// Racine — conditionnement ou mouvement non fait, avec son motif (domaine session).
//
// V5.4.0 — le même noyau sert aussi aux MOUVEMENTS. Cas réel (9 nov. 2026) :
// les accessoires de fin sautés faute de temps ne pouvaient se dire qu'en
// mettant 0 rep, avec la charge suggérée pré-remplie. Une barre « engagée » à
// 0 rep est un échec majeur (suggestion.js, classifyPerformance) : recalibrage,
// confiance 0,30, progression bloquée, et un RPE 8 fictif dans les moyennes.
// Un mouvement sauté n'est pas un échec. Mêmes motifs, mêmes champs, même
// règle de collecte que le metcon : il n'y a qu'une implémentation.
//
// POURQUOI CE MODULE EXISTE
// Le metcon de fin sauté est un cas réel et récurrent : il manque du temps, il
// fait trop chaud, quelque chose fait mal. Jusqu'ici l'athlète n'avait qu'une
// issue — écrire « pas fait » dans la note, ou ne rien saisir du tout. Les deux
// mentent au journal. Une note est du texte libre que rien ne relit ; une ligne
// absente est indistinguable d'une séance jamais ouverte. Dans les deux cas,
// l'historique ne SAIT pas que le conditionnement n'a pas eu lieu.
//
// Le module donne à cette absence un statut : une ligne de résultat qui existe,
// qui dit qu'elle n'a pas été faite, et qui dit pourquoi.
//
// CE QU'IL N'EST PAS : un jugement. Trois motifs, aucun classement, aucune
// alerte, aucun effet sur la progression. Sauter un metcon parce qu'il fait
// 34 °C est une décision d'athlète, pas un échec à signaler.
//
// DONNÉES — aucune clé de stockage créée, aucun schéma persisté modifié.
// L'état vit en mémoire vive le temps d'une séance, comme le compteur de rounds
// (scripts/session/amrap_rounds.js). Ce qui doit survivre part par la ligne du
// WOD, en champs texte ordinaires — `skipped` et `skipReason` — donc
// exportables et réimportables comme le reste du journal. Deux champs AJOUTÉS :
// un export d'une version antérieure reste importable, et une version
// antérieure qui relirait un export récent ignore simplement deux clés qu'elle
// ne connaît pas. Aucune migration nécessaire.
//
// LA RÈGLE QUI COMPTE : une ligne annulée ne porte AUCUNE donnée de
// performance. Pas de RPE, pas de rounds, pas de temps, pas de splits. C'est ce
// qui la rend inoffensive pour tout le reste du moteur — les moyennes de RPE
// (scripts/season/suggest.js, la collecte ML de save.js) lisent le champ `rpe`
// de chaque ligne sans distinction de nature. Un RPE laissé sur un metcon non
// fait empoisonnerait donc la fatigue moyenne avec l'effort d'une séance qui
// n'a pas eu lieu. Le nettoyage est fait à la COLLECTE, pas à l'affichage :
// l'athlète peut avoir saisi un RPE avant de changer d'avis.
(function(){
  // key -> id de motif. Mémoire vive uniquement.
  var store = {};

  // Les trois motifs, dans l'ordre d'usage attendu. `id` est ce que le code
  // manipule, `label` ce que l'athlète lit et ce qui part dans le journal —
  // un export doit se relire sans table de correspondance.
  var REASONS = [
    {id:'temps',    label:'Manque de temps'},
    {id:'chaleur',  label:'Chaleur extrême'},
    {id:'blessure', label:'Blessure'}
  ];

  // Champs de performance à retirer d'une ligne annulée : ceux de la carte WOD
  // et, depuis V5.4.0, ceux de la carte mouvement (`load`, `reps`). Sans
  // `load`, la ligne sort d'elle-même du moteur (enrichSessionResults et
  // updateAthleteStateFromResults ignorent une ligne sans charge), de Kalman,
  // de la mémoire Brain et de La Saison.
  // `wodText` et `planned` en sont volontairement absents : ce ne sont pas des
  // performances, c'est l'identité de ce qui n'a pas été fait. Une ligne non
  // faite doit dire LAQUELLE, sinon l'historique montre un trou anonyme.
  var PERFORMANCE_FIELDS = ['load','reps','rpe','result','rounds','roundSplits','lastRoundRemaining','cardio',
    'status','performanceRatio','coachNote'];

  function clean(v){ return String(v === undefined || v === null ? '' : v); }
  function esc(v){ return typeof escHtml === 'function' ? escHtml(v) : clean(v); }
  function norm(v){ return clean(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }

  // Même clé que la ligne WOD de l'écran résultats (collectSessionExercises) :
  // c'est ce qui permet à l'annulation de traverser sans correspondance.
  function keyFor(title){ return 'wod_' + clean(title); }

  function reasonById(id){
    var n = norm(id);
    for(var i=0;i<REASONS.length;i++){ if(norm(REASONS[i].id) === n) return REASONS[i]; }
    return null;
  }
  // Retrouve un motif depuis un LIBELLÉ stocké : c'est le chemin de relecture
  // d'un journal (historique, import). Un libellé inconnu n'invente rien.
  function reasonByLabel(label){
    var n = norm(label);
    if(!n) return null;
    for(var i=0;i<REASONS.length;i++){ if(norm(REASONS[i].label) === n) return REASONS[i]; }
    return null;
  }

  function isSkipped(key){ return !!store[clean(key)]; }
  function reasonOf(key){ return store[clean(key)] || ''; }
  function reasonLabelOf(key){
    var r = reasonById(reasonOf(key));
    return r ? r.label : '';
  }

  function set(key, reasonId){
    key = clean(key);
    var r = reasonById(reasonId);
    if(!key || !r) return false;
    store[key] = r.id;
    return true;
  }
  function clear(key){ delete store[clean(key)]; return true; }
  function resetAll(){ store = {}; }

  // Report de la mémoire vive sur les lignes collectées. Une même annulation
  // peut avoir été posée depuis la séance guidée, qui n'a pas de champ caché
  // dans l'écran Résultats : c'est la mémoire qui fait foi. Appelé par
  // collectSessionResults() juste avant stripPerformanceFields().
  function applyStore(results){
    if(!results || typeof results !== 'object') return results;
    Object.keys(store).forEach(function(key){
      var r = reasonById(store[key]);
      if(!r) return;
      if(!results[key] || typeof results[key] !== 'object') results[key] = {};
      results[key].skipped = '1';
      results[key].skipReason = r.label;
    });
    return results;
  }

  // ── Lecture d'une ligne STOCKÉE ──────────────────────────────────────────
  // Ces deux fonctions ne regardent pas la mémoire vive : elles lisent une
  // ligne de résultat telle qu'elle vit dans le journal. C'est par elles que
  // l'historique et le résumé apprennent qu'un conditionnement a été annulé,
  // y compris des mois plus tard ou après un import.
  function rowIsSkipped(row){
    if(!row) return false;
    var v = clean(row.skipped).toLowerCase();
    return v === '1' || v === 'true' || v === 'oui';
  }
  function rowReasonLabel(row){
    if(!rowIsSkipped(row)) return '';
    var stored = clean(row.skipReason).trim();
    if(stored) return stored;
    // Ligne annulée sans motif (saisie d'une version antérieure, import
    // partiel) : on le dit, on n'en devine pas un.
    return 'motif non précisé';
  }
  // Libellé unique, utilisé tel quel par l'historique et le résumé pour que la
  // même absence se lise de la même façon partout.
  function rowLabel(row){
    if(!rowIsSkipped(row)) return '';
    return 'Non fait — ' + rowReasonLabel(row);
  }

  // ── Nettoyage à la collecte ──────────────────────────────────────────────
  // Appelé par collectSessionResults() juste avant de rendre la carte des
  // résultats. Retire les champs de performance des lignes annulées, et retire
  // le marqueur des lignes qui ne le portent pas vraiment (un `skipped` vide
  // n'est pas une annulation).
  function stripPerformanceFields(results){
    if(!results || typeof results !== 'object') return results;
    Object.keys(results).forEach(function(key){
      var row = results[key];
      if(!row || typeof row !== 'object') return;
      if(!rowIsSkipped(row)){
        // Un marqueur présent mais faux ne doit pas rester dans le journal :
        // il ferait douter un lecteur humain autant qu'un test.
        if(row.skipped !== undefined) delete row.skipped;
        if(!clean(row.skipReason).trim() && row.skipReason !== undefined) delete row.skipReason;
        return;
      }
      PERFORMANCE_FIELDS.forEach(function(f){ if(row[f] !== undefined) delete row[f]; });
      // La note reste : « genou droit, arrêté après 2 rounds » est exactement
      // ce qu'un motif de trois mots ne peut pas dire.
      row.skipped = '1';
      var label = clean(row.skipReason).trim();
      row.skipReason = label || 'motif non précisé';
    });
    return results;
  }

  // ── Surface visible ──────────────────────────────────────────────────────
  // Discrète VOLONTAIREMENT : c'est une porte de sortie rare, pas une action
  // de la séance. Un lien texte, aucune chrome de bouton, et les motifs ne se
  // déplient qu'après une première intention.
  // V5.0.7 — discret, PAS illisible. La mise en retrait vivait dans la taille
  // et l'opacité du texte (12px à 72 %), et l'athlète ne lisait plus le lien
  // qu'il devait trouver. C'est l'ABSENCE DE CHROME qui porte la discrétion
  // désormais ; le texte se lit à la taille du reste de la carte (styles.css,
  // .wod-skip-open). Ne pas remettre d'opacité ici.
  // opts.label : libellé du lien (« Conditionnement non fait » par défaut,
  // « Non fait » pour un mouvement). opts.scope : suffixe d'identifiants, pour
  // qu'une même clé puisse avoir une surface dans la séance guidée ET dans
  // l'écran Résultats sans doublon d'id. opts.noFields : pas de champs cachés
  // (la séance guidée passe par la mémoire, voir applyStore).
  function controlHtml(key, opts){
    key = clean(key);
    opts = opts || {};
    var sid = key + clean(opts.scope);
    var label = clean(opts.label) || '✕ Conditionnement non fait';
    var chips = REASONS.map(function(r){
      return '<button type="button" class="sf-chip" data-skip-reason="'+esc(r.id)+'">'+esc(r.label)+'</button>';
    }).join('');
    return '' +
      (opts.noFields ? '' :
      '<input class="sf-input" id="wod_skipped_'+esc(sid)+'" data-key="'+esc(key)+'" data-field="skipped" data-skip-input="skipped" type="hidden" value=""/>' +
      '<input class="sf-input" id="wod_skipreason_'+esc(sid)+'" data-key="'+esc(key)+'" data-field="skipReason" data-skip-input="skipReason" type="hidden" value=""/>') +
      '<div class="wod-skip" id="wod_skip_'+esc(sid)+'" data-skip-host="'+esc(key)+'">' +
        '<button type="button" class="wod-skip-open" data-skip-open="1">'+esc(label)+'</button>' +
        '<div class="wod-skip-reasons" hidden>' +
          '<span class="wod-skip-ask">Pourquoi ?</span>' +
          '<div class="sf-chips">'+chips+'</div>' +
          '<button type="button" class="wod-skip-open" data-skip-cancel="1">Laisser tomber</button>' +
        '</div>' +
        '<div class="wod-skip-done" hidden>' +
          '<span class="wod-skip-state"></span>' +
          '<button type="button" class="wod-skip-open" data-skip-undo="1">Finalement je l\'ai fait</button>' +
        '</div>' +
      '</div>';
  }

  // Branche la surface. `onChange` est rappelé après chaque bascule pour que la
  // carte rafraîchisse son aperçu — le module ne connaît pas cet aperçu.
  function bind(key, card, onChange){
    key = clean(key);
    // La surface est cherchée DANS la carte d'abord : deux surfaces pour la
    // même clé (séance guidée + écran Résultats) ne se volent pas leurs ids.
    var host = (card && card.querySelector) ? card.querySelector('.wod-skip[data-skip-host]') : null;
    if(!host) host = document.getElementById('wod_skip_'+key);
    if(!host || !card) return;
    var openBtn  = host.querySelector('[data-skip-open]');
    var reasons  = host.querySelector('.wod-skip-reasons');
    var done     = host.querySelector('.wod-skip-done');
    var stateEl  = host.querySelector('.wod-skip-state');
    var skipInp  = card.querySelector('[data-skip-input="skipped"]') || document.getElementById('wod_skipped_'+key);
    var reasonInp= card.querySelector('[data-skip-input="skipReason"]') || document.getElementById('wod_skipreason_'+key);

    function paint(){
      var on = isSkipped(key);
      if(openBtn) openBtn.hidden = on;
      if(done) done.hidden = !on;
      if(on && reasons) reasons.hidden = true;
      if(stateEl) stateEl.textContent = on ? ('Non fait — ' + reasonLabelOf(key)) : '';
      // La carte entière se met en retrait : les champs de performance restent
      // visibles (l'athlète voit ce qu'il annule) mais ne sont plus saisissables.
      card.classList.toggle('is-skipped', on);
      if(skipInp) skipInp.value = on ? '1' : '';
      if(reasonInp) reasonInp.value = on ? reasonLabelOf(key) : '';
      if(typeof onChange === 'function') onChange(on);
    }

    if(openBtn) openBtn.addEventListener('click', function(){
      if(reasons) reasons.hidden = false;
      openBtn.hidden = true;
    });
    var cancelBtn = host.querySelector('[data-skip-cancel]');
    if(cancelBtn) cancelBtn.addEventListener('click', function(){
      if(reasons) reasons.hidden = true;
      if(openBtn) openBtn.hidden = false;
    });
    host.querySelectorAll('[data-skip-reason]').forEach(function(btn){
      btn.addEventListener('click', function(){
        set(key, btn.getAttribute('data-skip-reason'));
        paint();
      });
    });
    var undoBtn = host.querySelector('[data-skip-undo]');
    if(undoBtn) undoBtn.addEventListener('click', function(){
      clear(key);
      if(openBtn) openBtn.hidden = false;
      paint();
    });

    paint();
  }

  window.CoachWodSkip = {
    REASONS: REASONS.slice(),
    keyFor: keyFor,
    isSkipped: isSkipped,
    reasonOf: reasonOf,
    reasonLabel: reasonLabelOf,
    reasonByLabel: reasonByLabel,
    set: set,
    clear: clear,
    resetAll: resetAll,
    applyStore: applyStore,
    // Mise de côté de la mémoire vive pendant la correction d'une séance
    // passée (history_edit.js) : les deux ne se mélangent jamais.
    exportStore: function(){ return Object.assign({}, store); },
    importStore: function(saved){ store = Object.assign({}, saved || {}); },
    rowIsSkipped: rowIsSkipped,
    rowReasonLabel: rowReasonLabel,
    rowLabel: rowLabel,
    stripPerformanceFields: stripPerformanceFields,
    controlHtml: controlHtml,
    bind: bind
  };
})();
