// Coach Bertin V51.63 — Helpers applicatifs simples
// Extraction prudente depuis app.js.
// Ces fonctions ne portent pas la logique de charges, d'historique, de cycle ou de sync GitHub.

function copy(o){return JSON.parse(JSON.stringify(o));}
function $(id){return document.getElementById(id);}

function findFirstStored(keys){
  for(var i=0;i<keys.length;i++){
    try{
      var raw=localStorage.getItem(keys[i]);
      if(raw)return {key:keys[i], raw:raw};
    }catch(e){}
  }
  return null;
}

function nowIso(){try{return new Date().toISOString();}catch(e){return String(new Date());}}

function round5(n){if(n===0)return 0;if(!n||isNaN(n))return null;return Math.round(n/5)*5;}
function lb(n){var r=round5(n);return(r===0||r)?r+" lb":"—";}
function parseLoad(v){if(v===0||v==="0")return 0;if(!v)return null;var m=String(v).replace(",",".").match(/[0-9]+(\.[0-9]+)?/);return m?Number(m[0]):null;}


function parseRestToSeconds(s){
  var m=String(s||"").match(/(\d+):(\d+)/);if(!m)return 0;
  return Number(m[1])*60+Number(m[2]);
}
function cleanLine(s){return String(s||"").replace(/\s+/g," ").trim();}

// Affichage seulement : nettoie les suffixes internes/contextuels sans modifier les programmes sources.
function displayMovementName(name){
  var raw=String(name||'').trim();
  if(!raw)return raw;
  raw=raw.replace(/^\s*[A-Z][0-9]?\.\s*/,'');
  raw=raw.replace(/\s*[—-]\s*rappel\s+vendredi\b/ig,'');
  raw=raw.replace(/\s*\(\s*rappel\s+vendredi\s*\)/ig,'');
  raw=raw.replace(/\btechnique\b|\bprogression\b|\btempo\b|\bpump\b|\bcontr[oô]l[ée]\b/ig,'');
  raw=raw.replace(/\bstrict\b/ig,function(m,offset,str){return /strict press/i.test(str)?m:'';});
  return raw.replace(/\s+/g,' ').trim();
}


function vibrate(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}

function parseTimeToSeconds(t){var m=String(t||"").match(/(\d+)\s*min/);return m?Number(m[1])*60:0;}
function formatClock(sec){sec=Math.max(0,Math.floor(sec||0));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");}

// CONTRAT TIMER WOD — ne pas modifier sans mettre à jour dev/regression_checks.js.
// Minutes sans zéro inutile : 9:12, 0:45, 10:00. Secondes toujours à 2 chiffres.
function formatTimerDisplay(sec){
  sec=Math.max(0,Math.floor(Number(sec)||0));
  return String(Math.floor(sec/60))+":"+String(sec%60).padStart(2,"0");
}
function timerMeasureSampleForDisplay(text,isCountdown){
  text=String(text||"");
  if(isCountdown)return text.length>=2?"88":"8";
  var parts=text.split(":");
  return ((parts[0]||"0").length>=2)?"88:88":"8:88";
}
