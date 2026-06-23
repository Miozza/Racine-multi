// Racine — registre central des programmes
// Rôle : définir l’ordre et la visibilité des programmes dans l’app.
// Important : ce fichier ne charge PAS les scripts. Les scripts restent listés directement dans index.html pour garder Safari/iPhone stable.
//
// V1.6 : ajout d'un cycle spécialisé Strict Muscle-Up 10 semaines.
// Les programmes client de base sont dans racine_client_programs.js;
// les programmes sportifs sont dans racine_crossfit_programs.js;
// les cycles spécialisés sont dans leurs fichiers dédiés.

(function(){
  var legacyPrograms = [
    { id: "shoulders3d_v2",     file: "programs/epaules_3d_v2.js",       name: "Phase 1 — Épaules 3D v2 — Midi dense",     phase: 1, macroRole: "main",        macroStatus: "principal", durationWeeks: 6, minWeeks: 4, maxWeeks: 8 },
    { id: "shoulders3d",        file: "programs/epaules_3d.js",          name: "Phase 1 — Épaules 3D + Triceps",          phase: 1, macroRole: "alternate",   macroStatus: "ancienne version", durationWeeks: 6, minWeeks: 4, maxWeeks: 8 },
    { id: "hypertrophy_base",   file: "programs/hypertrophy_base.js",    name: "Phase 2 — Hypertrophie / Force Base",      phase: 2, macroRole: "main",        macroStatus: "principal", durationWeeks: 6, minWeeks: 5, maxWeeks: 8 },
    { id: "force_performance",  file: "programs/force_performance.js",   name: "Phase 3 — Force + Résistance musculaire",  phase: 3, macroRole: "main",        macroStatus: "carrefour", durationWeeks: 6, minWeeks: 5, maxWeeks: 8, branchAfter: ["competition_peak", "heritage225"] },
    { id: "competition_peak",   file: "programs/competition_peak.js",    name: "Phase 4 — Compétition CrossFit Peak",      phase: 4, macroRole: "main",        macroStatus: "objectif principal", durationWeeks: 8, minWeeks: 7, maxWeeks: 9 },
    { id: "hypertrophie_fesse", file: "programs/hypertrophie_fesse.js",  name: "Hypertrophie Fessiers — 4 semaines",       phase: 0, macroRole: "alternative", macroStatus: "comble un creux", durationWeeks: 4, minWeeks: 3, maxWeeks: 5, fillsGap: ["hypertrophie", "point faible", "variation"] },
    { id: "strength",           file: "programs/force.js",               name: "Force classique",                          phase: 0, macroRole: "buffer",      macroStatus: "tampon force", durationWeeks: 4, minWeeks: 3, maxWeeks: 5, fillsGap: ["force", "technique"] },
    { id: "heritage225",        file: "programs/heritage_225.js",        name: "Force longue durée — 12 semaines",          phase: 0, macroRole: "branch",      macroStatus: "branche après phase 3", durationWeeks: 12, minWeeks: 10, maxWeeks: 14, branchFrom: "force_performance" },
    { id: "arnold_split_beurt", file: "programs/arnold_split_beurt.js",  name: "Arnold Split — Hors-saison hypertrophie", phase: 0, macroRole: "buffer", macroStatus: "bloc hors-saison, durée ouverte", durationWeeks: 8, minWeeks: 4, maxWeeks: 16, fillsGap: ["hors-saison", "hypertrophie", "bodybuilding", "pause crossfit"] },
    { id: "general_strength_3d", file: "programs/general_strength_3d.js", name: "Force générale — 3 jours/semaine", phase: 0, macroRole: "alternative", macroStatus: "disponible pour 3 jours/semaine", durationWeeks: 6, minWeeks: 5, maxWeeks: 7, fillsGap: ["3 jours", "temps limité", "full body"] },
    { id: "general_hypertrophy_2d", file: "programs/general_hypertrophy_2d.js", name: "Hypertrophie générale — 2 jours/semaine", phase: 0, macroRole: "alternative", macroStatus: "disponible pour 2 jours/semaine", durationWeeks: 6, minWeeks: 5, maxWeeks: 7, fillsGap: ["2 jours", "temps très limité", "full body"] },
    { id: "general_hypertrophy_3d", file: "programs/general_hypertrophy_3d.js", name: "Hypertrophie générale — 3 jours/semaine", phase: 0, macroRole: "alternative", macroStatus: "disponible pour 3 jours/semaine", durationWeeks: 6, minWeeks: 5, maxWeeks: 7, fillsGap: ["3 jours", "temps limité", "full body", "hypertrophie"] }
  ];

  var clientPrograms = [
    { id:"client_beginner_foundation_2d", name:"Client — Débutant Fondation — 2 jours/semaine", objective:"débutant", frequency:2, audience:"débutant", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_beginner_foundation_3d", name:"Client — Débutant Fondation — 3 jours/semaine", objective:"débutant", frequency:3, audience:"débutant", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_hypertrophy_4d", name:"Client — Hypertrophie générale — 4 jours/semaine", objective:"hypertrophie", frequency:4, audience:"intermédiaire", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_hypertrophy_5d", name:"Client — Hypertrophie générale — 5 jours/semaine", objective:"hypertrophie", frequency:5, audience:"intermédiaire/avancé", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_strength_2d", name:"Client — Force générale — 2 jours/semaine", objective:"force", frequency:2, audience:"intermédiaire", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_strength_4d", name:"Client — Force générale — 4 jours/semaine", objective:"force", frequency:4, audience:"intermédiaire/avancé", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_recomposition_2d", name:"Client — Recomposition — 2 jours/semaine", objective:"recomposition", frequency:2, audience:"débutant/intermédiaire", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_recomposition_3d", name:"Client — Recomposition — 3 jours/semaine", objective:"recomposition", frequency:3, audience:"débutant/intermédiaire", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_recomposition_4d", name:"Client — Recomposition — 4 jours/semaine", objective:"recomposition", frequency:4, audience:"intermédiaire", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_hybrid_performance_3d", name:"Client — Performance hybride — 3 jours/semaine", objective:"force + moteur", frequency:3, audience:"intermédiaire", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_hybrid_performance_4d", name:"Client — Performance hybride — 4 jours/semaine", objective:"force + moteur", frequency:4, audience:"intermédiaire/avancé", status:"catalogue client", file:"programs/racine_client_programs.js" },
    { id:"client_hybrid_performance_5d", name:"Client — Performance hybride — 5 jours/semaine", objective:"force + moteur", frequency:5, audience:"avancé", status:"catalogue client", file:"programs/racine_client_programs.js" },

    { id:"client_haltero_crossfit_3d", name:"Client — Haltéro CrossFit — 3 jours/semaine", objective:"haltéro crossfit", frequency:3, audience:"intermédiaire", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_haltero_crossfit_4d", name:"Client — Haltéro CrossFit — 4 jours/semaine", objective:"haltéro crossfit", frequency:4, audience:"intermédiaire/avancé", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_haltero_crossfit_5d", name:"Client — Haltéro CrossFit — 5 jours/semaine", objective:"haltéro crossfit", frequency:5, audience:"avancé", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_rx_crossfit_4d", name:"Client — Performance RX CrossFit — 4 jours/semaine", objective:"performance RX crossfit", frequency:4, audience:"intermédiaire/avancé", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_rx_crossfit_5d", name:"Client — Performance RX CrossFit — 5 jours/semaine", objective:"performance RX crossfit", frequency:5, audience:"avancé", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_metcon_prep_2d", name:"Client — Préparation Metcon — 2 jours/semaine", objective:"préparation metcon", frequency:2, audience:"débutant/intermédiaire", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_metcon_prep_3d", name:"Client — Préparation Metcon — 3 jours/semaine", objective:"préparation metcon", frequency:3, audience:"débutant/intermédiaire", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_metcon_prep_4d", name:"Client — Préparation Metcon — 4 jours/semaine", objective:"préparation metcon", frequency:4, audience:"intermédiaire", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" }
  ].map(function(item){
    return Object.assign({
      phase:0,
      macroRole:"client_catalog",
      macroStatus:item.status,
      durationWeeks:6,
      minWeeks:5,
      maxWeeks:7,
      fillsGap:[item.frequency + " jours", item.objective, item.audience]
    }, item);
  });

  var specializedPrograms = [
    {
      id:"strict_muscle_up_10w",
      name:"Spécialisé — Strict Muscle-Up — 10 semaines / 4 jours",
      objective:"strict muscle-up",
      frequency:4,
      audience:"intermédiaire/avancé avec 10 strict pull-ups",
      status:"cycle spécialisé",
      file:"programs/strict_muscle_up_cycle.js",
      phase:0,
      macroRole:"specialized_cycle",
      macroStatus:"objectif technique avancé",
      durationWeeks:10,
      minWeeks:10,
      maxWeeks:10,
      fillsGap:["strict muscle-up", "rings", "gymnastique", "tirage strict", "4 jours"]
    }
  ];

  window.COACH_BERTIN_PROGRAM_INDEX = legacyPrograms.concat(clientPrograms).concat(specializedPrograms);

  window.COACH_BERTIN_MACROCYCLE = {
    preferredPhase1: "shoulders3d_v2",
    mainRoute: ["shoulders3d_v2", "hypertrophy_base", "force_performance", "competition_peak"],
    phase1Alternates: ["shoulders3d"],
    branchRoutes: { heritage225: ["shoulders3d_v2", "hypertrophy_base", "force_performance", "heritage225"] },
    gapFillers: [
      "hypertrophie_fesse", "strength", "general_strength_3d", "general_hypertrophy_2d", "general_hypertrophy_3d",
      "client_beginner_foundation_2d", "client_beginner_foundation_3d",
      "client_hypertrophy_4d", "client_hypertrophy_5d",
      "client_strength_2d", "client_strength_4d",
      "client_recomposition_2d", "client_recomposition_3d", "client_recomposition_4d",
      "client_hybrid_performance_3d", "client_hybrid_performance_4d", "client_hybrid_performance_5d",
      "client_haltero_crossfit_3d", "client_haltero_crossfit_4d", "client_haltero_crossfit_5d",
      "client_rx_crossfit_4d", "client_rx_crossfit_5d",
      "client_metcon_prep_2d", "client_metcon_prep_3d", "client_metcon_prep_4d",
      "strict_muscle_up_10w"
    ],
    branchAfterPhase3: ["competition_peak", "heritage225"]
  };
})();
