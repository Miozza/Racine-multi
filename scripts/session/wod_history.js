// Racine — historique des conditionnements (WOD)
// Porte publique : window.CoachWodHistory
//
// Le problème résolu : un score de WOD était sauvegardé (« 4 rounds + 6 »),
// mais RIEN ne disait de quel WOD il s'agissait. La clé de la ligne est le
// titre du bloc (`wod_<titre>`, cf. collectSessionExercises), et les titres
// sont génériques et réutilisés — « D. Finisher » couvre sept WOD sans rapport.
// Chercher par titre regrouperait donc des séances étrangères les unes aux
// autres. Ce module ne compare rien : il AFFICHE, et c'est l'athlète qui
// compare. Aucune suggestion de charge n'en dépend (CLAUDE.md § 3.2 : un
// résultat de WOD ne remplace jamais une capacité principale).
//
// Deux sources pour le texte d'un WOD passé, dans cet ordre :
//   1. `wodText` écrit sur la ligne au moment de la sauvegarde — fiable ;
//   2. à défaut, reconstruction depuis (jour, semaine) via buildWorkout(),
//      et SEULEMENT si le programme actif est celui de la séance. Sinon on
//      dit « texte non retrouvé » au lieu d'afficher le WOD d'un autre
//      programme. C'est la règle du DATA_FLOW_CONTRACT : le journal brut
//      l'emporte sur l'état reconstruit.
(function(){
  var api = window.CoachWodHistory || {};

  var KEY_PREFIX = 'wod_';
  var MAX_ROWS = 40;

  function clean(v){ return String(v === undefined || v === null ? '' : v); }
  function esc(v){ return typeof escHtml === 'function' ? escHtml(clean(v)) : clean(v); }

  // Même clé que la ligne WOD de l'écran résultats (collectSessionExercises).
  function keyFor(title){ return KEY_PREFIX + clean(title); }
  function titleFromKey(key){
    var k = clean(key);
    return k.indexOf(KEY_PREFIX) === 0 ? k.slice(KEY_PREFIX.length) : k;
  }
  function isWodKey(key){ return clean(key).indexOf(KEY_PREFIX) === 0; }

  // ── Format du WOD ─────────────────────────────────────────────────────────
  // Lu sur le texte, jamais sur le titre. Sert uniquement au filtre de la
  // modale : on ne mélange pas un score AMRAP (des rounds) et un For Time
  // (un temps), ce ne sont pas la même unité.
  function formatOf(text){
    var t = clean(text);
    if(/\bemom\b/i.test(t)) return 'emom';
    if(/\bamrap\b/i.test(t)) return 'amrap';
    if(/for time|cap\b/i.test(t)) return 'fortime';
    return '';
  }
  var FORMAT_LABELS = {amrap:'AMRAP', emom:'EMOM', fortime:'For Time'};

  // ── Texte d'un WOD passé ──────────────────────────────────────────────────
  function activeProgramLabel(){
    try{ return clean(typeof focus === 'function' && focus() ? focus().label : ''); }
    catch(e){ return ''; }
  }
  // Reconstruction : buildWorkout() lit le programme ACTIF (programs/workouts.js).
  // Une séance faite sous un autre programme ne se reconstruit donc pas — on
  // préfère l'absence à un texte faux.
  function rebuildWodText(entry, title){
    try{
      if(!entry) return '';
      if(typeof buildWorkout !== 'function') return '';
      var entryProgram = clean(entry.focus);
      if(entryProgram && entryProgram !== activeProgramLabel()) return '';
      var w = buildWorkout(entry.day, entry.week);
      var blocks = (w && w.blocks) || [];
      for(var i = 0; i < blocks.length; i++){
        var b = blocks[i];
        if(b && b.kind === 'wod' && clean(b.title) === clean(title)) return clean(b.text);
      }
    }catch(e){ /* jamais bloquant : la modale s'ouvre sans le texte */ }
    return '';
  }

  // ── Score lisible ─────────────────────────────────────────────────────────
  // `result` porte déjà la phrase saisie (« 4 rounds + 6 burpees », « 9:12 »).
  // `rounds` est le champ durable de l'AMRAP : il sert de repli quand la
  // phrase est vide.
  function scoreText(row){
    if(!row) return '';
    var result = clean(row.result).trim();
    if(result) return result;
    var rounds = clean(row.rounds).trim();
    if(rounds) return rounds + ' round' + (Number(rounds) > 1 ? 's' : '');
    return '';
  }

  // Lecture par `window.state` de bout en bout, jamais par le global nu :
  // c'est le chemin qu'emprunte déjà scripts/charge/ml_refinement.js, et c'est
  // le seul que dev/wod_history_checks.js peut réellement éprouver. Un mélange
  // des deux laissait passer un module cassé dans le navigateur.
  function historyEntries(){
    try{
      var st = window.state;
      return (st && Array.isArray(st.history)) ? st.history : [];
    }catch(e){ return []; }
  }

  // ── Lignes d'historique ───────────────────────────────────────────────────
  // Toutes les séances passées portant une ligne WOD, la plus récente d'abord.
  // Aucun filtrage par titre : c'est justement ce qui ne veut rien dire.
  function rows(opts){
    opts = opts || {};
    var out = [];
    historyEntries().forEach(function(entry){
      var results = (entry && entry.results) || {};
      Object.keys(results).forEach(function(key){
        if(!isWodKey(key)) return;
        var row = results[key] || {};
        var title = titleFromKey(key);
        var text = clean(row.wodText);
        var rebuilt = false;
        if(!text){
          text = rebuildWodText(entry, title);
          rebuilt = !!text;
        }
        out.push({
          key: key,
          title: title,
          date: clean(entry.actualDate || entry.date),
          week: entry.week,
          day: clean(entry.day),
          program: clean(entry.focus),
          text: text,
          rebuilt: rebuilt,
          format: formatOf(text),
          score: scoreText(row),
          rpe: clean(row.rpe),
          note: clean(row.note),
          skipped: clean(row.skipped) === '1' || clean(row.skipped).toLowerCase() === 'true',
          skipReason: clean(row.skipReason)
        });
      });
    });
    // Le plus récent en premier : c'est la comparaison qu'on cherche en salle.
    out.sort(function(a, b){ return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    if(opts.format) out = out.filter(function(r){ return r.format === opts.format; });
    return out.slice(0, opts.limit || MAX_ROWS);
  }

  // ── Bouton ────────────────────────────────────────────────────────────────
  // Même gabarit que le bouton note (.gvn-btn-mini) : il se pose dans la ligne
  // du kicker, n'ajoute AUCUNE rangée, donc ne reprend pas un pixel au chrono
  // (docs/UI_CONSTRAINTS.md — « Timer éditable »).
  // Le bouton s'affiche TOUJOURS. Une premiere version le masquait quand
  // l'historique etait vide : un bouton absent est alors indiscernable d'une
  // fonction cassee, et c'est exactement le doute qu'on a eu en le cherchant
  // dans l'app. Un historique vide se dit DANS la modale, pas par l'absence.
  // Le compteur reste affiche : il annonce ce qu'on va trouver avant le tap.
  function buttonHtml(title){
    var count = rows({limit: MAX_ROWS}).length;
    var label = 'Historique des conditionnements';
    return "<button type='button' class='gvn-btn-mini cwh-btn'"
      + " data-cwh-open='1'"
      + " data-cwh-title='" + esc(title) + "'"
      + " aria-label='" + esc(label) + "'"
      + " title='" + esc(label) + "'>"
      + "<span class='gvn-mini-ico' aria-hidden='true'>≡</span>"
      + "<span class='gvn-mini-label'>Histo</span>"
      + (count ? "<span class='gvn-mini-count'>" + count + "</span>" : "")
      + "</button>";
  }

  // ── Modale ────────────────────────────────────────────────────────────────
  // Coquille .tuto-modal, partagée avec le tuto et l'explication de charge :
  // verrou de scroll, fond tapable, gros bouton de fermeture.
  var currentFormat = '';

  function rowHtml(r){
    var head = esc(r.date) + (r.week ? ' · S' + esc(r.week) : '') + (r.day ? ' · ' + esc(r.day) : '');
    var h = "<div class='cwh-row'>";
    h += "<div class='cwh-row-head'>" + head
       + (r.format ? "<span class='cwh-tag'>" + esc(FORMAT_LABELS[r.format]) + "</span>" : "")
       + "</div>";
    h += "<div class='cwh-row-title'>" + esc(r.title) + "</div>";
    if(r.text){
      h += "<div class='cwh-row-text'>" + esc(r.text)
         + (r.rebuilt ? "<span class='cwh-rebuilt' title=\"Texte reconstruit depuis le programme, pas enregistré avec la séance\"> (reconstruit)</span>" : "")
         + "</div>";
    } else {
      h += "<div class='cwh-row-text cwh-missing'>Texte du WOD non retrouvé — séance faite sous un autre programme.</div>";
    }
    if(r.skipped){
      h += "<div class='cwh-row-score cwh-skipped'>Non fait" + (r.skipReason ? " — " + esc(r.skipReason) : "") + "</div>";
    } else {
      var score = r.score || '—';
      h += "<div class='cwh-row-score'>" + esc(score)
         + (r.rpe ? "<span class='cwh-rpe'>RPE " + esc(r.rpe) + "</span>" : "")
         + "</div>";
    }
    if(r.note) h += "<div class='cwh-row-note'>" + esc(r.note) + "</div>";
    h += "</div>";
    return h;
  }

  function listHtml(){
    var list = rows({format: currentFormat});
    if(!list.length){
      // On distingue les deux vides : « rien du tout » n'est pas « rien de ce
      // format ». Sans ca, un filtre trop etroit se lit comme une panne.
      var total = rows().length;
      return total
        ? "<div class='cwh-empty'>Aucun conditionnement de ce format. " + total + " enregistré(s) au total.</div>"
        : "<div class='cwh-empty'>Aucun conditionnement enregistré pour l'instant.<br/>Le texte et le score du WOD seront gardés à partir de ta prochaine séance sauvegardée.</div>";
    }
    return list.map(rowHtml).join('');
  }

  function filtersHtml(){
    var defs = [{v:'', l:'Tous'}, {v:'amrap', l:'AMRAP'}, {v:'emom', l:'EMOM'}, {v:'fortime', l:'For Time'}];
    return "<div class='cwh-filters'>" + defs.map(function(d){
      return "<button type='button' class='cwh-filter" + (currentFormat === d.v ? ' active' : '')
        + "' data-cwh-format='" + esc(d.v) + "'>" + esc(d.l) + "</button>";
    }).join('') + "</div>";
  }

  function paintList(){
    var host = document.getElementById('cwhList');
    if(host) host.innerHTML = listHtml();
    var modal = document.getElementById('cwhModal');
    if(!modal) return;
    modal.querySelectorAll('.cwh-filter').forEach(function(btn){
      var v = btn.getAttribute('data-cwh-format') || '';
      if(v === currentFormat) btn.classList.add('active'); else btn.classList.remove('active');
    });
  }

  function close(){
    var modal = document.getElementById('cwhModal');
    if(!modal) return;
    modal.classList.remove('visible');
    setTimeout(function(){
      modal.remove();
      try{ if(typeof unlockBodyScrollForModal === 'function') unlockBodyScrollForModal(); }catch(e){}
    }, 220);
  }

  function openModal(){
    var existing = document.getElementById('cwhModal');
    if(existing) existing.remove();
    currentFormat = '';
    var modal = document.createElement('div');
    modal.id = 'cwhModal';
    modal.className = 'tuto-modal cwh-modal';
    modal.innerHTML =
      "<div class='tuto-modal-inner'>"
      + "<div class='tuto-topline'>CONDITIONNEMENTS PASSÉS</div>"
      + filtersHtml()
      + "<div id='cwhList' class='cwh-list'>" + listHtml() + "</div>"
      + "<button id='cwhCloseBtn' class='btn-accent' style='width:100%;margin-top:14px'>Fermer</button>"
      + "</div>";
    document.body.appendChild(modal);
    try{ if(typeof lockBodyScrollForModal === 'function') lockBodyScrollForModal(); }catch(e){}
    setTimeout(function(){ modal.classList.add('visible'); }, 20);
    var btn = document.getElementById('cwhCloseBtn');
    if(btn) btn.onclick = close;
    modal.addEventListener('click', function(e){ if(e.target === modal) close(); });
    modal.querySelectorAll('.cwh-filter').forEach(function(f){
      f.onclick = function(e){
        e.preventDefault(); e.stopPropagation();
        currentFormat = f.getAttribute('data-cwh-format') || '';
        paintList();
      };
    });
  }

  // Délégation globale : la carte WOD est reconstruite à chaque rendu de bloc,
  // donc on ne rattache aucun handler à un bouton précis.
  function onClick(e){
    var t = e && e.target;
    if(!t || !t.closest) return;
    var btn = t.closest('[data-cwh-open]');
    if(!btn) return;
    e.preventDefault(); e.stopPropagation();
    openModal();
  }
  document.addEventListener('click', onClick, false);

  api.keyFor = keyFor;
  api.formatOf = formatOf;
  api.rows = rows;
  api.buttonHtml = buttonHtml;
  api.openModal = openModal;
  window.CoachWodHistory = api;
})();
