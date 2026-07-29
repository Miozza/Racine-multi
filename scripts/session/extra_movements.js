// Racine — mouvements faits hors programme (écran Résultats).
// Besoin : logger un mouvement fait aujourd'hui mais absent du programme du
// jour. Sans ça il n'atterrit nulle part : le moteur de charges et l'historique
// ne le voient jamais.
//
// Contrat (docs/STRUCTURE_CONTRACT.md, docs/DATA_FLOW_CONTRACT.md) :
//  - Catalogue fermé : les noms viennent uniquement de
//    RacineMovementSwaps.movementCatalog(profileId). Aucune saisie libre — le
//    moteur ne reconnaît un mouvement que par son nom exact.
//  - Clé de résultat = nom exact du catalogue, comme les blocs `exercises` de
//    collectSessionExercises(). C'est ce qui branche ast.movements[label],
//    movementRefs et CoachBrainMemory sans une ligne de code de plus.
//  - Anti-collision : un mouvement déjà dans la séance du jour n'est pas
//    sélectionnable, sa clé de résultat écraserait la saisie programmée. La
//    comparaison passe par le libellé du moteur, pas par la chaîne brute :
//    deux noms différents qui retombent sur le même mouvement collisionnent.
//  - Contexte neutre : aucun `kind`/titre de bloc n'est transmis, donc aucune
//    intention (technique/light/progression/wod/recovery) qui ferait tomber ces
//    séries dans coachIsLimitedProgressionContext(). C'est de la capacité réelle.
//  - Aucune cible : ces séries n'étaient pas prévues. La cible affichée est un
//    défaut d'affichage; enrichSessionResults() ne leur attache aucun `planned`
//    (voir le garde-fou dans collectSessionExercises).
//  - Durée de vie = l'écran Résultats. Rien n'est persisté hors state.history.
(function(){
  var api = window.CoachExtraMovements = window.CoachExtraMovements || {};

  // Cible neutre : sert à afficher la carte et à demander une suggestion, jamais
  // enregistrée comme prescription.
  var DEFAULT_FORMAT = "3x8";
  var DEFAULT_REPS = 8;

  var chosen = [];          // noms canoniques, dans l'ordre d'ajout
  var host = null;          // #sessionFields
  var addWrap = null;       // bloc du bouton « + Ajouter un mouvement »
  var renderCard = null;    // rendu de carte fourni par scripts/session/results.js
  var sessionItems = [];    // items de la séance au dernier rendu (anti-collision)

  // ── Utilitaires ────────────────────────────────────────────────────────────
  function norm(s){ return String(s==null?"":s).trim().toLowerCase(); }
  function fold(s){
    var v = norm(s);
    try{ return v.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){ return v; }
  }
  function esc(s){
    if(typeof escHtml === "function") return escHtml(s);
    return String(s==null?"":s).replace(/[&<>"']/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  // Libellé du moteur (canonicalMovementLabel) : sert seulement à comparer deux
  // noms entre eux, jamais de clé de résultat — sinon le journal brut perdrait
  // la variante réellement choisie (« Single-Leg Hip Thrust » → « Hip Thrust »).
  function canon(name){
    var raw = String(name==null?"":name).trim();
    try{
      if(typeof movementLabelFromKeyOrName === "function"){
        var label = movementLabelFromKeyOrName(raw);
        if(label) return String(label).trim();
      }
    }catch(e){}
    return raw;
  }
  // Toutes les formes comparables d'un nom (brut + canonique).
  function formsOf(name){
    var out = [];
    [name, canon(name)].forEach(function(v){
      var k = norm(v);
      if(k && out.indexOf(k) < 0) out.push(k);
    });
    return out;
  }

  function activeProfileId(){
    try{ return window.CoachProfiles ? CoachProfiles.getActiveId() : null; }catch(e){ return null; }
  }

  // ── Catalogue fermé ────────────────────────────────────────────────────────
  function catalog(){
    try{
      if(window.RacineMovementSwaps && typeof RacineMovementSwaps.movementCatalog === "function"){
        var cat = RacineMovementSwaps.movementCatalog(activeProfileId()) || {};
        return {
          program: Array.isArray(cat.program) ? cat.program.slice() : [],
          others:  Array.isArray(cat.others)  ? cat.others.slice()  : []
        };
      }
    }catch(e){}
    return { program: [], others: [] };
  }

  // ── Anti-collision ─────────────────────────────────────────────────────────
  // Noms déjà occupés par des items de séance (le WOD ne porte pas de clé de
  // mouvement). Le sélecteur y ajoute les hors programme déjà choisis.
  function occupiedNames(items){
    var names = [];
    (items || []).forEach(function(it){
      if(!it || it.isWod) return;
      names.push(it.key);
      names.push(it.name);
    });
    return names;
  }
  function occupiedIndex(names){
    var idx = {};
    (names || []).forEach(function(n){ formsOf(n).forEach(function(k){ idx[k] = true; }); });
    return idx;
  }
  function isOccupied(idx, name){
    return formsOf(name).some(function(k){ return !!idx[k]; });
  }

  // ── Items de séance ────────────────────────────────────────────────────────
  function buildItem(name){
    // Clé/nom = nom exact du catalogue, comme les blocs `exercises` de
    // collectSessionExercises(). La canonicalisation vers ast.movements[label]
    // reste faite en aval par le moteur, exactement comme pour un mouvement
    // programmé.
    var label = String(name || "").trim();
    var parsed = { min: DEFAULT_REPS, max: DEFAULT_REPS };
    try{
      if(typeof parseTargetReps === "function"){
        var p = parseTargetReps(DEFAULT_FORMAT, DEFAULT_REPS);
        if(p && p.min) parsed = p;
      }
    }catch(e){}
    var suggested = "";
    try{
      if(window.CoachCharge && typeof CoachCharge.suggestForExercise === "function"){
        // Bloc vide volontairement : ni kind ni titre, donc aucune intention
        // injectée dans le contexte mouvement (contexte neutre).
        suggested = CoachCharge.suggestForExercise({ name: label, format: DEFAULT_FORMAT }, {}) || "";
      }
    }catch(e){ suggested = ""; }
    return {
      key: label,
      name: label,
      suggested: suggested,
      format: DEFAULT_FORMAT,
      targetMin: parsed.min,
      targetMax: parsed.max,
      kind: "",
      blockTitle: "",
      note: "",
      text: "",
      isWod: false,
      isExtra: true
    };
  }

  // Appelé en fin de collectSessionExercises() avec les items déjà produits.
  api.buildItems = function(existingItems){
    if(!chosen.length) return [];
    var idx = occupiedIndex(occupiedNames(existingItems));
    var out = [];
    chosen.forEach(function(name){
      if(isOccupied(idx, name)) return; // la saisie programmée reste prioritaire
      out.push(buildItem(name));
    });
    return out;
  };

  api.list = function(){ return chosen.slice(); };

  // ── Cache de saisie ────────────────────────────────────────────────────────
  // collectSessionResults() donne la priorité maximale à guidedResultCache :
  // retirer une carte sans purger le cache ressusciterait la série. Purge sur la
  // clé exacte seulement — une correspondance élargie au libellé moteur pourrait
  // effacer la saisie d'un mouvement programmé voisin.
  function purgeCacheFor(names){
    try{
      var cache = window.guidedResultCache;
      if(!cache) return;
      var want = {};
      (names || []).forEach(function(n){ want[norm(n)] = true; });
      Object.keys(cache).forEach(function(k){ if(want[norm(k)]) delete cache[k]; });
    }catch(e){}
  }

  function cardFor(name){
    var found = null;
    try{
      var wanted = norm(name);
      var cards = document.querySelectorAll("#sessionFields .sf-card.is-extra[data-extra-key]");
      Array.prototype.forEach.call(cards, function(card){
        if(found) return;
        if(norm(card.getAttribute("data-extra-key")) === wanted) found = card;
      });
    }catch(e){}
    return found;
  }

  api.remove = function(name){
    var wanted = norm(name);
    chosen = chosen.filter(function(n){ return norm(n) !== wanted; });
    purgeCacheFor([name]);
    var card = cardFor(name);
    if(card && card.parentNode) card.parentNode.removeChild(card);
    return true;
  };

  // Vidage : retour WOD et après sauvegarde (scripts/session/save.js).
  api.clear = function(){
    purgeCacheFor(chosen);
    chosen = [];
    sessionItems = [];
    addWrap = null;
    return true;
  };

  // ── Bouton d'ajout en fin de liste ─────────────────────────────────────────
  function mountAddButton(){
    if(!host) return;
    if(addWrap && addWrap.parentNode === host){ host.appendChild(addWrap); return; }
    addWrap = document.createElement("div");
    addWrap.className = "extra-mv-add-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "extra-mv-add-btn";
    btn.textContent = "+ Ajouter un mouvement";
    btn.addEventListener("click", function(){ api.openPicker(); });
    var hint = document.createElement("p");
    hint.className = "extra-mv-add-hint";
    hint.textContent = "Fait aujourd’hui, mais pas au programme.";
    addWrap.appendChild(btn);
    addWrap.appendChild(hint);
    host.appendChild(addWrap);
  }

  // Appelé par renderSessionEntry() après la boucle sur les items.
  api.mount = function(opts){
    opts = opts || {};
    host = opts.container || document.getElementById("sessionFields");
    renderCard = (typeof opts.renderCard === "function") ? opts.renderCard : null;
    sessionItems = Array.isArray(opts.sessionItems) ? opts.sessionItems.slice() : [];
    if(!host) return false;
    mountAddButton();
    return true;
  };

  // ── Sélecteur plein écran ──────────────────────────────────────────────────
  api.openPicker = function(){
    var existing = document.getElementById("extraMvPicker");
    if(existing) existing.parentNode && existing.parentNode.removeChild(existing);

    var cat = catalog();
    // Programmés du dernier rendu + hors programme déjà ajoutés depuis.
    var occupied = occupiedIndex(occupiedNames(sessionItems).concat(chosen));
    var picked = {};   // clé normalisée -> nom exact du catalogue

    var modal = document.createElement("div");
    modal.id = "extraMvPicker";
    modal.className = "extra-mv-modal";
    modal.innerHTML =
      '<div class="extra-mv-sheet" role="dialog" aria-modal="true" aria-label="Ajouter un mouvement">'+
        '<div class="extra-mv-head">'+
          '<div>'+
            '<div class="extra-mv-eyebrow">Hors programme</div>'+
            '<div class="extra-mv-title">Ajouter un mouvement</div>'+
          '</div>'+
          '<button type="button" class="extra-mv-close" data-extra-close aria-label="Fermer">✕</button>'+
        '</div>'+
        '<input class="extra-mv-search" id="extraMvSearch" type="text" inputmode="search" '+
          'autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Rechercher un mouvement"/>'+
        '<div class="extra-mv-list" id="extraMvList"></div>'+
        '<div class="extra-mv-foot">'+
          '<button type="button" class="extra-mv-confirm" id="extraMvConfirm">Confirmer</button>'+
          '<p class="extra-mv-foot-note">Sélection multiple · noms du catalogue seulement.</p>'+
        '</div>'+
      '</div>';
    document.body.appendChild(modal);
    try{ if(typeof lockBodyScrollForModal === "function") lockBodyScrollForModal(); }catch(e){}
    setTimeout(function(){ modal.classList.add("visible"); }, 20);

    var listEl = modal.querySelector("#extraMvList");
    var searchEl = modal.querySelector("#extraMvSearch");
    var confirmEl = modal.querySelector("#extraMvConfirm");

    function rowHtml(name){
      var key = norm(name);
      if(isOccupied(occupied, name)){
        return '<button type="button" class="extra-mv-row is-blocked" disabled>'+
          '<span class="extra-mv-row-name">'+esc(name)+'</span>'+
          '<span class="extra-mv-row-tag">déjà dans la séance</span>'+
        '</button>';
      }
      var on = !!picked[key];
      return '<button type="button" class="extra-mv-row'+(on?" is-picked":"")+'" data-extra-name="'+esc(name)+'">'+
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
      var prog = cat.program.filter(keep);
      var rest = cat.others.filter(keep);
      var html = section("Programme actif", prog) + section("Bibliothèque", rest);
      if(!html){
        html = '<p class="extra-mv-empty">'+
          (cat.program.length + cat.others.length
            ? "Aucun mouvement du catalogue ne correspond."
            : "Catalogue de mouvements indisponible.")+
        '</p>';
      }
      listEl.innerHTML = html;
      Array.prototype.forEach.call(listEl.querySelectorAll("[data-extra-name]"), function(btn){
        btn.addEventListener("click", function(){
          var name = btn.getAttribute("data-extra-name");
          var key = norm(name);
          if(picked[key]) delete picked[key]; else picked[key] = name;
          btn.classList.toggle("is-picked", !!picked[key]);
          var mark = btn.querySelector(".extra-mv-row-mark");
          if(mark) mark.textContent = picked[key] ? "✓" : "+";
          syncConfirm();
        });
      });
    }

    function syncConfirm(){
      if(!confirmEl) return;
      var n = Object.keys(picked).length;
      confirmEl.textContent = n ? ("Confirmer ("+n+")") : "Confirmer";
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
      names.forEach(function(label){
        if(isOccupied(occupied, label)) return;
        if(chosen.some(function(n){ return norm(n) === norm(label); })) return;
        chosen.push(label);
        occupied = occupiedIndex(occupiedNames(sessionItems).concat(chosen));
        if(renderCard) renderCard(buildItem(label));
      });
      // Le bouton d'ajout reste en fin de liste après chaque ajout.
      mountAddButton();
      close();
    }

    if(searchEl) searchEl.addEventListener("input", renderList);
    Array.prototype.forEach.call(modal.querySelectorAll("[data-extra-close]"), function(btn){
      btn.addEventListener("click", close);
    });
    if(confirmEl) confirmEl.addEventListener("click", commit);

    renderList();
    syncConfirm();
    return modal;
  };
})();
