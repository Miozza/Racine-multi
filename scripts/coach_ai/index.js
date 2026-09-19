// Racine — Coach IA : porte d'entrée publique du domaine.
//
// Même forme que CoachCharge / CoachSession / CoachProfiles : un seul objet
// window.CoachAI, et app.js ne touche jamais aux modules internes. Si une vue
// a besoin de Coach IA, elle passe par ici.
(function(){
  "use strict";

  window.CoachAI = {
    // Disponibilité
    isReady: function(){ return !!(window.CoachAIConfig && CoachAIConfig.isReady()); },
    isAdmin: function(){ return !!(window.CoachAIConfig && CoachAIConfig.isAdmin()); },
    unavailableReason: function(){ return window.CoachAIConfig ? CoachAIConfig.unavailableReason() : "Coach IA non chargé."; },

    // Vue
    render: function(){ if(window.CoachAIUI) CoachAIUI.render(); },
    bind: function(){ if(window.CoachAIUI) CoachAIUI.bind(); },

    // Conversation
    send: function(text, opts){ return CoachAIChat.send(text, opts); },
    clearChat: function(){ return CoachAIChat.clear(); },

    // Semaines générées
    plan: function(){ return window.CoachAIPlan || null; },
    hasGeneratedWeek: function(week){ return !!(window.CoachAIPlan && CoachAIPlan.hasWeek(week)); },

    // Journal des propositions (consultatif)
    patchLog: function(){ return window.CoachAIPatch ? CoachAIPatch.readLog() : []; }
  };

  // Le câblage des écouteurs a besoin du DOM. defer garantit que le document
  // est parsé, mais pas que les autres modules le sont : on reste défensif.
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ CoachAI.bind(); });
  } else {
    CoachAI.bind();
  }
})();
