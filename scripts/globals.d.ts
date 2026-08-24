// Racine — declarations des globales du navigateur.
//
// A QUOI CA SERT
// Racine charge tout par balises <script> : chaque module pose sa porte sur
// window (window.CoachCharge = ...). Aucun import/export ES, aucun build step.
// L editeur ne peut donc pas relier une porte a son consommateur, et signalait
// ~776 fausses erreurs. Ce fichier lui donne la carte.
//
// CE QUE CE FICHIER N EST PAS
// Ce n est pas du code. Un .d.ts n est jamais charge par le navigateur, jamais
// servi au client, absent d index.html et du service worker. Seul l editeur le
// lit. Le supprimer n a aucun effet sur l application.
//
// TENU A LA MAIN, VOLONTAIREMENT
// Chaque nom ci-dessous correspond a une globale reellement posee par le code.
// Trois noms utilises par le code sont volontairement ABSENTS parce qu ils ne
// sont definis nulle part : coachLogError, coachLogWarn et
// coachIsIsolationMovement. Les declarer masquerait le probleme au lieu de le
// montrer. Voir le rapport associe.
//
// Le type est any : le but est de faire taire le bruit de cablage, pas de
// typer le projet. Les fautes de frappe dans les noms restent attrapees.

declare var BERTIN_MACROCYCLE_OVERRIDE: any;
declare var BERTIN_PRIVATE_PROGRAM_IDS: any;
declare var CHARGE_ORDER: any;
declare var COACH_ARNOLD_PROGRAMS: any;
declare var COACH_BERTIN_MACROCYCLE: any;
declare var COACH_BERTIN_MOVEMENT_VIDEOS: any;
declare var COACH_BERTIN_PROGRAMS: any;
declare var COACH_BERTIN_PROGRAM_INDEX: any;
declare var COACH_BERTIN_TUTORIALS: any;
declare var COACH_MOVEMENT_TUNING: any;
declare var CoachBrainExplain: any;
declare var CoachBrainJournal: any;
declare var CoachBrainMemory: any;
declare var CoachCeiling: any;
declare var CoachCharge: any;
declare var CoachHistory: any;
declare var CoachLog: any;
declare var CoachML: any;
declare var CoachMovementProfiles: any;
declare var CoachOnboarding: any;
declare var CoachProfiles: any;
declare var CoachProgress: any;
declare var CoachRetention: any;
declare var CoachSeason: any;
declare var CoachSeasonGoals: any;
declare var CoachSeasonUI: any;
declare var CoachSession: any;
declare var CoachState: any;
declare var CoachSuggest: any;
declare var CoachSummary: any;
declare var CoachTuningOverride: any;
declare var CoachUI: any;
declare var DEFAULT_CHARGES: any;
declare var EQUIPMENT_LOAD_RULES: any;
declare var RACINE_CLIENT_PROGRAM_CATALOG_IDS: any;
declare var RACINE_CROSSFIT_KNOWN_BENCHMARKS: any;
declare var RACINE_CROSSFIT_PROGRAM_CATALOG_IDS: any;
declare var RACINE_EQUIPMENT: any;
declare var RACINE_REFERENCE_PROFILE: any;
declare var RACINE_REFERENCE_REFS: any;
declare var RacineAIExport: any;
declare var RacineAIImport: any;
declare var RacineAIInfluence: any;
declare var RacineAdminPrograms: any;
declare var RacineAdminTuning: any;
declare var RacineExport: any;
declare var RacineHelp: any;
declare var RacineMovementSwaps: any;
declare var RacinePrescription: any;
declare var RacineProfileReference: any;
declare var __coachLoadHints: any;
declare var __racineClockStarted: any;
declare var __racineLastLoadInfoHint: any;
declare var bindCoachBeurtTmsButtons: any;
declare var brain: any;
declare var coachFirstMatchingTuningLoad: any;
declare var coachMatchesAnyTuningPattern: any;
declare var coachSafeSuggestedLoad: any;
declare var findCoachBertinTutorial: any;
declare var focusConfigs: any;
declare var migrateBertin: any;
declare var migrateBertinFromFiles: any;
declare var openCoachBeurtTmsChoice: any;

// API navigateur prefixees, reellement utilisees et absentes des lib DOM.
declare var webkitAudioContext: any;
interface HTMLElement {
  webkitRequestFullscreen?: () => void;
}
