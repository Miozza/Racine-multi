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

  var pending = [];   // propositions en attente de décision
  var busy = false;

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
      + "<p>Il lit ton historique, tes notes et ta progression réelle. Demande-lui de regarder un mouvement, "
      + "d'ajuster une séance, ou d'écrire ta semaine.</p>"
      + "<p class='cai-empty-hint'>« Mon développé couché stagne depuis un mois, qu'est-ce que tu vois ? »<br>"
      + "« Écris-moi la semaine 3, j'ai seulement 3 jours cette semaine. »<br>"
      + "« Mon épaule gauche accroche au strict press, change-moi ça. »</p>"
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
      + "<p class='cai-hint'>Elle reste sur cet appareil. Elle n'entre jamais dans un export de profil, "
      +   "ni dans un lien de prescription. Efface-la si tu prêtes ton téléphone.</p>"
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
    var banner = $("caiUnavailable"), composer = $("caiComposer");
    if(!banner || !composer) return;
    var reason = CoachAIConfig.unavailableReason();
    if(reason){
      banner.style.display = "";
      banner.innerHTML = "<p>" + esc(reason) + "</p>";
      composer.style.display = "none";
    } else {
      banner.style.display = "none";
      composer.style.display = "";
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
