// Coach Beurt — Hypertrophie Fessiers Stéphanie
// Programme local simplifié : bibliothèque de séances, sans cycle obligatoire.
// V50.40 : nettoyage équipement et noms de mouvements précis pour Stéphanie.

(function(){
  window.COACH_STEPHANIE_PROGRAMS = window.COACH_STEPHANIE_PROGRAMS || {};

  function ex(name, format, load, note){
    return { name:name, format:format, load:load || "RPE 7", note:note || "" };
  }

  window.COACH_STEPHANIE_PROGRAMS.hypertrophie_fesse_stephanie = {
    id: "hypertrophie_fesse_stephanie",
    label: "Hypertrophie Fessiers",
    athlete: "Stéphanie",
    mode: "simple_sessions",
    shoulderNote: "Épaule à respecter : pas d’overhead, pas de burpees en volume, pas de front rack lourd. Les charges doivent rester guidées par le RPE.",
    sessions: [
      {
        id: "glutes_heavy_hip_thrust",
        title: "Fessiers lourd — Hip Thrust",
        duration: "55–65 min",
        fatigue: "Élevée",
        goal: "Séance principale lourde : hip thrust, unilatéral contrôlé, abduction.",
        caution: "RPE 7–8. Pas d’échec. Stop si douleur hanche, dos ou épaule.",
        blocks: [
          {title:"Warm-up général", time:"8 min", text:"Bike 5 min + respiration côtes basses + Hip Switch + Hip CARs."},
          {title:"Activation fessiers", time:"8 min", text:"2 rondes : 15 glute bridge + 12 side-lying hip abduction/côté + 12 bodyweight reverse lunge/jambe."},
          {title:"A. Hip Thrust lourd", time:"18 min", exercises:[ex("Barbell Hip Thrust", "5×6-8", "RPE 7–8", "Pause 1 sec en haut, bassin stable. Monter seulement si la technique reste propre.")]},
          {title:"B. Split Squat", time:"12 min", exercises:[ex("DB Bulgarian Split Squat", "3×8/jambe", "RPE 7", "Amplitude contrôlée, buste stable, pas d’échec.")]},
          {title:"C. Abduction", time:"8 min", exercises:[ex("Cable Hip Abduction", "3×15-20/côté", "RPE 8", "Brûlure locale. Éviter de compenser avec le bas du dos.")]},
          {title:"Finisher", time:"5 min", text:"Glute bridge hold : 5×30 sec, repos 30 sec."},
          {title:"Retour au calme", time:"5 min", text:"Couch Stretch + Figure-4 Stretch + Box Breathing."}
        ]
      },
      {
        id: "glutes_heavy_unilateral",
        title: "Fessiers lourd — Unilatéral",
        duration: "55–65 min",
        fatigue: "Élevée",
        goal: "Mettre l’accent sur les fessiers jambe par jambe, sans charger l’épaule.",
        caution: "Choisir des charges contrôlables. Si le genou ou la hanche compense, réduire.",
        blocks: [
          {title:"Warm-up", time:"8 min", text:"Bike 5 min + Knee-to-Wall Ankle Rocks + Hip Switch + 10 step-up poids du corps/jambe."},
          {title:"Activation", time:"7 min", text:"2 rondes : 12 single-leg glute bridge/jambe + 15 banded seated hip abductions/côté."},
          {title:"A. Step-up haut", time:"16 min", exercises:[ex("DB Step-up", "4×8/jambe", "RPE 7–8", "Pousser par le talon, descente lente, pas d’élan.")]},
          {title:"B. Reverse Lunge", time:"12 min", exercises:[ex("DB Reverse Lunge", "3×10/jambe", "RPE 7", "Long pas arrière pour charger plus le fessier.")]},
          {title:"C. Hip Thrust modéré", time:"10 min", exercises:[ex("Hip Thrust", "3×12", "RPE 7", "Série propre, congestion, pas lourd maximal.")]},
          {title:"D. Abduction pump", time:"6 min", text:"2 rondes : 20 banded seated hip abductions + 20 frog pumps."},
          {title:"Retour au calme", time:"5 min", text:"Box Breathing + Hip Switch."}
        ]
      },
      {
        id: "glutes_volume_classic",
        title: "Fessiers volume",
        duration: "55–65 min",
        fatigue: "Moyenne",
        goal: "Accumuler du volume efficace sans écraser la récupération.",
        caution: "Chercher la congestion, pas le max. RPE 7–8 maximum.",
        blocks: [
          {title:"Warm-up", time:"8 min", text:"Row ou bike facile 5 min + activation élastique."},
          {title:"A. Hip Thrust volume", time:"15 min", exercises:[ex("Hip Thrust", "4×10-12", "RPE 7", "2 reps en réserve. Pause en haut sur chaque rep.")]},
          {title:"B. Goblet Squat", time:"12 min", exercises:[ex("Goblet Squat", "3×12", "RPE 7", "Pieds placés pour sentir fessiers. Mouvement contrôlé.")]},
          {title:"C. Slider Curl", time:"10 min", exercises:[ex("Slider Curl", "3×12-15", "RPE 8", "Ischios actifs, bassin stable.")]},
          {title:"D. Abduction", time:"8 min", exercises:[ex("Cable Hip Abduction", "3×20/côté", "RPE 8", "Sensation locale, pas de vitesse inutile.")]},
          {title:"Finisher", time:"5 min", text:"AMRAP qualité : 12 glute bridge + 12 side-lying hip abduction/côté + 12 air squat tempo."},
          {title:"Retour au calme", time:"5 min", text:"Figure-4 Stretch + Couch Stretch."}
        ]
      },
      {
        id: "posterior_chain_rdl",
        title: "Chaîne postérieure — RDL",
        duration: "50–60 min",
        fatigue: "Moyenne à élevée",
        goal: "Renforcer ischios/fessiers avec hinge contrôlé.",
        caution: "Dos neutre. Si le bas du dos prend toute la charge, réduire immédiatement.",
        blocks: [
          {title:"Warm-up", time:"8 min", text:"Bike 5 min + good morning PVC + hip hinge drill."},
          {title:"A. RDL", time:"18 min", exercises:[ex("DB RDL", "4×8", "RPE 7", "Charnière de hanche contrôlée, charge proche des jambes, aucune douleur lombaire.")]},
          {title:"B. Glute Bridge", time:"12 min", exercises:[ex("Glute Bridge", "4×10-12", "RPE 7", "Pause en haut, côtes basses, bassin stable.")]},
          {title:"C. Hamstring", time:"10 min", exercises:[ex("Slider Curl", "3×10-12", "RPE 8", "Contrôle lent, surtout à l’excentrique.")]},
          {title:"D. Core anti-extension", time:"7 min", exercises:[ex("Dead Bug", "3×8/côté", "poids du corps", "Expiration lente, lombaires stables.")]},
          {title:"Retour au calme", time:"5 min", text:"Supine Hamstring Stretch + Figure-4 Stretch + Box Breathing."}
        ]
      },
      {
        id: "glutes_quad_mix",
        title: "Fessiers + jambes",
        duration: "55–65 min",
        fatigue: "Moyenne",
        goal: "Travailler fessiers avec jambes complètes, sans focus épaule.",
        caution: "Pas besoin de charge maximale. Le contrôle compte plus que le poids.",
        blocks: [
          {title:"Warm-up", time:"8 min", text:"Bike 5 min + air squats tempo + activation fessiers."},
          {title:"A. Squat pattern", time:"15 min", exercises:[ex("Goblet Squat", "4×10", "RPE 7", "Amplitude propre. Éviter front rack si l’épaule est sensible.")]},
          {title:"B. Hip Thrust", time:"12 min", exercises:[ex("Hip Thrust", "3×10", "RPE 7", "Pause en haut. Série stable.")]},
          {title:"C. Walking Lunge", time:"10 min", exercises:[ex("Walking Lunge", "3×12 pas/jambe", "RPE 7", "Long pas, contrôle, pas de douleur genou.")]},
          {title:"D. Abduction + mollets", time:"8 min", text:"2 rondes : 20 banded seated hip abductions + 20 calf raises."},
          {title:"Retour au calme", time:"5 min", text:"Hip Switch + Couch Stretch + Box Breathing."}
        ]
      },
      {
        id: "cable_glutes",
        title: "Fessiers câble / isolation",
        duration: "45–55 min",
        fatigue: "Moyenne",
        goal: "Séance plus isolée : kickback, abduction, contrôle et congestion.",
        caution: "Très peu de stress systémique. Idéal si elle veut éviter une grosse séance lourde.",
        blocks: [
          {title:"Warm-up", time:"7 min", text:"Bike + Hip Switch + Hip CARs + side-lying hip abduction."},
          {title:"A. Cable Kickback", time:"14 min", exercises:[ex("Cable Kickback", "4×12-15/côté", "RPE 7–8", "Bassin stable, amplitude contrôlée, pas de dos creux.")]},
          {title:"B. Cable Hip Abduction", time:"12 min", exercises:[ex("Cable Hip Abduction", "4×15-20/côté", "RPE 8", "Chercher le moyen fessier, pas les lombaires.")]},
          {title:"C. Hip Thrust", time:"10 min", exercises:[ex("Hip Thrust", "3×15", "RPE 7", "Pompe musculaire, pas lourd.")]},
          {title:"D. Pump circuit", time:"8 min", text:"2 rondes : 20 frog pumps + 20 banded seated hip abductions + 30 sec glute bridge hold."},
          {title:"Retour au calme", time:"4 min", text:"Box Breathing + Hip Switch."}
        ]
      },
      {
        id: "pump_long",
        title: "Pump long",
        duration: "45–55 min",
        fatigue: "Faible à moyenne",
        goal: "Longue séance de pump sans grosses charges. Bonne option entre deux séances lourdes.",
        caution: "Si ça brûle, c’est correct. Si ça fait mal aux articulations, non.",
        blocks: [
          {title:"Warm-up", time:"6 min", text:"Bike + Hip Switch + Hip CARs."},
          {title:"A. Circuit 1", time:"14 min", text:"3 rondes : 15 glute bridge + 12 step-up/jambe + 20 side-lying hip abduction/côté."},
          {title:"B. Circuit 2", time:"14 min", text:"3 rondes : 15 frog pumps + 15 side-lying hip abduction/côté + 12 reverse lunge/jambe."},
          {title:"C. Finisher", time:"8 min", text:"EMOM 8 : min impaires 35 sec wall sit, min paires 35 sec banded seated hip abduction."},
          {title:"Core", time:"6 min", text:"2 rondes : 8 dead bug/côté + 20 sec side plank/côté."},
          {title:"Retour au calme", time:"5 min", text:"Hip Switch + Couch Stretch + Box Breathing."}
        ]
      },
      {
        id: "low_impact_engine_glutes",
        title: "Fessiers + cardio doux",
        duration: "45–60 min",
        fatigue: "Moyenne",
        goal: "Bouger plus longtemps avec un peu de conditioning sans irriter l’épaule.",
        caution: "Cardio contrôlé. Pas une séance CrossFit à fond.",
        blocks: [
          {title:"Warm-up", time:"7 min", text:"Bike + activation fessiers."},
          {title:"A. Hip Thrust", time:"12 min", exercises:[ex("Hip Thrust", "3×10", "RPE 7", "Stable, sans grind.")]},
          {title:"B. Step-up", time:"10 min", exercises:[ex("Step-up", "3×12/jambe", "RPE 7", "Poids léger ou corps libre selon fatigue.")]},
          {title:"C. Conditioning doux", time:"16 min", text:"AMRAP 16 facile : 10 cal bike + 12 air squats tempo + 12 glute bridge + 10 band pull-aparts. RPE 6–7."},
          {title:"D. Core", time:"6 min", text:"Dead bug 2×8/côté + side plank 2×20 sec/côté."},
          {title:"Retour au calme", time:"5 min", text:"Box Breathing + Hip Switch."}
        ]
      },
      {
        id: "recovery_glutes_mobility",
        title: "Récupération active fessiers",
        duration: "40–50 min",
        fatigue: "Faible",
        goal: "Séance longue mais facile : mobilité, activation, circulation sanguine.",
        caution: "Aucun mouvement ne devrait dépasser RPE 6.",
        blocks: [
          {title:"Cardio facile", time:"12 min", text:"Bike ou marche inclinée en aisance respiratoire."},
          {title:"Activation", time:"10 min", text:"2 rondes : 15 glute bridge + 12 side-lying clamshell/côté + 12 bird dog/côté."},
          {title:"Hip Switch + Hip CARs", time:"12 min", text:"90/90 hanches + couch stretch + pigeon modifié + respiration lente."},
          {title:"Core léger", time:"8 min", text:"2 rondes : 8 dead bug/côté + 20 sec side plank/côté + 8 pallof press/côté si câble disponible."},
          {title:"Option pump", time:"5 min", text:"Banded seated hip abduction légère 2×20 si elle veut finir avec une activation."}
        ]
      },
      {
        id: "short_but_complete",
        title: "Séance complète efficace",
        duration: "45–50 min",
        fatigue: "Moyenne",
        goal: "Option claire quand elle veut une vraie séance sans y passer 1 h 15.",
        caution: "Garder le rythme, mais ne pas sacrifier la technique.",
        blocks: [
          {title:"Warm-up", time:"6 min", text:"Bike 4 min + glute bridge + Side-Lying Hip Abduction."},
          {title:"A. Mouvement principal", time:"14 min", exercises:[ex("Hip Thrust", "4×8", "RPE 7", "Pause en haut, stable.")]},
          {title:"B. Unilatéral", time:"10 min", exercises:[ex("DB Reverse Lunge", "3×10/jambe", "RPE 7", "Choisir l’option la plus confortable.")]},
          {title:"C. Isolation", time:"8 min", exercises:[ex("Cable Hip Abduction", "3×15-20/côté", "RPE 8", "Contrôle et sensation locale.")]},
          {title:"D. Finisher", time:"6 min", text:"AMRAP 6 : 12 glute bridge + 10 air squat tempo + 12 side-lying hip abduction/côté."},
          {title:"Retour au calme", time:"4 min", text:"Hip Switch + Box Breathing."}
        ]
      }
    ]
  };

  // Informations affichées sur les cartes de sélection.
  // But : Stéphanie doit comprendre vite ce qu'il y a dans la séance, pourquoi elle existe,
  // et dans quel contexte la choisir. L'évaluation sert de garde-fou de programmation.
  var sessionDetails = {
    glutes_heavy_hip_thrust: {
      intention: "Construire la force principale des fessiers avec un hip thrust lourd, puis compléter avec unilatéral et abduction.",
      contenu: ["Hip Thrust lourd", "Bulgarian Split Squat", "Abduction", "Finisher isométrique"],
      meilleurChoix: "elle est fraîche, pas de douleur bas du dos/hanche, et veut la séance la plus productive de la semaine.",
      evaluation: {niveau:"Solide", raison:"Bonne séance pivot : tension mécanique élevée, un seul vrai mouvement lourd, accessoires ciblés. Volume élevé mais logique si elle ne la répète pas trop souvent.", surveillance:"ne pas faire la veille ou le lendemain d'une autre séance fessiers lourde; surveiller bas du dos et hanche."}
    },
    glutes_heavy_unilateral: {
      intention: "Développer les fessiers jambe par jambe et corriger les asymétries sans utiliser l'épaule.",
      contenu: ["Step-up haut", "Reverse lunge", "Hip Thrust modéré", "Pump abduction"],
      meilleurChoix: "elle veut une séance lourde mais différente du hip thrust principal, ou si la barre de hip thrust est moins disponible.",
      evaluation: {niveau:"Solide", raison:"Très bon complément au hip thrust : beaucoup de travail unilatéral, amplitude longue, peu de stress épaule.", surveillance:"risque de fatigue genou/hanche si les pas sont trop courts ou si elle force la charge."}
    },
    glutes_volume_classic: {
      intention: "Accumuler du volume hypertrophie sans chercher un max, avec une fatigue contrôlée.",
      contenu: ["Hip Thrust volume", "Squat/goblet squat", "Slider curl", "Abduction", "Circuit qualité"],
      meilleurChoix: "elle veut une vraie séance complète fessiers/jambes mais sans charge maximale.",
      evaluation: {niveau:"Très utile", raison:"Bonne séance de volume : combine extension de hanche, squat pattern, ischios et moyen fessier. Plus hypertrophie que performance.", surveillance:"si courbatures fortes, réduire le finisher ou une série d'abduction."}
    },
    posterior_chain_rdl: {
      intention: "Renforcer ischios et fessiers avec un hinge contrôlé, sans transformer ça en séance de dos.",
      contenu: ["RDL", "Glute bridge", "Slider curl", "Core anti-extension"],
      meilleurChoix: "elle veut travailler la chaîne postérieure ou varier d'une séance centrée hip thrust.",
      evaluation: {niveau:"Solide mais technique", raison:"Très pertinent pour les fessiers/ischios si le RDL reste propre. Le core aide à protéger la zone lombaire.", surveillance:"baisser la charge immédiatement si le bas du dos travaille plus que les ischios/fessiers."}
    },
    glutes_quad_mix: {
      intention: "Travailler fessiers avec jambes complètes pour garder une base athlétique, pas seulement isolation.",
      contenu: ["Squat pattern", "Hip Thrust", "Walking lunge", "Abduction"],
      meilleurChoix: "elle veut une séance plus générale jambes/fessiers avec un bon transfert CrossFit.",
      evaluation: {niveau:"Bien balancée", raison:"Bon équilibre entre fessiers et jambes. Moins spécialisée, mais utile pour garder une progression globale.", surveillance:"éviter le front rack si l'épaule est sensible; choisir goblet ou goblet squat."}
    },
    cable_glutes: {
      intention: "Créer un stimulus local fessiers avec peu de fatigue générale et presque aucun stress épaule.",
      contenu: ["Cable kickback", "Abduction", "Hip Thrust léger", "Pump circuit"],
      meilleurChoix: "elle veut sentir les fessiers sans se démolir, ou entre deux séances plus lourdes.",
      evaluation: {niveau:"Très sécuritaire", raison:"Bonne séance d'isolation : faible coût de récupération, utile pour pratiquer la connexion fessiers.", surveillance:"ne pas la compter comme remplacement complet d'une séance lourde trop souvent."}
    },
    pump_long: {
      intention: "Faire une séance longue, productive et légère, surtout orientée congestion et constance.",
      contenu: ["Circuits fessiers", "Air squat tempo", "Wall sit", "Core"],
      meilleurChoix: "elle veut bouger longtemps sans charges lourdes ou quand la fatigue nerveuse est plus haute.",
      evaluation: {niveau:"Bon outil", raison:"Utile pour ajouter du volume sans charge lourde. Très bon choix quand l'épaule ou le système nerveux doit rester tranquille.", surveillance:"la brûlure musculaire est correcte; la douleur articulaire ne l'est pas."}
    },
    low_impact_engine_glutes: {
      intention: "Combiner fessiers et cardio doux sans tomber dans un WOD agressif pour l'épaule.",
      contenu: ["Hip Thrust", "Step-up", "AMRAP doux", "Core"],
      meilleurChoix: "elle veut transpirer un peu tout en gardant un objectif fessiers clair.",
      evaluation: {niveau:"Intelligent", raison:"Bon compromis CrossFit/hypertrophie : un peu de moteur, mais les mouvements restent contrôlables.", surveillance:"garder RPE cardio 6–7; si ça devient une course, la qualité fessiers baisse."}
    },
    recovery_glutes_mobility: {
      intention: "Récupérer, bouger et garder l'activation sans créer de nouvelle fatigue.",
      contenu: ["Cardio facile", "Activation", "Hip Switch + Hip CARs", "Core léger"],
      meilleurChoix: "elle est courbaturée, fatiguée, ou veut faire quelque chose sans nuire à la prochaine grosse séance.",
      evaluation: {niveau:"Essentielle", raison:"Bonne séance de récupération active. Elle rend le plan plus durable et réduit le risque d'empiler trop de volume lourd.", surveillance:"ne pas la transformer en séance intense; tout doit rester facile."}
    },
    short_but_complete: {
      intention: "Donner une vraie séance fessiers complète en moins de temps, sans trop de décisions.",
      contenu: ["Hip Thrust", "Unilatéral", "Abduction", "Finisher court"],
      meilleurChoix: "elle manque de temps mais veut quand même une séance efficace.",
      evaluation: {niveau:"Très pratique", raison:"Structure simple et complète : un principal, un unilatéral, une isolation, un finisher. Bon choix par défaut.", surveillance:"si elle a plus de temps et beaucoup d'énergie, choisir une séance plus complète plutôt que celle-ci."}
    }
  };

  var program = window.COACH_STEPHANIE_PROGRAMS.hypertrophie_fesse_stephanie;
  (program.sessions || []).forEach(function(session){
    var details = sessionDetails[session.id] || {};
    Object.keys(details).forEach(function(key){ session[key] = details[key]; });
  });

  // ── Enregistrement runtime standard ────────────────────────────────────────
  // Ce programme est déclaré dans programs/index.js : il doit donc exister dans
  // COACH_BERTIN_PROGRAMS avec un getBlocks(day, week), sinon le moteur de
  // séances ne peut pas le faire tourner (le boot le déclarait « absent » et
  // retombait sur le premier programme public). La bibliothèque de séances
  // devient un plan 4 jours/semaine : les 10 séances tournent de semaine en
  // semaine dans l'ordre du tableau (lourdes en tête de semaine).
  var STEPH_DAYS = ["lundi", "mardi", "jeudi", "vendredi"];

  function stephSessionForDay(day, week){
    var di = STEPH_DAYS.indexOf(day);
    var sessions = program.sessions || [];
    if(di < 0 || !sessions.length) return null;
    var wk = Math.max(1, Number(week) || 1);
    return sessions[((wk - 1) * STEPH_DAYS.length + di) % sessions.length];
  }

  function stephKindFor(block){
    var t = String(block.title || "");
    var txt = String(block.text || "");
    if(/retour au calme|hip switch|mobilit/i.test(t)) return "mobility";
    if(/warm-up|activation|cardio facile/i.test(t)) return "warmup";
    if(/AMRAP|EMOM|for time/i.test(txt)) return "wod";
    if(/core/i.test(t)) return "core";
    if(block.exercises && block.exercises.length) return /^A\./.test(t) ? "main" : "accessory";
    return "accessory";
  }

  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};
  window.COACH_BERTIN_PROGRAMS.hypertrophie_fesse_stephanie = {
    label: "Hypertrophie Fessiers — Stéphanie",
    days: STEPH_DAYS,
    getBlocks: function(day, week){
      var s = stephSessionForDay(day, week);
      if(!s) return [];
      var blocks = [{
        kind: "technique",
        title: "Séance : " + s.title,
        time: s.duration || "—",
        text: (s.goal || "") + (s.caution ? " Prudence : " + s.caution : "")
      }];
      (s.blocks || []).forEach(function(b){
        blocks.push({
          kind: stephKindFor(b),
          title: b.title,
          time: b.time || "—",
          text: b.text || "",
          exercises: (b.exercises && b.exercises.length) ? b.exercises.slice() : undefined
        });
      });
      return blocks;
    }
  };

})();
