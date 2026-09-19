// Racine — Coach IA : l'écran.
//
// Propriétaire de la vue « Coach IA » au sens de docs/ARCHITECTURE.md :
// conversation, cartes de proposition, et le réglage de la clé API. Aucune
// autre vue ne rend ces éléments, et celle-ci ne rend rien qui appartienne à
// une autre (elle n'affiche pas une séance : elle propose, l'athlète accepte,
// et c'est WOD+ / Séance qui affichent le résultat comme n'importe quel
// programme).
//
// Mobile d'abord : le développement se fait depuis un iPhone et l'usage aussi.
// Une colonne, gros boutons, rien qui demande un curseur.
(function(){
  "use strict";

  var api = window.CoachAIUI = window.CoachAIUI || {};

  var pending = [];        // propositions en attente de décision
  var busy = false;
  var bridgeIntent = "libre";  // intention choisie dans le mode copier-coller

  // Deux chemins vers le même coach :
  //  - "pont"  : Racine écrit le prompt, tu le colles dans Claude, tu recolles
  //              la réponse. Passe par l'abonnement, ne coûte rien de plus.
  //  - "api"   : appel direct, facturé au jeton. Actif SEULEMENT si une clé est
  //              enregistrée. Sans clé, il n'existe pas.
  // Les deux aboutissent aux mêmes cartes Accepter / Refuser.
  function mode(){
    return (window.CoachAIConfig && CoachAIConfig.isReady()) ? "api" : "pont";
  }

  function $(id){ return document.getElementById(id); }
  function esc(s){
    if(window.CoachUI && CoachUI.escapeHtml) return CoachUI.escapeHtml(String(s==null?"":s));
    return String(s==null?"":s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function str(v){ return String(v==null?"":v).trim(); }

  // Rendu minimal du texte du modèle : paragraphes et puces. Volontairement
  // pas de moteur Markdown — une dépendance de plus pour trois cas d'usage,
  // et tout ce qui n'est pas échappé ici deviendrait une injection.
  function formatText(text){
    var lines = String(text || "").split(/\n+/);
    var html = "";
    var inList = false;
    lines.forEach(function(raw){
      var line = str(raw);
      if(!line) return;
      var bullet = /^[-•*]\s+/.test(line);
      if(bullet && !inList){ html += "<ul class='cai-list'>"; inList = true; }
      if(!bullet && inList){ html += "</ul>"; inList = false; }
      html += bullet ? ("<li>" + esc(line.replace(/^[-•*]\s+/, "")) + "</li>")
                     : ("<p>" + esc(line) + "</p>");
    });
    if(inList) html += "</ul>";
    return html;
  }

  // Le presse-papiers échoue silencieusement dans certains contextes iOS
  // (page non sécurisée, geste non reconnu). Le repli sélectionne le texte
  // pour que « Copier » du menu système reste possible : un bouton qui ne fait
  // rien sans le dire est pire que pas de bouton.
  async function copyToClipboard(text, fallbackEl){
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(e){}
    if(fallbackEl){
      fallbackEl.value = text;
      fallbackEl.style.display = "";
      try{ fallbackEl.focus(); fallbackEl.setSelectionRange(0, text.length); }catch(e){}
    }
    return false;
  }

  // ── Conversation ───────────────────────────────────────────────────────

  function renderMessages(){
    var host = $("caiMessages");
    if(!host) return;

    var history = window.CoachAIChat ? CoachAIChat.history() : [];
    var html = "";

    history.forEach(function(m){
      // Les messages d'outils (tableaux de blocs) ne se montrent pas : ce sont
      // les rouages, pas la conversation.
      if(typeof m.content !== "string") return;
      if(m.role === "user"){
        html += "<div class='cai-msg cai-msg-me'>" + formatText(m.content) + "</div>";
      }
    });

    // Le dernier tour d'assistant est rendu à part (voir renderReply) pour
    // éviter de reconstituer le texte depuis des blocs à chaque affichage.
    if(!html) html = "<div class='cai-empty'>"
      + "<p class='cai-empty-title'>Coach IA</p>"
      + "<p>Il lit ton historique réel, tes notes de séance et ta progression par mouvement, "
      + "puis il propose — remplacer un mouvement, changer des répétitions, écrire ta semaine. "
      + "Tu acceptes ou tu refuses.</p>"
      + (mode() === "api"
          ? "<p class='cai-empty-hint'>« Mon développé couché stagne depuis un mois, qu'est-ce que tu vois ? »<br>"
            + "« Écris-moi la semaine 3, j'ai seulement 3 jours cette semaine. »<br>"
            + "« Mon épaule gauche accroche au strict press, change-moi ça. »</p>"
          : "<p class='cai-empty-hint'>Suis les trois étapes ci-dessous. Le prompt contient déjà tout "
            + "ce que Claude a besoin de savoir sur toi — tu n'as rien à lui réexpliquer.</p>")
      + "</div>";

    host.innerHTML = html;
    host.scrollTop = host.scrollHeight;
  }

  function appendBubble(cls, html){
    var host = $("caiMessages");
    if(!host) return;
    var empty = host.querySelector(".cai-empty");
    if(empty) empty.remove();
    var div = document.createElement("div");
    div.className = "cai-msg " + cls;
    div.innerHTML = html;
    host.appendChild(div);
    host.scrollTop = host.scrollHeight;
    return div;
  }

  // ── Cartes de proposition ──────────────────────────────────────────────

  function renderProposals(){
    var host = $("caiProposals");
    if(!host) return;

    if(!pending.length){ host.innerHTML = ""; return; }

    host.innerHTML = pending.map(function(p, index){
      var d = CoachAIPatch.describe(p);
      return "<div class='cai-patch' data-index='" + index + "'>"
        + "<div class='cai-patch-head'>" + esc(d.title) + "</div>"
        + "<div class='cai-patch-body'>"
        + d.lines.map(function(l){ return "<p>" + esc(l) + "</p>"; }).join("")
        + "</div>"
        + (d.footer ? "<div class='cai-patch-foot'>" + esc(d.footer) + "</div>" : "")
        + "<div class='cai-patch-actions'>"
        + "<button type='button' class='cai-btn cai-btn-accept' data-cai-accept='" + index + "'>Accepter</button>"
        + "<button type='button' class='cai-btn cai-btn-refuse' data-cai-refuse='" + index + "'>Refuser</button>"
        + "</div>"
        + "</div>";
    }).join("");
  }

  function decide(index, accepted){
    var patch = pending[index];
    if(!patch) return;

    var result = accepted ? CoachAIPatch.apply(patch) : CoachAIPatch.refuse(patch);
    pending.splice(index, 1);
    renderProposals();

    if(accepted && result && result.ok){
      appendBubble("cai-msg-system cai-ok", formatText(result.message || "Appliqué."));
      // Les vues qui montrent la séance doivent refléter le changement tout
      // de suite, sinon l'athlète doute que ça ait marché.
      try{ if(typeof renderAll === "function") renderAll(); }catch(e){}
      try{ if(typeof renderCycle === "function") renderCycle(); }catch(e){}
    } else if(accepted){
      appendBubble("cai-msg-system cai-err", formatText((result && result.error) || "Application impossible."));
    } else {
      appendBubble("cai-msg-system", "<p>Proposition refusée.</p>");
    }
  }

  // ── Envoi ──────────────────────────────────────────────────────────────

  function setBusy(state){
    busy = state;
    var btn = $("caiSend"), input = $("caiInput");
    if(btn){ btn.disabled = state; btn.textContent = state ? "…" : "Envoyer"; }
    if(input) input.disabled = state;
  }

  async function send(){
    if(busy) return;
    var input = $("caiInput");
    if(!input) return;
    var text = str(input.value);
    if(!text) return;

    appendBubble("cai-msg-me", formatText(text));
    input.value = "";
    setBusy(true);

    var thinking = appendBubble("cai-msg-coach cai-thinking", "<p>Il lit ton historique…</p>");

    try{
      var out = await CoachAIChat.send(text);
      if(thinking) thinking.remove();
      if(str(out.text)) appendBubble("cai-msg-coach", formatText(out.text));
      if(out.proposals && out.proposals.length){
        pending = pending.concat(out.proposals);
        renderProposals();
      }
      if(!str(out.text) && !(out.proposals || []).length){
        appendBubble("cai-msg-system", "<p>Réponse vide.</p>");
      }
    }catch(e){
      if(thinking) thinking.remove();
      appendBubble("cai-msg-system cai-err", formatText(e && e.message ? e.message : String(e)));
    }finally{
      setBusy(false);
    }
  }

  // ── Mode pont : copier le prompt, coller la réponse ────────────────────

  function renderBridge(){
    var host = $("caiBridge");
    if(!host) return;

    var intents = CoachAIBridge.intents();
    host.innerHTML = ""
      + "<div class='cai-bridge-step'>"
      +   "<span class='cai-step-num'>1</span>"
      +   "<span class='cai-step-text'>Choisis ce que tu veux lui demander</span>"
      + "</div>"
      + "<div class='cai-intents'>"
      +   intents.map(function(i){
            return "<button type='button' class='cai-chip" + (i.key === bridgeIntent ? " cai-chip-on" : "")
              + "' data-cai-intent='" + esc(i.key) + "'>" + esc(i.label) + "</button>";
          }).join("")
      + "</div>"
      + "<textarea id='caiBridgeQuestion' class='cai-textarea cai-bridge-q' rows='2' "
      +   "placeholder='Précision optionnelle — « seulement 3 jours cette semaine », « mon épaule gauche accroche »…'></textarea>"

      + "<div class='cai-bridge-step'>"
      +   "<span class='cai-step-num'>2</span>"
      +   "<span class='cai-step-text'>Copie, colle dans Claude, reviens</span>"
      + "</div>"
      + "<button type='button' class='cai-btn cai-btn-accept cai-btn-wide' id='caiCopyPrompt'>Copier le prompt</button>"
      + "<textarea id='caiPromptFallback' class='cai-textarea cai-fallback' rows='4' readonly style='display:none'></textarea>"

      + "<div class='cai-bridge-step'>"
      +   "<span class='cai-step-num'>3</span>"
      +   "<span class='cai-step-text'>Colle sa réponse complète ici</span>"
      + "</div>"
      + "<textarea id='caiPasteAnswer' class='cai-textarea' rows='3' "
      +   "placeholder='Colle toute la réponse de Claude, texte compris.'></textarea>"
      + "<button type='button' class='cai-btn cai-btn-wide' id='caiReadAnswer'>Lire la réponse</button>";
  }

  async function copyPrompt(){
    var extra = $("caiBridgeQuestion");
    var prompt = CoachAIBridge.buildPrompt(bridgeIntent, extra ? extra.value : "");
    var ok = await copyToClipboard(prompt, $("caiPromptFallback"));
    appendBubble("cai-msg-system " + (ok ? "cai-ok" : ""),
      ok ? "<p>Prompt copié. Colle-le dans Claude, puis reviens avec sa réponse.</p>"
         : "<p>Copie automatique refusée par le navigateur. Le prompt est affiché ci-dessous : sélectionne-le et copie-le à la main.</p>");
  }

  function readAnswer(){
    var box = $("caiPasteAnswer");
    if(!box) return;
    var raw = str(box.value);
    if(!raw){
      appendBubble("cai-msg-system", "<p>Colle d'abord la réponse de Claude.</p>");
      return;
    }

    var out = CoachAIBridge.parseResponse(raw);

    if(str(out.text)) appendBubble("cai-msg-coach", formatText(out.text));

    if(!out.ok){
      appendBubble("cai-msg-system cai-err", formatText(out.error));
      return;
    }

    if(out.proposals && out.proposals.length){
      pending = pending.concat(out.proposals);
      renderProposals();
    } else if(!str(out.text)){
      appendBubble("cai-msg-system", "<p>Rien de lisible dans ce qui a été collé.</p>");
    }

    // Un type inventé par le modèle est signalé, jamais deviné ni appliqué.
    if(out.rejected && out.rejected.length){
      appendBubble("cai-msg-system cai-err",
        formatText("Proposition(s) ignorée(s), type inconnu : " + out.rejected.join(", ")));
    }

    box.value = "";
  }

  // ── Réglages (clé API) ─────────────────────────────────────────────────

  function renderSettings(){
    var host = $("caiSettings");
    if(!host) return;
    var cfg = CoachAIConfig.get();
    var hasKey = !!str(cfg.apiKey);

    host.innerHTML = ""
      + "<label class='cai-label' for='caiKey'>Clé API Anthropic</label>"
      + "<input id='caiKey' class='cai-input' type='password' autocomplete='off' spellcheck='false' "
      +   "placeholder='" + (hasKey ? "Clé enregistrée — laisser vide pour la garder" : "sk-ant-…") + "'>"
      + "<p class='cai-hint'><strong>Optionnelle.</strong> Sans clé, Coach IA fonctionne en copier-coller et ne coûte rien de plus "
      +   "que ton abonnement. Une clé API se facture séparément, à l'usage — un abonnement Pro ne la couvre pas. "
      +   "Elle n'a d'intérêt que si tu veux la conversation directe dans l'app.</p>"
      + "<p class='cai-hint'>Elle reste sur cet appareil : elle n'entre jamais dans un export de profil ni dans un lien de prescription. "
      +   "Efface-la si tu prêtes ton téléphone.</p>"
      + "<label class='cai-label' for='caiEffort'>Profondeur de réflexion</label>"
      + "<select id='caiEffort' class='cai-input'>"
      +   ["low","medium","high","xhigh"].map(function(e){
            return "<option value='" + e + "'" + (cfg.effort === e ? " selected" : "") + ">" + e + "</option>";
          }).join("")
      + "</select>"
      + "<p class='cai-hint'>« medium » suffit pour discuter. Monte à « high » pour faire écrire une semaine complète.</p>"
      + "<div class='cai-settings-actions'>"
      +   "<button type='button' class='cai-btn' id='caiSaveCfg'>Enregistrer</button>"
      +   (hasKey ? "<button type='button' class='cai-btn cai-btn-refuse' id='caiClearKey'>Effacer la clé</button>" : "")
      +   "<button type='button' class='cai-btn cai-btn-refuse' id='caiClearChat'>Effacer la conversation</button>"
      + "</div>";
  }

  function saveSettings(){
    var key = $("caiKey"), effort = $("caiEffort");
    var patch = {};
    // Champ vide = on garde la clé existante. Sans ça, ouvrir les réglages
    // pour changer l'effort effacerait la clé au passage.
    if(key && str(key.value)) patch.apiKey = str(key.value);
    if(effort) patch.effort = effort.value;
    CoachAIConfig.set(patch);
    if(key) key.value = "";
    renderSettings();
    renderAvailability();
    appendBubble("cai-msg-system cai-ok", "<p>Réglages enregistrés.</p>");
  }

  // ── Disponibilité ──────────────────────────────────────────────────────

  function renderAvailability(){
    var banner = $("caiUnavailable"), composer = $("caiComposer"), bridge = $("caiBridge");
    if(!banner || !composer || !bridge) return;

    if(mode() === "api"){
      // Clé enregistrée : conversation directe.
      banner.style.display = "none";
      composer.style.display = "";
      bridge.style.display = "none";
    } else {
      // Pas de clé : le pont. Ce n'est PAS une indisponibilité — c'est le
      // chemin normal, et il passe par l'abonnement déjà payé.
      banner.style.display = "";
      banner.innerHTML = "<p><strong>Mode copier-coller.</strong> Racine écrit le prompt, tu le colles dans Claude, "
        + "tu recolles sa réponse. Rien de plus à payer : ça passe par ton abonnement.</p>";
      composer.style.display = "none";
      bridge.style.display = "";
      renderBridge();
    }
  }

  // ── Câblage ────────────────────────────────────────────────────────────

  api.render = function(){
    if(!CoachAIConfig.isAdmin()){
      var view = $("coachaiView");
      if(view) view.innerHTML = "<div class='cai-empty'><p>Coach IA est réservé au profil admin.</p></div>";
      return;
    }
    renderMessages();
    renderProposals();
    renderSettings();
    renderAvailability();
  };

  api.bind = function(){
    var view = $("coachaiView");
    if(!view) return;

    view.addEventListener("click", function(ev){
      var t = ev.target;
      if(!t || !t.getAttribute) return;

      if(t.id === "caiSend"){ send(); return; }
      if(t.id === "caiCopyPrompt"){ copyPrompt(); return; }
      if(t.id === "caiReadAnswer"){ readAnswer(); return; }

      var intent = t.getAttribute("data-cai-intent");
      if(intent){
        bridgeIntent = intent;
        // Re-rendre ne doit pas effacer ce que l'athlète a déjà tapé ou collé.
        var q = $("caiBridgeQuestion"), a = $("caiPasteAnswer");
        var keptQ = q ? q.value : "", keptA = a ? a.value : "";
        renderBridge();
        if(keptQ && $("caiBridgeQuestion")) $("caiBridgeQuestion").value = keptQ;
        if(keptA && $("caiPasteAnswer")) $("caiPasteAnswer").value = keptA;
        return;
      }
      if(t.id === "caiSaveCfg"){ saveSettings(); return; }
      if(t.id === "caiClearKey"){
        CoachAIConfig.clearKey();
        renderSettings(); renderAvailability();
        return;
      }
      if(t.id === "caiClearChat"){
        CoachAIChat.clear();
        pending = [];
        renderMessages(); renderProposals();
        return;
      }
      if(t.id === "caiToggleSettings"){
        var panel = $("caiSettings");
        if(panel) panel.classList.toggle("cai-hidden");
        return;
      }

      var accept = t.getAttribute("data-cai-accept");
      if(accept !== null){ decide(Number(accept), true); return; }
      var refuse = t.getAttribute("data-cai-refuse");
      if(refuse !== null){ decide(Number(refuse), false); return; }
    });

    var input = $("caiInput");
    if(input){
      input.addEventListener("keydown", function(ev){
        // Entrée envoie, Maj+Entrée fait un retour à la ligne. Sur iPhone le
        // clavier n'a pas de Maj pratique : le bouton Envoyer reste la voie
        // principale, celle-ci est un raccourci clavier physique.
        if(ev.key === "Enter" && !ev.shiftKey){ ev.preventDefault(); send(); }
      });
    }
  };
})();
