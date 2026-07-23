// ─── Script de migration Bertin — one-shot ────────────────────────────────────
// À exécuter UNE SEULE FOIS dans la console du navigateur après déploiement.
// Crée le profil Bertin avec toutes ses permissions privées et migre les données
// de l'ancienne installation mono (Coach-Beurt) vers le nouveau profil multi.
//
// Usage console :
//   migrateBertin();        → migration complète depuis l'ancien localStorage mono
//   migrateBertin(false);   → crée le profil vide sans migration de données
//
// IMPORTANT : ne modifie pas les fichiers data/ du repo. Les données migrent
// vers localStorage du profil, pas vers des fichiers JSON statiques.
// ─────────────────────────────────────────────────────────────────────────────

// Trace de migration : journalisée dans CoachLog (consultable dans Diagnostic
// app) plutôt qu'en console pour garder une prod silencieuse.
function migrateLog(){
  var msg = Array.prototype.slice.call(arguments).join(" ");
  if(window.CoachLog && CoachLog.info) CoachLog.info("migrate_bertin", {message: msg});
}

window.migrateBertin = function(migrateData) {
  migrateData = (migrateData !== false);

  if(!window.CoachProfiles) {
    console.error("[migrateBertin] CoachProfiles non disponible.");
    return null;
  }

  // Vérifier si un profil Bertin existe déjà
  var existing = CoachProfiles.list().filter(function(p){ return p.name === "Bertin"; });
  if(existing.length) {
    console.warn("[migrateBertin] Un profil Bertin existe déjà (id:", existing[0].id, "). Abandon.");
    return existing[0].id;
  }

  // Tous les programmes privés disponibles
  var privatePerms = window.BERTIN_PRIVATE_PROGRAM_IDS
    ? window.BERTIN_PRIVATE_PROGRAM_IDS.slice()
    : [
        "shoulders3d_press225_phase2",
        "posture",
        "strict_muscle_up_personnel",
        "arnold_split_2026_adapte",
        "hypertrophie_fesse_stephanie"
      ];

  // Créer le profil Bertin
  var profileId = CoachProfiles.create({
    name: "Bertin",
    experienceLevel: "avance",
    bodyweightLb: 205,
    aggressiveness: 1.0,
    programPermissions: privatePerms
  });

  // Ajouter les métadonnées du macrocycle override et de la date de compétition
  CoachProfiles.update(profileId, {
    competitionDateIso: "2027-01-15",
    macrocycleOverrideKey: "BERTIN_MACROCYCLE_OVERRIDE",
    onboarded: true
  });

  migrateLog("[migrateBertin] Profil Bertin créé (id:", profileId, ")");
  migrateLog("[migrateBertin] Permissions privées:", privatePerms);

  if(!migrateData) {
    migrateLog("[migrateBertin] Migration de données ignorée (migrateData=false).");
    CoachProfiles.setActive(profileId);
    return profileId;
  }

  // ─── Migration des données depuis l'ancien localStorage mono ───────────────
  var legacyState = null;
  var legacyCharges = null;

  try {
    // Tenter les anciennes clés Coach-Beurt dans l'ordre
    var stateKeys = ["coachBertinState", "coachBertinV46", "coachBertinV43", "coachBertinV41"];
    for(var i = 0; i < stateKeys.length; i++) {
      var raw = localStorage.getItem(stateKeys[i]);
      if(raw) { legacyState = JSON.parse(raw); break; }
    }
    var chargeKeys = ["coachBertinCustomCharges", "coachBertinCustomChargesV46"];
    for(var j = 0; j < chargeKeys.length; j++) {
      var rawC = localStorage.getItem(chargeKeys[j]);
      if(rawC) { legacyCharges = JSON.parse(rawC); break; }
    }
  } catch(e) {
    console.warn("[migrateBertin] Erreur lecture legacy state:", e);
  }

  if(!legacyState) {
    console.warn("[migrateBertin] Aucun état legacy Coach-Beurt trouvé dans localStorage.");
    migrateLog("[migrateBertin] Profil créé sans données historiques.");
    CoachProfiles.setActive(profileId);
    return profileId;
  }

  // Écrire dans les clés du nouveau profil
  var keys = CoachProfiles.storageKeysFor(profileId);
  try {
    localStorage.setItem(keys.state, JSON.stringify(legacyState));
    migrateLog("[migrateBertin] État migré :", Object.keys(legacyState.movements || {}).length, "mouvements,", (legacyState.history || []).length, "séances.");
  } catch(e) {
    console.error("[migrateBertin] Erreur écriture état migré:", e);
  }

  if(legacyCharges) {
    try {
      localStorage.setItem(keys.charges, JSON.stringify(legacyCharges));
      migrateLog("[migrateBertin] Charges personnalisées migrées.");
    } catch(e) {
      console.warn("[migrateBertin] Erreur migration charges:", e);
    }
  }

  CoachProfiles.setActive(profileId);
  migrateLog("[migrateBertin] ✅ Migration complète. Profil Bertin actif.");
  migrateLog("[migrateBertin] Recharge la page pour appliquer.");
  return profileId;
};


// ─── Import depuis fichiers JSON (si pas de localStorage legacy) ──────────────
// UTILITÉ RÉELLE : outil console MANUEL, volontairement appelé par personne dans
// l'app. Filet de récupération à usage unique : recréer le profil Bertin à partir
// d'exports data/ de l'ancien Coach-Beurt mono quand le localStorage legacy est
// absent (nouvel appareil, cache effacé, migration ratée). À conserver — comme
// les données Bertin ne sont pas récupérables autrement, le retrait de cette
// fonction ferme la seule porte de restauration depuis fichiers.
//
// Usage : migrateBertinFromFiles(athleteStateObj, cycleStateObj, resultatsArr, chargesObj)
// Les objets viennent des fichiers data/ de Coach-Beurt mono collés en console.
//
// Exemple rapide :
//   fetch('data/athlete_state.json').then(r=>r.json()).then(as =>
//     fetch('data/cycle_state.json').then(r=>r.json()).then(cs =>
//       fetch('data/resultats.json').then(r=>r.json()).then(res =>
//         migrateBertinFromFiles(as, cs, res, null)
//   )));
//
window.migrateBertinFromFiles = function(athleteState, cycleState, resultats, customCharges) {
  if(!window.CoachProfiles) {
    console.error("[migrateBertinFromFiles] CoachProfiles non disponible.");
    return null;
  }

  // Créer le profil si absent
  var profileId = window.migrateBertin(false);
  if(!profileId) return null;

  // Construire le state complet depuis les 3 fichiers JSON mono
  var keys = CoachProfiles.storageKeysFor(profileId);

  // Fusionner athlete_state + cycle_state + resultats dans le format state multi
  var merged = {};
  if(cycleState)    merged = Object.assign(merged, cycleState);
  if(athleteState)  merged.athleteState = athleteState;
  if(resultats)     merged.history = Array.isArray(resultats) ? resultats : [];

  try {
    localStorage.setItem(keys.state, JSON.stringify(merged));
    migrateLog("[migrateBertinFromFiles] State écrit:",
      Object.keys((athleteState && athleteState.movements) || {}).length, "mouvements,",
      (merged.history || []).length, "séances."
    );
  } catch(e) {
    console.error("[migrateBertinFromFiles] Erreur écriture state:", e);
    return null;
  }

  if(customCharges) {
    try {
      localStorage.setItem(keys.charges, JSON.stringify(customCharges));
      migrateLog("[migrateBertinFromFiles] Charges personnalisées migrées.");
    } catch(e) {
      console.warn("[migrateBertinFromFiles] Erreur charges:", e);
    }
  }

  CoachProfiles.setActive(profileId);
  migrateLog("[migrateBertinFromFiles] ✅ Migration depuis fichiers complète. Recharge la page.");
  return profileId;
};
