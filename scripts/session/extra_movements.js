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

  var chosen = [];          // noms exacts du catalogue, dans l'ordre d'ajout
  var host = null;          // #sessionFields
  var addWrap = null;       // bloc du bouton « + Ajouter un mouvement »
  var renderCard = null;    // rendu de carte fourni par scripts/session/results.js
  var sessionItems = [];    // items de la séance au dernier rendu (anti-collision)

  // ── Utilitaires ────────────────────────────────────────────────────────────
  function norm(s){ return String(s==null?"":s).trim().toLowerCase(); }
  // Échappement et recherche pliée vivent désormais dans le sélecteur
  // (scripts/ui/movement_picker.js) : c'est lui qui rend le HTML.
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
  // Index forme comparable -> nom qui occupe la place. On garde le nom pour
  // pouvoir dire QUI bloque dans le sélecteur : un grisé sans raison ressemble à
  // un bug quand le nom affiché n'est pas celui du mouvement programmé
  // (« Single-Leg Hip Thrust » grisé par « Barbell Hip Thrust »).
  // Premier inscrit gagne : occupiedNames() pousse la clé avant le nom de bloc,
  // donc le libellé retenu est déjà nettoyé de son préfixe « A1. ».
  function occupiedIndex(names){
    var idx = {};
    (names || []).forEach(function(n){
      var label = String(n == null ? "" : n).trim();
      if(!label) return;
      formsOf(label).forEach(function(k){ if(!idx[k]) idx[k] = label; });
    });
    return idx;
  }
  // Retourne le nom occupant, ou "" si la place est libre.
  function occupiedBy(idx, name){
    var forms = formsOf(name);
    for(var i = 0; i < forms.length; i++) if(idx[forms[i]]) return idx[forms[i]];
    return "";
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
      if(occupiedBy(idx, name)) return; // la saisie programmée reste prioritaire
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

  // Pendant manquant de remove()/clear() : la décision d'ajouter vivait dans le
  // gestionnaire du sélecteur, donc inatteignable sans DOM — et le module
  // n'était vérifiable par rien. Rend false si le nom est vide ou déjà choisi.
  // L'anti-collision avec la séance du jour reste à l'appelant : lui seul sait
  // quels mouvements sont au programme (voir buildItems()).
  api.add = function(name){
    var label = String(name == null ? "" : name).trim();
    if(!label) return false;
    if(chosen.some(function(n){ return norm(n) === norm(label); })) return false;
    chosen.push(label);
    return true;
  };

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
  // La modale elle-même vit dans scripts/ui/movement_picker.js depuis V4.6.7 :
  // le panneau admin en avait besoin à l'identique. Ce qui reste ici est la
  // seule chose qui appartient à l'écran Résultats — l'anti-collision avec la
  // séance du jour et ce qu'on fait de la sélection.
  api.openPicker = function(){
    if(!(window.RacineMovementPicker && RacineMovementPicker.open)) return null;

    // Programmés du dernier rendu + hors programme déjà ajoutés depuis.
    var occupied = occupiedIndex(occupiedNames(sessionItems).concat(chosen));

    return RacineMovementPicker.open({
      eyebrow: "Hors programme",
      title: "Ajouter un mouvement",
      footNote: "Sélection multiple · noms du catalogue seulement.",
      catalog: catalog(),
      sectionTitles: { program: "Programme actif", others: "Bibliothèque" },
      // Même nom : « déjà dans la séance » suffit. Nom différent qui retombe
      // sur la même capacité : on nomme le mouvement qui occupe la place.
      blocked: function(name){
        var owner = occupiedBy(occupied, name);
        if(!owner) return "";
        return (norm(owner) === norm(name)) ? "déjà dans la séance" : ("déjà : " + owner);
      },
      onPick: function(names){
        names.forEach(function(label){
          if(occupiedBy(occupied, label)) return;
          if(!api.add(label)) return;
          occupied = occupiedIndex(occupiedNames(sessionItems).concat(chosen));
          if(renderCard) renderCard(buildItem(label));
        });
        // Le bouton d'ajout reste en fin de liste après chaque ajout.
        mountAddButton();
      }
    });
  };
})();
