// Racine — Coach IA : le pont copier-coller.
//
// POURQUOI CE FICHIER EXISTE. Un abonnement Claude Pro ne donne pas accès à
// l'API : la facturation API est séparée et à l'usage. Payer au jeton pour ce
// qu'un abonnement déjà payé sait faire n'a pas de sens. Ce pont est donc le
// chemin PAR DÉFAUT de Coach IA :
//
//   Racine construit le prompt  →  tu le colles dans Claude (app ou site)
//   →  tu recolles la réponse   →  Racine la lit et affiche les propositions
//
// L'appel API direct (client.js) reste possible et dormant : sans clé, il ne
// s'active jamais et ne coûte rien. C'est une option, pas le chemin normal.
//
// CE QUI NE CHANGE PAS entre les deux chemins : les propositions arrivent dans
// la MÊME carte Accepter / Refuser, appliquées par le MÊME CoachAIPatch.apply,
// nettoyées par le MÊME CoachAIPlan. Un patch collé à la main n'a pas plus de
// pouvoir qu'un patch venu de l'API — et notamment, il ne peut pas plus écrire
// une charge, parce que le contrat envoyé au modèle est engendré depuis les
// mêmes schémas (CoachAIPatch.contractText).
//
// Le format de marqueurs reprend celui d'Avis IA (scripts/ai/ai_import.js) :
// il est déjà rodé, et l'analyseur reste tolérant — marqueurs d'abord, bloc
// ```json ensuite, premier objet JSON en dernier recours. Un modèle qui
// bavarde autour de sa réponse ne doit pas faire échouer la lecture.
(function(){
  "use strict";

  var api = window.CoachAIBridge = window.CoachAIBridge || {};

  var START = "RACINE_COACH_START";
  var END = "RACINE_COACH_END";

  function str(v){ return String(v==null?"":v).trim(); }

  // ── Construction du prompt ─────────────────────────────────────────────

  function consigne(){
    return [
      "Tu es le coach d'entraînement de cet athlète. Il utilise Racine, une application de CrossFit et de force qui possède son propre moteur de calcul de charges.",
      "Réponds en français, au tutoiement, court et concret : il te lit sur un iPhone.",
      "",
      "CE QUE TU DÉCIDES : le choix des mouvements, leur ordre, le volume, les séries et les répétitions, la structure d'une semaine, l'intention de chaque journée. Et le repérage de ce qui stagne, de ce qui progresse, et de ce qui revient dans ses notes.",
      "",
      "CE QUE TU NE DÉCIDES PAS — LES CHARGES.",
      "Racine calcule chaque poids à partir de l'historique réel : e1RM mesurés, fiabilité du RPE par mouvement, frein après un RPE élevé, ratios du profil, et les tailles réelles du rack. Tu ne peux pas deviner tout ça depuis une conversation.",
      "N'écris donc AUCUN poids en livres dans le bloc de propositions ci-dessous — les champs n'existent pas. Pour exprimer une intensité, sers-toi du champ `intention` et du format de séries.",
      "Si tu veux conseiller un poids précis, dis-le dans ton texte libre, hors du bloc : l'athlète reste libre de le saisir, et Racine documentera l'écart.",
      "",
      "COMMENT RÉPONDRE.",
      "Réponds normalement, en texte, comme un coach. Puis, SI et seulement si tu proposes un changement concret, ajoute à la toute fin un bloc encadré par ces deux marqueurs, contenant un JSON valide et rien d'autre :",
      "",
      START,
      '{ "propositions": [ { "type": "...", "…": "…" } ] }',
      END,
      "",
      "Chaque entrée de `propositions` a un champ `type` qui nomme l'action, plus les champs de cette action. Types disponibles :",
      ""
    ].join("\n");
  }

  function rappelCharges(){
    return [
      "",
      "RAPPEL IMPORTANT : si tu écris quand même une charge dans le bloc JSON, Racine l'effacera sans le dire et calculera le poids lui-même. Ce n'est pas une punition, c'est la conception — une charge chiffrée est ambiguë entre « pourcentage d'un athlète de référence » et « poids réel », et la confondre donne des poids absurdes.",
      "",
      "Si tu n'as rien de concret à proposer, réponds seulement en texte, sans bloc.",
      ""
    ].join("\n");
  }

  var INTENTS = {
    libre: {
      label: "Question libre",
      question: "Voici ma situation. Dis-moi ce que tu vois."
    },
    semaine: {
      label: "Écrire ma semaine",
      question: "Écris-moi la prochaine semaine d'entraînement complète, en tenant compte de ma progression réelle, de ce qui stagne et de mes notes. Utilise `proposer_semaine`."
    },
    analyse: {
      label: "Analyser ma progression",
      question: "Analyse ma progression des dernières semaines : ce qui monte, ce qui stagne, ce qui revient dans mes notes. Propose des corrections concrètes si tu en vois."
    },
    faiblesses: {
      label: "Mes points faibles",
      question: "Quels sont mes points faibles visibles dans ces données, et qu'est-ce que tu changerais à ma programmation pour les corriger ?"
    }
  };

  api.intents = function(){
    return Object.keys(INTENTS).map(function(k){ return {key: k, label: INTENTS[k].label}; });
  };

  // Construit le texte complet à coller dans Claude.
  // Le contexte n'est PAS rogné ici comme il l'est pour l'API : il n'y a pas de
  // facturation au jeton sur ce chemin, donc autant en donner davantage. C'est
  // le seul endroit où le copier-coller est objectivement meilleur que l'API.
  api.buildPrompt = function(intentKey, extraQuestion){
    var intent = INTENTS[str(intentKey)] || INTENTS.libre;
    var question = str(extraQuestion) || intent.question;

    var contexte = "";
    try{
      contexte = window.CoachAIContext
        ? window.CoachAIContext.build({sessions: 14, notes: 16})
        : "(contexte indisponible)";
    }catch(e){ contexte = "(contexte illisible : " + (e && e.message) + ")"; }

    var contrat = "";
    try{ contrat = window.CoachAIPatch ? window.CoachAIPatch.contractText() : ""; }catch(e){}

    return [
      consigne(),
      contrat,
      rappelCharges(),
      "──────────────────────────────────────────",
      "ÉTAT ACTUEL DE L'ATHLÈTE",
      "──────────────────────────────────────────",
      "",
      contexte,
      "",
      "──────────────────────────────────────────",
      "SA DEMANDE",
      "──────────────────────────────────────────",
      "",
      question
    ].join("\n");
  };

  // ── Lecture de la réponse ──────────────────────────────────────────────

  function betweenMarkers(text){
    var a = text.indexOf(START);
    var b = text.indexOf(END);
    if(a < 0 || b < 0 || b <= a) return "";
    return text.slice(a + START.length, b).trim();
  }
  function stripFence(text){
    var m = str(text).match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return m ? str(m[1]) : str(text);
  }
  function firstJsonObject(text){
    text = stripFence(text);
    var a = text.indexOf("{");
    var b = text.lastIndexOf("}");
    if(a < 0 || b <= a) return "";
    return text.slice(a, b + 1).trim();
  }

  // Le texte lisible = tout ce qui précède le bloc. C'est la réponse de coach ;
  // le JSON n'est que la partie machine.
  function proseOf(text){
    var a = text.indexOf(START);
    if(a < 0){
      // Pas de marqueur : retirer un éventuel bloc ```json pour ne pas
      // afficher du JSON brut dans la conversation.
      return str(text.replace(/```(?:json)?[\s\S]*?```/gi, "").trim());
    }
    return str(text.slice(0, a));
  }

  // Les noms d'actions acceptés sont EXACTEMENT ceux des outils — un type
  // inventé par le modèle est refusé, pas deviné.
  function normalizeType(t){
    var name = str(t);
    if(!name) return "";
    if(name.indexOf("proposer_") !== 0) name = "proposer_" + name;
    return (window.CoachAIPatch && window.CoachAIPatch.isProposal(name)) ? name : "";
  }

  api.parseResponse = function(raw){
    raw = str(raw);
    if(!raw) return {ok:false, error:"Rien à lire : colle la réponse de Claude."};

    var prose = proseOf(raw);

    var candidate = betweenMarkers(raw);
    var source = "marqueurs";
    if(!candidate){
      candidate = firstJsonObject(raw);
      source = "JSON détecté";
    }
    // Pas de bloc du tout : ce n'est pas une erreur. Le modèle a répondu en
    // texte, ce qui est le cas le plus fréquent et parfaitement valide.
    if(!candidate) return {ok:true, text:prose, proposals:[], source:"texte seul"};

    var parsed;
    try{ parsed = JSON.parse(candidate); }
    catch(e){
      return {
        ok: false,
        text: prose,
        error: "Le bloc de propositions n'est pas un JSON valide. Redemande à Claude de le réécrire entre "
             + START + " et " + END + "."
      };
    }

    var list = [];
    if(parsed && Array.isArray(parsed.propositions)) list = parsed.propositions;
    else if(Array.isArray(parsed)) list = parsed;
    else if(parsed && str(parsed.type)) list = [parsed];

    var proposals = [];
    var rejected = [];
    list.slice(0, 12).forEach(function(item){
      if(!item || typeof item !== "object") return;
      var name = normalizeType(item.type);
      if(!name){ rejected.push(str(item.type) || "(sans type)"); return; }
      var input = Object.assign({}, item);
      delete input.type;
      proposals.push({id: null, name: name, input: input});
    });

    return {
      ok: true,
      text: prose,
      proposals: proposals,
      source: source,
      rejected: rejected
    };
  };

  api.START = START;
  api.END = END;
})();
