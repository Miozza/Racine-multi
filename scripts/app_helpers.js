// Racine — helpers applicatifs simples
// Extraction prudente depuis app.js.
// Ces fonctions ne portent pas la logique de charges, d'historique, de cycle ou de sauvegarde profil.

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
// Un texte contenant « RPE » sans unité lb/kg n'est pas une charge : sans ce
// garde, parseLoad("RPE 7–8") extrayait 7, mis à l'échelle puis arrondi en
// suggestion « 5 lb » sur les programmes à consigne RPE. "135 lb RPE 8" reste 135.
function parseLoad(v){if(v===0||v==="0")return 0;if(!v)return null;var s=String(v);if(/rpe/i.test(s)&&!/\b(lb|kg)\b/i.test(s))return null;var m=s.replace(",",".").match(/[0-9]+(\.[0-9]+)?/);return m?Number(m[0]):null;}


function parseRestToSeconds(s){
  var m=String(s||"").match(/(\d+):(\d+)/);if(!m)return 0;
  return Number(m[1])*60+Number(m[2]);
}

// Découpe une consigne de repos en segments, en marquant ceux qui sont un temps
// réellement décomptable. Sert à rendre CHAQUE temps tapable là où il est écrit,
// sans toucher au texte qui l'entoure (« 0:30 avant C2 » doit rester lisible).
//
// Trois formes existent dans le catalogue, comptées sur les 83 consignes
// distinctes de tous les programmes :
//   - `m:ss`, seul ou en plage — 3757 occurrences (« 1:00 », « 1:00-2:30 ») ;
//   - `N sec`, seul ou en plage —  380 occurrences (« 90 sec », « 60-90 sec »,
//     « 90–120 sec » avec un tiret DEMI-CADRATIN) ; `parseRestToSeconds` les
//     ignorait toutes, faute de `:` ;
//   - non chiffrée — « au besoin », « le reste de la minute », « qualité »,
//     « — » : rien à décompter, aucun segment tapable.
// Bornes : sous 5 s ce n'est pas un repos, au-delà de 15 min c'est une erreur
// de saisie. Hors bande, le segment reste du texte.
var COACH_REST_MIN_SECONDS = 5;
var COACH_REST_MAX_SECONDS = 15 * 60;
function coachRestPicks(text){
  var s = String(text == null ? "" : text);
  var out = [], last = 0, m, rx = null;

  if(/\d+:\d{2}/.test(s)){
    rx = /(\d+):(\d{2})/g;
  } else if(/\d+\s*(?:[-–—]\s*\d+\s*)?sec\b/i.test(s)){
    // Le nombre ne compte que s'il précède réellement l'unité : sinon un
    // « 3 séries ... 60 sec » ferait de 3 un temps de repos.
    rx = /(\d+)(?=\s*(?:[-–—]\s*\d+\s*)?sec\b)/g;
  }

  if(rx){
    while((m = rx.exec(s))){
      var sec = m[2] !== undefined ? (Number(m[1]) * 60 + Number(m[2])) : Number(m[1]);
      if(!(sec >= COACH_REST_MIN_SECONDS && sec <= COACH_REST_MAX_SECONDS)) sec = 0;
      if(m.index > last) out.push({text:s.slice(last, m.index), sec:0});
      out.push({text:m[0], sec:sec});
      last = m.index + m[0].length;
    }
  }
  if(last < s.length) out.push({text:s.slice(last), sec:0});
  return out;
}

// Sur une plage, c'est le temps LE PLUS LONG qui fait foi : une consigne
// « 1:00-2:30 » veut dire « au moins une minute, jusqu'à deux et demie ». Partir
// sur la borne basse pousse à reprendre trop tôt — et c'était le comportement
// de `parseRestToSeconds`, qui retenait le premier nombre rencontré.
function coachRestLongestSeconds(text){
  var picks = coachRestPicks(text), best = 0, i;
  for(i = 0; i < picks.length; i++){ if(picks[i].sec > best) best = picks[i].sec; }
  return best;
}
function cleanLine(s){return String(s||"").replace(/\s+/g," ").trim();}

// Le moteur de charges peut renvoyer une PHRASE à la place d'une charge : un
// profil non calibré reçoit « Profil non calibré : complète la calibration… »
// pour chaque mouvement. Les vues la posaient dans la fente de la charge —
// dimensionnée pour « 185 lb », 41 px en séance et 31 px sur WOD+ — où elle
// s'enroulait sur huit lignes et recouvrait le reste de la carte, jusqu'à
// masquer les champs de saisie.
// AFFICHAGE SEULEMENT : le texte du moteur est conservé mot pour mot, il change
// juste de fente. Aucune décision de charge n'est touchée.
// Le critère est la LONGUEUR, pas l'état du profil. Une version antérieure
// demandait `coachProfileNeedsCalibration()` : c'était juste tant qu'un profil
// non calibré ne recevait qu'une phrase. Depuis qu'il reçoit une estimation de
// niveau (« 75 lb »), ce critère écartait une vraie charge de sa fente. Ce qui
// distingue les deux cas n'a jamais été le profil : c'est qu'une charge est
// courte et qu'un message est une phrase.
// La plus longue charge réelle du catalogue fait 33 caractères
// (« 185 → 205 → 215 → 225 si autorisé ») ; le seuil est posé au-dessus.
function coachLoadIsMessage(load){
  var s = String(load == null ? "" : load).trim();
  if(!s) return false;
  return s.length > 40;
}

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
// Gabarit de mesure du timer — il reste un GABARIT (stable pour toute une phase
// de format, jamais la forme exacte affichée), mais il n'invente plus des
// chiffres impossibles. Un timer de 11 min n'affichera jamais « 88:88 », et
// dans Orbitron un « 1 » fait moins de la moitié d'un « 8 » : supposer des
// « 8 » partout coûtait jusqu'à 15 % de taille de chrono.
// `opts.maxMinutes` borne les minutes possibles ; `opts.widestDigit(chiffres)`
// désigne le plus large d'un ensemble, mesuré dans la police réelle. Sans
// `widestDigit`, le repli renvoie « 8 » partout — soit exactement l'ancien
// comportement (`88:88` / `8:88` / `88` / `8`).
function timerMeasureSampleForDisplay(text,isCountdown,opts){
  text=String(text||"");
  var widest=(opts&&typeof opts.widestDigit==="function")?opts.widestDigit:function(){return "8";};
  var range=function(a,b){var s="",i;for(i=a;i<=b;i++)s+=String(i);return s;};
  // Décompte de départ : « 10 », puis 9 → 1.
  if(isCountdown)return text.length>=2?(widest("1")+widest("0")):widest(range(1,9));
  var minuteDigits=((text.split(":")[0])||"0").length;
  var maxMin=Math.max(0,Math.floor(Number(opts&&opts.maxMinutes)||0));
  // Les secondes parcourent 00 → 59 quelle que soit la durée.
  var seconds=widest(range(0,5))+widest(range(0,9));
  if(minuteDigits>=2){
    var hi=Math.max(10,maxMin||99);
    var hiTens=Math.floor(hi/10);
    return widest(range(1,hiTens))+widest(hiTens>1?range(0,9):range(0,hi%10))+":"+seconds;
  }
  return widest(range(0,Math.min(9,maxMin||9)))+":"+seconds;
}
