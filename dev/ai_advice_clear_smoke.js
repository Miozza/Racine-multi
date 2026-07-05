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

const movementJson = JSON.stringify({
  racine_ai_response_version:'1.0', prompt_version:'RACINE_AI_PROMPT_V1', prompt_id:'RACINE-TEST-MOVE',
  scope:'movement', movement:'Barbell Row', verdict:'agree', confidence:0.8,
  summary:'OK', suggested_action:'confirm_current_load', reason:'OK', do_not_auto_apply:true
});
const cycleJson = JSON.stringify({
  racine_ai_response_version:'1.0', prompt_version:'RACINE_AI_PROMPT_V1', prompt_id:'RACINE-TEST-CYCLE',
  scope:'cycle', verdict:'partially_agree', confidence:0.87, summary:'Cycle OK', global_risk_level:'moderate',
  cycle_findings:[{movement:'Barbell Row', status:'watch', suggested_action:'maintain_but_watch', reason:'Surveiller le buste.'}],
  suggested_action:'maintain_but_watch', reason:'global', do_not_auto_apply:true
});
context.RacineAIImport.importAdvice(movementJson, {scope:'movement', movement:'Barbell Row'});
context.RacineAIImport.importAdvice(cycleJson, {scope:'cycle'});
let html = context.RacineAIImport.renderAdviceSummaryForMovement('Barbell Row');
if(!html.includes('Avis IA mouvement actif')) throw new Error('Movement active label missing');
if(!html.includes('Avis IA cycle actif')) throw new Error('Cycle active label missing');
if(!html.includes('Effacer avis mouvement actif')) throw new Error('Movement clear button missing');
if(!html.includes('Effacer avis cycle actif')) throw new Error('Cycle clear button missing');
if(!context.RacineAIImport.clearLatestMovementAdvice('Barbell Row')) throw new Error('Could not clear movement advice');
html = context.RacineAIImport.renderAdviceSummaryForMovement('Barbell Row');
if(html.includes('Avis IA mouvement actif')) throw new Error('Movement advice still rendered after clear');
if(!html.includes('Avis IA cycle actif')) throw new Error('Cycle advice should remain after movement clear');
if(!context.RacineAIImport.clearLatestCycleAdvice()) throw new Error('Could not clear cycle advice');
html = context.RacineAIImport.renderAdviceSummaryForMovement('Barbell Row');
if(!html.includes('Aucun avis importé')) throw new Error('Advice should be empty after clears');
context.RacineAIImport.importAdvice(movementJson, {scope:'movement', movement:'Barbell Row'});
context.RacineAIImport.importAdvice(cycleJson, {scope:'cycle'});
context.RacineAIImport.clearAllAdvice();
if(context.RacineAIImport.readLog().length !== 0) throw new Error('clearAllAdvice did not empty log');
console.log('✓ ai_advice_clear_smoke ok');
