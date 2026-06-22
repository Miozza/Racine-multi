// Coach Beurt — registre central des programmes
// Rôle : définir l’ordre et la visibilité des programmes dans l’app.
// Important : ce fichier ne charge PAS les scripts. Les scripts restent listés directement dans index.html pour garder Safari/iPhone stable.
//
// Modifier un programme existant : modifier seulement son fichier dans /programs/.
// Ajouter un programme : créer le fichier dans /programs/, ajouter son entrée ici, puis ajouter son script dans index.html.
// Supprimer un programme : retirer son entrée ici, retirer son script dans index.html, puis supprimer son fichier.
// Ce fichier ne doit pas injecter d’UI PC, de styles ou de handlers runtime.

(function(){
  window.COACH_BERTIN_PROGRAM_INDEX = [
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

  window.COACH_BERTIN_MACROCYCLE = {
    preferredPhase1: "shoulders3d_v2",
    mainRoute: ["shoulders3d_v2", "hypertrophy_base", "force_performance", "competition_peak"],
    phase1Alternates: ["shoulders3d"],
    branchRoutes: { heritage225: ["shoulders3d_v2", "hypertrophy_base", "force_performance", "heritage225"] },
    gapFillers: ["hypertrophie_fesse", "strength", "general_strength_3d", "general_hypertrophy_2d", "general_hypertrophy_3d"],
    branchAfterPhase3: ["competition_peak", "heritage225"]
  };
})();