// Coach Beurt — Arnold Split 2026 adapté
// Programme local expérimental : 6 cartes bodybuilding hypertrophie, données locales seulement.

(function(){
  window.COACH_ARNOLD_PROGRAMS = window.COACH_ARNOLD_PROGRAMS || {};

  function ex(name, format, load, note){
    return { name:name, format:format, load:load || "RPE 7–8", note:note || "" };
  }

  var globalRules = "Repos : 90–150 sec sur les gros mouvements, 60–90 sec sur l’isolation. RPE 7–8 au début, 8–9 max en fin de cycle. Pas d’échec sur squat/deadlift/RDL/mouvements lourds. AMRAP seulement sur pull-ups/dips/ring rows, arrêt RPE 9 max. Progression : si toutes les séries atteignent le haut de plage avec bonne forme, augmenter légèrement la prochaine fois. Dimanche : repos ou mobilité légère.";

  window.COACH_ARNOLD_PROGRAMS.arnold_split_2026_adapte = {
    id: "arnold_split_2026_adapte",
    label: "Arnold Split 2026 — Adapté",
    athlete: "Local",
    mode: "simple_sessions",
    experimental: true,
    cycleNote: globalRules,
    sessions: [
      {
        id: "arnold_j1_pecs_dos_a",
        title: "Jour 1 — Pecs + Dos A",
        duration: "60–75 min",
        fatigue: "Élevée",
        tags: ["Pecs", "Dos", "Poussée", "Tirage", "Hypertrophie"],
        goal: "Gros volume haut du corps, alternance poussée/tirage.",
        intention: "Accumuler du volume pecs/dos en gardant les épaules propres et le tirage solide.",
        contenu: ["Bench Press", "Incline DB Press", "Pull-Up/Ring Row", "Barbell Row", "DB Fly", "Tirage élastique/Ring Row wide"],
        meilleurChoix: "Début de semaine ou journée où le haut du corps est frais.",
        caution: "RPE cible 7–8. AMRAP propre seulement sur Pull-Up/Ring Row, arrêt RPE 9 max. Aucune douleur d’épaule sur les fly.",
        evaluation: { niveau:"Expérimental", raison:"Séance bodybuilding haut volume avec alternance poussée/tirage pour limiter la fatigue locale.", surveillance:"Épaules, coudes et bas du dos sur le Barbell Row." },
        blocks: [
          {title:"Règles du jour", time:"2 min", text:globalRules},
          {title:"A. Travail principal", time:"48–58 min", exercises:[
            ex("Bench Press", "4×8-12", "RPE 7–8", "Garde les omoplates serrées, barre contrôlée, pas de rebond."),
            ex("Incline DB Press", "4×8-12", "RPE 7–8", "Inclinaison modérée, descente lente, pousse sans verrouiller brutalement."),
            ex("Pull-Up", "4×AMRAP propre", "RPE 9 max", "Option : Ring Row si les pull-ups ne sont pas propres. Arrête avant de perdre la forme."),
            ex("Barbell Row", "4×8-12", "RPE 7–8", "Dos gainé, tire les coudes vers les hanches."),
            ex("DB Fly", "3×10-15", "Léger", "Grand étirement, aucune douleur d’épaule."),
            ex("Tirage élastique", "4×10-12", "RPE 7–8", "Option : Ring Row wide. Remplacement du lat pulldown. Mouvement contrôlé.")
          ]},
          {title:"Sortie", time:"5–8 min", text:"Mobilité pecs/lats légère + respiration. Stopper si épaules irritées."}
        ]
      },
      {
        id: "arnold_j2_epaules_bras_a",
        title: "Jour 2 — Épaules + Bras A",
        duration: "60–75 min",
        fatigue: "Moyenne à élevée",
        tags: ["Épaules", "Biceps", "Triceps", "Bras", "Hypertrophie"],
        goal: "Épaules larges, bras, triceps/biceps sans exploser les articulations.",
        intention: "Construire deltoïdes et bras avec contrôle, sans élan ni surcharge articulaire.",
        contenu: ["Seated DB Press", "Cable Lateral Raise", "Barbell Curl", "Dips", "Preacher/Incline Curl", "Skull Crusher"],
        meilleurChoix: "Après Pecs + Dos A si les épaules et les coudes répondent bien.",
        caution: "RPE 7–8. Dips en AMRAP propre seulement, arrêt RPE 9. Réduire l’amplitude si épaules sensibles.",
        evaluation: { niveau:"Expérimental", raison:"Volume bras/épaules classique, compatible hypertrophie si les coudes restent calmes.", surveillance:"Surveiller les coudes sur Skull Crusher et Dips." },
        blocks: [
          {title:"Règles du jour", time:"2 min", text:globalRules},
          {title:"A. Épaules + bras", time:"50–60 min", exercises:[
            ex("Seated DB Press", "4×8-12", "RPE 7–8", "Tronc solide, haltères contrôlés, pas d’élan."),
            ex("Cable Lateral Raise", "4×10-15", "RPE 8", "Monte jusqu’à l’épaule, contrôle la descente."),
            ex("Barbell Curl", "4×8-12", "RPE 7–8", "Coudes fixes, pas de swing du dos."),
            ex("Dips", "4×AMRAP propre", "RPE 9 max", "Si épaules sensibles, amplitude réduite."),
            ex("Preacher Curl", "3×10-12", "RPE 8", "Option : Curl incliné. Mouvement strict, étirement contrôlé."),
            ex("Skull Crusher", "3×8-12", "Charge modérée", "Coudes stables, charge modérée.")
          ]},
          {title:"Sortie", time:"5 min", text:"Décompression épaules/coudes. Aucun set forcé."}
        ]
      },
      {
        id: "arnold_j3_jambes_a",
        title: "Jour 3 — Jambes A",
        duration: "60–70 min",
        fatigue: "Élevée",
        tags: ["Jambes", "Quadriceps", "Ischios", "Mollets", "Squat"],
        goal: "Base jambes, squat, ischios, mollets.",
        intention: "Construire une base jambes solide sans aller à l’échec sur les mouvements lourds.",
        contenu: ["Back/Front Squat", "Lunges", "Stiff-Leg Deadlift", "Standing Calf Raise"],
        meilleurChoix: "Milieu de split, avec assez de récupération avant la deuxième moitié.",
        caution: "Aucun échec sur squat ou Stiff-Leg Deadlift. RPE 8 max si la technique commence à bouger.",
        evaluation: { niveau:"Expérimental", raison:"Séance jambes simple et efficace : squat, unilatéral, hinge, mollets.", surveillance:"Bas du dos et contrôle de genou sur lunges." },
        blocks: [
          {title:"Règles du jour", time:"2 min", text:globalRules},
          {title:"A. Jambes", time:"48–58 min", exercises:[
            ex("Back Squat", "4×8-12", "RPE 7–8", "Option : Front Squat si plus naturel. Descente contrôlée, gainage fort, profondeur stable."),
            ex("Lunges", "3×10-15/jambe", "RPE 7–8", "Pas long, genou stable, contrôle complet."),
            ex("Stiff-Leg Deadlift", "4×10-12", "RPE 7–8", "Hanches vers l’arrière, dos neutre, étirement ischios."),
            ex("Standing Calf Raise", "4×15-20", "RPE 8", "Pause en haut, descente complète.")
          ]},
          {title:"Sortie", time:"5–8 min", text:"Mobilité hanches/ischios/mollets. Si le bas du dos parle, réduire la prochaine séance."}
        ]
      },
      {
        id: "arnold_j4_pecs_dos_b",
        title: "Jour 4 — Pecs + Dos B",
        duration: "60–75 min",
        fatigue: "Élevée",
        tags: ["Pecs", "Dos", "Deadlift", "Dips", "Row"],
        goal: "Deuxième stimulation pecs/dos avec angles différents.",
        intention: "Travailler pecs/dos sous d’autres angles, avec deadlift technique et sans échec.",
        contenu: ["Deadlift", "Decline/DB Press", "Chest Dips", "One-Arm DB Row", "Cable/Ring Row", "Cable/DB Fly"],
        meilleurChoix: "Après une journée de récupération relative des jambes et du bas du dos.",
        caution: "Deadlift technique seulement, RPE 8 max. Chest Dips AMRAP propre à RPE 9 max. Aucun grinder.",
        evaluation: { niveau:"Expérimental", raison:"Deuxième haut du corps avec angle différent et tirage horizontal dominant.", surveillance:"Fatigue lombaire si Jambes A a été lourde." },
        blocks: [
          {title:"Règles du jour", time:"2 min", text:globalRules},
          {title:"A. Pecs + dos", time:"50–62 min", exercises:[
            ex("Deadlift", "3×6-10", "RPE 8 max", "Technique propre seulement. Pas d’échec."),
            ex("Decline Bench Press", "4×8-12", "RPE 7–8", "Option : DB Press plat si decline non disponible. Contrôle la descente, pousse fort sans rebond."),
            ex("Chest Dips", "4×AMRAP propre", "RPE 9 max", "Penche légèrement le torse."),
            ex("One-Arm DB Row", "4×8-12/côté", "RPE 7–8", "Tire le coude vers la hanche, pause en haut."),
            ex("Seated Cable Row", "4×10-12", "RPE 7–8", "Option : Ring Row si cable row non disponible. Dos droit, scapulas serrées."),
            ex("Cable Fly", "3×10-15", "Léger", "Option : DB Fly si cable non disponible. Contraction pecs, pas de douleur.")
          ]},
          {title:"Sortie", time:"5 min", text:"Respiration + mobilité lats/pecs. Noter toute fatigue lombaire."}
        ]
      },
      {
        id: "arnold_j5_epaules_bras_b",
        title: "Jour 5 — Épaules + Bras B",
        duration: "60–70 min",
        fatigue: "Moyenne",
        tags: ["Épaules", "Biceps", "Triceps", "Congestion", "Isolation"],
        goal: "Finition épaules/bras, détails, congestion.",
        intention: "Ajouter du volume propre sans chercher les charges maximales.",
        contenu: ["Arnold Press", "Front Raise", "Reverse Curl", "Overhead Tricep Extension", "Concentration Curl", "Tricep Pushdown"],
        meilleurChoix: "Fin de semaine, quand le but est congestion et détails plutôt que performance lourde.",
        caution: "RPE 7–8, 8–9 max sur isolation. Aucun élan. Réduire si douleur épaule/coude.",
        evaluation: { niveau:"Expérimental", raison:"Séance de finition plus locale, moins systémique que les grosses journées.", surveillance:"Épaules antérieures déjà sollicitées par les presses et dips." },
        blocks: [
          {title:"Règles du jour", time:"2 min", text:globalRules},
          {title:"A. Finition épaules + bras", time:"48–58 min", exercises:[
            ex("Arnold Press", "4×8-12", "RPE 7–8", "Rotation contrôlée, ne force pas l’amplitude si douleur."),
            ex("Front Raise", "4×10-12", "Léger", "Pas d’élan, arrêt hauteur épaule."),
            ex("Reverse Curl", "4×8-12", "RPE 7–8", "Poignets neutres, contrôle complet."),
            ex("Overhead Tricep Extension", "4×8-12", "RPE 7–8", "Étire les triceps, coudes serrés."),
            ex("Concentration Curl", "3×10-12", "RPE 8", "Strict, contraction forte en haut."),
            ex("Tricep Pushdown", "3×10-12", "RPE 8", "Coudes collés au corps, extension complète.")
          ]},
          {title:"Sortie", time:"5 min", text:"Pompage léger seulement si les coudes sont OK. Sinon mobilité et fin."}
        ]
      },
      {
        id: "arnold_j6_jambes_b",
        title: "Jour 6 — Jambes B",
        duration: "60–75 min",
        fatigue: "Élevée",
        tags: ["Jambes", "Quadriceps", "Fessiers", "Ischios", "Mollets"],
        goal: "Jambes avec emphase quadriceps, fessiers, ischios.",
        intention: "Deuxième stimulation jambes sans machine obligatoire, avec tempo et contrôle.",
        contenu: ["Front/Goblet Squat tempo", "Romanian Deadlift", "Bulgarian Split Squat", "Hamstring Walkout/Sliding Curl", "Standing Calf Raise"],
        meilleurChoix: "Dernière grosse séance avant dimanche repos ou mobilité légère.",
        caution: "Aucun échec sur squat tempo ou RDL. Si le bas du dos prend le relais, baisser la charge immédiatement.",
        evaluation: { niveau:"Expérimental", raison:"Remplace leg press et leg curl par variantes libres/locales distribuables.", surveillance:"Accumulation de fatigue jambes après Jambes A et Deadlift." },
        blocks: [
          {title:"Règles du jour", time:"2 min", text:globalRules},
          {title:"A. Jambes", time:"52–62 min", exercises:[
            ex("Front Squat", "4×10-15", "RPE 7–8", "Option : Goblet Squat avec tempo si front squat non souhaité. Remplace la leg press. Tempo contrôlé, posture droite."),
            ex("Romanian Deadlift", "4×8-12", "RPE 7–8", "Hanches loin derrière, dos neutre, charge maîtrisée."),
            ex("Bulgarian Split Squat", "3×10-12/jambe", "RPE 7–8", "Descente stable, pousse par le talon avant."),
            ex("Hamstring Walkout", "4×10-12", "RPE 8", "Option : Sliding Leg Curl. Remplace le leg curl machine. Garde les hanches hautes."),
            ex("Standing Calf Raise", "4×15-20", "RPE 8", "Amplitude complète, pause en haut.")
          ]},
          {title:"Sortie", time:"5–8 min", text:"Retour au calme hanches/ischios/mollets. Dimanche repos ou mobilité légère."}
        ]
      }
    ]
  };
})();
