// Racine — Coach IA : l'appel réseau, et rien d'autre.
//
// Pourquoi fetch() brut et pas le SDK @anthropic-ai/sdk : Racine n'a ni
// bundler ni étape de build, et dev/architecture.json fige ce choix
// ("Zéro import/export ES", balises <script defer> listées à la main pour la
// stabilité Safari/iPhone). Importer le SDK imposerait un bundler ou un
// module ESM depuis un CDN — les deux cassent ce contrat. L'API Messages est
// un seul POST JSON : la dépendance ne paierait pas son coût.
//
// Ce fichier ne connaît ni l'entraînement, ni les patchs, ni l'UI. Il prend
// des messages, il rend une réponse ou une erreur lisible en français.
(function(){
  "use strict";

  var api = window.CoachAIClient = window.CoachAIClient || {};

  function cfg(){ return window.CoachAIConfig ? CoachAIConfig.get() : {}; }

  // Messages d'erreur écrits pour quelqu'un debout dans un gym avec un
  // iPhone, pas pour une console : ce qui s'est passé, et quoi faire.
  function errorMessage(status, body){
    var detail = "";
    try{ detail = (body && body.error && body.error.message) ? String(body.error.message) : ""; }catch(e){}

    if(status === 401 || status === 403){
      return "Clé API refusée. Vérifie-la dans Réglages → Coach IA.";
    }
    if(status === 400){
      return "Requête refusée par l'API" + (detail ? " : " + detail : ".");
    }
    if(status === 429){
      return "Limite de débit atteinte. Attends une minute et réessaie.";
    }
    if(status === 529){
      return "L'API est surchargée en ce moment. Réessaie dans un instant.";
    }
    if(status >= 500){
      return "Erreur côté API (" + status + "). Réessaie dans un instant.";
    }
    return "Erreur " + status + (detail ? " : " + detail : ".");
  }

  // Un appel. `messages` et `tools` sont passés tels quels : c'est chat.js qui
  // sait ce qu'il envoie.
  api.send = async function(opts){
    opts = opts || {};
    var c = cfg();
    var key = String(c.apiKey || "").trim();
    if(!key) throw new Error("Aucune clé API enregistrée.");

    var body = {
      model: String(opts.model || c.model || CoachAIConfig.DEFAULT_MODEL),
      // Non-streaming : une réponse de coaching tient largement dedans, et le
      // streaming SSE à la main coûterait plus qu'il ne rapporte ici.
      max_tokens: Number(opts.maxTokens || 16000),
      messages: opts.messages || [],
      // Opus 5 réfléchit par défaut ; on le déclare explicitement pour que le
      // comportement ne dépende pas d'un défaut d'API qui peut bouger.
      thinking: {type: "adaptive"},
      output_config: {effort: String(opts.effort || c.effort || "medium")}
    };
    if(opts.system) body.system = opts.system;
    if(opts.tools && opts.tools.length) body.tools = opts.tools;

    var res;
    try{
      res = await fetch(CoachAIConfig.ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": CoachAIConfig.API_VERSION,
          // Sans cet en-tête, l'API refuse toute requête venue d'un navigateur
          // (CORS). Il assume explicitement que la clé est exposée côté client
          // — acceptable ici : app perso, clé locale, profil admin seulement.
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });
    }catch(e){
      // Hors-ligne, coupure, DNS. Racine doit continuer à fonctionner sans
      // réseau : c'est une erreur de Coach IA, pas une panne de l'app.
      throw new Error("Pas de connexion. Coach IA a besoin du réseau ; le reste de Racine fonctionne normalement.");
    }

    var payload = null;
    try{ payload = await res.json(); }catch(e){ payload = null; }

    if(!res.ok) throw new Error(errorMessage(res.status, payload));
    if(!payload) throw new Error("Réponse illisible de l'API.");
    return payload;
  };

  // Extraction du texte visible d'une réponse. Les blocs `thinking` ne sont
  // jamais affichés : ce n'est pas au coach de montrer son brouillon.
  api.textOf = function(message){
    var out = [];
    var blocks = (message && Array.isArray(message.content)) ? message.content : [];
    blocks.forEach(function(b){
      if(b && b.type === "text" && String(b.text || "").trim()) out.push(String(b.text).trim());
    });
    return out.join("\n\n");
  };

  api.toolUsesOf = function(message){
    var blocks = (message && Array.isArray(message.content)) ? message.content : [];
    return blocks.filter(function(b){ return b && b.type === "tool_use"; });
  };
})();
