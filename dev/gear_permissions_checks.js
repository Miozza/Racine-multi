#!/usr/bin/env node
/*
  Racine — garde-fous : grille d'accès aux programmes privés dans Gear.
  L'ex-onglet « Admin » de la vue PC (grille profils × programmes privés,
  bascule ✓/·) vit désormais dans le panneau Gear des Réglages. La vue PC
  redevient purement de l'inspection en lecture seule. Tous les profils étant
  locaux, la grille montre tout le monde d'un coup : aucun sélecteur de profil
  n'est requis pour donner/retirer un programme (le sélecteur restant est
  scopé aux remplacements de mouvements).

  Usage : node dev/gear_permissions_checks.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
let failures = 0;
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); failures++; } else { console.log('ok  :', msg); } }

const pc = read('scripts/view_pc.js');
const gear = read('scripts/profiles/admin_programs.js');
const html = read('index.html');

// ── Vue PC : plus d'onglet Admin ───────────────────────────────────────────
assert(!/\['admin'\s*,\s*'Admin'\]/.test(pc), 'vue PC : onglet « Admin » retiré de la barre d\'onglets');
assert(!/pcRenderAdminTab|pcBindAdmin/.test(pc.replace(/\/\/[^\n]*/g,'')), 'vue PC : code de l\'onglet Admin supprimé');
assert(!/grantProgramPermission|revokeProgramPermission/.test(pc), 'vue PC : ne touche plus aux permissions');

// ── Gear : grille directe, sans sélection de profil pour l'accès ───────────
assert(/data-perm-profile/.test(gear) && /data-perm-program/.test(gear), 'Gear : grille profils × programmes présente');
assert(/grantProgramPermission/.test(gear) && /revokeProgramPermission/.test(gear), 'Gear : bascule branchée sur grant/revoke');
assert(/Accès aux programmes spécialisés/.test(gear), 'Gear : section d\'accès nommée');
assert(!/data-share-program/.test(gear), 'Gear : plus de copie de lien par programme');
assert(/adminSwapsShare/.test(gear) && /RacinePrescription/.test(gear), 'Gear : partage des remplacements par lien conservé');
assert(/adminProgSelectProfile/.test(gear), 'Gear : sélecteur de profil conservé (scopé aux remplacements)');
const gridIdx = gear.indexOf('data-perm-profile'), selIdx = gear.indexOf('adminProgSelectProfile');
assert(gridIdx !== -1 && selIdx !== -1 && gridIdx < selIdx, 'Gear : la grille d\'accès vient avant le sélecteur des remplacements');
assert(/id="adminProgramsPanel"[^>]*class="[^"]*admin-only|class="[^"]*admin-only[^"]*"[^>]*id="adminProgramsPanel"/.test(html) || /panel admin-only" id="adminProgramsPanel"/.test(html),
  'index.html : panneau Gear toujours réservé à l\'admin');

// ── Smoke runtime : rendu de la grille sans erreur ─────────────────────────
try{
  const els = {};
  function mkEl(id){ return { id:id, innerHTML:'', classList:{contains(){return false;},add(){},remove(){}}, querySelectorAll(){ return []; }, onclick:null, onchange:null, oninput:null, onfocus:null }; }
  const ctx = { console: console, navigator: {} };
  ctx.window = ctx; ctx.self = ctx;
  ctx.document = {
    getElementById(id){ if(!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelectorAll(){ return []; }
  };
  ctx.CoachProfiles = {
    isActiveAdmin(){ return true; },
    getActiveId(){ return 'p1'; },
    getActive(){ return { id:'p1', name:'Bertin' }; },
    list(){ return [
      { id:'p1', name:'Bertin', onboarded:true, programPermissions:['prog_priv'] },
      { id:'p2', name:'Stéphanie', onboarded:true, programPermissions:[] }
    ]; },
    exportProfileBlob(){ return { state:{ cycle:{ goal:'force' } } }; },
    grantProgramPermission(){}, revokeProgramPermission(){}
  };
  ctx.window.CoachProfiles = ctx.CoachProfiles;
  ctx.COACH_BERTIN_PROGRAM_INDEX = [
    { id:'prog_pub', name:'Base', visibility:'public' },
    { id:'prog_priv', name:'Phase 2 — Press 225', visibility:'private' }
  ];
  ctx.window.COACH_BERTIN_PROGRAM_INDEX = ctx.COACH_BERTIN_PROGRAM_INDEX;
  vm.createContext(ctx);
  vm.runInContext(gear, ctx, { filename:'admin_programs.js' });
  ctx.RacineAdminPrograms.render();
  const out = els['adminProgramsBody'].innerHTML;
  assert(/data-perm-profile="p1"/.test(out) && /data-perm-profile="p2"/.test(out), 'smoke : tous les profils apparaissent dans la grille');
  assert(/data-perm-program="prog_priv"/.test(out), 'smoke : le programme privé apparaît en colonne');
  assert(!/data-perm-program="prog_pub"/.test(out), 'smoke : les programmes publics restent hors grille');
  assert(/✓/.test(out), 'smoke : permission existante affichée ✓');
  assert(/Remplacements de mouvements/.test(out), 'smoke : section remplacements toujours rendue');
}catch(e){
  assert(false, 'smoke : rendu Gear sans exception (' + e.message + ')');
}

process.on('exit', function(){
  if(failures){ console.error('\n❌ gear_permissions_checks : ' + failures + ' échec(s)'); process.exit(1); }
  else console.log('\n✅ gear_permissions_checks OK');
});
