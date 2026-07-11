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
};
