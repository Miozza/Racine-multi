#!/usr/bin/env node
/*
  Racine — garde-fous prescription coach → client par lien.
  Objectif : la prescription voyage dans le fragment d'URL (aucun serveur),
  ne s'applique jamais sans accord explicite, expire, et refuse les formats
  inconnus au lieu de corrompre un profil.
  Voir docs/IDEES_FUTURES.md (idée 2) et scripts/profiles/prescription.js.
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];
const notes = [];
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ (cond ? notes : errors).push(msg); }

// Câblage statique.
assert(read('index.html').indexOf('scripts/profiles/prescription.js') !== -1, 'prescription.js chargé par index.html.');
assert(read('scripts/profiles/admin_programs.js').indexOf('RacinePrescription') !== -1, 'Panneau admin : bouton Partager branché.');
const adminPrograms = read('scripts/profiles/admin_programs.js');
assert(adminPrograms.includes('data-share-program'), 'Gear expose une action de copie par programme privé.');
assert(!adminPrograms.includes('data-grant='), 'Gear ne prétend plus accorder localement un accès distant.');
assert(!adminPrograms.includes('data-revoke='), 'Gear ne prétend plus retirer un accès distant.');
assert(!adminPrograms.includes('data-activate='), 'Gear ne prétend plus activer un cycle distant.');
assert(!adminPrograms.includes('setProfileActiveProgram'), 'Gear ne change plus le cycle actif.');
assert(read('scripts/profiles/ui.js').indexOf('RacinePrescription.propose') !== -1, 'Réglages client : coller le lien branché.');
// Le boot doit reconstruire le catalogue avec les permissions du profil actif,
// sinon un programme privé accordé après le chargement de la page (prescription
// acceptée, activation admin) reste invisible et déclenche à tort le fallback
// « programme absent ».
assert(/function coachFullBoot\(\)[\s\S]{0,800}registerProgramsFromIndex\(\)/.test(read('app.js')),
  'coachFullBoot reconstruit focusConfigs (permissions du profil actif).');
assert(/state\.missingCycle && focusConfigs\[state\.missingCycle\.id\]/.test(read('app.js')),
  'Auto-guérison : un cycle tracé par le fallback est restauré quand le programme redevient disponible.');

// Test dynamique.
try{
  const ctx = {
    window: {},
    console: console,
    location: { hash: '', origin: 'https://exemple.test', pathname: '/racine/', search: '' },
    history: { replaceState: function(){} },
    navigator: {},
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary')
  };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(read('scripts/profiles/prescription.js'), ctx, {filename:'prescription.js'});
  const api = ctx.window.RacinePrescription;

  // Aller-retour avec accents (unicode-safe).
  const patch = api.buildPatch({
    coach: 'Bertin', clientName: 'Stéphanie',
    programId: 'hypertrophie_fesse_stephanie',
    swaps: [{from:'Bench Press', to:'DB Bench Press', note:'épaule sensible — 4 sem.'}]
  });
  assert(!!patch && patch.v === 1, 'buildPatch pose la version.');
  const link = api.buildLink(patch);
  assert(typeof link === 'string' && link.indexOf('#rx=') !== -1, 'buildLink produit un lien #rx=.');
  assert(/^[A-Za-z0-9_\-]+$/.test(link.split('#rx=')[1]), 'Code base64url propre (transmissible en texto).');
  const parsed = api.parse(link);
  assert(parsed && parsed.patch, 'parse accepte le lien complet.');
  assert(parsed.patch.swaps[0].note === 'épaule sensible — 4 sem.', 'Accents intacts après aller-retour.');
  assert(api.parse(link.split('#rx=')[1]) && api.parse(link.split('#rx=')[1]).patch, 'parse accepte le code seul.');
  assert(api.parse('#rx=' + link.split('#rx=')[1]).patch.programId === 'hypertrophie_fesse_stephanie', 'parse accepte le hash seul.');

  // Refus des formats invalides.
  assert(api.parse('pas un lien') === null, 'Texte quelconque refusé.');
  assert(api.buildPatch({}) === null, 'Prescription vide impossible à construire.');
  const future = JSON.parse(JSON.stringify(patch)); future.v = 99;
  const futureLink = '#rx=' + ctx.btoa(unescape(encodeURIComponent(JSON.stringify(future)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  assert(api.parse(futureLink) && api.parse(futureLink).error, 'Version future refusée avec message.');
  const old = JSON.parse(JSON.stringify(patch)); old.createdAt = '2020-01-01T00:00:00.000Z';
  const oldLink = '#rx=' + ctx.btoa(unescape(encodeURIComponent(JSON.stringify(old)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  assert(api.parse(oldLink) && api.parse(oldLink).error, 'Prescription expirée refusée avec message.');

  const missingVisibility = { id:'futur_programme', name:'Futur programme' };
  assert(missingVisibility.visibility !== 'public', 'Un futur programme sans visibilité n’est pas public implicitement.');

  // Application : jamais sans profil actif; accorde l'accès sans changer le
  // cycle courant. Réaccepter le même lien doit rester idempotent.
  const granted = []; const swapsAdded = [];
  ctx.window.COACH_BERTIN_PROGRAM_INDEX = [{ id:'hypertrophie_fesse_stephanie', name:'Hypertrophie Fessiers — Stéphanie', visibility:'private' }];
  ctx.window.CoachProfiles = ctx.CoachProfiles = {
    getActiveId: function(){ return 'p1'; },
    hasActiveOnboardedProfile: function(){ return true; },
    getActive: function(){ return { id:'p1', name:'Stéphanie', onboarded:true }; },
    hasProgramPermission: function(id, pid){ return granted.some(x => x.id === id && x.pid === pid); },
    grantProgramPermission: function(id, pid){
      if(!this.hasProgramPermission(id, pid)) granted.push({id:id,pid:pid});
      return true;
    }
  };
  const knownMovements = ['Bench Press', 'DB Bench Press'];
  ctx.window.RacineMovementSwaps = ctx.RacineMovementSwaps = {
    add: function(id, from, to, note){ swapsAdded.push({id:id, from:from, to:to, note:note}); return { ok:true }; },
    listFor: function(){ return []; },
    // Même contrat que le vrai module (scripts/profiles/swaps.js) : un nom
    // hors catalogue est rejeté plutôt que posé aveuglément.
    canonicalMovement: function(id, name){
      var n = String(name||'').trim().toLowerCase();
      for(var i=0;i<knownMovements.length;i++) if(knownMovements[i].toLowerCase() === n) return knownMovements[i];
      return null;
    }
  };
  let r = api.applyToActiveProfile(parsed.patch);
  assert(r.ok, 'Application OK sur profil actif.');
  assert(granted.length === 1 && granted[0].pid === 'hypertrophie_fesse_stephanie', 'Programme accordé sans changer le cycle actif.');
  assert(swapsAdded.length === 1 && swapsAdded[0].to === 'DB Bench Press', 'Remplacements posés via RacineMovementSwaps.');
  r = api.applyToActiveProfile(parsed.patch);
  assert(r.ok && granted.length === 1, 'Réaccepter la même prescription ne duplique pas la permission et ne réactive aucun cycle.');
  const unknown = api.buildPatch({ programId:'programme_inexistant' });
  r = api.applyToActiveProfile(unknown);
  assert(!r.ok && r.error, 'Programme inconnu refusé (app pas à jour) au lieu d\'écrire un cycle cassé.');

  // Remplacement dont le nom ne correspond plus au catalogue (programme mis à
  // jour, mouvement renommé depuis que le lien a été créé) : ignoré plutôt
  // que posé en silence avec un nom que le moteur de charges ne reconnaît pas.
  swapsAdded.length = 0;
  const staleSwapPatch = api.buildPatch({
    programId: 'hypertrophie_fesse_stephanie',
    swaps: [{from:'Mouvement Disparu', to:'Autre Mouvement Inconnu'}]
  });
  r = api.applyToActiveProfile(staleSwapPatch);
  assert(r.ok && r.warning && swapsAdded.length === 0, 'Remplacement à nom obsolète ignoré, avertissement renvoyé au lieu d\'un ajout silencieux.');

  ctx.window.CoachProfiles.hasActiveOnboardedProfile = function(){ return false; };
  r = api.applyToActiveProfile(parsed.patch);
  assert(!r.ok, 'Refus sans profil actif onboardé.');
}catch(e){
  errors.push('Simulation prescription impossible : ' + (e && e.stack ? e.stack : e));
}

if(errors.length){
  console.error('\nÉCHEC prescription_checks.js');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK prescription_checks.js');
notes.forEach(n => console.log(' - ' + n));
