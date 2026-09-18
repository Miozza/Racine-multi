// Racine — Coach IA : ce que le modèle a le droit de proposer.
//
// Un patch est une PROPOSITION. Il n'est jamais appliqué par le modèle ni par
// ce fichier tout seul : l'athlète appuie sur « Accepter », et c'est ce geste
// qui déclenche apply(). Même posture que scripts/profiles/prescription.js
// (carte Accepter/Refuser) et que l'Avis IA existant
// (scripts/ai/ai_import.js, `do_not_auto_apply`).
//
// Les outils sont de deux natures, et c'est la distinction structurante :
//   - LECTURE (`consulter_mouvement`) : exécuté tout de suite, sans demander.
//     Lire l'historique ne change rien, donc rien à valider.
//   - PROPOSITION (`proposer_*`) : jamais exécuté. On rend au modèle un
//     tool_result qui dit « affiché, l'athlète décidera », et la conversation
//     s'arrête là. Le tool_result garde l'historique valide pour l'API.
//
// Ce qu'AUCUN outil ne peut faire, par construction : écrire une charge.
// Cherchez un champ de poids dans les schémas ci-dessous — il n'y en a pas.
// C'est la décision « le moteur garde la main », tenue dans le schéma plutôt
// que dans une consigne de prompt qu'un modèle peut contourner.
(function(){
  "use strict";

  var api = window.CoachAIPatch = window.CoachAIPatch || {};

  var LOG_KEY = "racine_coach_ai_patch_log_v1";
  var LOG_MAX = 80;

  function str(v){ return String(v==null?"":v).trim(); }
  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }

  // ── Définitions d'outils envoyées à l'API ──────────────────────────────
  //
  // Volontairement SANS `strict: true` : le mode strict impose que tout champ
  // déclaré soit requis, ce qui obligerait à des unions avec null pour chaque
  // champ optionnel (note, repos, objectif…). La validation réelle se fait de
  // toute façon ici et dans CoachAIPlan.sanitize*, qui nettoient bien plus que
  // ce qu'un schéma peut exprimer — l'effacement des charges, par exemple.

  var EXERCISE_SCHEMA = {
    type: "object",
    properties: {
      name: {type: "string", description: "Nom réel du mouvement, stable et distinct (ex. « Back Squat »). Aucune intention ni intensité dans le nom."},
      format: {type: "string", description: "Séries × répétitions ou format de travail (ex. « 4×8 », « EMOM 10 », « 3×30 s »)."},
      rest: {type: "string", description: "Repos entre séries (ex. « 2:00 »)."},
      note: {type: "string", description: "Consigne d'exécution courte. C'est ici que va tout ce qui n'est ni un nom, ni un format."},
      intention: {
        type: "string",
        enum: ["normale", "technique", "legere", "facile", "lourde"],
        description: "Intention du travail. « technique », « legere » et « facile » coupent l'auto-progression du moteur de charges : à utiliser pour une semaine de reprise, un deload ou un apprentissage."
      }
    },
    required: ["name", "format"]
  };

  var BLOCK_SCHEMA = {
    type: "object",
    properties: {
      time: {type: "string", description: "Durée indicative du bloc (ex. « 12 min »)."},
      title: {type: "string", description: "Titre du bloc (ex. « A. Squat lourd »)."},
      tag: {type: "string", description: "Étiquette courte affichée (ex. « Principal », « Superset »)."},
      kind: {
        type: "string",
        enum: ["warmup","main","secondary","hypertrophy","accessory","technique","core","wod","mobility","bonus"],
        description: "Nature du bloc. « wod » pour un metcon, « bonus » pour une consigne informative non capturée dans les résultats."
      },
      text: {type: "string", description: "Texte du bloc, pour un metcon ou une consigne. À utiliser À LA PLACE de `exercises`, pas en plus."},
      exercises: {type: "array", items: EXERCISE_SCHEMA, description: "Exercices du bloc. À utiliser À LA PLACE de `text`."}
    },
    required: ["title", "kind"]
  };

  function tools(){
    return [
      {
        name: "consulter_mouvement",
        description: "Lire l'historique détaillé d'un mouvement : séries réellement effectuées, RPE, notes de l'athlète, charge actuellement suggérée par le moteur et son explication. "
                   + "Utilise cet outil avant de te prononcer sur un mouvement précis — le contexte de départ ne contient qu'un résumé.",
        input_schema: {
          type: "object",
          properties: {
            mouvement: {type: "string", description: "Nom du mouvement, tel qu'il apparaît dans le programme ou l'historique."}
          },
          required: ["mouvement"]
        }
      },
      {
        name: "proposer_remplacement",
        description: "Proposer de remplacer un mouvement par un autre, partout où il apparaît, jusqu'à ce que l'athlète retire le remplacement. "
                   + "Sert quand un mouvement pose problème (douleur, matériel indisponible, exécution qui ne passe pas).",
        input_schema: {
          type: "object",
          properties: {
            de: {type: "string", description: "Mouvement à remplacer, nom exact."},
            vers: {type: "string", description: "Mouvement de remplacement, nom exact."},
            raison: {type: "string", description: "Pourquoi, en une phrase. L'athlète la lit avant d'accepter."}
          },
          required: ["de", "vers", "raison"]
        }
      },
      {
        name: "proposer_ajustement",
        description: "Proposer de changer le format (séries × répétitions), le repos ou la consigne d'un exercice, pour un jour et une semaine donnés. "
                   + "Fonctionne sur n'importe quelle semaine, générée ou non. Ne peut pas changer la charge : le poids reste calculé par le moteur de Racine.",
        input_schema: {
          type: "object",
          properties: {
            semaine: {type: "integer", description: "Numéro de semaine visé."},
            jour: {type: "string", description: "Jour visé, en minuscules (« lundi », « mardi »…)."},
            mouvement: {type: "string", description: "Mouvement visé, tel qu'il s'affiche dans la séance."},
            format: {type: "string", description: "Nouveau format (ex. « 5×5 »). Laisser vide pour ne pas y toucher."},
            rest: {type: "string", description: "Nouveau repos (ex. « 3:00 »). Laisser vide pour ne pas y toucher."},
            note: {type: "string", description: "Consigne ajoutée à l'exercice."},
            raison: {type: "string", description: "Pourquoi, en une phrase."}
          },
          required: ["semaine", "jour", "mouvement", "raison"]
        }
      },
      {
        name: "proposer_semaine",
        description: "Proposer une semaine d'entraînement complète, qui remplacera le programme pour cette semaine-là si l'athlète l'accepte. "
                   + "N'écris JAMAIS de charge : le moteur de Racine calcule chaque poids à partir de l'historique réel, des ratios de l'athlète et du matériel disponible. "
                   + "Exprime l'intensité voulue par le champ `intention` et par le format, jamais par un nombre de livres.",
        input_schema: {
          type: "object",
          properties: {
            semaine: {type: "integer", description: "Numéro de la semaine à écrire."},
            label: {type: "string", description: "Nom court de la semaine (ex. « Volume haut du corps »)."},
            objectif: {type: "string", description: "Objectif de la semaine, en une phrase."},
            jours: {
              type: "array",
              description: "Un objet par jour d'entraînement.",
              items: {
                type: "object",
                properties: {
                  jour: {type: "string", description: "Jour en minuscules (« lundi », « mardi »…)."},
                  blocs: {type: "array", items: BLOCK_SCHEMA}
                },
                required: ["jour", "blocs"]
              }
            }
          },
          required: ["semaine", "jours"]
        }
      }
    ];
  }

  var PROPOSALS = ["proposer_remplacement", "proposer_ajustement", "proposer_semaine"];

  api.tools = tools;
  api.isProposal = function(name){ return PROPOSALS.indexOf(str(name)) >= 0; };
  api.isRead = function(name){ return str(name) === "consulter_mouvement"; };

  // ── Rendu lisible d'une proposition ────────────────────────────────────
  // L'athlète doit pouvoir décider sans lire du JSON.

  api.describe = function(patch){
    patch = patch || {};
    var name = str(patch.name);
    var input = patch.input || {};

    if(name === "proposer_remplacement"){
      return {
        title: "Remplacer un mouvement",
        lines: [
          str(input.de) + "  →  " + str(input.vers),
          str(input.raison)
        ].filter(Boolean),
        footer: "S'applique partout, jusqu'à ce que tu le retires."
      };
    }

    if(name === "proposer_ajustement"){
      var bits = [];
      if(str(input.format)) bits.push("format → " + str(input.format));
      if(str(input.rest)) bits.push("repos → " + str(input.rest));
      if(str(input.note)) bits.push("note → " + str(input.note));
      return {
        title: "Ajuster " + str(input.mouvement),
        lines: [
          "Semaine " + str(input.semaine) + " · " + str(input.jour),
          bits.join("  ·  "),
          str(input.raison)
        ].filter(Boolean),
        footer: "La charge reste calculée par le moteur."
      };
    }

    if(name === "proposer_semaine"){
      var jours = Array.isArray(input.jours) ? input.jours : [];
      var lines = [];
      if(str(input.objectif)) lines.push(str(input.objectif));
      jours.forEach(function(d){
        var blocs = Array.isArray(d.blocs) ? d.blocs : [];
        var titles = blocs.map(function(b){ return str(b.title); }).filter(Boolean);
        lines.push(str(d.jour) + " — " + (titles.join(" · ") || "aucun bloc"));
      });
      return {
        title: "Semaine " + str(input.semaine) + (str(input.label) ? " — " + str(input.label) : ""),
        lines: lines,
        footer: "Remplace le programme pour cette semaine. Réversible : « Retirer la semaine »."
      };
    }

    return {title: "Proposition inconnue", lines: [], footer: ""};
  };

  // ── Application — déclenchée par le geste de l'athlète, jamais avant ────

  api.apply = function(patch){
    patch = patch || {};
    var name = str(patch.name);
    var input = patch.input || {};

    try{
      if(name === "proposer_remplacement"){
        if(!window.RacineMovementSwaps) return {ok:false, error:"Module de remplacements indisponible."};
        var profileId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
        // Passe par le mécanisme EXISTANT (scripts/profiles/swaps.js) : pas de
        // second chemin d'écriture pour la même chose.
        var done = RacineMovementSwaps.add(profileId, str(input.de), str(input.vers), str(input.raison));
        if(!done) return {ok:false, error:"Écriture du remplacement impossible."};
        logPatch(patch, "accepted");
        return {ok:true, message:"Remplacement actif : " + str(input.de) + " → " + str(input.vers) + "."};
      }

      if(name === "proposer_ajustement"){
        if(!window.CoachAIPlan) return {ok:false, error:"Module de plan indisponible."};
        var res = CoachAIPlan.addAdjustment({
          week: input.semaine,
          day: input.jour,
          movement: input.mouvement,
          format: input.format,
          rest: input.rest,
          note: input.note || input.raison
        });
        if(!res.ok) return res;
        logPatch(patch, "accepted");
        return {ok:true, message:"Ajustement appliqué sur " + str(input.mouvement) + "."};
      }

      if(name === "proposer_semaine"){
        if(!window.CoachAIPlan) return {ok:false, error:"Module de plan indisponible."};
        var days = {};
        (Array.isArray(input.jours) ? input.jours : []).forEach(function(d){
          var key = str(d && d.jour).toLowerCase();
          if(!key) return;
          days[key] = Array.isArray(d.blocs) ? d.blocs : [];
        });
        var out = CoachAIPlan.setWeek(input.semaine, {
          label: str(input.label),
          goal: str(input.objectif),
          days: days
        });
        if(!out.ok) return out;
        logPatch(patch, "accepted");
        return {
          ok: true,
          message: "Semaine " + out.week + " écrite (" + out.days.join(", ") + "). "
                 + "Pour la suivre, choisis le programme « Semaines Coach IA » dans l'onglet Cycle."
        };
      }
    }catch(e){
      return {ok:false, error:"Application impossible : " + (e && e.message ? e.message : String(e))};
    }

    return {ok:false, error:"Type de proposition inconnu : " + name};
  };

  api.refuse = function(patch){ logPatch(patch, "refused"); return {ok:true}; };

  // ── Journal des propositions ───────────────────────────────────────────
  // Plafonné : le stockage local est la seule source de vérité et n'a aucune
  // copie serveur (CLAUDE.md §2.1). Un journal qui gonfle vient concurrencer
  // l'historique d'entraînement pour le quota — l'historique passe d'abord.

  function readLog(){
    try{
      var raw = localStorage.getItem(LOG_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){ return []; }
  }
  function writeLog(list){
    try{ localStorage.setItem(LOG_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(-LOG_MAX))); }
    catch(e){ /* quota plein : le journal est consultatif, on le perd sans bruit */ }
  }
  function logPatch(patch, decision){
    var list = readLog();
    list.push({
      at: nowIso(),
      name: str(patch && patch.name),
      decision: decision,
      summary: api.describe(patch).title
    });
    writeLog(list);
  }

  api.readLog = readLog;
  api.LOG_KEY = LOG_KEY;
  api.LOG_MAX = LOG_MAX;
})();
