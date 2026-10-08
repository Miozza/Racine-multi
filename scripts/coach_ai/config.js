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
  var SCHEMA = 3;

  // Modèle par défaut : Haiku 5.5 (V5.2.12, remplace Haiku 4.5 choisi le
  // 2026-10-07). Même logique — la conversation courante n'a pas besoin d'un
  // gros modèle, cible « moins de 1 $ par mois » — mais Haiku 5.5 suit mieux
  // les consignes et se sert mieux de ses outils, pour 10 fois moins cher
  // ($0,10 / $0,50 le million de jetons contre $1 / $5). Les poids restent
  // calculés par le moteur quel que soit le modèle (CLAUDE.md §3.5).
  var DEFAULT_MODEL = "claude-haiku-5-5";
  // Ancien défaut, jamais choisi à la main : l'écran n'offrait pas de choix
  // de modèle avant le schéma 2. La migration le remplace donc par le défaut.
  var LEGACY_DEFAULT_MODEL = "claude-opus-5";

  // Prix en $ par million de jetons (entrée / sortie), tarifs publics
  // Anthropic relevés le 2026-10-08 (Haiku 5.5 : tarif des prompts ≤ 100 k
  // jetons — ceux de Racine en font ≈ 8 k). Servent au compteur local et au
  // plafond mensuel — une estimation, pas une facture : la facture fait foi.
  // `effort` : le modèle accepte output_config.effort et la réflexion
  // adaptative. Haiku 4.5 refuse les deux (erreur 400).
  // `fallback` : le modèle accepte le repli serveur `fallbacks: "default"`
  // quand un filtre de sécurité décline (Opus 5.5, Sonnet 5.5 ; pas Haiku).
  // `legacy` : gardé pour compter la dépense passée et lire une config
  // ancienne, mais plus proposé dans la liste.
  var MODELS = {
    "claude-haiku-5-5":  {label: "Économique — Haiku 5.5",  input: 0.1, output: 0.5, effort: true},
    "claude-sonnet-5-5": {label: "Équilibré — Sonnet 5.5",  input: 2,   output: 10,  effort: true, fallback: true},
    "claude-opus-5-5":   {label: "Fort — Opus 5.5",         input: 4,   output: 20,  effort: true, fallback: true},
    "claude-haiku-4-5":  {label: "Haiku 4.5 (ancien)",      input: 1,   output: 5,   effort: false, legacy: true},
    "claude-opus-5":     {label: "Opus 5 (ancien)",         input: 5,   output: 25,  effort: true,  legacy: true}
  };
  // Schéma 2 → 3 : les modèles remplacés par leur successeur direct, moins
  // cher et meilleur. Rien d'autre n'est touché.
  var SUCCESSORS = {"claude-haiku-4-5": "claude-haiku-5-5", "claude-opus-5": "claude-opus-5-5"};
  // Modèle inconnu (saisi à la main) : on compte au prix le plus haut, pour
  // que le plafond se déclenche trop tôt plutôt que trop tard.
  var UNKNOWN_MODEL = {label: "", input: 5, output: 25, effort: true};

  var DEFAULT_BUDGET = 1;   // $ par mois
  var USAGE_KEY = "racine_coach_ai_usage_v1";
  var USAGE_MONTHS = 12;    // plafond du compteur : un an d'historique
  var ENDPOINT = "https://api.anthropic.com/v1/messages";
  var API_VERSION = "2023-06-01";

  function str(v){ return String(v==null?"":v).trim(); }

  // Une clé API ne contient ni espace ni guillemet. Un collage depuis Notes,
  // un courriel ou le presse-papiers iOS peut pourtant en ajouter, ainsi que
  // des caractères invisibles (espace insécable, largeur nulle) qui font
  // refuser la clé sans que rien ne se voie à l'écran.
  function cleanKey(v){
    return String(v==null?"":v)
      .replace(/[\s\u00A0\u200B-\u200D\u2060\uFEFF]/g, "")
      .replace(/^["'«»“”‘’`]+|["'«»“”‘’`]+$/g, "");
  }

  // Aperçu sans danger d'une clé : le préfixe (public, identique pour toutes
  // les clés d'un même type) et la longueur. Jamais la partie secrète.
  function keyPreview(key){
    key = String(key || "");
    if(!key) return "aucune clé";
    return "« " + key.slice(0, 10) + "… » (" + key.length + " caractères)";
  }

  // Quel assistant l'athlète colle-t-il son prompt dans. PUREMENT COSMÉTIQUE :
  // ça change les libellés de l'écran, jamais le prompt ni la lecture de la
  // réponse. Le pont est indépendant du fournisseur par construction — il
  // produit du texte et lit du texte — et il doit le rester : ne pas
  // introduire ici de branche qui changerait le contenu envoyé.
  var ASSISTANTS = {
    claude:  "Claude",
    chatgpt: "ChatGPT",
    autre:   "ton IA"
  };

  function defaults(){
    return {
      schema: SCHEMA,
      apiKey: "",
      assistant: "claude",
      model: DEFAULT_MODEL,
      // effort : profondeur de réflexion. "medium" pour la conversation
      // courante, le générateur de semaine monte à "high" de son côté.
      effort: "medium",
      // Plafond mensuel en $ : au-delà, l'appel API est refusé et l'écran
      // renvoie vers le copier-coller. 0 = pas de plafond.
      monthlyBudget: DEFAULT_BUDGET,
      enabled: true
    };
  }

  // Migration ascendante : un objet d'une version antérieure garde ses
  // valeurs, les champs neufs prennent le défaut. Jamais d'écrasement.
  function migrate(raw){
    var base = defaults();
    if(!raw || typeof raw !== "object") return base;
    var fromSchema = Number(raw.schema) || 1;
    var out = Object.assign(base, raw);
    out.schema = SCHEMA;
    // Schéma 1 → 2 : l'ancien défaut n'était pas un choix de l'athlète.
    if(fromSchema < 2 && str(out.model) === LEGACY_DEFAULT_MODEL) out.model = DEFAULT_MODEL;
    // Schéma 2 → 3 : successeur direct (Haiku 4.5 → 5.5, Opus 5 → 5.5).
    if(fromSchema < 3 && SUCCESSORS[str(out.model)]) out.model = SUCCESSORS[str(out.model)];
    if(!str(out.model)) out.model = DEFAULT_MODEL;
    // Une clé déjà enregistrée avec un caractère invisible est réparée à la
    // lecture : pas besoin de la recoller.
    out.apiKey = cleanKey(out.apiKey);
    var budget = Number(out.monthlyBudget);
    out.monthlyBudget = (isFinite(budget) && budget >= 0) ? budget : DEFAULT_BUDGET;
    if(["low","medium","high","xhigh","max"].indexOf(str(out.effort)) < 0) out.effort = "medium";
    if(!Object.prototype.hasOwnProperty.call(ASSISTANTS, str(out.assistant))) out.assistant = "claude";
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
      if("apiKey" in patch) cfg.apiKey = cleanKey(patch.apiKey);
      if("model"  in patch) cfg.model  = str(patch.model) || DEFAULT_MODEL;
      if("effort" in patch) cfg.effort = str(patch.effort);
      if("monthlyBudget" in patch) cfg.monthlyBudget = Number(patch.monthlyBudget);
      if("assistant" in patch) cfg.assistant = str(patch.assistant);
      if("enabled" in patch) cfg.enabled = !!patch.enabled;
    }
    return write(cfg) ? cfg : null;
  };

  // Efface la clé seule. Volontairement pas de removeItem sur tout le bloc :
  // on garde modèle/effort choisis, on ne réinitialise que le secret.
  api.clearKey = function(){ return api.set({apiKey:""}); };

  api.keyPreview = function(){ return keyPreview(read().apiKey); };
  api.cleanKey = cleanKey;

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

  // Nom à afficher dans l'écran. Sert aux libellés, à rien d'autre.
  api.assistantLabel = function(){ return ASSISTANTS[read().assistant] || ASSISTANTS.claude; };
  api.assistants = function(){
    return Object.keys(ASSISTANTS).map(function(k){ return {key: k, label: ASSISTANTS[k]}; });
  };

  // ── Modèles ──────────────────────────────────────────────────────────

  api.modelInfo = function(model){
    var id = str(model || read().model);
    return Object.assign({id: id}, MODELS[id] || UNKNOWN_MODEL);
  };
  api.models = function(){
    return Object.keys(MODELS).filter(function(k){ return !MODELS[k].legacy; }).map(function(k){ return {id: k, label: MODELS[k].label}; });
  };

  // ── Compteur de dépense ──────────────────────────────────────────────
  //
  // Clé d'APPAREIL, comme la clé API : la dépense est celle de cette clé sur
  // ce téléphone, pas celle d'un athlète. Elle n'entre donc ni dans un export
  // de profil ni dans un lien de prescription.

  function monthKey(d){
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function readUsage(){
    try{
      var raw = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
      if(raw && typeof raw === "object" && raw.months && typeof raw.months === "object") return raw;
    }catch(e){}
    return {schema: 1, months: {}};
  }

  // Coût d'une réponse, d'après le bloc `usage` qu'elle déclare. Écriture en
  // cache facturée 1,25× l'entrée, lecture en cache 0,1×.
  api.costOf = function(model, usage){
    var m = api.modelInfo(model);
    var u = usage || {};
    var tokIn = Number(u.input_tokens) || 0;
    var tokWrite = Number(u.cache_creation_input_tokens) || 0;
    var tokRead = Number(u.cache_read_input_tokens) || 0;
    var tokOut = Number(u.output_tokens) || 0;
    return (tokIn * m.input + tokWrite * m.input * 1.25 + tokRead * m.input * 0.1 + tokOut * m.output) / 1e6;
  };

  api.recordUsage = function(model, usage){
    var cost = api.costOf(model, usage);
    var data = readUsage();
    var k = monthKey();
    var row = data.months[k] || {usd: 0, calls: 0};
    row.usd = (Number(row.usd) || 0) + cost;
    row.calls = (Number(row.calls) || 0) + 1;
    data.months[k] = row;
    // Plafond : on garde les USAGE_MONTHS mois les plus récents. Les clés
    // AAAA-MM se trient comme des dates.
    var keep = Object.keys(data.months).sort().slice(-USAGE_MONTHS);
    var months = {};
    keep.forEach(function(m){ months[m] = data.months[m]; });
    data.months = months;
    try{ localStorage.setItem(USAGE_KEY, JSON.stringify(data)); }catch(e){}
    return cost;
  };

  api.monthSpend = function(){
    var row = readUsage().months[monthKey()];
    return {usd: row ? (Number(row.usd) || 0) : 0, calls: row ? (Number(row.calls) || 0) : 0};
  };

  // Vrai si le plafond du mois est atteint. Le plafond est une estimation
  // locale ; la vraie limite reste le crédit prépayé du compte Anthropic.
  api.overBudget = function(){
    var budget = Number(read().monthlyBudget) || 0;
    return budget > 0 && api.monthSpend().usd >= budget;
  };

  api.ENDPOINT = ENDPOINT;
  api.API_VERSION = API_VERSION;
  api.DEFAULT_MODEL = DEFAULT_MODEL;
  api.STORAGE_KEY = KEY;
  api.USAGE_KEY = USAGE_KEY;
})();
