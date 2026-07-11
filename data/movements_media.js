// Racine — Liens vidéo par mouvement
// Clé = nom exact du mouvement tel qu'utilisé dans programs/tutorials.js (COACH_BERTIN_TUTORIALS)
// Valeur = ID YouTube (pas l'URL complète) — null si pas encore trouvé
// Sources prioritaires : @CentralAthleteatx, @marcusfilly, @leboxlasarre6457
// Fallback utilisé si aucune des 3 ne couvrait le mouvement : Catalyst Athletics (Greg Everett,
// référence oly weightlifting) ou CrossFit officiel — indiqué en commentaire.

window.COACH_BERTIN_MOVEMENT_VIDEOS = {

  // ── Priorité haute — technique/olympique/risque ──────────────────────────
  "Front Squat": "Qh-u0nNBDK4",              // Marcus Filly
  "Power Clean": "aiWaW-xT_8I",              // Central Athlete
  "Tall Muscle Clean": "rebjWdAlVjA",        // Catalyst Athletics (fallback)
  "Clean Pull": "xx8WkFrST2Y",               // Catalyst Athletics (fallback)
  "Back Squat": "ultWZbUMPL8",               // CrossFit officiel (fallback)
  "Deadlift": "jZ_vWXiBHi4",                 // Marcus Filly
  "Romanian Deadlift": "_U9KjljQyd0",        // Catalyst Athletics (fallback) — clé tutorials.js de ce dépôt (= "RDL" chez Coach-Beurt)
  "Stiff-Leg Deadlift": "QbmaRSO1sIM",       // Catalyst Athletics (fallback)
  "Bulgarian Split Squat": "G0Mo2LF8uLU",    // Marcus Filly (Rear Foot Elevated Split Squat)
  "Arnold Press": "R-RTgOxrj88",             // Marcus Filly (Seated Arnold Press)

  // ── Priorité moyenne — mobilité/correctifs (kyphose) ─────────────────────
  "Band External Rotation — elbow tucked": "ybNV36DoRfY", // générique S&C (fallback)
  "Band Internal Rotation — elbow tucked": "MfjCK5_Ss5g", // générique S&C (fallback)
  "Serratus Wall Slide": "eI7IHxvhA3k",                   // générique mobilité (fallback)
  "Serratus Cable Punch": "YoWwzkCULHQ",                  // générique (fallback) — "Split Stance Cable Serratus Punch"
  "Scap Push-up": "LeMk15TN0No",                          // athletic trainer demo (fallback)
  "Scap Pull-up": "-ZIpSoTRsuE",                          // tutoriel complet (fallback)
  "Wall Slide": "YIvNRUJp7_E",                            // générique (fallback)
  "Front Rack Stretch": "QVjxU5YePCw",                    // WOD Nation coach, CrossFit Chiang Mai (fallback)
  "World's Greatest Stretch": "-CiWQ2IvY34",              // Squat University (fallback)
  "Open Book": "rDviWORCWEw",                             // générique physio (fallback)
  "Trap-3 Raise": "bvFTLE99Nhw",                           // générique (fallback)

  // ── Priorité moyenne — technique spécifique/moins commun ─────────────────
  "Dead Bug": "UBa7wBucN-4",                              // générique (fallback)
  "Pallof Press": "xeFp4MXad98",                          // générique (fallback)
  "Landmine Press": "ORoOn93dnh4",                        // Marcus Filly (Half Kneeling Landmine Press)
  "Hamstring Walkout": "OzdSDZZPtdE",                     // générique (fallback)
  "Ankle Rocks": "CbhPRzBZHgQ",                           // générique mobilité (fallback)

  // ══ 2e passe (V4.5.4) — Functional Bodybuilding = chaîne secondaire de Marcus Filly ══

  // ── Priorité haute — polyarticulaires chargés / technique ────────────────
  "Decline Bench Press": "LfyQBUKR8SE",       // ScottHermanFitness (fallback) — barbell
  "Incline DB Press": "wCrNcBhdfbE",          // Marcus Filly (Incline Dumbbell Bench Press)
  "Strict Press": "_aISMzimYEA",              // Functional Bodybuilding (Strict Press)
  "Seated DB Press": "3GFZpOYu0pQ",           // Marcus Filly (Seated Dumbbell Press)
  "DB Shoulder Press": "22gQUcvcW1o",         // Marcus Filly (Dumbbell Strict Press, debout)
  "Barbell Row": "UNyeMXO481I",               // Functional Bodybuilding (Bent Over Row Pronated)
  "Pull-Up": "0wScGKPC5fA",                   // Central Athlete (Pronated Pull-Up)
  "Weighted Pull-up": "_U5vqJocrbA",          // Central Athlete (Weighted Strict Pronated Pull-Up)
  "Dips": "LXkp2QJ5ASo",                      // Marcus Filly (Strict Bar Dip)
  "Chest Dips": "yN6Q1UI_xkE",                // Jeff Nippard (fallback) — dips version pecs
  "Goblet Squat": "f-Vf2yRRqOg",              // Marcus Filly

  // ── Priorité moyenne — tirages, unilatéral, jambes ───────────────────────
  "Ring Row Strict": "EN6ubEkzMC0",           // Marcus Filly (Ring Row)
  "One-Arm DB Row": "xl1YiqQY2vA",            // Marcus Filly (Single Arm Dumbbell Row)
  "Seated Cable Row": "UCXxvVItLoM",          // Renaissance Periodization (fallback)
  "Lunges": "ah4av3OEw-4",                    // Marcus Filly (Walking Lunge)
  "Standing Calf Raise": "ADIDoYt_ko4",       // OPEX Fitness (fallback) — DB Standing Calf Raise
  "Farmer Carry": "9539aIvAhm4",              // Functional Bodybuilding (DB Farmers Carry)
  "Glute Bridge": "wMEoGwkk650",              // Marcus Filly (Glute Bridges)

  // ── Priorité moyenne — épaules ciblées / posture ─────────────────────────
  "Face Pull": "0Po47vvj9g4",                 // PureGym (fallback) — Cable Face Pulls
  "Lateral Raise DB": "n_r-ROwHkdA",          // Functional Bodybuilding (Shoulder Lateral Raise)
  "Lateral Raise câble bas": "fxy-NNoyt9E",   // Lifting Lindsay (fallback) — Low Pulley, Behind the Back
  "Cable Lateral Raise": "BGw_YA3KiHs",       // Leo Fanner (fallback) — guide complet
  "Rear Delt Fly DB": "hf7jnF45N_I",          // Functional Bodybuilding (Bent Over Reverse Dumbbell Fly)
  "Rear Delt Fly câble bas": "Fsz8Up0Pp9w",   // Primal Strength (fallback) — Low Cable Rear Delt Fly
  "Front Raise": "xagEKj2yDc8",               // Functional Bodybuilding (Dumbbell Shoulder Front Raise)

  // ── Priorité basse — isolation bras/pecs ─────────────────────────────────
  "DB Curl": "HnHuhf4hEWY",                   // Functional Bodybuilding (Dual Dumbbell Bicep Curl)
  "Barbell Curl": "JnLFSFurrqQ",              // Renaissance Periodization (fallback) — Normal Grip
  "Hammer Curls": "fM0TQLoesLs",              // Functional Bodybuilding (Hammer Curls)
  "Concentration Curl": "Jvj2wV0vOYU",        // ScottHermanFitness (fallback)
  "Reverse Curl": "ypfd1kaI1AU",              // Buff Dudes (fallback) — barbell, avant-bras
  "Skull Crusher": "l3rHYPtMUo8",             // Renaissance Periodization (fallback) — Barbell Skullcrusher
  "Overhead Tricep Extension": "4--u52sHZPs", // Functional Bodybuilding (Dumbbell Overhead Tricep Extension)
  "Tricep Pushdown": "6Fzep104f0s",           // Renaissance Periodization (fallback) — Cable Triceps Pushdown
  "Triceps Rope Pushdown": "qHDrQglWgS4",     // Buff Dudes (fallback) — Cable Rope Pushdown
  "Overhead Rope Extension": "mRozZKkGIfg",   // Bodybuilding.com (fallback) — Cable Rope Overhead Extension
  "DB Fly": "JFm8KbhjibM",                    // Renaissance Periodization (fallback) — Flat Dumbbell Flye
  "Cable Fly": "taI4XduLpTk",                 // LIVESTRONG (fallback) — Cable Crossovers

  // ── Priorité basse — échauffement / gainage ──────────────────────────────
  "Dead Hang": "XwryUTVQNIU",                 // Functional Bodybuilding (Passive Hang)
  "Cat-Cow": "1Y0YjXS9sKI",                   // Hinge Health (fallback) — physio
  "Hollow Hold": "4xRpGgttca8",               // Marcus Filly (Hollow Hold)
};
