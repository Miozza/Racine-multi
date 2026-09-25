// Racine — Coach IA : la conversation.
//
// Tient l'historique du dialogue, construit la consigne système, fait tourner
// la boucle d'outils et rend à l'UI un résultat simple : du texte, et
// éventuellement des propositions à valider.
//
// Stockage de la conversation : clé locale plafonnée, namespacée par profil,
// et volontairement HORS du state du profil. Deux raisons :
//  - l'export/import JSON est le mécanisme de sauvegarde de l'entraînement
//    (CLAUDE.md §2.1) ; y empiler des messages de chat le gonflerait sans rien
//    apporter à la restauration d'un athlète ;
//  - le quota local n'a aucune copie serveur. Entre garder une séance de 2024
//    et garder une conversation de la semaine dernière, la séance gagne.
(function(){
  "use strict";

  var api = window.CoachAIChat = window.CoachAIChat || {};

  var KEY_BASE = "racine_coach_ai_chat_v1";
  var MAX_MESSAGES = 30;   // ≈ 15 échanges ; au-delà on oublie le plus ancien
  var MAX_TOOL_ROUNDS = 5; // garde-fou de coût : borne la boucle d'outils

  function str(v){ return String(v==null?"":v).trim(); }

  function storageKey(){
    var id = "";
    try{ id = window.CoachProfiles ? str(CoachProfiles.getActiveId()) : ""; }catch(e){}
    return id ? (KEY_BASE + "::" + id) : KEY_BASE;
  }

  function read(){
    try{
      var raw = localStorage.getItem(storageKey());
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){ return []; }
  }
  function write(list){
    try{ localStorage.setItem(storageKey(), JSON.stringify((Array.isArray(list) ? list : []).slice(-MAX_MESSAGES))); }
    catch(e){ /* quota : la conversation est jetable, on n'échoue pas dessus */ }
  }

  api.history = read;
  api.clear = function(){
    // removeItem sur CETTE clé de conversation uniquement. Jamais
    // localStorage.clear() ni de suppression en masse (CLAUDE.md §2.1).
    try{ localStorage.removeItem(storageKey()); }catch(e){}
    return [];
  };

  // ── Consigne système ───────────────────────────────────────────────────
  //
  // Le contexte athlète est mis en cache : il est long, stable d'un message à
  // l'autre, et se place donc AVANT tout ce qui varie (prompt caching = match
  // de préfixe). La question de l'athlète, elle, vit dans `messages`.

  function systemBlocks(){
    var contexte = "";
    try{ contexte = window.CoachAIContext ? CoachAIContext.build() : ""; }catch(e){}

    var consigne = [
      "Tu es le coach d'entraînement intégré à Racine, une application de CrossFit et de force.",
      "Tu parles à l'athlète directement, en français, au tutoiement. Il te lit sur un iPhone, souvent debout dans un gym : réponds court et concret. Pas de listes à rallonge, pas de préambule.",
      "",
      "CE QUE TU DÉCIDES :",
      "- le choix des mouvements, leur ordre, le volume, les séries et les répétitions ;",
      "- la structure d'une semaine et l'intention de chaque journée ;",
      "- le repérage de ce qui stagne, de ce qui progresse, et de ce qui revient dans les notes de l'athlète.",
      "",
      "CE QUE TU NE DÉCIDES PAS — LES CHARGES.",
      "Racine possède un moteur de charges calibré sur l'historique réel de cet athlète : ses e1RM, sa fiabilité de RPE par mouvement, son matériel, ses arrondis de rack. Il sait des choses que tu ne peux pas deviner depuis une conversation.",
      "N'écris donc jamais un poids en livres dans une proposition. Les outils n'ont d'ailleurs aucun champ pour ça.",
      "Pour exprimer une intensité, sers-toi du champ `intention` (« technique », « legere », « facile » coupent l'auto-progression) et du format de séries.",
      "Si l'athlète te demande explicitement un poids, réponds-lui dans la conversation — c'est un conseil, il reste libre de le saisir — mais ne le mets pas dans un patch.",
      "",
      "TA MÉTHODE :",
      "- Avant de te prononcer sur un mouvement précis, appelle `consulter_mouvement`. Le contexte ci-dessous n'est qu'un résumé ; l'outil te donne le détail et la suggestion courante du moteur.",
      "- Quand tu proposes un changement, appelle l'outil correspondant. L'athlète verra une carte Accepter / Refuser. Tu ne peux rien appliquer toi-même, et c'est voulu.",
      "- Une proposition à la fois, sauf si l'athlète en demande plusieurs.",
      "- Si les données sont trop minces pour conclure, dis-le. Ne comble pas un trou par une supposition présentée comme un fait.",
      "- Ne propose jamais d'ajustement pour un jour marqué manqué. Si des jours manqués ont une raison liée à la santé, adapte la reprise de la semaine suivante.",
      "",
      "Tu ne parles que d'entraînement. Tu n'es pas médecin : devant une douleur qui persiste ou qui inquiète, dis-le simplement et suggère un professionnel, puis propose l'adaptation d'entraînement qui évite la zone."
    ].join("\n");

    return [
      // Bloc stable → mis en cache. Le contexte athlète bouge une fois par
      // séance, pas à chaque message : c'est exactement ce qu'on veut cacher.
      {type: "text", text: consigne},
      {type: "text", text: "Voici l'état actuel de l'athlète.\n\n" + contexte, cache_control: {type: "ephemeral"}}
    ];
  }

  // ── Boucle ─────────────────────────────────────────────────────────────

  function toolResult(id, content, isError){
    var block = {type: "tool_result", tool_use_id: id, content: String(content)};
    if(isError) block.is_error = true;
    return block;
  }

  // Envoie un message et fait tourner les outils jusqu'à une réponse finale
  // ou une proposition. Retourne {text, proposals[]}.
  api.send = async function(userText, opts){
    opts = opts || {};
    userText = str(userText);
    if(!userText) throw new Error("Message vide.");
    if(!window.CoachAIConfig || !CoachAIConfig.isReady()){
      throw new Error(CoachAIConfig ? CoachAIConfig.unavailableReason() : "Coach IA indisponible.");
    }

    var messages = read();
    messages.push({role: "user", content: userText});

    var tools = window.CoachAIPatch ? CoachAIPatch.tools() : [];
    var proposals = [];
    var texts = [];
    var rounds = 0;

    while(rounds < MAX_TOOL_ROUNDS){
      rounds++;

      var reply = await CoachAIClient.send({
        system: systemBlocks(),
        messages: messages,
        tools: tools,
        effort: opts.effort
      });

      var text = CoachAIClient.textOf(reply);
      if(text) texts.push(text);

      // Toujours réinjecter le contenu complet : un tool_use sans son bloc
      // d'origine dans l'historique rend la requête suivante invalide.
      messages.push({role: "assistant", content: reply.content});

      var uses = CoachAIClient.toolUsesOf(reply);
      if(!uses.length || reply.stop_reason !== "tool_use") break;

      var results = [];
      var stopAfter = false;

      uses.forEach(function(use){
        var name = str(use.name);

        // Lecture : exécutée immédiatement, la boucle continue.
        if(CoachAIPatch.isRead(name)){
          var detail = "";
          try{ detail = CoachAIContext.movementDetail((use.input || {}).mouvement); }
          catch(e){ detail = "Lecture impossible : " + (e && e.message ? e.message : String(e)); }
          results.push(toolResult(use.id, detail));
          return;
        }

        // Proposition : rien n'est appliqué. On rend au modèle un accusé de
        // réception honnête et on sort de la boucle — la suite appartient à
        // l'athlète, pas au modèle.
        if(CoachAIPatch.isProposal(name)){
          proposals.push({id: use.id, name: name, input: use.input || {}});
          results.push(toolResult(use.id, "Proposition affichée à l'athlète. En attente de sa décision (Accepter ou Refuser). Ne la répète pas."));
          stopAfter = true;
          return;
        }

        results.push(toolResult(use.id, "Outil inconnu : " + name, true));
      });

      // Tous les tool_result dans UN SEUL message utilisateur : les répartir
      // sur plusieurs messages apprend au modèle à ne plus paralléliser.
      messages.push({role: "user", content: results});

      if(stopAfter) break;
    }

    write(messages);
    return {
      text: texts.join("\n\n"),
      proposals: proposals
    };
  };

  api.MAX_MESSAGES = MAX_MESSAGES;
  api.MAX_TOOL_ROUNDS = MAX_TOOL_ROUNDS;
  api.KEY_BASE = KEY_BASE;
})();
