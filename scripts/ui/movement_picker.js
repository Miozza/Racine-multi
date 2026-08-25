// Racine — sélecteur de mouvement plein écran, réutilisable.
//
// Extrait tel quel de scripts/session/extra_movements.js, où il vivait inline :
// même modale, même recherche insensible aux accents, mêmes lignes bloquées,
// même refus de se fermer au tap sur le fond (une sélection en cours ne doit
// pas disparaître par accident). Rien du comportement n'a changé — seul
// l'appelant est devenu un paramètre.
//
// Pourquoi l'extraction : deux écrans ont besoin du même geste, et le moteur de
// charges ne reconnaît un mouvement que par son NOM EXACT. Retaper ce nom à la
// main est la seule façon de poser un réglage qui ne s'appliquera jamais —
// le champ texte libre de l'ancienne « Calibration du moteur » acceptait
// « lateral raise db » et le stockait sans broncher. Un catalogue fermé ferme
// cette porte pour de bon.
//
// Contrat :
//  - le picker ne connaît AUCUNE règle métier. Ce qui est bloqué, ce qui est
//    listé et ce qu'on fait de la sélection sont fournis par l'appelant.
//  - il ne persiste rien. Sa durée de vie est celle de la modale.
//  - une seule instance à la fois : ouvrir remplace ce qui était ouvert.
window.RacineMovementPicker = window.RacineMovementPicker || {};

(function(){
  var api = window.RacineMovementPicker;
  var MODAL_ID = "racineMovementPicker";

  function esc(s){
    if(typeof escapeHtml === "function") return escapeHtml(s);
    return String(s==null?"":s).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function norm(s){ return String(s==null?"":s).trim().toLowerCase(); }
  // Recherche pliée : « haltère » doit se trouver en tapant « haltere ».
  function fold(s){
    var v = norm(s);
    try{ return v.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){ return v; }
  }

  // Catalogue par défaut : celui du profil actif. Même source que l'écran
  // Résultats — un mouvement absent d'ici est absent partout.
  function defaultCatalog(){
    try{
      if(window.RacineMovementSwaps && typeof RacineMovementSwaps.movementCatalog === "function"){
        var pid = (window.CoachProfiles && CoachProfiles.getActiveId) ? CoachProfiles.getActiveId() : null;
        var cat = RacineMovementSwaps.movementCatalog(pid) || {};
        return {
          program: Array.isArray(cat.program) ? cat.program.slice() : [],
          others:  Array.isArray(cat.others)  ? cat.others.slice()  : []
        };
      }
    }catch(e){}
    return { program: [], others: [] };
  }

  /**
   * @param {Object} opts
   *   eyebrow, title, footNote  — textes d'en-tête et de pied
   *   confirmLabel              — libellé du bouton de validation
   *   multi                     — sélection multiple (défaut true)
   *   catalog                   — {program:[], others:[]} ; défaut = profil actif
   *   sectionTitles             — {program, others}
   *   blocked(name)             — "" si libre, sinon le texte à afficher en grisé
   *   onPick(names)             — appelé à la validation avec les noms exacts
   */
  api.open = function(opts){
    opts = opts || {};
    var multi = (opts.multi !== false);
    var cat = opts.catalog || defaultCatalog();
    var program = Array.isArray(cat.program) ? cat.program : [];
    var others  = Array.isArray(cat.others)  ? cat.others  : [];
    var titles = opts.sectionTitles || {};
    var progTitle  = titles.program || "Programme actif";
    var otherTitle = titles.others  || "Bibliothèque";
    var blocked = (typeof opts.blocked === "function") ? opts.blocked : function(){ return ""; };
    var onPick = (typeof opts.onPick === "function") ? opts.onPick : function(){};

    var existing = document.getElementById(MODAL_ID);
    if(existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var picked = {};   // clé normalisée -> nom exact du catalogue

    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "extra-mv-modal";
    modal.innerHTML =
      '<div class="extra-mv-sheet" role="dialog" aria-modal="true" aria-label="'+esc(opts.title||"Choisir un mouvement")+'">'+
        '<div class="extra-mv-head">'+
          '<div>'+
            '<div class="extra-mv-eyebrow">'+esc(opts.eyebrow||"")+'</div>'+
            '<div class="extra-mv-title">'+esc(opts.title||"Choisir un mouvement")+'</div>'+
          '</div>'+
          '<button type="button" class="extra-mv-close" data-picker-close aria-label="Fermer">✕</button>'+
        '</div>'+
        '<input class="extra-mv-search" id="racineMvSearch" type="text" inputmode="search" '+
          'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Rechercher un mouvement"/>'+
        '<div class="extra-mv-list" id="racineMvList"></div>'+
        '<div class="extra-mv-foot">'+
          '<button type="button" class="extra-mv-confirm" id="racineMvConfirm">'+esc(opts.confirmLabel||"Confirmer")+'</button>'+
          '<p class="extra-mv-foot-note">'+esc(opts.footNote||"Noms du catalogue seulement.")+'</p>'+
        '</div>'+
      '</div>';
    document.body.appendChild(modal);
    try{ if(typeof lockBodyScrollForModal === "function") lockBodyScrollForModal(); }catch(e){}
    setTimeout(function(){ modal.classList.add("visible"); }, 20);

    var listEl = modal.querySelector("#racineMvList");
    var searchEl = modal.querySelector("#racineMvSearch");
    var confirmEl = modal.querySelector("#racineMvConfirm");
    var baseConfirm = opts.confirmLabel || "Confirmer";

    function rowHtml(name){
      var why = blocked(name) || "";
      if(why){
        return '<button type="button" class="extra-mv-row is-blocked" disabled>'+
          '<span class="extra-mv-row-name">'+esc(name)+'</span>'+
          '<span class="extra-mv-row-tag">'+esc(why)+'</span>'+
        '</button>';
      }
      var on = !!picked[norm(name)];
      return '<button type="button" class="extra-mv-row'+(on?" is-picked":"")+'" data-picker-name="'+esc(name)+'">'+
        '<span class="extra-mv-row-name">'+esc(name)+'</span>'+
        '<span class="extra-mv-row-mark">'+(on?"✓":"+")+'</span>'+
      '</button>';
    }

    function section(title, names){
      if(!names.length) return "";
      return '<div class="extra-mv-section">'+
        '<div class="extra-mv-section-title">'+esc(title)+'</div>'+
        names.map(rowHtml).join("")+
      '</div>';
    }

    function renderList(){
      var q = fold(searchEl ? searchEl.value : "");
      function keep(n){ return !q || fold(n).indexOf(q) >= 0; }
      var html = section(progTitle, program.filter(keep)) + section(otherTitle, others.filter(keep));
      if(!html){
        html = '<p class="extra-mv-empty">'+
          (program.length + others.length
            ? "Aucun mouvement du catalogue ne correspond."
            : "Catalogue de mouvements indisponible.")+
        '</p>';
      }
      listEl.innerHTML = html;
      Array.prototype.forEach.call(listEl.querySelectorAll("[data-picker-name]"), function(btn){
        btn.addEventListener("click", function(){
          var name = btn.getAttribute("data-picker-name");
          var key = norm(name);
          if(picked[key]){
            delete picked[key];
          }else{
            // Mono-sélection : le choix précédent tombe, sinon « Confirmer (2) »
            // sur un écran qui n'attend qu'un seul mouvement.
            if(!multi) picked = {};
            picked[key] = name;
          }
          if(!multi) renderList(); else {
            btn.classList.toggle("is-picked", !!picked[key]);
            var mark = btn.querySelector(".extra-mv-row-mark");
            if(mark) mark.textContent = picked[key] ? "✓" : "+";
          }
          syncConfirm();
        });
      });
    }

    function syncConfirm(){
      if(!confirmEl) return;
      var n = Object.keys(picked).length;
      confirmEl.textContent = (multi && n) ? (baseConfirm+" ("+n+")") : baseConfirm;
      confirmEl.classList.toggle("is-armed", n > 0);
    }

    // L'écran ne se ferme que par Confirmer ou ✕ : pas de fermeture au tap sur
    // le fond, une sélection en cours ne doit pas disparaître par accident.
    function close(){
      modal.classList.remove("visible");
      setTimeout(function(){
        if(modal.parentNode) modal.parentNode.removeChild(modal);
        try{ if(typeof unlockBodyScrollForModal === "function") unlockBodyScrollForModal(); }catch(e){}
      }, 200);
    }

    function commit(){
      var names = Object.keys(picked).map(function(k){ return picked[k]; });
      close();
      if(names.length) onPick(names);
    }

    if(searchEl) searchEl.addEventListener("input", renderList);
    Array.prototype.forEach.call(modal.querySelectorAll("[data-picker-close]"), function(btn){
      btn.addEventListener("click", close);
    });
    if(confirmEl) confirmEl.addEventListener("click", commit);

    renderList();
    syncConfirm();
    return modal;
  };

  api.ready = true;
})();
