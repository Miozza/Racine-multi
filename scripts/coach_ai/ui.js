// Racine — Coach IA : l'écran.
//
// Propriétaire de la vue « Coach IA » au sens de docs/ARCHITECTURE.md :
// conversation, carnet du coach, cartes de proposition, et le réglage de la
// clé API. Aucune autre vue ne rend ces éléments, et celle-ci ne rend rien qui
// appartienne à une autre (elle n'affiche pas une séance : elle propose,
// l'athlète accepte, et c'est WOD+ / Séance qui affichent le résultat comme
// n'importe quel programme).
//
// Le fil est TOUJOURS rendu depuis la mémoire (CoachAIChat.turns()) : ce qui
// est à l'écran est ce qui est stocké, réponses du coach et décisions
// comprises. Avant la V5.2.11, les réponses n'étaient pas réaffichées et le
// coach semblait avoir tout oublié en revenant sur l'écran.
//
// Mobile d'abord : le développement se fait depuis un iPhone et l'usage aussi.
// Une colonne, gros boutons, rien qui demande un curseur.
(function(){
  "use strict";

  var api = window.CoachAIUI = window.CoachAIUI || {};

  var busy = false;
  var bridgeIntent = "libre";  // intention choisie dans le mode copier-coller

  // Raccourcis du mode API : les questions qu'on pose vraiment entre deux
  // séries. Le coach a déjà aujourd'hui et demain dans son contexte.
  var QUICK = [
    {label: "Ma séance d'aujourd'hui", text: "Qu'est-ce que j'ai aujourd'hui ? Donne-moi les points d'attention de la séance."},
    {label: "Ma séance de demain", text: "Qu'est-ce qui est prévu demain, et comment je m'y prépare ?"},
    {label: "Bilan de la semaine", text: "Fais le bilan de ma semaine : ce qui a bien marché, ce qui coince, et ce que tu ajusterais."},
    {label: "Ce qui stagne", text: "Quels mouvements stagnent dans mon historique récent, et qu'est-ce que tu proposes ?"}
  ];

  // Deux chemins vers le même coach :
  //  - "pont"  : Racine écrit le prompt, tu le colles dans Claude, tu recolles
  //              la réponse. Passe par l'abonnement, ne coûte rien de plus.
  //  - "api"   : appel direct, facturé au jeton. Actif SEULEMENT si une clé est
  //              enregistrée. Sans clé, il n'existe pas.
  // Les deux aboutissent au même fil et aux mêmes cartes Accepter / Refuser.
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

  // Nom de l'assistant utilisé, pour les libellés seulement. Le prompt, lui,
  // ne nomme aucun fournisseur — c'est ce qui le rend portable.
  function ia(){
    try{ return CoachAIConfig.assistantLabel(); }catch(e){ return "ton IA"; }
  }

  // Rendu du texte du modèle : paragraphes, puces, listes numérotées, titres
  // courts et **gras**. Volontairement pas de moteur Markdown — tout passe
  // par esc() AVANT la mise en forme, donc rien du modèle n'est interprété
  // comme du HTML.
  function inline(text){
    return esc(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
  function formatText(text){
    var lines = String(text || "").split(/\n+/);
    var html = "";
    var list = "";
    function close(){ if(list){ html += "</" + list + ">"; list = ""; } }
    lines.forEach(function(raw){
      var line = str(raw);
      if(!line) return;
      var bullet = /^[-•*]\s+/.test(line);
      var numbered = /^\d+[.)]\s+/.test(line);
      var heading = /^#{1,4}\s+/.test(line);
      if(bullet || numbered){
        var want = bullet ? "ul" : "ol";
        if(list !== want){ close(); html += "<" + want + " class='cai-list'>"; list = want; }
        html += "<li>" + inline(line.replace(/^([-•*]|\d+[.)])\s+/, "")) + "</li>";
        return;
      }
      close();
      if(heading) html += "<p class='cai-h'>" + inline(line.replace(/^#{1,4}\s+/, "")) + "</p>";
      else html += "<p>" + inline(line) + "</p>";
    });
    close();
    return html;
  }

  // ── Dates ──────────────────────────────────────────────────────────────

  function dayKey(iso){
    if(!iso) return "";
    try{ var d = new Date(iso); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }catch(e){ return ""; }
  }
  function dayLabel(iso){
    if(!iso) return "Plus tôt";
    try{
      var d = new Date(iso), now = new Date();
      var y = new Date(now); y.setDate(now.getDate() - 1);
      if(dayKey(iso) === dayKey(now.toISOString())) return "Aujourd'hui";
      if(dayKey(iso) === dayKey(y.toISOString())) return "Hier";
      return d.toLocaleDateString("fr-CA", {weekday: "short", day: "numeric", month: "short"});
    }catch(e){ return ""; }
  }
  function timeLabel(iso){
    if(!iso) return "";
    try{ return new Date(iso).toLocaleTimeString("fr-CA", {hour: "2-digit", minute: "2-digit"}); }catch(e){ return ""; }
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

  // ── En-tête : qui répond, et ce qu'il a en mémoire ─────────────────────

  function renderHeader(){
    var status = $("caiStatus");
    if(status){
      if(mode() === "api"){
        var cfg = CoachAIConfig.get();
        var info = CoachAIConfig.modelInfo(cfg.model);
        var label = str(info.label).split("—").pop().trim() || cfg.model;
        status.innerHTML = "<span class='cai-dot cai-dot-on'></span>Direct · " + esc(label);
      } else {
        status.innerHTML = "<span class='cai-dot'></span>Copier-coller · " + esc(ia());
      }
    }
    var count = $("caiMemoryCount");
    if(count){
      var n = window.CoachAIChat ? CoachAIChat.memory().length : 0;
      count.textContent = n ? String(n) : "";
    }
  }

  // ── Le fil ─────────────────────────────────────────────────────────────

  function proposalCard(turnId, p, index){
    var d = CoachAIPatch.describe(p);
    var status = str(p.status) || "pending";
    var actions = status === "pending"
      ? "<div class='cai-patch-actions'>"
        + "<button type='button' class='cai-btn cai-btn-accept' data-cai-accept='" + esc(turnId + ":" + index) + "'>Accepter</button>"
        + "<button type='button' class='cai-btn cai-btn-refuse' data-cai-refuse='" + esc(turnId + ":" + index) + "'>Refuser</button>"
        + "</div>"
      : "<div class='cai-patch-state cai-patch-" + esc(status) + "'>" + (status === "accepted" ? "Acceptée" : "Refusée") + "</div>";
    return "<div class='cai-patch" + (status !== "pending" ? " cai-patch-done" : "") + "'>"
      + "<div class='cai-patch-head'><span class='cai-patch-tag'>Proposition</span>" + esc(d.title) + "</div>"
      + "<div class='cai-patch-body'>" + d.lines.map(function(l){ return "<p>" + esc(l) + "</p>"; }).join("") + "</div>"
      + (d.footer && status === "pending" ? "<div class='cai-patch-foot'>" + esc(d.footer) + "</div>" : "")
      + actions
      + "</div>";
  }

  function turnHtml(t){
    var via = t.via === "pont" ? "<span class='cai-via'>copier-coller</span>" : "";
    if(t.role === "user"){
      return "<div class='cai-row cai-row-me'><div class='cai-msg cai-msg-me'>" + formatText(t.text)
        + "<div class='cai-meta'>" + via + esc(timeLabel(t.at)) + "</div></div></div>";
    }
    var html = "<div class='cai-row cai-row-coach'>"
      + "<div class='cai-coach-head'><span class='cai-avatar'>C</span><span class='cai-coach-name'>Coach</span>"
      + "<span class='cai-meta'>" + via + esc(timeLabel(t.at)) + "</span></div>";
    if(str(t.text)) html += "<div class='cai-msg cai-msg-coach'>" + formatText(t.text) + "</div>";
    (t.memos || []).forEach(function(m){
      html += "<div class='cai-memo'><span class='cai-memo-tag'>Retenu</span>" + esc(m) + "</div>";
    });
    (t.proposals || []).forEach(function(p, i){ html += proposalCard(t.id, p, i); });
    html += "<button type='button' class='cai-cc-link' data-cai-cc='" + esc(t.id) + "'>→ Claude Code</button>";
    return html + "</div>";
  }

  function emptyHtml(){
    var api = mode() === "api";
    return "<div class='cai-empty'>"
      + "<div class='cai-empty-mark'>C</div>"
      + "<p class='cai-empty-title'>Ton coach</p>"
      + "<p>Il lit ton historique, tes notes, ta progression par mouvement et les séances prévues. "
      + "Il propose — remplacer un mouvement, ajuster un format, écrire une semaine — et rien ne change sans ton accord.</p>"
      + "<p class='cai-empty-hint'>" + (api
          ? "Il se souvient de vos derniers échanges, et garde dans son carnet ce qui compte sur la durée."
          : "Suis les trois étapes ci-dessous. Le prompt contient déjà tout ce que " + esc(ia()) + " doit savoir, y compris vos derniers échanges.")
      + "</p></div>";
  }

  function renderMessages(){
    var host = $("caiMessages");
    if(!host) return;
    var turns = window.CoachAIChat ? CoachAIChat.turns() : [];
    if(!turns.length){ host.innerHTML = emptyHtml(); return; }
    var html = "", lastDay = null;
    turns.forEach(function(t){
      if(t.role === "system") return;
      var key = dayKey(t.at);
      if(key !== lastDay){
        html += "<div class='cai-day'><span>" + esc(dayLabel(t.at)) + "</span></div>";
        lastDay = key;
      }
      html += turnHtml(t);
    });
    host.innerHTML = html;
    host.scrollTop = host.scrollHeight;
  }

  // Messages éphémères (confirmations, erreurs) : affichés, jamais stockés.
  function appendBubble(cls, html){
    var host = $("caiMessages");
    if(!host) return null;
    var empty = host.querySelector(".cai-empty");
    if(empty) empty.remove();
    var div = document.createElement("div");
    div.className = "cai-row cai-row-system";
    div.innerHTML = "<div class='cai-msg " + cls + "'>" + html + "</div>";
    host.appendChild(div);
    host.scrollTop = host.scrollHeight;
    return div;
  }
  function appendThinking(){
    var host = $("caiMessages");
    if(!host) return null;
    var div = document.createElement("div");
    div.className = "cai-row cai-row-coach cai-thinking";
    div.innerHTML = "<div class='cai-coach-head'><span class='cai-avatar'>C</span><span class='cai-coach-name'>Coach</span></div>"
      + "<div class='cai-msg cai-msg-coach'><span class='cai-typing'><i></i><i></i><i></i></span>"
      + "<span class='cai-typing-text'>Il lit ton programme et ton historique</span></div>";
    host.appendChild(div);
    host.scrollTop = host.scrollHeight;
    return div;
  }

  // ── Décision sur une proposition ───────────────────────────────────────

  function decide(ref, accepted){
    var parts = String(ref).split(":");
    var turnId = parts[0], index = Number(parts[1]);
    var patch = CoachAIChat.findProposal(turnId, index);
    if(!patch || patch.status !== "pending") return;

    var result = accepted ? CoachAIPatch.apply(patch) : CoachAIPatch.refuse(patch);
    if(!accepted || (result && result.ok)) CoachAIChat.setProposalStatus(turnId, index, accepted ? "accepted" : "refused");
    renderMessages();

    if(accepted && result && result.ok){
      appendBubble("cai-msg-system cai-ok", formatText(result.message || "Appliqué."));
      // Les vues qui montrent la séance doivent refléter le changement tout
      // de suite, sinon l'athlète doute que ça ait marché.
      try{ if(typeof renderAll === "function") renderAll(); }catch(e){}
      try{ if(typeof renderCycle === "function") renderCycle(); }catch(e){}
    } else if(accepted){
      appendBubble("cai-msg-system cai-err", formatText((result && result.error) || "Application impossible."));
    }
  }

  // ── Envoi (mode API) ───────────────────────────────────────────────────

  function setBusy(state){
    busy = state;
    var btn = $("caiSend"), input = $("caiInput");
    if(btn){ btn.disabled = state; btn.textContent = state ? "…" : "Envoyer"; }
    if(input) input.disabled = state;
    var quick = $("caiQuick");
    if(quick) quick.classList.toggle("cai-disabled", !!state);
  }

  function autoGrow(el){
    if(!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  async function send(textOverride){
    if(busy) return;
    var input = $("caiInput");
    var text = str(textOverride != null ? textOverride : (input && input.value));
    if(!text) return;

    if(input){ input.value = ""; autoGrow(input); }
    setBusy(true);

    // Le tour de l'athlète est écrit par CoachAIChat.send avant l'appel : on
    // le montre tout de suite en relisant le fil.
    var thinking = null;
    var sending = CoachAIChat.send(text);
    renderMessages();
    thinking = appendThinking();

    try{
      var out = await sending;
      if(thinking) thinking.remove();
      renderMessages();
      if(!str(out.text) && !(out.proposals || []).length && !(out.memos || []).length){
        appendBubble("cai-msg-system", "<p>Réponse vide.</p>");
      }
    }catch(e){
      if(thinking) thinking.remove();
      renderMessages();
      appendBubble("cai-msg-system cai-err", formatText(e && e.message ? e.message : String(e)));
    }finally{
      setBusy(false);
      renderHeader();
    }
  }

  function renderQuick(){
    var host = $("caiQuick");
    if(!host) return;
    if(mode() !== "api"){ host.innerHTML = ""; host.style.display = "none"; return; }
    host.style.display = "";
    host.innerHTML = QUICK.map(function(q, i){
      return "<button type='button' class='cai-chip' data-cai-quick='" + i + "'>" + esc(q.label) + "</button>";
    }).join("");
  }

  // ── Carnet du coach ────────────────────────────────────────────────────

  function renderMemory(){
    var host = $("caiMemory");
    if(!host || !window.CoachAIChat) return;
    var facts = CoachAIChat.memory().slice().reverse();
    host.innerHTML = sheetHead("Carnet du coach", facts.length + " / " + CoachAIChat.MAX_FACTS + " faits")
      + "<p class='cai-hint cai-sheet-intro'>Ce que le coach garde d'une conversation à l'autre : blessures, contraintes, objectifs, préférences. "
      +   "Relu à chaque message. Il note lui-même ; tu peux ajouter ou effacer.</p>"
      + (facts.length
          ? "<ul class='cai-facts'>" + facts.map(function(f){
              return "<li class='cai-fact'><div><span class='cai-fact-text'>" + esc(f.text) + "</span>"
                + "<span class='cai-fact-meta'>" + esc(str(f.at).slice(0, 10)) + (f.source === "athlete" ? " · noté par toi" : " · noté par le coach") + "</span></div>"
                + "<button type='button' class='cai-fact-del' data-cai-forget='" + esc(f.id) + "' aria-label='Effacer ce fait'>✕</button></li>";
            }).join("") + "</ul>"
          : "<p class='cai-hint cai-hint-empty'>Carnet vide pour l'instant.</p>")
      + "<div class='cai-fact-add'>"
      +   "<input id='caiFactInput' class='cai-input' maxlength='240' placeholder='Ajouter un fait (ex. « pas de sauts jusqu'en novembre »)'>"
      +   "<button type='button' class='cai-btn cai-btn-small' id='caiFactAdd'>Ajouter</button>"
      + "</div>"
      + (facts.length ? "<button type='button' class='cai-link-btn' id='caiMemoryClear'>Vider le carnet</button>" : "");
  }

  // ── Bilan « suggéré vs fait » ──────────────────────────────────────────
  // Calculé par Racine (CoachAIContext.gapReport), sans appel au modèle :
  // l'afficher ne coûte rien. Le coach ne le commente que si on le demande.
  var gapWeeks = 8;
  function signed(v, unit){ return (v > 0 ? "+" : "") + v + unit; }
  function renderGap(){
    var host = $("caiGap");
    if(!host || !window.CoachAIContext) return;
    var rep = CoachAIContext.gapReport({weeks: gapWeeks});
    var rows = rep.lignes;
    var flagged = rows.filter(function(r){ return r.signal; });
    host.innerHTML = sheetHead("Bilan suggéré vs fait", gapWeeks + " dernières semaines · calculé par Racine, sans IA")
      + "<div class='cai-seg'>" + [4, 8, 16].map(function(w){
          return "<button type='button' class='cai-seg-btn" + (w === gapWeeks ? " cai-seg-on" : "") + "' data-cai-gapweeks='" + w + "'>" + w + " sem.</button>";
        }).join("") + "</div>"
      + "<p class='cai-hint'>Écart = charge faite − charge suggérée <strong>avant</strong> la séance. Un écart répété dit si le moteur est trop prudent ou trop ambitieux pour toi.</p>"
      + (rows.length ? "" : "<p class='cai-hint cai-hint-empty'>Aucune série avec une suggestion enregistrée sur cette période.</p>")
      + (flagged.length ? "<div class='cai-card-title'>À regarder</div>" : "")
      + flagged.concat(rows.filter(function(r){ return !r.signal; })).map(function(r){
          var dir = r.ecartMoyenLb > 0.4 ? "up" : (r.ecartMoyenLb < -0.4 ? "down" : "eq");
          return "<div class='cai-gap" + (r.signal ? " cai-gap-flag" : "") + "'>"
            + "<div class='cai-gap-head'><span class='cai-gap-name'>" + esc(r.mouvement) + "</span>"
            + "<span class='cai-gap-delta cai-gap-" + dir + "'>" + (dir === "eq" ? "= suggéré" : signed(r.ecartMoyenLb, " lb") + " <small>(" + signed(r.ecartMoyenPct, " %") + ")</small>") + "</span></div>"
            + "<div class='cai-gap-meta'>" + r.seances + " séance(s) · ↑ " + r.auDessus + " · = " + r.egal + " · ↓ " + r.enDessous
            + (r.rpeMoyen != null ? " · RPE " + r.rpeMoyen : "")
            + (r.derniere ? " · dernière : " + r.derniere.fait + " lb faits, " + r.derniere.suggere + " suggérés" : "") + "</div>"
            + (r.signal ? "<div class='cai-gap-signal'>" + esc(r.signal) + "</div>" : (r.suivie ? "<div class='cai-gap-ok'>Suggestion suivie</div>" : ""))
            + "</div>";
        }).join("")
      + (rows.length ? "<div class='cai-sheet-actions'>"
          + (mode() === "api" ? "<button type='button' class='cai-btn cai-btn-primary' id='caiGapAsk'>Demander au coach</button>" : "")
          + "<button type='button' class='cai-btn' id='caiGapCC'>→ Claude Code</button>"
          + "</div>" : "");
  }

  // ── Demande pour Claude Code ───────────────────────────────────────────
  // Rédigée ICI à partir de la conversation et des données calculées par
  // Racine — aucun appel au modèle. Déposée dans la sauvegarde GitHub
  // (racine/demandes/) pour qu'une session Claude Code la lise, ou copiée.
  var requestTitle = "";
  function appLine(){
    var bits = [];
    try{ var p = (typeof focus === "function") ? focus() : null; if(p && p.label) bits.push("Programme actif : " + p.label + " (" + (typeof activeProgramId === "function" ? activeProgramId() : "") + ")"); }catch(e){}
    try{ bits.push("semaine S" + state.week); }catch(e){}
    return bits.join(" · ");
  }
  function mentionedGapRows(text){
    var rows = window.CoachAIContext ? CoachAIContext.gapReport({weeks: 8}).lignes : [];
    var low = String(text || "").toLowerCase();
    return rows.filter(function(r){ return low.indexOf(r.mouvement.toLowerCase()) >= 0; });
  }
  function gapMarkdown(rows){
    return rows.map(function(r){
      return "- " + r.mouvement + " : " + r.seances + " séance(s), écart moyen " + signed(r.ecartMoyenLb, " lb") + " (" + signed(r.ecartMoyenPct, " %") + "), "
        + "↑" + r.auDessus + " =" + r.egal + " ↓" + r.enDessous + (r.rpeMoyen != null ? ", RPE moyen " + r.rpeMoyen : "") + (r.signal ? " — " + r.signal : "");
    }).join("\n");
  }
  function buildRequest(source){
    var date = new Date().toISOString().slice(0, 10);
    var name = "";
    try{ name = (CoachProfiles.getActive() || {}).name || ""; }catch(e){}
    var parts = ["# Demande Racine → Claude Code", "",
      "Date : " + date + (name ? " · Profil : " + name : "") + " · Racine " + (window.APP_VERSION || ""), appLine(), "",
      "## Ce que je veux", "", "(Écris ici, en une ou deux phrases, le changement voulu.)", ""];
    var context = "";
    if(source && source.turnId){
      var turns = CoachAIChat.turns();
      var idx = -1;
      turns.forEach(function(t, i){ if(t.id === source.turnId) idx = i; });
      var coach = idx >= 0 ? turns[idx] : null;
      var user = null;
      for(var i = idx - 1; i >= 0; i--){ if(turns[i].role === "user"){ user = turns[i]; break; } }
      parts.push("## Échange avec Coach IA", "");
      if(user) parts.push("**Athlète** (" + str(user.at).slice(0, 16).replace("T", " ") + ") :", "", user.text, "");
      if(coach){
        parts.push("**Coach** :", "", coach.text || "(pas de texte)", "");
        (coach.proposals || []).forEach(function(p){
          parts.push("- Proposition : " + CoachAIPatch.describe(p).title + " — " + CoachAIPatch.describe(p).lines.join(" · ") + " (" + ({accepted: "acceptée", refused: "refusée", pending: "en attente"}[p.status] || p.status) + ")");
        });
        if((coach.proposals || []).length) parts.push("");
      }
      context = (user ? user.text : "") + " " + (coach ? coach.text : "");
      requestTitle = user ? user.text : "échange coach";
      var rows = mentionedGapRows(context);
      if(rows.length) parts.push("## Données calculées par Racine (suggéré vs fait, 8 semaines)", "", gapMarkdown(rows), "");
    } else if(source && source.gap){
      var all = CoachAIContext.gapReport({weeks: gapWeeks}).lignes;
      var flagged = all.filter(function(r){ return r.signal; });
      requestTitle = "bilan suggéré vs fait";
      parts.push("## Bilan suggéré vs fait (" + gapWeeks + " semaines, calculé par Racine)", "",
        "Écart = charge faite − charge suggérée avant la séance.", "",
        gapMarkdown(flagged.length ? flagged : all.slice(0, 12)), "");
    }
    parts.push("## Rappels pour Claude Code", "",
      "- Lire `CLAUDE.md` avant tout. Les charges restent au moteur : aucun poids en dur.",
      "- Un réglage propre à un mouvement va dans `scripts/charge/movement_tuning.js` ; un changement de programme dans `programs/`.",
      "- Historique complet et contexte de l'athlète : dépôt `racine-sauvegarde`, dossier `racine/`.");
    return parts.join("\n");
  }
  function renderRequest(source){
    var host = $("caiRequest");
    if(!host) return;
    var md = buildRequest(source);
    var gh = !!(window.RacineGitHubBackup && RacineGitHubBackup.isActiveTarget && RacineGitHubBackup.isActiveTarget());
    host.innerHTML = sheetHead("Demande pour Claude Code", "Rédigée par Racine, sans IA · modifiable")
      + "<p class='cai-hint'>Complète « Ce que je veux », puis " + (gh ? "envoie-la dans ta sauvegarde GitHub (<code>racine/demandes/</code>) : ta prochaine session Claude Code la lira." : "copie-la dans ta conversation avec Claude ou Claude Code.") + "</p>"
      + "<textarea id='caiRequestText' class='cai-textarea cai-request-text' rows='16' spellcheck='false'>" + esc(md) + "</textarea>"
      + "<p id='caiRequestStatus' class='cai-hint'></p>"
      + "<div class='cai-sheet-actions'>"
      +   (gh ? "<button type='button' class='cai-btn cai-btn-primary' id='caiRequestSend'>Envoyer sur GitHub</button>" : "")
      +   "<button type='button' class='cai-btn" + (gh ? "" : " cai-btn-primary") + "' id='caiRequestCopy'>Copier</button>"
      + "</div>";
  }
  async function sendRequest(){
    var box = $("caiRequestText"), st = $("caiRequestStatus");
    if(!box) return;
    if(/\(Écris ici, en une ou deux phrases, le changement voulu\.\)/.test(box.value)){
      if(st){ st.textContent = "Complète d'abord « Ce que je veux »."; st.className = "cai-hint cai-err"; }
      return;
    }
    if(st){ st.textContent = "Envoi…"; st.className = "cai-hint"; }
    var out = await RacineGitHubBackup.pushRequest(requestTitle, box.value);
    if(out.ok){
      closePanels();
      appendBubble("cai-msg-system cai-ok", "<p>Demande déposée : <code>" + esc(out.path) + "</code>. Dis à Claude Code de lire tes demandes dans <code>racine-sauvegarde</code>.</p>");
    } else if(st){ st.textContent = out.error; st.className = "cai-hint cai-err"; }
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
      +   "<span class='cai-step-text'>Copie, colle dans " + esc(ia()) + ", reviens</span>"
      + "</div>"
      + "<button type='button' class='cai-btn cai-btn-accept cai-btn-wide' id='caiCopyPrompt'>Copier le prompt</button>"
      + "<textarea id='caiPromptFallback' class='cai-textarea cai-fallback' rows='4' readonly style='display:none'></textarea>"

      + "<div class='cai-bridge-step'>"
      +   "<span class='cai-step-num'>3</span>"
      +   "<span class='cai-step-text'>Colle sa réponse complète ici</span>"
      + "</div>"
      + "<textarea id='caiPasteAnswer' class='cai-textarea' rows='3' "
      +   "placeholder='Colle toute la réponse de " + esc(ia()) + ", texte compris.'></textarea>"
      + "<button type='button' class='cai-btn cai-btn-wide' id='caiReadAnswer'>Lire la réponse</button>";
  }

  async function copyPrompt(){
    var extra = $("caiBridgeQuestion");
    var extraText = extra ? str(extra.value) : "";
    var prompt = CoachAIBridge.buildPrompt(bridgeIntent, extraText);
    var ok = await copyToClipboard(prompt, $("caiPromptFallback"));
    // La question entre dans le fil : la réponse recollée s'y rattachera, et
    // le prochain prompt rendra cet échange à l'IA.
    var label = extraText;
    if(!label){
      var intent = CoachAIBridge.intents().filter(function(i){ return i.key === bridgeIntent; })[0];
      label = intent ? intent.label : "Question";
    }
    CoachAIChat.addTurn({role: "user", text: label, via: "pont"});
    if(extra) extra.value = "";
    renderMessages();
    appendBubble("cai-msg-system " + (ok ? "cai-ok" : ""),
      ok ? "<p>Prompt copié. Colle-le dans " + esc(ia()) + ", puis reviens avec sa réponse.</p>"
         : "<p>Copie automatique refusée par le navigateur. Le prompt est affiché ci-dessous : sélectionne-le et copie-le à la main.</p>");
  }

  function readAnswer(){
    var box = $("caiPasteAnswer");
    if(!box) return;
    var raw = str(box.value);
    if(!raw){
      appendBubble("cai-msg-system", "<p>Colle d'abord la réponse de " + esc(ia()) + ".</p>");
      return;
    }

    var out = CoachAIBridge.parseResponse(raw);
    var memos = [];
    (out.memos || []).forEach(function(m){
      var r = CoachAIChat.remember(m, "coach");
      if(r.ok) memos.push(r.fact.text);
    });
    CoachAIChat.addTurn({
      role: "coach", text: out.text, via: "pont", memos: memos,
      proposals: (out.ok ? (out.proposals || []) : []).map(function(p){ return {name: p.name, input: p.input, status: "pending"}; })
    });
    try{ if(window.RacineGitHubBackup) RacineGitHubBackup.schedule("coach"); }catch(e){}
    renderMessages();
    renderHeader();

    if(!out.ok){
      appendBubble("cai-msg-system cai-err", formatText(out.error));
      return;
    }
    if(!str(out.text) && !(out.proposals || []).length && !memos.length){
      appendBubble("cai-msg-system", "<p>Rien de lisible dans ce qui a été collé.</p>");
    }
    // Un type inventé par le modèle est signalé, jamais deviné ni appliqué.
    if(out.rejected && out.rejected.length){
      appendBubble("cai-msg-system cai-err",
        formatText("Proposition(s) ignorée(s), type inconnu : " + out.rejected.join(", ")));
    }

    box.value = "";
  }

  // ── Réglages (clé API, modèle, mémoire) ────────────────────────────────

  // En-tête commun des panneaux (Réglages, Carnet) : ils s'ouvrent en
  // feuille par-dessus la conversation, plus dans le fil — ouverts dans le
  // fil, ils l'écrasaient et se coupaient eux-mêmes (captures iPhone).
  function sheetHead(title, sub){
    return "<div class='cai-sheet-head'>"
      + "<div><div class='cai-sheet-title'>" + esc(title) + "</div>" + (sub ? "<div class='cai-sheet-sub'>" + sub + "</div>" : "") + "</div>"
      + "<button type='button' class='cai-sheet-close' data-cai-close='1' aria-label='Fermer'>Fermer</button>"
      + "</div>";
  }
  function card(title, body){
    return "<section class='cai-card'><div class='cai-card-title'>" + esc(title) + "</div>" + body + "</section>";
  }
  var EFFORT_LABELS = {low: "Rapide", medium: "Normale", high: "Approfondie", xhigh: "Maximale"};

  function renderSettings(){
    var host = $("caiSettings");
    if(!host) return;
    var cfg = CoachAIConfig.get();
    var hasKey = !!str(cfg.apiKey);
    var info = CoachAIConfig.modelInfo(cfg.model);
    var spend = CoachAIConfig.monthSpend();
    var usage = window.CoachAIChat ? CoachAIChat.usage() : {turns: 0, bytes: 0, facts: 0, maxTurns: 0, maxFacts: 0};
    var archived = !!(window.RacineGitHubBackup && RacineGitHubBackup.isActiveTarget && RacineGitHubBackup.isActiveTarget());
    // Un modèle saisi hors liste reste sélectionnable tel quel.
    var models = CoachAIConfig.models();
    if(!models.some(function(m){ return m.id === cfg.model; })) models.push({id: cfg.model, label: cfg.model});
    var budget = Number(cfg.monthlyBudget) || 0;
    var pct = budget > 0 ? Math.min(100, Math.round(spend.usd / budget * 100)) : 0;

    host.innerHTML = sheetHead("Réglages Coach IA", mode() === "api" ? "Conversation directe" : "Copier-coller")

      + card("Connexion",
          "<label class='cai-label' for='caiKey'>Clé API Anthropic</label>"
        + (hasKey
            ? "<div class='cai-keyline'><span class='cai-pill cai-pill-ok'>Clé enregistrée</span><span class='cai-keypreview'>" + esc(CoachAIConfig.keyPreview()) + "</span></div>"
              + (/^sk-ant-api/.test(cfg.apiKey) ? "" : "<p class='cai-hint'>Préfixe inhabituel (une clé API commence d'ordinaire par sk-ant-api). Si l'API la refuse, le message d'erreur le dira au premier envoi.</p>")
            : "<div class='cai-keyline'><span class='cai-pill'>Aucune clé</span><span class='cai-keypreview'>Coach IA fonctionne en copier-coller</span></div>")
        + "<input id='caiKey' class='cai-input' type='password' autocomplete='off' spellcheck='false' "
        +   "placeholder='" + (hasKey ? "Coller une nouvelle clé pour la remplacer" : "sk-ant-api03-…") + "'>"
        + "<p class='cai-hint'>Optionnelle et facturée à l'usage (un abonnement Pro ne la couvre pas). Elle reste sur cet appareil : jamais dans un export ni dans un lien.</p>"
        + "<label class='cai-label' for='caiAssistant'>IA utilisée en copier-coller</label>"
        + "<select id='caiAssistant' class='cai-input cai-select'>"
        +   CoachAIConfig.assistants().map(function(a){
              return "<option value='" + esc(a.key) + "'" + (cfg.assistant === a.key ? " selected" : "") + ">" + esc(a.label) + "</option>";
            }).join("")
        + "</select>"
        + "<p class='cai-hint'>Change seulement les libellés : le prompt marche pareil avec n'importe quelle IA.</p>")

      + card("Modèle",
          "<select id='caiModel' class='cai-input cai-select' aria-label='Modèle'>"
        +   models.map(function(m){
              return "<option value='" + esc(m.id) + "'" + (cfg.model === m.id ? " selected" : "") + ">" + esc(m.label) + "</option>";
            }).join("")
        + "</select>"
        + "<ul class='cai-model-notes'>"
        +   "<li><strong>Haiku 5.5</strong> ≈ 0,1 ¢ — discuter, lire ton programme et ton historique</li>"
        +   "<li><strong>Sonnet 5.5</strong> ≈ 2 ¢ — réécrire une semaine</li>"
        +   "<li><strong>Opus 5.5</strong> ≈ 4 ¢ — le plus fort</li>"
        + "</ul>"
        + (info.effort
            ? "<label class='cai-label' for='caiEffort'>Réflexion</label>"
              + "<select id='caiEffort' class='cai-input cai-select'>"
              +   ["low","medium","high","xhigh"].map(function(e){
                    return "<option value='" + e + "'" + (cfg.effort === e ? " selected" : "") + ">" + EFFORT_LABELS[e] + "</option>";
                  }).join("")
              + "</select>"
              + "<p class='cai-hint'>« Normale » suffit pour discuter. Plus haut = plus lent et plus cher.</p>"
            : "")
        + "<p class='cai-hint'>Les poids viennent toujours du moteur de Racine, quel que soit le modèle.</p>")

      + card("Dépense du mois",
          "<div class='cai-spend'><span class='cai-spend-amount'>" + spend.usd.toFixed(2) + " $</span>"
        +   "<span class='cai-spend-of'>" + (budget > 0 ? "sur " + budget.toFixed(2) + " $" : "sans plafond") + " · " + spend.calls + " appel(s)</span></div>"
        + (budget > 0 ? "<div class='cai-meter'><span style='width:" + pct + "%'></span></div>" : "")
        + "<label class='cai-label' for='caiBudget'>Plafond mensuel ($)</label>"
        + "<input id='caiBudget' class='cai-input' type='number' inputmode='decimal' min='0' step='0.5' value='" + esc(String(cfg.monthlyBudget)) + "'>"
        + "<p class='cai-hint'>Estimation calculée sur cet appareil ; la facture Anthropic fait foi. 0 = pas de plafond.</p>")

      + card("Mémoire",
          "<div class='cai-stats'>"
        +   "<div><span class='cai-stat'>" + usage.turns + "<small> / " + usage.maxTurns + "</small></span><span class='cai-stat-label'>messages</span></div>"
        +   "<div><span class='cai-stat'>" + usage.facts + "<small> / " + usage.maxFacts + "</small></span><span class='cai-stat-label'>faits au carnet</span></div>"
        +   "<div><span class='cai-stat'>" + Math.max(1, Math.round(usage.bytes / 1024)) + "<small> Ko</small></span><span class='cai-stat-label'>sur l'appareil</span></div>"
        + "</div>"
        + "<p class='cai-hint'>" + (archived
            ? "✅ Chaque échange est aussi archivé dans ta sauvegarde GitHub (<code>racine/coach/</code>) : rien n'est perdu quand le téléphone oublie."
            : "Au-delà de " + usage.maxTurns + " messages, le plus ancien s'efface. Active la sauvegarde GitHub (Réglages de Racine) pour tout garder.")
        + "</p>")

      + "<div class='cai-sheet-actions'>"
      +   "<button type='button' class='cai-btn cai-btn-primary' id='caiSaveCfg'>Enregistrer</button>"
      +   (hasKey ? "<button type='button' class='cai-btn cai-btn-refuse' id='caiClearKey'>Effacer la clé</button>" : "")
      + "</div>";
  }

  function saveSettings(){
    var key = $("caiKey"), effort = $("caiEffort");
    var patch = {};
    // Champ vide = on garde la clé existante. Sans ça, ouvrir les réglages
    // pour changer l'effort effacerait la clé au passage.
    if(key && str(key.value)) patch.apiKey = str(key.value);
    if(effort) patch.effort = effort.value;
    var model = $("caiModel"), budget = $("caiBudget");
    if(model) patch.model = model.value;
    if(budget && str(budget.value) !== "") patch.monthlyBudget = Number(budget.value);
    var assistant = $("caiAssistant");
    if(assistant) patch.assistant = assistant.value;
    CoachAIConfig.set(patch);
    if(key) key.value = "";
    renderSettings();
    renderAvailability();   // re-rend aussi le pont, dont les libellés changent
    closePanels();
    appendBubble("cai-msg-system cai-ok", "<p>Réglages enregistrés.</p>");
  }

  // Nouvelle conversation : le fil repart à zéro, le carnet reste. Si
  // l'archive GitHub est active, les échanges non encore archivés partent
  // d'abord — sinon ils seraient perdus.
  async function newConversation(){
    var turns = CoachAIChat.turns();
    if(!turns.length) return;
    var archived = !!(window.RacineGitHubBackup && RacineGitHubBackup.isActiveTarget && RacineGitHubBackup.isActiveTarget());
    if(!confirm("Commencer une nouvelle conversation ? Le carnet du coach est conservé."
      + (archived ? " Les échanges actuels sont archivés sur GitHub avant d'être retirés du téléphone." : " Les échanges actuels seront effacés de ce téléphone."))) return;
    if(archived){
      var out = await RacineGitHubBackup.push({coachOnly: true});
      if(!out || !out.ok){
        appendBubble("cai-msg-system cai-err", formatText("Archive GitHub impossible (" + ((out && out.error) || "erreur") + "). Conversation conservée."));
        return;
      }
    }
    CoachAIChat.clear();
    renderMessages();
    renderHeader();
  }

  // ── Disponibilité ──────────────────────────────────────────────────────

  function renderAvailability(){
    var banner = $("caiUnavailable"), composer = $("caiComposer"), bridge = $("caiBridge");
    if(!banner || !composer || !bridge) return;
    var view = $("coachaiView");
    if(view) view.classList.toggle("cai-pont", mode() !== "api");

    if(mode() === "api"){
      // Clé enregistrée : conversation directe.
      banner.style.display = "none";
      composer.style.display = "";
      bridge.style.display = "none";
    } else {
      // Pas de clé : le pont. Ce n'est PAS une indisponibilité — c'est le
      // chemin normal, et il passe par l'abonnement déjà payé.
      banner.style.display = "";
      banner.innerHTML = "<p><strong>Copier-coller</strong> — aucune clé API sur cet appareil. Le prompt passe par ton abonnement "
        + esc(ia()) + ". Pour la conversation directe : ⚙ → Clé API.</p>";
      composer.style.display = "none";
      bridge.style.display = "";
      renderBridge();
    }
    renderQuick();
    renderHeader();
  }

  function togglePanel(id){
    var open = false;
    ["caiSettings", "caiMemory", "caiGap", "caiRequest"].forEach(function(other){
      var el = $(other);
      if(!el) return;
      if(other === id) el.classList.toggle("cai-hidden");
      else el.classList.add("cai-hidden");
      if(!el.classList.contains("cai-hidden")){ open = true; el.scrollTop = 0; }
    });
    var back = $("caiBackdrop");
    if(back) back.classList.toggle("cai-hidden", !open);
  }
  function closePanels(){ togglePanel(null); }

  // ── Câblage ────────────────────────────────────────────────────────────

  api.render = function(){
    if(!CoachAIConfig.isAdmin()){
      var view = $("coachaiView");
      if(view) view.innerHTML = "<div class='cai-empty'><p>Coach IA est réservé au profil admin.</p></div>";
      return;
    }
    renderMessages();
    renderSettings();
    renderMemory();
    renderAvailability();
  };

  api.bind = function(){
    var view = $("coachaiView");
    if(!view) return;

    view.addEventListener("click", function(ev){
      var t = ev.target && ev.target.closest ? ev.target.closest("button") : ev.target;
      if(!t || !t.getAttribute) return;

      if(t.id === "caiSend"){ send(); return; }
      if(t.id === "caiCopyPrompt"){ copyPrompt(); return; }
      if(t.id === "caiReadAnswer"){ readAnswer(); return; }
      if(t.id === "caiNewChat"){ newConversation(); return; }

      var quick = t.getAttribute("data-cai-quick");
      if(quick !== null && QUICK[Number(quick)]){ send(QUICK[Number(quick)].text); return; }

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
        // Geste destructif (la clé ne se réaffiche jamais) : confirmé.
        if(!confirm("Effacer la clé API de cet appareil ? Coach IA repassera en copier-coller jusqu'à ce que tu en recolles une.")) return;
        CoachAIConfig.clearKey();
        renderSettings(); renderAvailability();
        return;
      }
      if(t.getAttribute("data-cai-close") || t.id === "caiBackdrop"){ closePanels(); return; }
      if(t.id === "caiToggleSettings"){ renderSettings(); togglePanel("caiSettings"); return; }
      if(t.id === "caiToggleMemory"){ renderMemory(); togglePanel("caiMemory"); return; }
      if(t.id === "caiToggleGap"){ renderGap(); togglePanel("caiGap"); return; }
      var gw = t.getAttribute("data-cai-gapweeks");
      if(gw){ gapWeeks = Number(gw) || 8; renderGap(); return; }
      if(t.id === "caiGapAsk"){ closePanels(); send("Commente mon bilan suggéré vs fait (outil consulter_bilan) : qu'est-ce que ces écarts disent du réglage du moteur pour moi ?"); return; }
      if(t.id === "caiGapCC"){ renderRequest({gap: true}); togglePanel("caiRequest"); return; }
      var cc = t.getAttribute("data-cai-cc");
      if(cc){ renderRequest({turnId: cc}); togglePanel("caiRequest"); return; }
      if(t.id === "caiRequestSend"){ sendRequest(); return; }
      if(t.id === "caiRequestCopy"){
        var rt = $("caiRequestText");
        copyToClipboard(rt ? rt.value : "", rt).then(function(ok){
          var st = $("caiRequestStatus");
          if(st){ st.textContent = ok ? "✅ Copiée." : "Copie refusée : sélectionne le texte et copie-le à la main."; st.className = "cai-hint" + (ok ? " cai-ok" : ""); }
        });
        return;
      }

      if(t.id === "caiFactAdd"){
        var input = $("caiFactInput");
        var r = CoachAIChat.remember(input ? input.value : "", "athlete");
        if(r.ok){ renderMemory(); renderHeader(); }
        return;
      }
      var forget = t.getAttribute("data-cai-forget");
      if(forget){ CoachAIChat.forget(forget); renderMemory(); renderHeader(); return; }
      if(t.id === "caiMemoryClear"){
        if(confirm("Vider tout le carnet du coach ? La conversation n'est pas touchée.")){
          CoachAIChat.clearMemory(); renderMemory(); renderHeader();
        }
        return;
      }

      var accept = t.getAttribute("data-cai-accept");
      if(accept !== null){ decide(accept, true); return; }
      var refuse = t.getAttribute("data-cai-refuse");
      if(refuse !== null){ decide(refuse, false); return; }
    });

    document.addEventListener("keydown", function(ev){ if(ev.key === "Escape") closePanels(); });

    var input = $("caiInput");
    if(input){
      input.addEventListener("input", function(){ autoGrow(input); });
      input.addEventListener("keydown", function(ev){
        // Entrée envoie, Maj+Entrée fait un retour à la ligne. Sur iPhone le
        // clavier n'a pas de Maj pratique : le bouton Envoyer reste la voie
        // principale, celle-ci est un raccourci clavier physique.
        if(ev.key === "Enter" && !ev.shiftKey){ ev.preventDefault(); send(); }
      });
    }
  };
})();
