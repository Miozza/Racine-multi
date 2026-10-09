// Racine — Avis IA mouvement par l'API (V5.2.16).
//
// Le bouton « Avis IA » du panneau (!) envoie directement le prompt mouvement
// à l'API au lieu de le faire copier. Ce fichier ne fabrique rien de neuf :
//  - le prompt est celui du copier-coller (RacineAIExport.buildMovementPrompt),
//    donc seulement CE mouvement — ses 8 dernières séances, l'explication
//    Brain, ses notes dictées. Pas de cycle, pas de programme : c'est ce qui
//    tient le coût d'un avis autour d'un millième de dollar sur Haiku ;
//  - la réponse est rangée par RacineAIImport.importAdvice, exactement comme
//    un avis collé à la main. Même mémoire, même suivi d'influence ;
//  - l'appel passe par CoachAIClient.send : même clé, même modèle, même
//    plafond mensuel que Coach IA. Aucun fetch() ici (CLAUDE.md §3.4).
//
// Sans clé, hors-ligne, plafond atteint ou erreur : mode() rend la raison et
// le panneau revient au copier-coller. Avis IA reste toujours utilisable.
//
// Consultatif : rien ici ne touche une charge. Un poids proposé par l'IA
// s'affiche à côté de celui de Brain ; l'athlète le saisit lui-même.
(function(){
  "use strict";

  var api = window.RacineAIAsk = window.RacineAIAsk || {};

  // Une réponse d'avis tient en quelques centaines de jetons ; le plafond
  // laisse la place à la réflexion adaptative sans ouvrir la porte à une
  // dépense de conversation.
  var MAX_TOKENS = 4000;

  function str(v){ return String(v==null?"":v).trim(); }
  function movementOf(hint){ hint = hint || {}; return str(hint.name || hint.label || hint.movement); }

  // {api:true} si l'appel peut partir, sinon {api:false, reason} — la raison
  // est affichée telle quelle au-dessus du bouton de copie.
  api.mode = function(){
    var cfg = window.CoachAIConfig;
    if(!cfg || !window.CoachAIClient || !window.RacineAIExport || !window.RacineAIImport){
      return {api:false, reason:"Envoi direct indisponible : copie le prompt."};
    }
    if(!cfg.isReady()) return {api:false, reason:cfg.unavailableReason() || "Envoi direct indisponible."};
    if(cfg.overBudget()) return {api:false, reason:"Plafond du mois atteint : copie le prompt, c'est gratuit."};
    try{
      if(typeof navigator !== "undefined" && navigator.onLine === false){
        return {api:false, reason:"Hors-ligne : copie le prompt, ou réessaie avec du réseau."};
      }
    }catch(e){}
    return {api:true, reason:""};
  };

  // Envoie le prompt du mouvement et range la réponse. Rend l'avis enregistré.
  // Lève une Error au message lisible : le panneau l'affiche et repasse au
  // copier-coller.
  api.askMovement = async function(hint){
    var m = api.mode();
    if(!m.api) throw new Error(m.reason);
    var movement = movementOf(hint);
    var prompt = RacineAIExport.buildMovementPrompt(hint || {});
    var reply = await CoachAIClient.send({
      messages: [{role:"user", content: prompt}],
      maxTokens: MAX_TOKENS
    });
    var text = CoachAIClient.textOf(reply);
    if(!text) throw new Error("Réponse vide de l'API.");
    return RacineAIImport.importAdvice(text, {
      scope:"movement", movement: movement, via:"api", model: str(reply && reply.model),
      // Le poids de Brain au moment de la question, pour l'afficher à côté
      // de celui de l'IA même si elle n'a pas recopié le prompt_id.
      brain_load: str((hint && (hint.load || hint.suggestedLoad)) || "").replace(/\s*⚠\s*/g, "")
    });
  };
})();
