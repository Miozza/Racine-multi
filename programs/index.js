// Racine — registre central des programmes
// Rôle : définir l'ordre et la visibilité des programmes dans l'app.
// Important : ce fichier ne charge PAS les scripts. Les scripts restent listés directement dans index.html pour garder Safari/iPhone stable.
//
// Champ visibility :
//   "public"  → disponible à tous les profils sans permission explicite
//   "private" → visible seulement si profile.programPermissions contient l'id
//
// V1.7 : ajout programmes perso Bertin (private) + système visibility.

(function(){
  var legacyPrograms = [
    { id: "shoulders3d_v2",     file: "programs/epaules_3d_v2.js",       name: "Phase 1 — Épaules 3D v2 — Midi dense",     phase: 1, macroRole: "main",        macroStatus: "principal",             durationWeeks: 6,  minWeeks: 4,  maxWeeks: 8,  visibility: "private" },
    { id: "shoulders3d",        file: "programs/epaules_3d.js",          name: "Phase 1 — Épaules 3D + Triceps",           phase: 1, macroRole: "alternate",   macroStatus: "ancienne version",      durationWeeks: 6,  minWeeks: 4,  maxWeeks: 8,  visibility: "private" },
    { id: "hypertrophy_base",   file: "programs/hypertrophy_base.js",    name: "Phase 2 — Hypertrophie / Force Base",       phase: 2, macroRole: "main",        macroStatus: "principal",             durationWeeks: 6,  minWeeks: 5,  maxWeeks: 8,  visibility: "public", objective: "hypertrophie", frequency: 4, suggestedNext: ["force_performance", "client_strength_4d"] },
    { id: "force_performance",  file: "programs/force_performance.js",   name: "Phase 3 — Force + Résistance musculaire",   phase: 3, macroRole: "main",        macroStatus: "carrefour",             durationWeeks: 6,  minWeeks: 5,  maxWeeks: 8,  visibility: "public", branchAfter: ["competition_peak", "heritage225"], objective: "force", frequency: 4, suggestedNext: ["competition_peak", "client_hybrid_performance_4d"] },
    { id: "competition_peak",   file: "programs/competition_peak.js",    name: "Phase 4 — Compétition CrossFit Peak",       phase: 4, macroRole: "main",        macroStatus: "objectif principal",    durationWeeks: 8,  minWeeks: 7,  maxWeeks: 9,  visibility: "public", objective: "performance RX", frequency: 4, suggestedNext: ["client_rx_crossfit_5d"] },
    { id: "hypertrophie_fesse", file: "programs/hypertrophie_fesse.js",  name: "Hypertrophie Fessiers — 4 semaines",        phase: 0, macroRole: "alternative", macroStatus: "comble un creux",       durationWeeks: 4,  minWeeks: 3,  maxWeeks: 5,  visibility: "public", fillsGap: ["hypertrophie", "point faible", "variation"], objective: "hypertrophie", frequency: 4, suggestedNext: ["general_hypertrophy_3d", "client_hypertrophy_4d"] },
    { id: "strength",           file: "programs/force.js",               name: "Force classique",                           phase: 0, macroRole: "buffer",      macroStatus: "tampon force",           durationWeeks: 4,  minWeeks: 3,  maxWeeks: 5,  visibility: "public", fillsGap: ["force", "technique"], objective: "force", frequency: 4, suggestedNext: ["general_strength_3d", "client_strength_4d"] },
    { id: "heritage225",        file: "programs/heritage_225.js",        name: "Force longue durée — 12 semaines",          phase: 0, macroRole: "branch",      macroStatus: "branche après phase 3", durationWeeks: 12, minWeeks: 10, maxWeeks: 14, visibility: "private", branchFrom: "force_performance" },
    { id: "arnold_split_beurt", file: "programs/arnold_split_beurt.js",  name: "Arnold Split — Hors-saison hypertrophie",   phase: 0, macroRole: "buffer",      macroStatus: "bloc hors-saison",      durationWeeks: 8,  minWeeks: 4,  maxWeeks: 16, visibility: "private", fillsGap: ["hors-saison", "hypertrophie", "bodybuilding", "pause crossfit"] },
    { id: "general_strength_3d",     file: "programs/general_strength_3d.js",     name: "Force générale — 3 jours/semaine",           phase: 0, macroRole: "alternative", macroStatus: "3 jours/semaine",  durationWeeks: 6, minWeeks: 5, maxWeeks: 7, visibility: "public", fillsGap: ["3 jours", "temps limité", "full body"], objective: "force", frequency: 3, suggestedNext: ["client_strength_4d", "client_hybrid_performance_3d"] },
    { id: "general_hypertrophy_2d",  file: "programs/general_hypertrophy_2d.js",  name: "Hypertrophie générale — 2 jours/semaine",    phase: 0, macroRole: "alternative", macroStatus: "2 jours/semaine",  durationWeeks: 6, minWeeks: 5, maxWeeks: 7, visibility: "public", fillsGap: ["2 jours", "temps très limité", "full body"], objective: "hypertrophie", frequency: 2, suggestedNext: ["client_strength_2d", "client_recomposition_2d"] },
    { id: "general_hypertrophy_3d",  file: "programs/general_hypertrophy_3d.js",  name: "Hypertrophie générale — 3 jours/semaine",    phase: 0, macroRole: "alternative", macroStatus: "3 jours/semaine",  durationWeeks: 6, minWeeks: 5, maxWeeks: 7, visibility: "public", fillsGap: ["3 jours", "temps limité", "full body", "hypertrophie"], objective: "hypertrophie", frequency: 3, suggestedNext: ["general_strength_3d", "client_hypertrophy_4d"] }
  ];

  // ─── Programmes personnels Bertin (private) ───────────────────────────────
  // Non visibles aux futurs clients. Activer via profile.programPermissions.
  var bertinPrivatePrograms = [
    { id: "shoulders3d_press225_phase2", file: "programs/epaules_3d_press225_phase2.js", name: "Phase 2 — Épaules 3D + Press 225",          phase: 2, macroRole: "main",     macroStatus: "principal Bertin", durationWeeks: 6,  minWeeks: 6,  maxWeeks: 8,  visibility: "private" },
    { id: "posture",                     file: "programs/posture_cyphose.js",             name: "Posture / Cyphose",                          phase: 0, macroRole: "buffer",   macroStatus: "tampon posture",   durationWeeks: 4,  minWeeks: 2,  maxWeeks: 4,  visibility: "private", fillsGap: ["posture", "récupération", "mobilité"] },
    { id: "strict_muscle_up_personnel", file: "programs/strict_muscle_up_personnel.js",  name: "Strict Muscle-Up Personnel — 12 semaines",  phase: 0, macroRole: "buffer",   macroStatus: "skill perso",      durationWeeks: 12, minWeeks: 12, maxWeeks: 12, visibility: "private", fillsGap: ["muscle-up", "gymnastique", "anneaux", "skill"] },
    { id: "arnold_split_2026_adapte",   file: "programs/arnold_split_2026_adapte.js",    name: "Arnold Split 2026 Adapté",                   phase: 0, macroRole: "buffer",   macroStatus: "hors-saison perso",durationWeeks: 8,  minWeeks: 4,  maxWeeks: 16, visibility: "private", fillsGap: ["hors-saison", "hypertrophie", "bodybuilding"] },
    { id: "arnold_split_strict",        file: "programs/arnold_split_strict.js",         name: "Arnold Split Strict",                        phase: 0, macroRole: "buffer",   macroStatus: "hors-saison perso",durationWeeks: 8,  minWeeks: 4,  maxWeeks: 16, visibility: "public",  fillsGap: ["hors-saison", "hypertrophie", "bodybuilding", "fréquence variable"], objective: "hypertrophie", frequency: 6, suggestedNext: ["client_strength_4d", "client_hybrid_performance_4d"] },
    { id: "hypertrophie_fesse_stephanie", file: "programs/hypertrophie_fesse_stephanie.js", name: "Hypertrophie Fessiers — Stéphanie",       phase: 0, macroRole: "alternative", macroStatus: "profil Stéphanie", durationWeeks: 4, minWeeks: 3, maxWeeks: 5, visibility: "private", fillsGap: ["hypertrophie", "fessiers", "stephanie"] }
  ];

  var clientPrograms = [
    { id:"client_beginner_foundation_2d", suggestedNext:["general_hypertrophy_2d", "client_strength_2d", "client_recomposition_2d"],  name:"Client — Débutant Fondation — 2 jours/semaine",         objective:"débutant",          frequency:2, audience:"débutant",               status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_beginner_foundation_3d", suggestedNext:["general_hypertrophy_3d", "general_strength_3d", "client_recomposition_3d"],  name:"Client — Débutant Fondation — 3 jours/semaine",         objective:"débutant",          frequency:3, audience:"débutant",               status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_hypertrophy_4d", suggestedNext:["client_strength_4d", "arnold_split_strict"],          name:"Client — Hypertrophie générale — 4 jours/semaine",      objective:"hypertrophie",      frequency:4, audience:"intermédiaire",          status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_hypertrophy_5d", suggestedNext:["client_hybrid_performance_5d"],          name:"Client — Hypertrophie générale — 5 jours/semaine",      objective:"hypertrophie",      frequency:5, audience:"intermédiaire/avancé",   status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_strength_2d", suggestedNext:["general_hypertrophy_2d", "client_recomposition_2d"],             name:"Client — Force générale — 2 jours/semaine",             objective:"force",             frequency:2, audience:"intermédiaire",          status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_strength_4d", suggestedNext:["client_hybrid_performance_4d", "client_hypertrophy_4d"],             name:"Client — Force générale — 4 jours/semaine",             objective:"force",             frequency:4, audience:"intermédiaire/avancé",   status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_recomposition_2d", suggestedNext:["client_strength_2d", "general_hypertrophy_2d"],        name:"Client — Recomposition — 2 jours/semaine",              objective:"recomposition",     frequency:2, audience:"débutant/intermédiaire", status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_recomposition_3d", suggestedNext:["general_hypertrophy_3d", "client_hybrid_performance_3d"],        name:"Client — Recomposition — 3 jours/semaine",              objective:"recomposition",     frequency:3, audience:"débutant/intermédiaire", status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_recomposition_4d", suggestedNext:["client_hypertrophy_4d", "client_strength_4d"],        name:"Client — Recomposition — 4 jours/semaine",              objective:"recomposition",     frequency:4, audience:"intermédiaire",          status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_hybrid_performance_3d", suggestedNext:["client_haltero_crossfit_3d", "client_strength_4d"],   name:"Client — Performance hybride — 3 jours/semaine",        objective:"force + moteur",    frequency:3, audience:"intermédiaire",          status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_hybrid_performance_4d", suggestedNext:["client_haltero_crossfit_4d", "client_rx_crossfit_4d"],   name:"Client — Performance hybride — 4 jours/semaine",        objective:"force + moteur",    frequency:4, audience:"intermédiaire/avancé",   status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_hybrid_performance_5d", suggestedNext:["client_haltero_crossfit_5d", "client_rx_crossfit_5d"],   name:"Client — Performance hybride — 5 jours/semaine",        objective:"force + moteur",    frequency:5, audience:"avancé",                 status:"catalogue client",  file:"programs/racine_client_programs.js" },
    { id:"client_haltero_crossfit_3d", suggestedNext:["client_rx_crossfit_4d", "client_hybrid_performance_4d"],     name:"Client — Haltéro CrossFit — 3 jours/semaine",           objective:"haltéro crossfit",  frequency:3, audience:"intermédiaire",          status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_haltero_crossfit_4d", suggestedNext:["client_rx_crossfit_4d"],     name:"Client — Haltéro CrossFit — 4 jours/semaine",           objective:"haltéro crossfit",  frequency:4, audience:"intermédiaire/avancé",   status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_haltero_crossfit_5d", suggestedNext:["client_rx_crossfit_5d", "competition_peak"],     name:"Client — Haltéro CrossFit — 5 jours/semaine",           objective:"haltéro crossfit",  frequency:5, audience:"avancé",                 status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_rx_crossfit_4d", suggestedNext:["competition_peak", "client_rx_crossfit_5d"],          name:"Client — Performance RX CrossFit — 4 jours/semaine",    objective:"performance RX",    frequency:4, audience:"intermédiaire/avancé",   status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_rx_crossfit_5d", suggestedNext:["competition_peak"],          name:"Client — Performance RX CrossFit — 5 jours/semaine",    objective:"performance RX",    frequency:5, audience:"avancé",                 status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_metcon_prep_2d", suggestedNext:["client_haltero_crossfit_3d", "client_hybrid_performance_3d"],          name:"Client — Préparation Metcon — 2 jours/semaine",         objective:"préparation metcon",frequency:2, audience:"débutant/intermédiaire", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_metcon_prep_3d", suggestedNext:["client_haltero_crossfit_3d", "client_rx_crossfit_4d"],          name:"Client — Préparation Metcon — 3 jours/semaine",         objective:"préparation metcon",frequency:3, audience:"débutant/intermédiaire", status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" },
    { id:"client_metcon_prep_4d", suggestedNext:["client_haltero_crossfit_4d", "client_rx_crossfit_4d"],          name:"Client — Préparation Metcon — 4 jours/semaine",         objective:"préparation metcon",frequency:4, audience:"intermédiaire",          status:"catalogue sportif", file:"programs/racine_crossfit_programs.js" }
  ].map(function(item){
    return Object.assign({
      phase: 0,
      macroRole: "client_catalog",
      macroStatus: item.status,
      durationWeeks: 6,
      minWeeks: 5,
      maxWeeks: 7,
      visibility: "public",
      fillsGap: [item.frequency + " jours", item.objective, item.audience]
    }, item);
  });

  var specializedPrograms = [
    {
      id: "strict_muscle_up_10w",
      suggestedNext:["client_haltero_crossfit_4d", "client_hybrid_performance_4d"],
      name: "Spécialisé — Strict Muscle-Up — 10 semaines / 4 jours",
      objective: "strict muscle-up",
      frequency: 4,
      audience: "intermédiaire/avancé avec 10 strict pull-ups",
      status: "cycle spécialisé",
      file: "programs/strict_muscle_up_cycle.js",
      phase: 0,
      macroRole: "specialized_cycle",
      macroStatus: "objectif technique avancé",
      durationWeeks: 10,
      minWeeks: 10,
      maxWeeks: 10,
      visibility: "public",
      fillsGap: ["strict muscle-up", "rings", "gymnastique", "tirage strict", "4 jours"]
    }
  ];

  window.COACH_BERTIN_PROGRAM_INDEX = legacyPrograms
    .concat(bertinPrivatePrograms)
    .concat(clientPrograms)
    .concat(specializedPrograms);

  // IDs privés Bertin — référence pour création du profil Bertin
  window.BERTIN_PRIVATE_PROGRAM_IDS = bertinPrivatePrograms.map(function(p){ return p.id; });

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

  // Macrocycle personnalisé Bertin — écrase le défaut générique pour ce profil
  window.BERTIN_MACROCYCLE_OVERRIDE = {
    targetLabel: "Compétition janvier 2027",
    targetDate: "2027-01-15",
    preferredPhase1: "shoulders3d_v2",
    mainRoute: ["shoulders3d_v2", "shoulders3d_press225_phase2", "force_performance", "competition_peak"],
    phase1Alternates: ["shoulders3d"],
    branchRoutes: { heritage225: ["shoulders3d_v2", "shoulders3d_press225_phase2", "force_performance", "heritage225"] },
    gapFillers: ["hypertrophie_fesse", "posture", "strength", "strict_muscle_up_personnel"],
    branchAfterPhase3: ["competition_peak", "heritage225"]
  };
})();
