// Racine — note par mouvement, pendant la séance guidée.
//
// Besoin : une observation qui ne rentre pas dans un chiffre (« la 3e série
// était plus dure que la 4e », « appui gauche instable »). Le RPE unique par
// mouvement ne peut pas la porter.
//
// Forme (V4.5.25) : un petit bouton rond dans la ligne du titre du mouvement,
// à côté du `?` du tuto. Il ne prend aucune place verticale et ne déplace donc
// aucun champ poids/reps/RPE. Il ouvre une modale plein écran (même popup que
// le tuto et l'explication de charge) qui se referme complètement après
// l'ajout. La note s'écrit, se relit et s'efface depuis cette modale.
//
// Saisie : clavier iOS. Son micro suffit et ne demande aucune permission à
// l'app. Aucune API de reconnaissance vocale n'est utilisée : dans une PWA
// standalone iOS, `webkitSpeechRecognition` existe mais reste inerte, donc un
// bouton « Dicter » ne ferait que semblant de marcher.
//
// Contrat (CLAUDE.md, docs/DATA_FLOW_CONTRACT.md, docs/STRUCTURE_CONTRACT.md) :
//  - TEXTE UNIQUEMENT. Aucun audio enregistré, aucun MediaRecorder, aucune
//    permission micro. Le stockage local est la seule source de vérité et n'a
//    aucune copie serveur : des blobs audio satureraient le quota au détriment
//    de l'historique.
//  - Aucun nouveau chemin de persistance, aucun changement de schéma :
//    l'écriture passe par setGuidedResult(key,'note',…). Le reste existe déjà
//    (guidedResultCache → collectSessionResults() → state.history), et
//    renderHistory() affiche déjà r.note sous le mouvement.
//  - La note reste UNE SEULE CHAÎNE. Les observations successives se
//    concatènent avec un séparateur, elles ne se remplacent pas. Pas de
//    tableau : c'est le format que renderHistory et l'export attendent.
//  - Le moteur de charges et athlete_state ne sont pas touchés. Avis IA lit la
//    note directement dans state.history (scripts/ai/ai_export.js).
//  - Écoute déléguée au document : la séance guidée se re-rend souvent, des
//    écouteurs posés sur les boutons seraient perdus à chaque rendu.
(function(){
  "use strict";

  var api = window.CoachVoiceNote = window.CoachVoiceNote || {};

  var SEPARATOR = " · ";
  var MAX_CHUNK = 240;    // une observation
  var MAX_NOTE  = 1200;   // total par mouvement — garde-fou quota localStorage
  var MODAL_ID  = "guidedNoteModal";

  // Bouton qui a ouvert la modale : sert à rafraîchir son état sans re-rendre
  // la séance (un renderGuidedSession() remettrait le timer à zéro).
  var sourceBtn = null;

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
  // Concaténation : l'observation d'après la 5e série s'ajoute à celle d'après
  // la 3e, elle ne la remplace pas.
  function appendNote(key, text){
    var add = cleanChunk(text);
    if(!add) return readNote(key);
    var current = readNote(key);
    var next = current ? (current + SEPARATOR + add) : add;
    if(next.length > MAX_NOTE) next = next.slice(0, MAX_NOTE).trim();
    writeNote(key, next);
    return next;
  }
  // Effacement d'une observation. Une chaîne vide reste une écriture valide :
  // collectSessionResults() ignore les valeurs vides, donc la note disparaît
  // aussi de la séance sauvegardée.
  function removeNoteAt(key, index){
    var parts = noteParts(readNote(key));
    index = Number(index);
    if(!(index >= 0) || index >= parts.length) return readNote(key);
    parts.splice(index, 1);
    var next = parts.join(SEPARATOR);
    writeNote(key, next);
    return next;
  }
  function clearNote(key){
    writeNote(key, "");
    return "";
  }

  // ── Petit bouton dans la ligne du titre (zéro impact sur la mise en page) ──
  function buttonHtml(key, label){
    key = String(key==null?"":key).trim();
    if(!key) return "";
    var name = String(label==null?key:label);
    var has = noteParts(readNote(key)).length > 0;
    return "<button type='button' class='gvn-btn-mini" + (has?" has-notes":"") + "'"
      + " data-gvn-open='1'"
      + " data-gvn-key='" + esc(key) + "'"
      + " data-gvn-label='" + esc(name) + "'"
      + " aria-label='" + esc("Note de séance — " + name) + "'"
      + " title='" + esc("Note de séance — " + name) + "'>✎</button>";
  }
  function refreshSourceButton(key){
    if(!sourceBtn) return;
    sourceBtn.classList.toggle("has-notes", noteParts(readNote(key)).length > 0);
  }

  // ── Modale (même popup que le tuto : .tuto-modal / .tuto-modal-inner) ──────
  function modalBodyHtml(key, label){
    var parts = noteParts(readNote(key));
    var h = "";
    h += "<div class='tuto-topline'>NOTE DE SÉANCE</div>";
    h += "<div class='tuto-title'>" + esc(label) + "</div>";

    if(parts.length){
      h += "<div class='gvn-list'>";
      parts.forEach(function(p, i){
        h += "<div class='gvn-item'>"
           + "<span class='gvn-item-text'>" + esc(p) + "</span>"
           + "<button type='button' class='gvn-item-del' data-gvn-del='" + i + "'"
           + " aria-label='" + esc("Effacer : " + p) + "'>✕</button>"
           + "</div>";
      });
      h += "</div>";
    } else {
      h += "<div class='gvn-empty'>Aucune note pour ce mouvement.</div>";
    }

    h += "<textarea class='gvn-input' data-gvn-input='1' rows='3' maxlength='" + MAX_CHUNK + "'"
       + " autocapitalize='sentences' autocorrect='on' spellcheck='true'"
       + " placeholder='" + esc("ex. : 3e série plus dure que la 4e, appui gauche instable") + "'></textarea>";
    h += "<div class='gvn-hint'>Touche le champ, puis le micro du clavier pour dicter.</div>";
    h += "<div class='gvn-modal-actions'>";
    h += "<button type='button' class='gvn-modal-btn gvn-add' data-gvn-add='1'>Ajouter</button>";
    if(parts.length){
      h += "<button type='button' class='gvn-modal-btn gvn-clear' data-gvn-clear='1'>Tout effacer</button>";
    }
    h += "</div>";
    h += "<button type='button' class='btn-accent gvn-close' data-gvn-close='1' style='width:100%;margin-top:12px'>Fermer</button>";
    return h;
  }

  function openModal(key, label){
    key = String(key==null?"":key).trim();
    if(!key) return;
    label = String(label==null?key:label);

    var existing = document.getElementById(MODAL_ID);
    if(existing) existing.remove();

    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "tuto-modal";
    modal.setAttribute("data-gvn-modal", "1");
    modal.setAttribute("data-gvn-key", key);
    modal.setAttribute("data-gvn-label", label);
    modal.innerHTML = "<div class='tuto-modal-inner'>" + modalBodyHtml(key, label) + "</div>";
    document.body.appendChild(modal);

    try{ if(typeof lockBodyScrollForModal === "function") lockBodyScrollForModal(); }catch(e){}
    setTimeout(function(){ modal.classList.add("visible"); }, 20);

    // Focus : c'est ce qui ouvre le clavier iOS, donc ce qui met son micro à
    // portée. Après l'animation d'apparition pour ne pas la saccader.
    setTimeout(function(){
      var ta = modal.querySelector("[data-gvn-input]");
      if(ta && ta.focus){ try{ ta.focus(); }catch(e){} }
    }, 260);
  }

  function refreshModal(modal){
    if(!modal) return;
    var key = modal.getAttribute("data-gvn-key") || "";
    var label = modal.getAttribute("data-gvn-label") || key;
    var ta = modal.querySelector("[data-gvn-input]");
    var draft = ta ? ta.value : "";
    var inner = modal.querySelector(".tuto-modal-inner");
    if(inner) inner.innerHTML = modalBodyHtml(key, label);
    var ta2 = modal.querySelector("[data-gvn-input]");
    if(ta2) ta2.value = draft;
    refreshSourceButton(key);
  }

  // `commit` : enregistre le brouillon avant de fermer, pour ne rien perdre
  // quand on ferme sans avoir tapé « Ajouter ».
  function closeModal(modal, commit){
    if(!modal) return;
    var key = modal.getAttribute("data-gvn-key") || "";
    if(commit !== false){
      var ta = modal.querySelector("[data-gvn-input]");
      if(ta && cleanChunk(ta.value)) appendNote(key, ta.value);
    }
    refreshSourceButton(key);
    sourceBtn = null;
    modal.classList.remove("visible");
    setTimeout(function(){
      if(modal.parentNode) modal.remove();
      try{ if(typeof unlockBodyScrollForModal === "function") unlockBodyScrollForModal(); }catch(e){}
    }, 220);
  }

  // ── Écoute déléguée (posée une fois, survit aux re-rendus) ─────────────────
  function onClick(ev){
    try{
      var t = ev && ev.target;
      if(!t || !t.closest) return;

      var open = t.closest("[data-gvn-open]");
      if(open){
        ev.preventDefault();
        ev.stopPropagation();
        sourceBtn = open;
        openModal(open.getAttribute("data-gvn-key"), open.getAttribute("data-gvn-label"));
        return;
      }

      var modal = t.closest("[data-gvn-modal]");
      if(!modal) return;
      var key = modal.getAttribute("data-gvn-key") || "";

      // Clic sur le fond sombre : ferme (en enregistrant le brouillon).
      if(t === modal){ closeModal(modal, true); return; }

      var del = t.closest("[data-gvn-del]");
      if(del){
        ev.preventDefault();
        removeNoteAt(key, del.getAttribute("data-gvn-del"));
        refreshModal(modal);
        return;
      }

      var clear = t.closest("[data-gvn-clear]");
      if(clear){
        ev.preventDefault();
        if(!window.confirm("Effacer toutes les notes de ce mouvement ?")) return;
        clearNote(key);
        refreshModal(modal);
        return;
      }

      var add = t.closest("[data-gvn-add]");
      if(add){
        ev.preventDefault();
        var ta = modal.querySelector("[data-gvn-input]");
        var draft = ta ? cleanChunk(ta.value) : "";
        if(draft) appendNote(key, draft);
        if(ta) ta.value = "";
        // La modale se referme complètement après l'ajout.
        closeModal(modal, false);
        return;
      }

      var close = t.closest("[data-gvn-close]");
      if(close){
        ev.preventDefault();
        closeModal(modal, true);
        return;
      }
    }catch(e){
      // Jamais bloquant : la saisie chiffrée de la séance reste intacte.
      try{ if(window.CoachLog && CoachLog.error) CoachLog.error("voice_note.click", e); }catch(e2){}
    }
  }

  document.addEventListener("click", onClick, false);

  api.SEPARATOR = SEPARATOR;
  api.buttonHtml = buttonHtml;
  api.readNote = readNote;
  api.appendNote = appendNote;
  api.removeNoteAt = removeNoteAt;
  api.clearNote = clearNote;
  api.noteParts = noteParts;
  api.openModal = openModal;
})();
