const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname,'../scripts/ui_modals.js'),'utf8');
if(src.includes("document.querySelector('.ai-advice-summary, .ai-advice-note')")){
  throw new Error('Global querySelector fallback still present for Avis IA modal updates');
}
if(!src.includes('function refreshLoadInfoModalBody()')){
  throw new Error('refreshLoadInfoModalBody missing');
}
if(!src.includes('refreshLoadInfoModalBody();')){
  throw new Error('Clear/import callbacks do not refresh modal body');
}
const importSrc = fs.readFileSync(path.join(__dirname,'../scripts/ai/ai_import.js'),'utf8');
const closeCount = (importSrc.match(/id="aiAdviceCloseBtn"/g)||[]).length;
if(closeCount !== 1) throw new Error('Import modal close button should appear once, got '+closeCount);
console.log('✓ ai_advice_modal_refresh_smoke ok');
