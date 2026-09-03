#!/usr/bin/env node
/*
  Racine — contrat du conditionnement non fait (scripts/session/wod_skip.js).

  Ce que ce fichier protège (le contrat, pas l'inventaire) :
    1. Les trois motifs sont ceux demandés, et rien d'autre ne se déclare motif.
    2. Marquer / annuler l'annulation est réversible et sans effet de bord.
    3. LA RÈGLE : une ligne annulée ne porte AUCUNE donnée de performance.
       C'est ce qui la rend inoffensive pour les moyennes de RPE, qui lisent le
       champ `rpe` de chaque ligne sans distinction de nature.
    4. La note de l'athlète SURVIT : un motif de trois mots ne dit pas tout.
    5. Un marqueur faux ou vide n'est pas une annulation, et ne reste pas dans
       le journal.
    6. Une ligne annulée se relit depuis le journal seul — c'est par là que
       l'historique et le résumé l'apprennent, des mois plus tard ou après un
       import.
    7. Compatibilité ascendante : deux champs AJOUTÉS, aucune clé renommée,
       aucune migration. Une ligne annulée sans motif se lit encore.
    8. La surface visible reste discrète : aucune chrome de bouton.

  Usage :
    node dev/wod_skip_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function fail(msg){ errors.push(msg); }
function assert(cond, msg){ if(!cond) fail(msg); else notes.push(msg); }

// Bac à sable minimal : le module ne dépend d'aucun DOM pour la partie qui
// compte (lecture du journal et nettoyage à la collecte).
const ctx = {
  console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
  parseInt, parseFloat, isNaN, isFinite,
  document: { getElementById: () => null },
  escHtml: v => String(v == null ? '' : v)
};
ctx.window = ctx;
ctx.globalThis = ctx;

try {
  vm.runInNewContext(read('scripts/session/wod_skip.js'), ctx, { filename: 'wod_skip.js' });
  const S = ctx.window.CoachWodSkip;
  assert(!!S, 'La porte publique window.CoachWodSkip existe.');

  // ─── 1. Les trois motifs, et rien d'autre ────────────────────────────────
  const labels = S.REASONS.map(r => r.label);
  assert(S.REASONS.length === 3, 'Trois motifs, pas plus (obtenu ' + S.REASONS.length + ').');
  ['Manque de temps', 'Chaleur extrême', 'Blessure'].forEach(l => {
    assert(labels.indexOf(l) >= 0, 'Motif présent : « ' + l +' ».');
  });
  const k = S.keyFor('Metcon');
  assert(k === 'wod_Metcon', 'La clé est celle de la ligne WOD de l\'écran résultats (' + k + ').');
  assert(S.set(k, 'inventé') === false && S.isSkipped(k) === false,
    'Un motif inconnu est refusé : le module n\'en invente pas.');

  // ─── 2. Marquer, puis revenir en arrière ─────────────────────────────────
  assert(S.set(k, 'chaleur') === true, 'Marquer avec un motif connu fonctionne.');
  assert(S.isSkipped(k) === true && S.reasonLabel(k) === 'Chaleur extrême',
    'L\'état porte le libellé du motif (« ' + S.reasonLabel(k) + ' »).');
  S.clear(k);
  assert(S.isSkipped(k) === false && S.reasonLabel(k) === '',
    'Annuler l\'annulation ne laisse aucune trace en mémoire.');
  S.set(k, 'temps'); S.resetAll();
  assert(S.isSkipped(k) === false, 'resetAll() vide tout entre deux séances.');

  // ─── 3. LE COEUR — aucune donnée de performance sur une ligne annulée ────
  // Les moyennes de fatigue (scripts/season/suggest.js, la collecte ML de
  // scripts/session/save.js) lisent `rpe` de CHAQUE ligne sans regarder sa
  // nature. Un RPE laissé sur un metcon non fait entrerait dans la moyenne
  // avec l'effort d'une séance qui n'a pas eu lieu.
  {
    const results = {
      'wod_Metcon': {
        skipped: '1', skipReason: 'Blessure',
        rpe: '9', result: '5 rounds', rounds: '5',
        roundSplits: '1:02 · 1:10', lastRoundRemaining: '3 burpees',
        note: 'genou droit, arrêté après 2 rounds'
      },
      'Back Squat': { load: '205', reps: '3', rpe: '8' }
    };
    S.stripPerformanceFields(results);
    const row = results['wod_Metcon'];
    ['rpe', 'result', 'rounds', 'roundSplits', 'lastRoundRemaining'].forEach(f => {
      assert(row[f] === undefined,
        'Ligne annulée : le champ « ' + f + ' » est retiré à la collecte.');
    });
    assert(row.skipped === '1' && row.skipReason === 'Blessure',
      'Le marqueur et le motif restent : la ligne EXISTE et dit pourquoi.');

    // ─── 4. La note survit ────────────────────────────────────────────────
    assert(row.note === 'genou droit, arrêté après 2 rounds',
      'La note de l\'athlète survit : un motif de trois mots ne dit pas tout.');

    // Et le reste de la séance n'est pas touché.
    assert(results['Back Squat'].rpe === '8' && results['Back Squat'].load === '205',
      'Les autres mouvements de la séance sont intacts.');
  }

  // ─── 5. Un marqueur faux n'est pas une annulation ────────────────────────
  {
    const results = {
      'wod_A': { skipped: '', skipReason: '', rpe: '8', result: '4 rounds' },
      'wod_B': { skipped: '0', rpe: '7' },
      'wod_C': { rpe: '8', result: '6 rounds' }
    };
    S.stripPerformanceFields(results);
    assert(results['wod_A'].rpe === '8' && results['wod_A'].result === '4 rounds',
      'Un marqueur VIDE n\'annule rien : le résultat est conservé.');
    assert(results['wod_A'].skipped === undefined && results['wod_A'].skipReason === undefined,
      'Et le marqueur faux ne reste pas dans le journal.');
    assert(results['wod_B'].rpe === '7', 'Un marqueur « 0 » n\'annule rien non plus.');
    assert(results['wod_C'].rpe === '8', 'Une ligne sans marqueur traverse inchangée.');
  }

  // ─── 6. Relecture depuis le journal SEUL ─────────────────────────────────
  // Aucune mémoire vive ici : c'est le chemin de l'historique et du résumé.
  S.resetAll();
  assert(S.rowIsSkipped({skipped: '1', skipReason: 'Manque de temps'}) === true,
    'Une ligne stockée se relit comme annulée sans aucun état en mémoire.');
  assert(S.rowLabel({skipped: '1', skipReason: 'Manque de temps'}) === 'Non fait — Manque de temps',
    'Le libellé est unique : historique et résumé disent la même chose.');
  assert(S.rowIsSkipped({load: '205', reps: '3'}) === false,
    'Une ligne de charge n\'est jamais lue comme annulée.');
  assert(S.rowLabel({load: '205'}) === '',
    'Et elle ne reçoit aucun libellé d\'annulation.');
  ['1', 'true', 'oui'].forEach(v => {
    assert(S.rowIsSkipped({skipped: v}) === true,
      'Le marqueur « ' + v + ' » est reconnu (tolérance de relecture d\'un import).');
  });

  // ─── 7. Compatibilité ascendante ─────────────────────────────────────────
  // Deux champs AJOUTÉS. Un export antérieur reste importable ; une ligne
  // annulée sans motif (import partiel) se lit encore, sans motif inventé.
  assert(S.rowReasonLabel({skipped: '1'}) === 'motif non précisé',
    'Une annulation sans motif se lit, et le dit — aucun motif inventé.');
  {
    const ancien = { load: '205', reps: '3', rpe: '8' };
    const copie = JSON.parse(JSON.stringify(ancien));
    S.stripPerformanceFields({x: copie});
    assert(JSON.stringify(copie) === JSON.stringify(ancien),
      'Une ligne d\'une version antérieure traverse la collecte à l\'identique.');
  }
  assert(S.reasonByLabel('Chaleur extrême') && S.reasonByLabel('Chaleur extrême').id === 'chaleur',
    'Un libellé stocké se remappe sur son motif (relecture d\'un journal).');
  assert(S.reasonByLabel('canicule') === null,
    'Un libellé inconnu ne se remappe sur rien.');

  // ─── 8. La surface reste discrète, vérifié sur le source ─────────────────
  // « Discret » est la demande explicite de l'athlète : c'est une porte de
  // sortie rare, elle ne doit pas se disputer l'attention avec la saisie.
  {
    const html = S.controlHtml('wod_Metcon');
    assert(html.indexOf('wod-skip-open') >= 0, 'La surface expose un lien, pas un bouton d\'action.');
    assert(!/class="btn|class="sf-adj|class="btn-/.test(html),
      'Aucune classe de bouton principal dans la surface d\'annulation.');
    assert(html.indexOf('data-field="skipped"') >= 0 && html.indexOf('data-field="skipReason"') >= 0,
      'Les deux champs durables sont posés en data-field, comme le reste du journal.');
    assert((html.match(/hidden/g) || []).length >= 2,
      'Les motifs ne sont pas dépliés d\'emblée : ils attendent une intention.');

    const css = read('styles.css');

    // CE QUE CE TEST NE VOYAIT PAS, et qui est arrivé : l'attribut `hidden`
    // était bien dans le HTML, et la surface s'ouvrait quand même dépliée —
    // motifs, « Laisser tomber » et « Finalement je l'ai fait » d'un bloc.
    // `display` posé sur une CLASSE bat le `display:none` que [hidden] tient
    // de la feuille de style du navigateur : sa spécificité est plus faible.
    // Vérifier la présence de l'attribut dans une chaîne ne prouve donc rien
    // sur ce qui s'affiche. Ces deux assertions regardent la règle CSS.
    // Les seules classes que le module replie (bind() pose `.hidden` dessus).
    // `.wod-skip` — le conteneur — n'est jamais replié : il est hors sujet.
    const REPLIABLES = ['.wod-skip-reasons', '.wod-skip-done'];
    const jsSrc = read('scripts/session/wod_skip.js');
    assert(/reasons\.hidden\s*=/.test(jsSrc) && /done\.hidden\s*=/.test(jsSrc),
      'Le module replie bien ces éléments par l\'attribut hidden (sinon cette liste est périmée).');
    REPLIABLES.forEach(sel => {
      const rules = css.match(new RegExp('\\' + sel + '[^{,]*\\{[^}]*\\}', 'g')) || [];
      const nue = rules.filter(r => /display\s*:/.test(r) && !/:not\(\[hidden\]\)/.test(r.split('{')[0]));
      assert(nue.length === 0,
        'La règle de « ' + sel + ' » ne pose pas `display` sans garde :not([hidden]).');
    });
    assert(/\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(css),
      'Le filet générique [hidden]{display:none!important} est en place pour les prochaines.');
    assert(/\.wod-skip-open\s*\{[^}]*background:\s*none/.test(css),
      'Le lien d\'annulation n\'a aucun fond : rien qui ressemble à un bouton.');
    assert(/\.sf-card\.is-skipped[^{]*\{[^}]*pointer-events:\s*none/.test(css),
      'Une carte annulée n\'est plus saisissable.');
  }

  // ─── 9. Le branchement existe vraiment, vérifié sur le source ────────────
  const res = read('scripts/session/results.js');
  assert(/CoachWodSkip\.controlHtml\(item\.key\)/.test(res),
    'La carte WOD monte la surface d\'annulation.');
  assert(/CoachWodSkip\.stripPerformanceFields\(results\)/.test(res),
    'collectSessionResults() nettoie les lignes annulées.');
  const collectBody = res.slice(res.indexOf('function collectSessionResults'));
  const stripAt = collectBody.indexOf('stripPerformanceFields');
  const cacheAt = collectBody.indexOf('guidedResultCache');
  assert(stripAt > cacheAt && cacheAt >= 0,
    'Le nettoyage passe APRÈS le cache : sinon un RPE saisi puis annulé revient.');
  assert(/CoachWodSkip\.rowIsSkipped/.test(read('app.js')),
    'L\'historique sait lire une ligne annulée.');
  assert(/CoachWodSkip\.rowIsSkipped/.test(read('scripts/summary/index.js')),
    'Le résumé de séance aussi.');
  assert(/scripts\/session\/wod_skip\.js/.test(read('index.html')),
    'Le module est chargé par index.html (les scripts restent listés à la main).');

  // ─── 10. LA CONTRE-ÉPREUVE — la pollution qu'on évite, chiffrée ──────────
  // Le reste du fichier vérifie que les champs partent. Celui-ci vérifie que
  // ça CHANGE quelque chose, sur le consommateur réel : la moyenne de RPE de
  // La Saison (scripts/season/suggest.js), qui lit le champ `rpe` de chaque
  // ligne sans regarder sa nature. Sans ce test, un futur refactor pourrait
  // remettre le RPE en circulation sans qu'aucune assertion ne tombe.
  {
    const sctx = {
      console, Math, Date, JSON, Number, String, Boolean, Array, Object, RegExp,
      parseInt, parseFloat, isNaN, isFinite
    };
    sctx.window = sctx; sctx.globalThis = sctx;
    vm.runInNewContext(read('scripts/season/suggest.js'), sctx, { filename: 'suggest.js' });
    const suggest = sctx.window.CoachSuggest;
    assert(!!(suggest && typeof suggest.recentAvgRpe === 'function'),
      'CoachSuggest.recentAvgRpe est chargé (sinon ce test ne prouverait rien).');

    // Même séance, deux fois : squat à RPE 8, metcon annulé « saisi » à RPE 9.
    function seance(){
      return {
        'Back Squat': {load: '205', reps: '3', rpe: '8'},
        'wod_Metcon': {skipped: '1', skipReason: 'Chaleur extrême', rpe: '9'}
      };
    }
    const nettoyee = seance();
    S.stripPerformanceFields(nettoyee);
    const apres = suggest.recentAvgRpe({history: [{date: '2026-09-03', results: nettoyee}]}, '2026-09-03');
    const avant = suggest.recentAvgRpe({history: [{date: '2026-09-03', results: seance()}]}, '2026-09-03');

    assert(apres === 8,
      'Après nettoyage, la fatigue moyenne ne retient que la séance réellement faite (obtenu ' + apres + ').');
    assert(avant > apres,
      'Et le RPE d\'un metcon non fait POLLUERAIT bien cette moyenne : ' + avant + ' au lieu de ' + apres + '.');
  }

} catch (err) {
  fail('Erreur pendant les tests wod_skip : ' + (err && err.stack ? err.stack : err));
}

if (errors.length) {
  console.error('\nECHEC wod_skip_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}

console.log('OK wod_skip_checks.js');
notes.forEach(n => console.log(' - ' + n));
