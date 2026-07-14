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

  // ══ Correctifs anomalies (V4.5.5) — fiches Close-Grip / DB Bench séparées ══
  "Close-Grip Bench Press": "XEFDMwmrLAM",    // Marcus Filly (Close Grip Bench Press)
  "DB Bench Press": "hm_TrCkhJgo",            // Marcus Filly (Dumbbell Bench Press)

  // ══ 3e passe (V4.5.6) — fort trafic catalogue + haltéro technique ══

  // ── Fort trafic catalogue client ─────────────────────────────────────────
  "Hip Thrust": "hg9MMvd-MY8",                // Functional Bodybuilding (Barbell Hip Thrust)
  "DB RDL": "UsOjCcxSJaI",                    // Functional Bodybuilding (Dumbbell Romanian Deadlift)
  "Push Press": "yklSQG1_Ovc",                // Catalyst Athletics (Exercise Library)
  "KB Swing": "KkYOW3jDhoM",                  // Marcus Filly (Russian Kettlebell Swing)
  "Hanging Knee Raise": "RD_A-Z15ER4",        // Renaissance Periodization (fallback)

  // ── Haltéro technique (catalogue haltéro/CrossFit) ───────────────────────
  "Clean and Jerk": "bNCXgyosXlc",            // Catalyst Athletics (Exercise Library)
  "Power Snatch": "ydHHsju1-Nc",              // Catalyst Athletics (Exercise Library)
  "Hang Power Snatch": "SpDPcj0W3Yw",         // Catalyst Athletics (Exercise Library)
  "Snatch Pull": "G1QygZ3Kd3w",               // Catalyst Athletics (Exercise Library)
  "Split Jerk": "2GPA-cjUFnA",                // Catalyst Athletics (Exercise Library)
  "Push Jerk": "Om7vLD6x8W0",                 // Catalyst Athletics (Exercise Library)
  "Overhead Squat": "m_fvfJi94D8",            // Catalyst Athletics (Exercise Library)
  "Thruster": "aea5BGj9a8Y",                  // CrossFit officiel (Foundational Movement)

  // ══ 4e passe (V4.5.7) — skills gym RX + basiques metcon ══

  // ── Skills gym CrossFit RX ───────────────────────────────────────────────
  "Bar Muscle-up": "NjseWnHc3PM",             // CrossFit officiel (Gymnastics Course — Bar Muscle-Up Drill)
  "Ring Muscle-up": "j-5Ubq3ZOds",            // Marcus Filly (Strict Ring Muscle Up Tutorial)
  "Handstand Push-up": "0wDEO6shVjc",         // CrossFit officiel (The Strict Handstand Push-Up)
  "Handstand Walk": "I5p2VVDupq8",            // CrossFit officiel (The Handstand Walk)
  "Pistol": "7BJxe3R-IcY",                    // Marcus Filly (Pistol Strength Progressions)
  "Toes-to-Bar": "DoQSjlaa9zc",               // Marcus Filly (Kipping Toes To Bar)
  "Ring Dip": "4X9fFSTMDJ4",                  // Central Athlete (Strict Ring Dip)
  "Rope Climb": "nI4MijQJ_No",                // CrossFit officiel (The Rope Climb, J-Hook)
  "Double-under": "82jNjDS19lg",              // CrossFit officiel (The Double-Under)

  // ── Basiques metcon ──────────────────────────────────────────────────────
  "Air Squat": "C_VtOYc6j5c",                 // CrossFit officiel (Foundational Movement)
  "Box Jump": "52r_Ul5k03g",                  // CrossFit officiel (The Box Jump)
  "Sit-Up": "_HDZODOx7Zw",                    // CrossFit officiel (The AbMat Sit-up)
  "GHD Sit-Up": "1pbZ8mX2D1U",                // CrossFit officiel (The GHD Sit-up)
  "Side Plank": "_R389Jk0tIo",                // Marcus Filly (Side Plank)
  "Push-Up lesté": "SYZ7ktqfL2Q",             // Marcus Filly (Weighted Push Ups)
  "Walking Lunge DB": "eFWCn5iEbTU",          // Renaissance Periodization (fallback) — Dumbbell Walking Lunge

  // ══ 5e passe (V4.5.8) — fessiers, front rack, drills muscle-up, divers ══
  // « Overhead Hold » a une fiche mais pas de vidéo (pas de bonne démo barre trouvée).

  // ── Fessiers (hypertrophie_fesse) ────────────────────────────────────────
  "Frog Bridge": "HyCiZVMMDW4",               // Bret Contreras (fallback) — Frog Pumps
  "Cable Pull-Through": "pv8e6OSyETE",        // Renaissance Periodization (fallback)
  "Cable Hip Abduction": "vSqhrbzZb7A",       // Glute Lab / Bret Contreras (fallback)
  "Mini-Band Lateral Walk": "ReT_5fnUe6k",    // Nick Tumminello (fallback)
  "Hip Switch": "m51AZSXMvEA",                // The Active Life (fallback) — 90/90 Hip Switch
  "Front-Foot Elevated Split Squat": "bZN3q31j8ks", // Functional Bodybuilding
  "Step-Up": "1F-tgZJkfiM",                   // Marcus Filly (Dumbbell Step Up)

  // ── Famille front rack + divers ──────────────────────────────────────────
  "Front Rack Lunge": "f3WLs_HutLw",          // CrossFit officiel (The Front Rack Lunge)
  "Front Rack Hold": "duiT0_faFnE",           // The Active Life (fallback)
  "Front Rack Carry": "ofwpNdE8yZU",          // Functional Bodybuilding (Barbell Front Rack Carry)
  "Bar-Facing Burpee": "PCdMS9QLtaE",         // CrossFit Games (fallback) — efficiency tips
  "Cable Curl": "NFzTWp2qpiE",                // Fit Father Project (fallback)
  "DB Pullover": "owr5y-s6-Qk",               // Functional Bodybuilding (Dumbbell Pullover)
  "Cable External Rotation": "PVdgjHqAes8",   // Muscle & Motion (fallback)
  "Push-Up": "IIpHnPCkl7Q",                   // Marcus Filly (Push Ups)

  // ── Drills muscle-up (cycle strict 10 semaines) ──────────────────────────
  "Strict Muscle-Up": "721soPhMhs8",          // Central Athlete
  "False Grip Hang": "6qgtI2XbmUc",           // Central Athlete (False Grip Passive Hang on Rings)
  "False Grip Ring Row": "EtLL4QtQRHI",       // Central Athlete
  "False Grip Pull to Sternum": "gpNkZWG_gFo",// Central Athlete (False Grip Ring Pull-Up)
  "Ring Support Hold": "kONbxg4kzkE",         // Marcus Filly
  "Ring Turnout Support": "9PKChU9Ozs8",      // Antranik (fallback) — RTO Support Hold
  "Arch Hold": "TkrTjU-qf6U",                 // CrossFit officiel (Arch Holds)
  "Wrist Strength": "1ljl0cMg5JI",            // GMB Fitness (fallback) — 5 Wrist Strength Exercises
  "Transition Drill": "Pe_4RCi-PuQ",          // CrossFit officiel (Low-Ring Muscle-Up Tips)
  "Low Ring Transition Pause": "rpEhhvq8S8k", // Jenny LaBaw (fallback)
  "Slow Negative Muscle-Up": "Mx31PedEpTg",   // Functional Bodybuilding (Ring Muscle Up Negative)

  // ── Fessiers femme (hypertrophie_fesse_stephanie) ────────────────────────
  // null = pas encore trouvé dans les sources curées ; ID à ajouter après revue.
  "Cable Kickback": null,
  "DB Reverse Lunge": null,
  "Slider Curl": null
};
