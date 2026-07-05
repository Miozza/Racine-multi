const fs = require('fs');
const vm = require('vm');
const path = require('path');
const store = {};
const context = {
  window: {},
  localStorage: {
    getItem: (k) => Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null,
    setItem: (k,v) => { store[k]=String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  Date, Math, Number, String, JSON, console
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/ai/ai_import.js'),'utf8'), context);
const cycleJson = JSON.stringify({
  racine_ai_response_version: '1.0',
  prompt_version: 'RACINE_AI_PROMPT_V1',
  prompt_id: 'RACINE-TEST-CYCLE',
  scope: 'cycle',
  verdict: 'partially_agree',
  confidence: 0.87,
  summary: 'Cycle cohérent, quelques mouvements à surveiller.',
  global_risk_level: 'moderate',
  priority_movements: ['Barbell Row','Weighted Pull-up'],
  cycle_findings: [
    {movement:'Barbell Row', status:'reliable', suggested_action:'maintain_but_watch', reason:'La progression est logique. Vérifier le buste.'},
    {movement:'Weighted Pull-up', status:'watch', suggested_action:'increase_confirmations', reason:'RPE élevé, confirmer avant progression.'}
  ],
  suggested_action: 'maintain_but_watch',
  reason: 'Avis global consultatif.',
  do_not_auto_apply: true
}, null, 2);
const rec = context.RacineAIImport.importAdvice(cycleJson, {scope:'cycle'});
if(rec.status !== 'structured') throw new Error('Cycle JSON should import as structured');
const bridge = context.RacineAIImport.latestCycleFindingForMovement('Barbell Row');
if(!bridge || !bridge.finding || bridge.finding.suggested_action !== 'maintain_but_watch') throw new Error('Cycle finding not matched to movement');
const html = context.RacineAIImport.renderAdviceSummaryForMovement('Barbell Row');
if(!html.includes('Avis IA cycle')) throw new Error('Cycle advice not rendered in movement panel');
if(!html.includes('Vérifier le buste')) throw new Error('Cycle finding reason not rendered');
console.log('✓ ai_cycle_movement_bridge_smoke ok');
