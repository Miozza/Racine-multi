#!/usr/bin/env node
/*
  Racine — garde-fou : le jour RÉEL suit l'horloge du téléphone.

  Demande de l'athlète (2026-10-16) : Coach IA et l'écran WOD doivent dire le
  vrai jour, dans le fuseau local, sans le confondre avec le jour de
  PROGRAMME (state.day), qui avance avec la semaine validée et pas avec le
  calendrier. Contrat protégé ici :

    1. realToday() (app.js) donne la date locale et le jour en toutes
       lettres. À 21 h à Montréal, l'UTC est déjà au lendemain : la date ne
       doit pas suivre l'UTC (ancien défaut de toISOString().slice(0,10)).
    2. Le passage de minuit change le jour transmis à Coach IA, d'un message
       au suivant, dans plusieurs fuseaux. Le jour de programme, lui, ne bouge
       pas.
    3. L'écran WOD affiche le même jour réel que Coach IA (même source).
    4. Une séance sauvegardée est datée du jour réel de la saisie (date,
       actualDate, actualDayName) et garde son jour de programme à part
       (jour, plannedDay) : faite un vendredi, elle reste un vendredi.

  Usage : node dev/real_today_checks.js
  (le script se relance lui-même avec plusieurs valeurs de TZ)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const ZONES = ['America/Toronto', 'America/Los_Angeles', 'Europe/Paris', 'Asia/Tokyo', 'Pacific/Kiritimati'];

if(!process.env.RACINE_TODAY_CHILD){
  let failed = 0;
  ZONES.forEach(tz => {
    const r = cp.spawnSync(process.execPath, [__filename], {env: Object.assign({}, process.env, {TZ: tz, RACINE_TODAY_CHILD: '1'}), encoding: 'utf8'});
    process.stdout.write(r.stdout || '');
    process.stderr.write(r.stderr || '');
    if(r.status !== 0) failed++;
  });
  if(failed){ console.error('✗ real_today_checks — ' + failed + ' fuseau(x) en échec.'); process.exit(1); }
  console.log('✓ real_today_checks — ' + ZONES.length + ' fuseaux, minuit et date réelle cohérents.');
  process.exit(0);
}

const TZ = process.env.TZ;
let failures = 0;
function assert(cond, msg){ if(!cond){ console.error('FAIL [' + TZ + ']:', msg); failures++; } }

function extractFunction(src, name){
  const start = src.indexOf('function ' + name + '(');
  if(start < 0) return null;
  let depth = 0, i = src.indexOf('{', start);
  for(let j = i; j < src.length; j++){
    if(src[j] === '{') depth++;
    else if(src[j] === '}'){ depth--; if(depth === 0) return src.slice(start, j + 1); }
  }
  return null;
}

// Horloge simulée : `new Date()` sans argument rend NOW, le reste est le vrai Date.
let NOW = 0;
class FakeDate extends Date {
  constructor(...a){ if(a.length) super(...a); else super(NOW); }
  static now(){ return NOW; }
}

const app = read('app.js');
const c = {console, Math, JSON, Intl, String, Number, Object, Array, Date: FakeDate};
c.window = c;
vm.createContext(c);
['REAL_DAY_NAMES', 'REAL_MONTH_NAMES'].forEach(n => {
  const m = app.match(new RegExp('var ' + n + '\\s*=\\s*[^\\n]+\\n'));
  assert(!!m, 'app.js déclare ' + n);
  if(m) vm.runInContext(m[0], c);
});
['localIsoDate', 'todayIsoDate', 'realToday', 'actualDayName', 'todayDateString'].forEach(n => {
  const src = extractFunction(app, n);
  assert(!!src, 'app.js : ' + n + '() existe');
  if(src) vm.runInContext(src, c);
});

// Jour de programme volontairement différent du jour réel.
c.state = {week: 3, day: 'lundi', history: [], completedDays: [], missedDays: [], profile: {name: 'T'}, cycle: {goal: 'x'}};
c.dayLabel = d => d;
c.currentDayOrder = () => ['lundi', 'mercredi', 'vendredi'];
c.totalWeeks = () => 8;
c.buildWorkout = d => ({day: {label: 'Séance ' + d}, blocks: []});
c.APP_VERSION = 'test';
c.focus = () => ({label: 'Test'});
c.buildCycleStatePayload = () => ({});
vm.runInContext(read('scripts/coach_ai/context.js'), c, {filename: 'context.js'});
vm.runInContext(read('scripts/session/save.js'), c, {filename: 'save.js'});
vm.runInContext(read('scripts/view_wodplus.js'), c, {filename: 'view_wodplus.js'});

// Vérité indépendante du code testé : Intl avec le fuseau explicite.
function expected(ms){
  const parts = new Intl.DateTimeFormat('fr-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'}).formatToParts(new Date(ms));
  const get = t => (parts.find(p => p.type === t) || {}).value;
  return {iso: get('year') + '-' + get('month') + '-' + get('day'), day: get('weekday')};
}
function todayLine(){ return (c.CoachAIContext.build().split('\n').find(l => l.indexOf("Aujourd'hui (jour réel") === 0) || ''); }
function programLine(){ return (c.CoachAIContext.build().split('\n').find(l => l.indexOf('Jour de programme ouvert') === 0) || ''); }

// 1. Minuit local du vendredi 16 → samedi 17 octobre 2026.
const before = new Date(2026, 9, 16, 23, 59, 59).getTime();
const after = new Date(2026, 9, 17, 0, 0, 0).getTime();
NOW = before;
const t1 = c.realToday();
assert(t1.iso === '2026-10-16' && t1.day === 'vendredi' && t1.label === 'vendredi 16 octobre 2026', '23:59:59 local → vendredi 16 octobre 2026 (reçu ' + JSON.stringify(t1) + ')');
assert(t1.iso === expected(before).iso && t1.day === expected(before).day, 'realToday() suit le fuseau local, pas l\'UTC.');
const l1 = todayLine(), p1 = programLine();
assert(l1.indexOf('vendredi 16 octobre 2026 (2026-10-16)') !== -1, 'Coach IA reçoit le vendredi en toutes lettres : « ' + l1 + ' »');
assert(l1.indexOf('fuseau ' + TZ) !== -1, 'Coach IA reçoit le fuseau du téléphone.');
assert(c.wodPlusRealTodayText() === t1.label && l1.indexOf(c.wodPlusRealTodayText()) !== -1, 'L\'écran WOD et Coach IA affichent le même jour réel.');
const pay1 = c.buildSessionPayload({});
assert(pay1.date === '2026-10-16' && pay1.actualDate === '2026-10-16' && pay1.actualDayName === 'vendredi', 'Séance saisie le vendredi : datée du vendredi.');
assert(pay1.jour === 'lundi' && pay1.plannedDay === 'lundi', 'La séance garde son jour de programme à part (lundi).');

NOW = after;
const t2 = c.realToday();
assert(t2.iso === '2026-10-17' && t2.day === 'samedi', '00:00:00 local → samedi 17 octobre (reçu ' + JSON.stringify(t2) + ')');
const l2 = todayLine(), p2 = programLine();
assert(l2.indexOf('samedi 17 octobre 2026 (2026-10-17)') !== -1, 'Après minuit, le message suivant transmet samedi : « ' + l2 + ' »');
assert(p1 === p2 && p2.indexOf('S3 · lundi') !== -1, 'Le jour de programme ne suit pas le calendrier (reste S3 · lundi).');
assert(c.buildSessionPayload({}).actualDayName === 'samedi', 'Une séance saisie après minuit est datée du samedi.');

// 2. Soirée : 21 h local. À l'ouest de Greenwich, l'UTC est déjà au lendemain.
NOW = new Date(2026, 9, 16, 21, 0, 0).getTime();
assert(c.realToday().iso === '2026-10-16' && c.todayDateString() === '2026-10-16', '21 h le vendredi reste le vendredi, quel que soit l\'UTC.');
assert(todayLine().indexOf('vendredi 16 octobre 2026') !== -1, 'Coach IA dit vendredi à 21 h.');

// 3. Plus de date UTC pour dater une séance, une sauvegarde ou une demande.
['scripts/session/save.js', 'scripts/session/results.js', 'scripts/coach_ai/context.js'].forEach(f => {
  assert(!/toISOString\(\)\s*\.slice\(0,\s*10\)/.test(read(f)), f + ' : aucune date tirée de toISOString().slice(0,10) (UTC).');
});

if(failures){ process.exit(1); }
console.log('ok  : ' + TZ + ' — minuit, 21 h, WOD = Coach IA, séance datée du jour réel.');
