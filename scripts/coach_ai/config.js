// Racine — Coach IA : configuration de l'accès API.
//
// Décision explicite du 2026-09-18 (lève la règle CLAUDE.md §3.4 « pas de
// distant ») : Racine appelle directement l'API Claude depuis le navigateur.
// Ce qui change, et les garde-fous qui l'encadrent :
//
//  - La clé API vit dans le stockage local de CET APPAREIL, jamais dans le
//    state d'un profil. Conséquence voulue : elle ne peut pas partir dans un
//    export/import JSON de profil (CLAUDE.md §2.1), ni voyager par un lien de
//    prescription. Un profil exporté reste un profil, pas un trousseau.
//  - Le domaine entier est réservé à l'admin (CoachProfiles.isActiveAdmin).
//    Un client n'a ni l'écran, ni l'appel, ni la facture.
//  - Aucun appel n'est fait si la clé est absente : l'app se comporte
//    exactement comme avant. Hors-ligne = Coach IA muet, le reste intact.
(function(){
  "use strict";

  var api = window.CoachAIConfig = window.CoachAIConfig || {};

  // Clé volontairement HORS des clés namespacées par profil
  // (CoachProfiles.storageKeysFor) : appareil, pas athlète.
  var KEY = "racine_coach_ai_device_v1";
  var SCHEMA = 1;

  // Modèle par défaut. Opus 5 : le raisonnement sur un historique
  // d'entraînement bruité vaut son prix, et l'usage est de quelques
  // messages par semaine, pas un chat de production.
  var DEFAULT_MODEL = "claude-opus-5";
  var ENDPOINT = "https://api.anthropic.com/v1/messages";
  var API_VERSION = "2023-06-01";

  function str(v){ return String(v==null?"":v).trim(); }

  function defaults(){
    return {
      schema: SCHEMA,
      apiKey: "",
      model: DEFAULT_MODEL,
      // effort : profondeur de réflexion. "medium" pour la conversation
      // courante, le générateur de semaine monte à "high" de son côté.
      effort: "medium",
      enabled: true
    };
  }

  // Migration ascendante : un objet d'une version antérieure garde ses
  // valeurs, les champs neufs prennent le défaut. Jamais d'écrasement.
  function migrate(raw){
    var base = defaults();
    if(!raw || typeof raw !== "object") return base;
    var out = Object.assign(base, raw);
    out.schema = SCHEMA;
    if(!str(out.model)) out.model = DEFAULT_MODEL;
    if(["low","medium","high","xhigh","max"].indexOf(str(out.effort)) < 0) out.effort = "medium";
    return out;
  }

  function read(){
    try{ return migrate(JSON.parse(localStorage.getItem(KEY) || "null")); }
    catch(e){ return defaults(); }
  }
  function write(cfg){
    try{ localStorage.setItem(KEY, JSON.stringify(migrate(cfg))); return true; }
    catch(e){ return false; }
  }

  api.get = read;

  api.set = function(patch){
    var cfg = read();
    if(patch && typeof patch === "object"){
      if("apiKey" in patch) cfg.apiKey = str(patch.apiKey);
      if("model"  in patch) cfg.model  = str(patch.model) || DEFAULT_MODEL;
      if("effort" in patch) cfg.effort = str(patch.effort);
      if("enabled" in patch) cfg.enabled = !!patch.enabled;
    }
    return write(cfg) ? cfg : null;
  };

  // Efface la clé seule. Volontairement pas de removeItem sur tout le bloc :
  // on garde modèle/effort choisis, on ne réinitialise que le secret.
  api.clearKey = function(){ return api.set({apiKey:""}); };

  api.isAdmin = function(){
    try{
      return !!(window.CoachProfiles && typeof CoachProfiles.isActiveAdmin === "function" && CoachProfiles.isActiveAdmin());
    }catch(e){ return false; }
  };

  // Le domaine est disponible si : admin + clé présente + activé.
  api.isReady = function(){
    var cfg = read();
    return api.isAdmin() && !!str(cfg.apiKey) && cfg.enabled !== false;
  };

  // Raison lisible quand isReady() est faux — l'écran l'affiche tel quel
  // au lieu d'un bouton mort.
  api.unavailableReason = function(){
    if(!api.isAdmin()) return "Coach IA est réservé au profil admin.";
    var cfg = read();
    if(!str(cfg.apiKey)) return "Aucune clé API enregistrée. Réglages → Coach IA.";
    if(cfg.enabled === false) return "Coach IA est désactivé dans les réglages.";
    return "";
  };

  api.ENDPOINT = ENDPOINT;
  api.API_VERSION = API_VERSION;
  api.DEFAULT_MODEL = DEFAULT_MODEL;
  api.STORAGE_KEY = KEY;
})();
