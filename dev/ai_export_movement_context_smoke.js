const fs = require('fs');
const ui = fs.readFileSync('scripts/ui_modals.js','utf8');
const ai = fs.readFileSync('scripts/ai/ai_export.js','utf8');
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }
assert(ui.includes('window.__racineLastLoadInfoHint = hint'), 'ui_modals doit mémoriser le hint exact du panneau (!)');
assert(ai.includes('MOVEMENT-GLOBAL') === false || ai.includes('dernier hint exact'), 'ai_export doit protéger contre les prompts movement/global vides');
assert(ai.includes('var last = window.__racineLastLoadInfoHint'), 'ai_export doit réutiliser le dernier contexte mouvement si besoin');
console.log('✅ ai_export_movement_context_smoke OK');
