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
  Date,
  Math,
  Number,
  String,
  JSON,
  console,
  movementLabelFromKeyOrName: (x)=>x
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/ai/ai_import.js'),'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/ai/ai_influence.js'),'utf8'), context);
const raw = `Avis court\nRACINE_AI_RESPONSE_START\n{"racine_ai_response_version":"1.0","prompt_id":"P1","scope":"movement","movement":"Front Squat","verdict":"partially_agree","confidence":0.86,"summary":"200 lb possible en option.","suggested_action":"consider_ambitious_option","reason":"historique stable","do_not_auto_apply":true}\nRACINE_AI_RESPONSE_END`;
context.RacineAIImport.importAdvice(raw,{movement:'Front Squat',scope:'movement'});
const results = {'Front Squat': {load:'200', reps:'3', rpe:'8', planned:{load:195, reps:3, context:{label:'Front Squat'}}}};
const influences = context.RacineAIInfluence.annotateSessionResults(results,{date:'2026-07-03',jour:'vendredi',semaine:5,cycle:'test'});
if(influences.length !== 1) throw new Error('Influence non detectee');
if(!results['Front Squat'].aiAdviceInfluence) throw new Error('Annotation resultat absente');
if(results['Front Squat'].aiAdviceInfluence.influencedBy !== 'ai_advice') throw new Error('Source influence incorrecte');
if(results['Front Squat'].aiAdviceInfluence.brainSuggestion !== 195) throw new Error('Brain suggestion incorrecte');
console.log('✓ ai_influence_smoke ok');
