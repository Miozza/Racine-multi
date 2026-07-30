// Racine — note dictée par mouvement, pendant la séance guidée.
//
// Besoin : une observation qui ne rentre pas dans un chiffre (« la 3e série
// était plus dure que la 4e », « appui gauche instable »). Le RPE unique par
// mouvement ne peut pas la porter.
//
// Contrat (CLAUDE.md, docs/DATA_FLOW_CONTRACT.md, docs/STRUCTURE_CONTRACT.md) :
//  - TEXTE UNIQUEMENT. Aucun audio enregistré, aucun MediaRecorder, aucune
//    permission micro demandée par l'app. Le stockage local est la seule source
//    de vérité et n'a aucune copie serveur : des blobs audio satureraient le
//    quota au détriment de l'historique.
//  - Aucun nouveau chemin de persistance, aucun changement de schéma :
//    l'écriture passe par setGuidedResult(key,'note',…). Le reste existe déjà
//    (guidedResultCache → collectSessionResults() → state.history), et
//    renderHistory() affiche déjà r.note sous le mouvement.
//  - La note reste UNE SEULE CHAÎNE. Deux dictées sur le même mouvement se
//    concatènent avec un séparateur, elles ne se remplacent pas. Pas de
//    tableau : c'est le format que renderHistory et l'export attendent.
//  - Le moteur de charges et athlete_state ne sont pas touchés. Avis IA lit la
//    note directement dans state.history (scripts/ai/ai_export.js).
//  - Écoute déléguée au document : la séance guidée se re-rend souvent, des
//    écouteurs posés sur les boutons seraient perdus à chaque rendu.
//
// Reconnaissance vocale : jamais présumée fonctionnelle. webkitSpeechRecognition
// est présente mais inerte dans une PWA standalone iOS — l'objet existe, la
// détection de fonctionnalité réussit, et rien ne se produit. On exige donc un
// évènement de démarrage réel (onstart / onaudiostart / onspeechstart) sous
// ~1,6 s, sinon on bascule définitivement pour la session et on le dit à
// l'athlète. Le chemin fiable reste le micro du clavier iOS : ce n'est pas une
// API web, il suffit qu'un <textarea> prenne le focus.
(function(){
  "use strict";

  var api = window.CoachVoiceNote = window.CoachVoiceNote || {};

  var SEPARATOR = " · ";
  var MAX_CHUNK = 240;    // une dictée / une saisie
  var MAX_NOTE  = 1200;   // total par mouvement — garde-fou quota localStorage
  var START_TIMEOUT = 1600; // ms avant de déclarer la reconnaissance inerte

  var HINT_DEFAULT = "Touche la zone de texte, puis le micro du clavier.";
  var HINT_LISTEN  = "Écoute… parle, puis vérifie le texte.";
  var HINT_DEAD    = "Reconnaissance vocale inactive ici. Micro du clavier seulement.";

  // "unknown" tant qu'aucune tentative; "ok" après un démarrage réel;
  // "dead" définitivement pour la session après un démarrage muet.
  var recoState = "unknown";
  var reco = null, recoBlock = null, recoBase = "", recoStarted = false, recoTimer = null;
  var openKey = null;

  // ── Utilitaires ────────────────────────────────────────────────────────────
  function esc(v){
    if(typeof escHtml === "function"){
      try{ return escHtml(v); }catch(e){}
    }
    return String(v==null?"":v).replace(/[&<>"']/g, function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function cleanChunk(v){
    return String(v==null?"":v).replace(/\s+/g," ").trim().slice(0, MAX_CHUNK);
  }
  function noteParts(note){
    return String(note==null?"":note).split(/\s*·\s*/).map(function(x){
      return String(x).trim();
    }).filter(Boolean);
  }

  // ── Lecture / écriture : uniquement via le chemin existant ─────────────────
  function readNote(key){
    key = String(key==null?"":key).trim();
    if(!key) return "";
    try{
      if(typeof getGuidedResult === "function"){
        return String(getGuidedResult(key, "note", "") || "").trim();
      }
    }catch(e){}
    return "";
  }
  function writeNote(key, value){
    try{
      if(typeof setGuidedResult === "function"){
        setGuidedResult(key, "note", value);
        return true;
      }
    }catch(e){}
    return false;
  }
  // Concaténation : la dictée d'après la 5e série s'ajoute à celle d'après la 3e.
  function appendNote(key, text){
    var add = cleanChunk(text);
    if(!add) return readNote(key);
    var current = readNote(key);
    var next = current ? (current + SEPARATOR + add) : add;
    if(next.length > MAX_NOTE) next = next.slice(0, MAX_NOTE).trim();
    writeNote(key, next);
    return next;
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  function recapHtml(note){
    var parts = noteParts(note);
    if(!parts.length) return "";
    return parts.map(function(p){
      return "<span class='gvn-line'>" + esc(p) + "</span>";
    }).join("");
  }

  // Point d'accroche unique appelé par renderGuidedResultPanel().
  // `key` est la même clé que les champs poids/reps/RPE.
  function blockHtml(key, label){
    key = String(key==null?"":key).trim();
    if(!key) return "";
    var note = readNote(key);
    var parts = noteParts(note);
    var open = openKey === key;
    var aria = "Note de séance pour " + String(label==null?key:label);

    var h = "<div class='gvn-block" + (open?" is-open":"") + "' data-gvn-key='" + esc(key) + "'>";
    h += "<div class='gvn-head'>";
    h += "<button type='button' class='gvn-toggle" + (parts.length?" has-notes":"") + "'"
       + " data-gvn-toggle='1' aria-expanded='" + (open?"true":"false") + "'"
       + " aria-label='" + esc(aria) + "'>";
    h += "<span class='gvn-ico' aria-hidden='true'>🎙</span>";
    h += "<span class='gvn-toggle-label'>Note</span>";
    if(parts.length) h += "<span class='gvn-count'>" + parts.length + "</span>";
    h += "</button>";
    h += "</div>";
    h += "<div class='gvn-recap" + (parts.length?"":" hidden") + "' data-gvn-recap='1'>" + recapHtml(note) + "</div>";
    h += "<div class='gvn-panel" + (open?"":" hidden") + "' data-gvn-panel='1'>";
    h += "<textarea class='gvn-input' data-gvn-input='1' rows='2' maxlength='" + MAX_CHUNK + "'"
       + " autocapitalize='sentences' autocorrect='on' spellcheck='true'"
       + " placeholder='" + esc("ex. : 3e série plus dure que la 4e, appui gauche instable") + "'></textarea>";
    h += "<div class='gvn-actions'>";
    // La présence de l'objet ne prouve rien (iOS), mais son absence prouve que
    // rien ne marchera : dans ce cas on ne propose même pas le bouton.
    if(recoState !== "dead" && recognitionCtor()){
      h += "<button type='button' class='gvn-btn gvn-mic' data-gvn-mic='1'>Dicter</button>";
    }
    h += "<button type='button' class='gvn-btn gvn-add' data-gvn-add='1'>Ajouter</button>";
    h += "</div>";
    h += "<div class='gvn-status' data-gvn-status='1'>" + esc(recoState === "dead" ? HINT_DEAD : HINT_DEFAULT) + "</div>";
    h += "</div></div>";
    return h;
  }

  // ── Accès DOM local (pas de sélecteur par clé : pas d'échappement CSS) ─────
  function blockOf(el){ return (el && el.closest) ? el.closest(".gvn-block") : null; }
  function keyOf(block){ return block ? String(block.getAttribute("data-gvn-key")||"").trim() : ""; }
  function inputOf(block){ return block ? block.querySelector("[data-gvn-input]") : null; }
  function setStatus(block, text){
    var el = block ? block.querySelector("[data-gvn-status]") : null;
    if(el) el.textContent = String(text==null?"":text);
  }
  function refreshRecap(block, note){
    if(!block) return;
    var parts = noteParts(note);
    var recap = block.querySelector("[data-gvn-recap]");
    if(recap){
      recap.innerHTML = recapHtml(note);
      recap.classList.toggle("hidden", !parts.length);
    }
    var toggle = block.querySelector("[data-gvn-toggle]");
    if(toggle){
      toggle.classList.toggle("has-notes", !!parts.length);
      var count = toggle.querySelector(".gvn-count");
      if(parts.length){
        if(!count){
          count = document.createElement("span");
          count.className = "gvn-count";
          toggle.appendChild(count);
        }
        count.textContent = String(parts.length);
      } else if(count && count.parentNode){
        count.parentNode.removeChild(count);
      }
    }
  }
  // Idempotent : appelé par « Ajouter », par la fermeture du panneau, par la
  // perte de focus et par la fin d'une dictée. Le brouillon est vidé, donc un
  // second appel ne duplique rien.
  function commitDraft(block){
    var ta = inputOf(block), key = keyOf(block);
    if(!ta || !key) return "";
    var draft = cleanChunk(ta.value);
    if(!draft) return readNote(key);
    var next = appendNote(key, draft);
    ta.value = "";
    refreshRecap(block, next);
    return next;
  }

  // ── Ouverture / fermeture ──────────────────────────────────────────────────
  function closeBlock(block){
    if(!block) return;
    commitDraft(block);
    var panel = block.querySelector("[data-gvn-panel]");
    if(panel) panel.classList.add("hidden");
    block.classList.remove("is-open", "is-listening");
    var toggle = block.querySelector("[data-gvn-toggle]");
    if(toggle) toggle.setAttribute("aria-expanded", "false");
  }
  function closeAllExcept(block){
    Array.prototype.forEach.call(document.querySelectorAll(".gvn-block.is-open"), function(b){
      if(b !== block) closeBlock(b);
    });
  }
  function openBlock(block){
    var key = keyOf(block);
    if(!key) return;
    closeAllExcept(block);
    openKey = key;
    var panel = block.querySelector("[data-gvn-panel]");
    if(panel) panel.classList.remove("hidden");
    block.classList.add("is-open");
    var toggle = block.querySelector("[data-gvn-toggle]");
    if(toggle) toggle.setAttribute("aria-expanded", "true");
    setStatus(block, recoState === "dead" ? HINT_DEAD : HINT_DEFAULT);
    // Focus synchrone dans le geste utilisateur : c'est ce qui ouvre le clavier
    // iOS, donc ce qui rend son micro accessible. Aucune API web impliquée.
    var ta = inputOf(block);
    if(ta && ta.focus){ try{ ta.focus(); }catch(e){} }
  }

  // ── Reconnaissance vocale (bonus, jamais présumée fonctionnelle) ───────────
  function recognitionCtor(){
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }
  function markDead(block){
    recoState = "dead";
    document.body.classList.add("gvn-reco-dead");
    stopDictation();
    if(block){
      setStatus(block, HINT_DEAD);
      // Repli immédiat : ouvrir le clavier pour que son micro soit à portée.
      var ta = inputOf(block);
      if(ta && ta.focus){ try{ ta.focus(); }catch(e){} }
    }
  }
  function stopDictation(){
    if(recoTimer){ clearTimeout(recoTimer); recoTimer = null; }
    if(reco){
      try{ reco.onresult = reco.onerror = reco.onend = reco.onstart = reco.onaudiostart = reco.onspeechstart = null; }catch(e){}
      try{ reco.abort(); }catch(e){}
      try{ reco.stop(); }catch(e){}
    }
    reco = null;
    if(recoBlock){ recoBlock.classList.remove("is-listening"); }
    recoBlock = null;
    recoStarted = false;
    recoBase = "";
  }
  function transcriptOf(ev){
    var out = "";
    try{
      var list = ev && ev.results ? ev.results : [];
      for(var i=0;i<list.length;i++){
        var alt = list[i] && list[i][0];
        if(alt && alt.transcript) out += " " + alt.transcript;
      }
    }catch(e){}
    return cleanChunk(out);
  }
  function startDictation(block){
    var Ctor = recognitionCtor();
    if(recoState === "dead" || !Ctor){ markDead(block); return; }
    stopDictation();

    var instance;
    try{ instance = new Ctor(); }catch(e){ markDead(block); return; }

    reco = instance;
    recoBlock = block;
    recoStarted = false;
    recoBase = "";

    try{
      instance.lang = "fr-CA";
      instance.continuous = false;
      instance.interimResults = true;
      instance.maxAlternatives = 1;
    }catch(e){}

    // Un démarrage réel, pas une détection de fonctionnalité : l'objet peut
    // exister et rester inerte (PWA standalone iOS).
    function alive(){
      if(recoStarted) return;
      recoStarted = true;
      recoState = "ok";
      if(recoTimer){ clearTimeout(recoTimer); recoTimer = null; }
      if(recoBlock){
        recoBlock.classList.add("is-listening");
        setStatus(recoBlock, HINT_LISTEN);
      }
    }
    instance.onstart = alive;
    instance.onaudiostart = alive;
    instance.onspeechstart = alive;
    instance.onresult = function(ev){
      alive();
      var ta = inputOf(recoBlock);
      if(!ta) return;
      var text = transcriptOf(ev);
      if(!text) return;
      ta.value = cleanChunk(recoBase ? (recoBase + " " + text) : text);
    };
    instance.onerror = function(){
      if(!recoStarted){ markDead(recoBlock || block); return; }
      var b = recoBlock;
      stopDictation();
      if(b) setStatus(b, "Dictée interrompue. Le micro du clavier reste disponible.");
    };
    instance.onend = function(){
      var b = recoBlock;
      var started = recoStarted;
      stopDictation();
      if(!b) return;
      if(!started){ markDead(b); return; }
      // Transcription imparfaite acceptée : on enregistre, l'intention prime.
      commitDraft(b);
      setStatus(b, HINT_DEFAULT);
    };

    var ta = inputOf(block);
    recoBase = ta ? cleanChunk(ta.value) : "";

    try{ instance.start(); }
    catch(e){ markDead(block); return; }

    setStatus(block, "Démarrage de la dictée…");
    recoTimer = setTimeout(function(){
      recoTimer = null;
      if(recoStarted) return;
      // Aucun évènement de démarrage : l'API est présente mais inerte.
      // Bascule définitive pour la session, et on le dit à l'athlète.
      markDead(block);
    }, START_TIMEOUT);
  }

  // ── Écoute déléguée (posée une fois, survit aux re-rendus) ─────────────────
  function onClick(ev){
    try{
      var t = ev && ev.target;
      if(!t || !t.closest) return;

      var toggle = t.closest("[data-gvn-toggle]");
      if(toggle){
        ev.preventDefault();
        var tb = blockOf(toggle);
        if(!tb) return;
        if(tb.classList.contains("is-open")){
          stopDictation();
          closeBlock(tb);
          openKey = null;
        } else {
          openBlock(tb);
        }
        return;
      }

      var mic = t.closest("[data-gvn-mic]");
      if(mic){
        ev.preventDefault();
        var mb = blockOf(mic);
        if(mb) startDictation(mb);
        return;
      }

      var add = t.closest("[data-gvn-add]");
      if(add){
        ev.preventDefault();
        var ab = blockOf(add);
        if(!ab) return;
        commitDraft(ab);
        var ta = inputOf(ab);
        if(ta && ta.focus){ try{ ta.focus(); }catch(e){} }
        return;
      }
    }catch(e){
      // Jamais bloquant : la saisie chiffrée de la séance reste intacte.
      try{ if(window.CoachLog && CoachLog.error) CoachLog.error("voice_note.click", e); }catch(e2){}
    }
  }
  // La perte de focus enregistre le brouillon : « Bloc suivant → » re-rend la
  // séance et détruirait le <textarea> sans ça.
  function onFocusOut(ev){
    try{
      var t = ev && ev.target;
      if(!t || !t.getAttribute || !t.getAttribute("data-gvn-input")) return;
      commitDraft(blockOf(t));
    }catch(e){}
  }

  document.addEventListener("click", onClick, false);
  document.addEventListener("focusout", onFocusOut, false);

  api.SEPARATOR = SEPARATOR;
  api.blockHtml = blockHtml;
  api.readNote = readNote;
  api.appendNote = appendNote;
  api.noteParts = noteParts;
  api.recognitionState = function(){ return recoState; };
})();
