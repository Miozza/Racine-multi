// Racine V1.7-multi — prototype multi-utilisateur viable + catalogue client sportif + cycle strict muscle-up
var APP_VERSION = "V1.7-multi";

// Architecture stable
// programs/*.js = plan prévu
// data/charges.js = charges de base / équipement / préférences
// Toutes les données (historique, charges réelles, cycle) vivent en local
// par profil (scripts/profiles/, scripts/state/). Aucun réseau requis.

// Objectif compétition : optionnel, propre à chaque profil (state.profile.competitionDateIso).
// Repli neutre si rien n'est défini, pour ne jamais casser la Route PC.
var COMPETITION_DATE = new Date(Date.now() + 180*24*60*60*1000);
var HAS_COMPETITION_GOAL = false;
function recomputeCompetitionDate(){
  var iso = state.profile && state.profile.competitionDateIso;
  if(iso){
    var d = new Date(iso);
    if(!isNaN(d.getTime())){ COMPETITION_DATE = d; HAS_COMPETITION_GOAL = true; return; }
  }
  COMPETITION_DATE = new Date(Date.now() + 180*24*60*60*1000);
  HAS_COMPETITION_GOAL = false;
}
var PHASE_TARGETS = {
  1: { bench:null, backSquat:null, note:"Épaules saines, posture améliorée, récupération post-compétition." },
  2: { bench:285,  backSquat:260,  note:"Bench 285 lb, Back squat 260 lb x5, RDL et hip thrust solides." },
  3: { bench:300,  backSquat:285,  note:"Bench 300 lb, Back squat 285 lb, tolérer 75 reps squats compétition." },
  4: { bench:null, backSquat:null, note:"Performance Open CrossFit janvier 2027. Benchmarks, synchro, peaking." }
};

// ─── WeekInfo dynamique selon le programme actif ─────────────────────────────
// Construit à partir des données du programme (4 ou 6 semaines)

function buildWeekInfo(){
  var cfg = focus();
  var labels = cfg.weekLabels || ["S1","S2","S3","S4"];
  var goals  = cfg.weekGoals  || ["Base.","Volume.","Intensité.","Deload."];
  var info = {};
  labels.forEach(function(lbl,i){
    info[i+1] = { label: lbl, goal: goals[i] || "" };
  });
  return info;
}
function totalWeeks(){
  var cfg=focus();
  if(cfg&&cfg.weekLabels&&cfg.weekLabels.length)return cfg.weekLabels.length;
  if(cfg&&cfg.sets&&cfg.sets.length)return cfg.sets.length;
  return 4;
}

// ─── Programmes actifs : source de vérité = programs/index.js ────────────────

var focusConfigs = {};

function programIndexIds(){
  var activePerms = [];
  try{
    var ap = window.CoachProfiles && CoachProfiles.getActive && CoachProfiles.getActive();
    activePerms = (ap && Array.isArray(ap.programPermissions)) ? ap.programPermissions : [];
  }catch(e){}

  return (window.COACH_BERTIN_PROGRAM_INDEX || [])
    .filter(function(item){
      if(!item || !item.id) return false;
      var vis = item.visibility || "public";
      if(vis === "public") return true;
      if(vis === "private") return activePerms.indexOf(item.id) !== -1;
      return false;
    })
    .map(function(item){ return item.id; });
}

function registerProgramsFromIndex(){
  var programs = window.COACH_BERTIN_PROGRAMS || {};
  var ids = programIndexIds();

  focusConfigs = {};

  ids.forEach(function(id){
    if(programs[id]){
      focusConfigs[id] = Object.assign({}, programs[id]);
    } else {
      console.warn("Programme déclaré dans programs/index.js mais non chargé :", id);
    }
  });

  Object.keys(programs).forEach(function(id){
    if(ids.indexOf(id) === -1){
      console.warn("Programme chargé mais absent de programs/index.js, donc ignoré :", id);
    }
  });

  window.focusConfigs = focusConfigs;
}

function defaultProgramId(){
  var ids = programIndexIds();
  for(var i=0;i<ids.length;i++){
    if(focusConfigs[ids[i]])return ids[i];
  }
  return Object.keys(focusConfigs)[0] || "";
}

registerProgramsFromIndex();

// Données de profil, mouvements et banques WOD chargées depuis programs/config.js

var ALL_DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
var DEFAULT_PROGRAM_DAYS = ["lundi","mardi","jeudi","vendredi"];
var DAYS_ORDER = DEFAULT_PROGRAM_DAYS; // compatibilité ancienne logique; utiliser currentDayOrder() pour l’affichage.

function activeProgramExists(){
  return !!(state && state.cycle && state.cycle.goal && focusConfigs[state.cycle.goal]);
}
function activeProgramId(){
  return (state && state.cycle && state.cycle.goal) ? state.cycle.goal : defaultProgramId();
}
function currentDayOrder(){
  var cfg = focus ? focus() : {};
  var days = (cfg && Array.isArray(cfg.days) && cfg.days.length) ? cfg.days : DEFAULT_PROGRAM_DAYS;
  return days.filter(function(d){ return ALL_DAYS.indexOf(d) >= 0; });
}
function currentDayMeta(day){
  var cfg = focus ? focus() : {};
  var d = Object.assign({}, baseDays[day] || {label:day, base:"", focus:""});
  if(cfg && cfg.dayMeta && cfg.dayMeta[day]) d = Object.assign(d, cfg.dayMeta[day]);
  return d;
}
function ensureCurrentDay(){
  var days = currentDayOrder();
  if(days.indexOf(state.day) < 0){
    state.lastDayCorrection = {from:state.day,to:(days[0]||"lundi"),cycle:activeProgramId(),date:nowIso ? nowIso() : String(new Date())};
    state.day = days[0] || "lundi";
    state.cycleState=buildCycleStatePayload();
    save();
  }
  return days;
}
function isDayCompleted(day){ return (state.completedDays||[]).indexOf(day)>=0; }
function isDayMissed(day){ return (state.missedDays||[]).some(function(x){return x&&x.day===day&&Number(x.week)===Number(state.week)&&x.cycle===activeProgramId();}); }
function addUniqueDay(list, day){
  if(day && list.indexOf(day)<0)list.push(day);
}
function buildWeekTrackingForWeek(wk, cycle){
  wk=Number(wk)||Number(state.week)||1;
  cycle=cycle||activeProgramId();
  var validDays=currentDayOrder(), completed=[], missed=[];
  function addCompleted(day){if(validDays.indexOf(day)>=0)addUniqueDay(completed,day);}
  (state.weekTransitions||[]).forEach(function(t){
    if(!t||Number(t.fromWeek)!==wk||t.cycle!==cycle)return;
    (t.completedDays||[]).forEach(addCompleted);
    (t.missedDays||[]).forEach(function(x){
      if(x&&Number(x.week)===wk&&x.cycle===cycle&&validDays.indexOf(x.day)>=0)missed.push(x);
    });
  });
  (state.history||[]).forEach(function(s){
    var sw=Number(s&&((s.week!==undefined?s.week:s.semaine)));
    if(sw!==wk)return;
    var day=(s&&s.day)||(s&&s.jour);
    addCompleted(day);
  });
  return {completedDays:completed,missedDays:missed};
}
function applyWeekTrackingForWeek(wk){
  var tracking=buildWeekTrackingForWeek(wk,activeProgramId());
  state.completedDays=tracking.completedDays;
  state.missedDays=tracking.missedDays;
}
function setActiveWeek(wk, opts){
  opts=opts||{};
  var next=Math.max(1,Math.min(totalWeeks(),Number(wk)||Number(state.week)||1));
  if(next===Number(state.week))return false;
  state.week=next;
  if(!opts.keepTracking)applyWeekTrackingForWeek(next);
  state.cycleState=buildCycleStatePayload();
  return true;
}
function treatedDays(){
  return currentDayOrder().filter(function(d){ return isDayCompleted(d) || isDayMissed(d); });
}
function missingDaysForWeek(){
  return currentDayOrder().filter(function(d){ return !isDayCompleted(d) && !isDayMissed(d); });
}
function dayLabel(day){ var m=currentDayMeta(day); return (m&&m.label)||day; }
function actualDayName(){
  var js=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  try{return js[new Date().getDay()];}catch(e){return "";}
}

function localIsoDate(d){
  d = d instanceof Date ? d : new Date();
  if(isNaN(d.getTime())) d = new Date();
  var y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}
function parseLocalIsoDate(iso){
  if(!iso)return null;
  var m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m)return null;
  var d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  return isNaN(d.getTime())?null:d;
}
function todayIsoDate(){return localIsoDate(new Date());}
function mondayOfCurrentWeekIso(){
  var d=new Date();
  var js=d.getDay();
  var offset=(js+6)%7;
  d.setDate(d.getDate()-offset);
  return localIsoDate(d);
}
function cycleStartDateForActive(){
  return state.activeCycleStartDate ||
    (state.cycleState&&state.cycleState.activeCycleStartDate) ||
    (state.cycleState&&state.cycleState.cycleStartedAt?String(state.cycleState.cycleStartedAt).slice(0,10):null) ||
    todayIsoDate();
}
function calcWeekFromCycleStart(startIso, refDate){
  var start=parseLocalIsoDate(startIso), ref=parseLocalIsoDate(refDate||todayIsoDate());
  if(!start||!ref)return Number(state.week)||1;
  var diff=Math.floor((ref.getTime()-start.getTime())/(1000*60*60*24));
  var wk=Math.floor(Math.max(0,diff)/7)+1;
  return Math.max(1,Math.min(totalWeeks(),wk));
}
function dayFromDateIfProgramDay(refDate){
  var d=parseLocalIsoDate(refDate||todayIsoDate());
  if(!d)return null;
  var js=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  var day=js[d.getDay()];
  return currentDayOrder().indexOf(day)>=0 ? day : null;
}
function applyCycleStartDate(startIso, opts){
  opts=opts||{};
  var d=parseLocalIsoDate(startIso);
  if(!d){alert("Date de départ invalide.");return false;}
  var oldWeek=Number(state.week)||1;
  state.activeCycleStartDate=localIsoDate(d);
  state.week=calcWeekFromCycleStart(state.activeCycleStartDate);
  var dateDay=dayFromDateIfProgramDay(todayIsoDate());
  if(opts.setDayFromToday && dateDay)state.day=dateDay;
  ensureCurrentDay();
  if(opts.resetWeekTracking || Number(state.week)!==oldWeek){
    state.completedDays=[];
    state.missedDays=[];
  }
  state.cycleState=buildCycleStatePayload();
  return true;
}
function cycleDateSummaryHtml(){
  var start=cycleStartDateForActive();
  var wk=calcWeekFromCycleStart(start);
  var day=dayFromDateIfProgramDay(todayIsoDate());
  var dayTxt=day?dayLabel(day):"jour manuel";
  return '<div style="margin-top:10px;padding:10px;background:rgba(255,255,255,.04);border-radius:10px">'+
    '<strong>Date de départ confirmée :</strong> '+CoachUI.escapeHtml(start)+'<br>'+ 
    '<small style="color:var(--muted)">Aujourd’hui = S'+wk+' · '+CoachUI.escapeHtml(dayTxt)+'. Cette date ne modifie pas les charges ni l’historique.</small></div>';
}

// ─── Références de calibration ──────────────────────────────────────────────

// Ancienne banque de références : conservée comme ancre de migration/calibration,
// mais elle n'est plus injectée automatiquement dans un nouveau profil.
// Un profil neuf démarre avec ses propres tests d'intégration + son historique réel.
var PRELOADED_REFS = (window.RacineProfileReference && RacineProfileReference.refs)
  ? RacineProfileReference.refs()
  : {};

function blankProfile(){
  if(window.RacineProfileReference && RacineProfileReference.blankProfile){
    return RacineProfileReference.blankProfile();
  }
  var ref=(typeof defaultProfile === "object" && defaultProfile) ? defaultProfile : {};
  var out={};
  Object.keys(ref).forEach(function(k){ out[k]=null; });
  out.name="";out.experienceLevel=null;out.bodyweightLb=null;out.aggressiveness=1;out.competitionDateIso=null;out.scaleRatios=null;
  return out;
}

function liveMovementRefsFromPayload(payload){
  return payload && payload.movementRefs ? copy(payload.movementRefs) : {};
}

// ─── State ───────────────────────────────────────────────────────────────────

function freshState(){
  return {
    week: 1,
    day: "lundi",
    history: [],
    profile: blankProfile(),
    trainingMaxPct: 0.925,
    cycle: { goal:"shoulders3d" },
    movementRefs: {},
    // Suivi RPE par mouvement pour progression automatique
    rpeHistory: {},        // { "mvKey__range": [rpe1, rpe2, rpe3] } — 3 dernières séances
    sessionCount: {},      // { "lundi": 2, "mardi": 1, ... } — séances complétées par jour cette semaine
    completedDays: [],     // ["lundi", "mardi"] — jours complétés cette semaine
    missedDays: [],        // [{week, day, cycle, reason, date}] — séances prévues mais manquées
    weekTransitions: [],   // passages manuels/automatiques de semaine
    savedCycles: [],       // cycles mis en pause et récupérables
    archivedCycles: [],    // cycles terminés/abandonnés
    deloadAlert: false,    // true si le système détecte fatigue RPE
    athleteState: { movements:{}, updatedAt:null, version:null }, // Force actuelle durable par mouvement
    cycleState: null,      // Où le cycle est rendu, sauvegardable indépendamment des versions
    activeCycleStartDate: null // Date de départ confirmée du cycle actif (YYYY-MM-DD), indépendante des charges.
  };
}
var state = freshState();
var customCharges = {};

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function load(){
  state = freshState();
  try{
    var found = CoachState.readState();
    var p = found && found.data;
    if(p){
      state = Object.assign(state, p);
      state.profile      = Object.assign(blankProfile(), p.profile||{});
      state.cycle        = Object.assign({goal:"shoulders3d"}, p.cycle||{});
      state.movementRefs = liveMovementRefsFromPayload(p);
      state.history      = p.history || [];
      state.rpeHistory   = p.rpeHistory || {};
      state.completedDays= p.completedDays || [];
      state.missedDays   = p.missedDays || [];
      state.weekTransitions = p.weekTransitions || [];
      state.savedCycles  = p.savedCycles || [];
      state.archivedCycles = p.archivedCycles || [];
      state.deloadAlert  = p.deloadAlert || false;
      state.athleteState = p.athleteState || { movements:{}, updatedAt:null, version:null };
      state.cycleState   = p.cycleState || null;
      state.activeCycleStartDate = p.activeCycleStartDate || (state.cycleState&&state.cycleState.activeCycleStartDate) || (state.cycleState&&state.cycleState.cycleStartedAt?String(state.cycleState.cycleStartedAt).slice(0,10):null);
      // Migration douce vers la cle stable, sans effacer les anciennes cles.
      if(found.migrated)save();
    }
  }catch(e){coachLogError("load",e);}
  recomputeCompetitionDate();
}
function save(){try{CoachState.writeState(state);}catch(e){coachLogError("save",e);}}

function loadCustomCharges(){
  try{
    var found = CoachState.readCustomCharges();
    customCharges = found&&found.data ? found.data : {};
    if(found&&found.migrated)saveCustomCharges();
  }catch(e){customCharges={};}
}
function saveCustomCharges(){try{CoachState.writeCustomCharges(customCharges);}catch(e){}}

function buildCycleStatePayload(){
  return {
    version:APP_VERSION,
    updatedAt:nowIso(),
    activeCycle:state.cycle&&state.cycle.goal?state.cycle.goal:"shoulders3d",
    activeWeek:state.week,
    activeDay:state.day,
    activeDays:currentDayOrder(),
    completedDays:state.completedDays||[],
    missedDays:state.missedDays||[],
    weekTransitions:state.weekTransitions||[],
    savedCycles:state.savedCycles||[],
    archivedCycles:state.archivedCycles||[],
    focus:focus()?focus().label:"",
    activeCycleStartDate:cycleStartDateForActive(),
    cycleStartedAt:cycleStartDateForActive()
  };
}
function applyCycleStatePayload(cycleData){
  if(!cycleData||typeof cycleData!=="object")return;
  state.cycleState=cycleData;
  if(cycleData.activeCycle)state.cycle={goal:cycleData.activeCycle};
  if(cycleData.activeWeek)state.week=Math.max(1,Math.min(totalWeeks(),Number(cycleData.activeWeek)||state.week));
  if(cycleData.activeDay)state.day=cycleData.activeDay;
  if(Array.isArray(cycleData.weekTransitions))state.weekTransitions=cycleData.weekTransitions;
  if(Array.isArray(cycleData.savedCycles))state.savedCycles=cycleData.savedCycles;
  if(Array.isArray(cycleData.archivedCycles))state.archivedCycles=cycleData.archivedCycles;
  if(Array.isArray(cycleData.completedDays)){
    var validDays=currentDayOrder();
    state.completedDays=cycleData.completedDays.filter(function(day){return validDays.indexOf(day)>=0;});
  }
  if(Array.isArray(cycleData.missedDays)){
    var cycle=activeProgramId(), week=Number(state.week);
    state.missedDays=cycleData.missedDays.filter(function(x){return x&&Number(x.week)===week&&x.cycle===cycle;});
  }
  applyWeekTrackingForWeek(state.week);
  if(cycleData.activeCycleStartDate)state.activeCycleStartDate=String(cycleData.activeCycleStartDate).slice(0,10);
  else if(cycleData.cycleStartedAt)state.activeCycleStartDate=String(cycleData.cycleStartedAt).slice(0,10);
  if(!focusConfigs[state.cycle.goal]){
    state.missingCycle = {id:state.cycle.goal,date:nowIso()};
    state.cycle.goal = defaultProgramId();
  }
  ensureCurrentDay();
}

function focus(){return focusConfigs[state.cycle.goal]||focusConfigs[defaultProgramId()]||{};}
function weekIdx(){var tw=Math.max(1,totalWeeks());return Math.max(0,Math.min(tw-1,state.week-1));}
function refKey(mvKey,reps){return mvKey+"__"+repRange(reps);}

function tmFromProfile(mvKey){
  var mv=movements[mvKey];if(!mv||!mv.profile)return 0;
  var raw=Number(state.profile[mv.profile]);return raw?raw*Number(state.trainingMaxPct||0.925):0;
}
function referenceBase(mvKey,targetReps){
  var key=mvKey+"__"+repRange(targetReps),ref=state.movementRefs[key];
  if(ref&&ref.load!==undefined&&ref.load!==null&&ref.load!=="")return{value:Number(ref.load),source:"reference",ref:ref};
  if(estimatedDailyLoads[mvKey])return{value:Number(estimatedDailyLoads[mvKey]),source:"estimate",ref:null};
  var fb=tmFromProfile(mvKey);return{value:fb,source:fb?"profile":"none",ref:null};
}
function referenceMultiplier(ref){
  var table={hypertrophy:[0.82,0.85,0.88,0.65],shoulders3d:[0.68,0.72,0.76,0.50],strength:[0.84,0.87,0.90,0.62],weightlifting:[0.72,0.76,0.80,0.55],posture:[0.75,0.78,0.82,0.55],engine:[0.70,0.73,0.76,0.55],recomp:[0.78,0.82,0.85,0.58]};
  var m=(table[state.cycle.goal]||table.hypertrophy)[weekIdx()];
  if(ref){if(ref.status==="hard"||Number(ref.rpe)>=9)m-=0.08;if(ref.quality==="acceptable")m-=0.025;if(ref.quality==="doubtful")m-=0.08;}
  if(Number(state.week)===6)m=Math.min(m,0.55);
  return Math.max(0.40,Math.min(m,0.90));
}
function profileMultiplier(index){var base=focus().mult[weekIdx()];return index===0?base:Math.max(0.45,base-0.12);}
function suggestLoad(mvKey,pct,targetReps){
  var base=referenceBase(mvKey,targetReps);
  if(!base.value)return 0;
  if(base.source==="estimate")return base.value;
  if(base.source==="reference")return base.value*referenceMultiplier(base.ref);
  return base.value*pct;
}
function progressionPct(index){return profileMultiplier(index);}
function targetReps(index,kind){
  var goal=state.cycle.goal,week=weekIdx();
  if(kind==="main")return focus().targetReps[week]||5;
  if(kind==="accessory"){if(goal==="shoulders3d")return 15;if(goal==="strength")return 8;if(goal==="weightlifting")return 3;return 10;}
  if(kind==="wod")return goal==="shoulders3d"?12:8;
  return focus().targetReps[week]||5;
}
function setScheme(kind,index){
  var goal=state.cycle.goal,week=weekIdx();
  if(kind==="main")return focus().sets[week];
  if(kind==="accessory"){if(goal==="shoulders3d")return"3-4 x 15";if(goal==="strength")return"3 x 8";if(goal==="weightlifting")return"5 x 3 technique";if(goal==="engine")return"2 x 10";return"3 x 10";}
  return"—";
}
function restFor(kind){
  if(kind==="main")return focus().rest;
  if(kind==="accessory")return state.cycle.goal==="strength"?"2:00–2:30":(state.cycle.goal==="shoulders3d"||state.cycle.goal==="shoulders3d_v2")?"0:30–1:00":"0:45–1:15";
  if(kind==="wod")return"selon WOD";
  return"—";
}
function currentDayLabel(){
  var d=currentDayMeta(state.day);
  return (d&&d.label)||state.day||"—";
}

// Construction des séances chargée depuis programs/workouts.js

// ─── Moteur audio (Web Audio API) ────────────────────────────────────────────
// Fonctionne sans fichier externe, génère les sons en temps réel

var audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  return audioCtx;
}
// Résume le contexte après interaction utilisateur (requis iOS)
function resumeAudio(){var ctx=getAudioCtx();if(ctx&&ctx.state==="suspended")ctx.resume();}

function playBeep(freq,dur,vol,type){
  var ctx=getAudioCtx();if(!ctx)return;
  try{
    var osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type=type||"sine";osc.frequency.setValueAtTime(freq,ctx.currentTime);
    gain.gain.setValueAtTime(vol||0.4,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+dur);
  }catch(e){}
}

// Bip court aigu (countdown 3-2-1)
function bipCountdown(){playBeep(880,0.12,0.5);}
// Bip long grave (départ / fin)
function bipStart(){playBeep(660,0.35,0.6);setTimeout(function(){playBeep(880,0.35,0.6);},180);}
function bipEnd(){playBeep(440,0.5,0.7);setTimeout(function(){playBeep(330,0.7,0.7);},250);}
// Bip minute EMOM
function bipEmom(){playBeep(1047,0.18,0.5);setTimeout(function(){playBeep(1047,0.18,0.5);},220);}
// Bip fin repos
function bipRestDone(){playBeep(660,0.2,0.5);setTimeout(function(){playBeep(880,0.3,0.6);},150);setTimeout(function(){playBeep(1047,0.4,0.7);},320);}

// ─── Timer WOD ───────────────────────────────────────────────────────────────

var wodTimer={duration:0,remaining:0,elapsed:0,running:false,interval:null,mode:"down",label:"",isEmom:false,countdownActive:false};

function wodTimerConfig(block){
  var txt=String((block&&block.text)||""),seconds=parseTimeToSeconds(block&&block.time),label="Timer",mode="down",isEmom=false;
  if(/AMRAP/i.test(txt)){label="AMRAP "+Math.round(seconds/60)+" min";}
  else if(/EMOM/i.test(txt)){label="EMOM "+Math.round(seconds/60)+" min";isEmom=true;}
  else if(/For time|Cap/i.test(txt)){label="CAP "+Math.round(seconds/60)+" min";mode="up";}
  if(!seconds){seconds=8*60;label="Timer 8 min";}
  return{seconds:seconds,label:label,mode:mode,isEmom:isEmom};
}
function stopWodTimer(){
  if(wodTimer.interval){clearInterval(wodTimer.interval);wodTimer.interval=null;}
  wodTimer.running=false;wodTimer.countdownActive=false;

}
function wodTimerCurrentValue(){return wodTimer.mode==="up"?wodTimer.elapsed:wodTimer.remaining;}
function updateWodTimerDisplay(){
  // timer WOD retiré de la vue PC. Aucun élément à mettre à jour.
}
function resetWodTimerState(dur,mode,label,isEmom){
  stopWodTimer();
  wodTimer.duration=dur;wodTimer.mode=mode||"down";wodTimer.label=label||"Timer";
  wodTimer.elapsed=0;wodTimer.remaining=dur;wodTimer.isEmom=!!isEmom;
}

function startWodCountdown(onDone){
  // 10 secondes de countdown avant le départ
  wodTimer.countdownActive=true;
  wodTimer.countdownRemaining=10;
  updateWodTimerDisplay();
  var cd=setInterval(function(){
    wodTimer.countdownRemaining--;
    // Bips aux 3 dernières secondes
    if(wodTimer.countdownRemaining<=3&&wodTimer.countdownRemaining>0){bipCountdown();vibrate([60]);}
    if(wodTimer.countdownRemaining<=0){
      clearInterval(cd);
      wodTimer.countdownActive=false;
      bipStart();vibrate([200,80,200]);
      onDone();
    }
    updateWodTimerDisplay();
  },1000);
}

function setupWodTimer(){
  var box=document.querySelector(".pc-timer");
  if(!box){stopWodTimer();return;}
  var dur=Number(box.getAttribute("data-duration"))||0;
  var mode=box.getAttribute("data-mode")||"down";
  var label=box.getAttribute("data-label")||"Timer";
  var isEmom=box.getAttribute("data-emom")==="1";
  if(wodTimer.duration!==dur||wodTimer.mode!==mode)resetWodTimerState(dur,mode,label,isEmom);
  updateWodTimerDisplay();
  var start=null,pause=null,reset=null; // timer WOD retiré

  if(start)start.onclick=function(){
    resumeAudio();
    if(wodTimer.running||wodTimer.countdownActive)return;
    start.textContent="...";start.disabled=true;
    // Countdown 10s puis démarrage
    startWodCountdown(function(){
      start.textContent="▶";start.disabled=false;
      wodTimer.running=true;
      wodTimer.interval=setInterval(function(){
        if(wodTimer.mode==="up"){
          wodTimer.elapsed=Math.min(wodTimer.duration,wodTimer.elapsed+1);
          updateWodTimerDisplay();
          // Bip à chaque minute EMOM
          if(wodTimer.isEmom&&wodTimer.elapsed>0&&wodTimer.elapsed%60===0){bipEmom();vibrate([100,50,100]);}
          if(wodTimer.elapsed>=wodTimer.duration){stopWodTimer();bipEnd();vibrate([300,100,300,100,300]);}
        } else {
          wodTimer.remaining=Math.max(0,wodTimer.remaining-1);
          updateWodTimerDisplay();
          // Bips 3 dernières secondes
          if(wodTimer.remaining<=3&&wodTimer.remaining>0){bipCountdown();vibrate([60]);}
          // Bip à chaque minute EMOM (quand remaining tombe sur multiple de 60)
          if(wodTimer.isEmom&&wodTimer.remaining>0&&wodTimer.remaining%60===0){bipEmom();vibrate([100,50,100]);}
          if(wodTimer.remaining<=0){stopWodTimer();bipEnd();vibrate([300,100,300,100,300]);}
        }
      },1000);
    });
  };
  if(pause)pause.onclick=function(){stopWodTimer();updateWodTimerDisplay();};
  if(reset)reset.onclick=function(){
    resetWodTimerState(dur,mode,label,isEmom);

    updateWodTimerDisplay();
  };
}

// ─── Timer repos ─────────────────────────────────────────────────────────────

var restTimer={remaining:0,interval:null,running:false};

function currentClockWithSeconds(){
  var n=new Date();
  return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0")+":"+String(n.getSeconds()).padStart(2,"0");
}


// horloge uniquement dans le mode séance; heure et secondes même grosseur.
var globalClockInterval=null;
function ensureGlobalClock(){
  return $('guidedLiveClock');
}
function updateGlobalClock(){
  var el=ensureGlobalClock();
  if(!el) return;
  var n=new Date();
  var hh=String(n.getHours()).padStart(2,'0');
  var mm=String(n.getMinutes()).padStart(2,'0');
  var ss=String(n.getSeconds()).padStart(2,'0');
  el.innerHTML='<span class="glc-hm">'+hh+':'+mm+'</span><span class="glc-sec">'+ss+'</span>';
}
function startGlobalClock(){
  updateGlobalClock();
  if(globalClockInterval)clearInterval(globalClockInterval);
  globalClockInterval=setInterval(updateGlobalClock,1000);
}
function ensureRestFloatingClock(){
  var el=$("restFloatingClock");
  if(!el){
    el=document.createElement("div");
    el.id="restFloatingClock";
    el.className="rest-floating-clock hidden";
    document.body.appendChild(el);
  }
  return el;
}
function updateRestFloatingClock(){
  // l'heure permanente remplace l'ancienne horloge de repos.
  // Les boutons Pause ont été retirés des vues iPhone et séance.
  var el=$("restFloatingClock");
  if(el){el.className="rest-floating-clock hidden";el.innerHTML="";}
}
function updateRestDisplay(){
  // restDisplay retiré du DOM. Seul updateRestFloatingClock est conservé.
  updateRestFloatingClock();
}
function stopRestTimer(){
  if(restTimer.interval){clearInterval(restTimer.interval);restTimer.interval=null;}
  restTimer.running=false;updateRestDisplay();
}
function startRestTimer(seconds){
  resumeAudio();
  stopRestTimer();restTimer.remaining=seconds;restTimer.running=true;updateRestDisplay();
  restTimer.interval=setInterval(function(){
    restTimer.remaining=Math.max(0,restTimer.remaining-1);
    updateRestDisplay();
    // Bips 3 dernières secondes du repos
    if(restTimer.remaining<=3&&restTimer.remaining>0){bipCountdown();vibrate([60]);}
    if(restTimer.remaining<=0){
      stopRestTimer();bipRestDone();vibrate([300,100,300,100,300]);

    }
  },1000);
}
function setupRestBar(){
  var map={rb45:45,rb60:60,rb90:90,rb120:120};
  Object.keys(map).forEach(function(id){var b=$(id);if(b)b.onclick=function(){resumeAudio();startRestTimer(map[id]);};});

}

// ─── Saisie résultats locale ────────────────────────────────────────────────

// Extrait la plage de reps cible depuis le format (ex: "4 x 15-20" → {min:15,max:20})
// ou depuis un nombre simple (ex: "5 x 8" → {min:8,max:8})
function parseTargetReps(format, repsHint){
  // Chercher une plage "X-Y" dans le format
  var rangeMatch = String(format||"").match(/(\d+)\s*[–\-]\s*(\d+)/);
  if(rangeMatch) return {min:Number(rangeMatch[1]), max:Number(rangeMatch[2])};
  // Chercher un nombre simple après "x" ou "×"
  var singleMatch = String(format||"").match(/[x×]\s*(\d+)/i);
  if(singleMatch) return {min:Number(singleMatch[1]), max:Number(singleMatch[1])};
  // Fallback sur repsHint
  var r = Number(repsHint)||8;
  return {min:r, max:r};
}

// Génère les chips de reps dynamiques pour la saisie des résultats et la vue séance.
// Règle V51.08 :
// - maximum 5 pastilles de reps pour libérer l’espace iPhone.
// - RPE conserve 6 et ajoute les demi-paliers utiles : 7.5 et 8.5.
// - cible simple (5 reps) → 3 à 7.
// - plage large (10–15 reps) → fenêtre de 5 valeurs centrée autour de la cible utile.
function buildRepsChips(targetMin, targetMax){
  var min = Number(targetMin || targetMax || 1);
  var max = Number(targetMax || targetMin || min);
  if(!isFinite(min) || min < 1) min = 1;
  if(!isFinite(max) || max < 1) max = min;
  min = Math.round(min);
  max = Math.round(max);
  if(max < min){ var tmp = min; min = max; max = tmp; }

  var chips = [];
  var maxChips = 5;

  if(min !== max){
    var width = max - min + 1;
    if(width <= maxChips){
      for(var r = min; r <= max; r++) chips.push(r);
      return chips;
    }
    var mid = Math.round((min + max) / 2);
    var loRange = Math.max(min, mid - 2);
    var hiRange = loRange + (maxChips - 1);
    if(hiRange > max){
      hiRange = max;
      loRange = Math.max(min, hiRange - (maxChips - 1));
    }
    for(var rr = loRange; rr <= hiRange; rr++) chips.push(rr);
    return chips;
  }

  // Cible simple : 5 pastilles maximum, cible au centre quand possible.
  var center = min;
  var lo = Math.max(1, center - 2);
  var hi = lo + (maxChips - 1);
  if(center > hi){
    hi = center;
    lo = Math.max(1, hi - (maxChips - 1));
  }
  for(var i = lo; i <= hi; i++) chips.push(i);
  return chips;
}
function buildRpeChips(){
  return [6,7,7.5,8,8.5,9,10];
}

// ── Analyse la structure d'un WOD pour extraire mouvements + reps + couleurs ──
function parseWodStructure(text){
  if(!text) return null;
  var COLORS = ['mv1','mv2','mv3','mv4'];
  var raw = String(text);
  var moves = [], seen = new Set();

  function cleanMoveName(name, isCal){
    var n = String(name||'')
      .replace(/\bmin\s*\d+\s*=\s*/ig,'')
      .replace(/[;:,.]+$/,'')
      .replace(/\s+/g,' ')
      .trim();

    // dans la vue séance, on doit voir "Cal Row" et non juste "Row".
    // Si le texte original contient "cal", on conserve cette information dans le nom.
    var hadCal = !!isCal || /^cal\s+/i.test(n);
    n = n.replace(/^cal\s+/i,'').trim();

    // En vue séance/résultats WOD, le nom du mouvement reste propre.
    // La charge appartient aux consignes, pas au titre: "Wall Balls 14 lb" => "Wall Balls".
    n = n
      .replace(/\b(?:\d+(?:\.\d+)?\s*)?(?:lb|lbs|kg)\s*(?:\/\s*(?:main|hand|côté|side))?\b/ig,'')
      .replace(/\b(?:light|léger|légers|légères|modéré|modérée|moderate|heavy|lourd|lourds|lourdes)\b/ig,'')
      .replace(/\s+/g,' ')
      .trim();

    if(hadCal){
      if(/^row\b/i.test(n)) return 'Cal Row';
      if(/^bike\b/i.test(n)) return 'Cal Bike';
      if(/^ski\b|^skierg\b/i.test(n)) return 'Cal SkiErg';
      return 'Cal '+n.charAt(0).toUpperCase()+n.slice(1);
    }
    return n;
  }
  function addMove(reps,name,isCal){
    name = cleanMoveName(name,isCal);
    if(!name || name.length<2) return;
    var key = (String(reps)+'_'+name).toLowerCase();
    if(seen.has(key)) return;
    seen.add(key);
    moves.push({name:name, reps:String(reps), color:COLORS[moves.length % COLORS.length]});
  }

  // EMOM : "min 1 = 12 cal row ; min 2 = 10 ring rows stricts"
  if(/\bEMOM\b/i.test(raw)){
    var emomPart = raw.split('.')[0];
    var emomRe = /min\s*\d+\s*=\s*(\d+)\s*(cal\s+)?([^;\.]+)/ig;
    var m;
    while((m = emomRe.exec(emomPart)) !== null){ addMove(m[1], m[3], !!m[2]); }
    if(moves.length) return moves;
  }

  // For time 21-15-9 : les reps sont une pyramide, donc on affiche "21-15-9" pour chaque mouvement.
  var scheme = null;
  var schemeMatch = raw.match(/(\d+\s*[-–]\s*\d+\s*[-–]\s*\d+)/);
  if(/for time|cap/i.test(raw) && schemeMatch){ scheme = schemeMatch[1].replace(/\s/g,''); }

  var main = raw
    .replace(/^[^:]*:\s*/,'')
    .split('.')[0]
    .replace(/\bAMRAP\s*\d+\b/ig,'')
    .replace(/\bEMOM\s*\d+\b/ig,'')
    .replace(/\bFor time\b/ig,'')
    .replace(/\bCap\s*\d+\s*min\b/ig,'')
    .trim();

  if(scheme){
    main = main.replace(/^(\d+\s*[-–]\s*\d+\s*[-–]\s*\d+)\s*:?\s*/,'');
    main.split('+').forEach(function(part){
      var isCalPart = /^\s*cal\s+/i.test(part);
      part = cleanMoveName(part, isCalPart);
      if(part) addMove(scheme, part, false);
    });
    if(moves.length) return moves;
  }

  main.split('+').forEach(function(part){
    part = part.trim();
    var m = part.match(/^(\d+)\s*(cal\s+)?(.+)$/i);
    if(!m) return;
    var reps = Number(m[1]);
    var name = cleanMoveName(m[3], !!m[2]);
    if(reps<1||reps>80||name.length<2) return;
    addMove(reps, name, false);
  });

  return moves.length>=1 ? moves : null;
}
// Estime les rounds attendus selon durée et type
function estimateWodRounds(text, durationMin){
  if(/emom/i.test(text)) return {min:durationMin,max:durationMin,def:durationMin};
  if(/for time|cap/i.test(text)) return {min:1,max:1,def:1};
  if(durationMin<=6)  return {min:2,max:4,def:3};
  if(durationMin<=10) return {min:3,max:6,def:4};
  if(durationMin<=15) return {min:4,max:8,def:5};
  return {min:3,max:6,def:4};
}

// Helpers For Time.
// Ces fonctions doivent exister avant rendu résultats session, sinon les WODs For Time
// comme le jeudi Épaules 3D n'affichent pas le champ de temps final.
function parseCapSeconds(text, fallbackMin){
  var raw = String(text || '');
  var m = raw.match(/(?:cap|time cap)\s*[:=]?\s*(\d+)\s*(?:min|minutes?)?/i);
  var min = m ? Number(m[1]) : Number(fallbackMin || 0);
  if(!min || min < 1) min = 8;
  return Math.max(60, Math.round(min * 60));
}
var _timeOptionsCache = null;
function buildTimeOptions(expectedSec){
  // V51.18 : For Time = liste complète 00:00 → 60:00, à la seconde.
  // L’objectif/cap détecté reste présélectionné, sans réduire la plage disponible.
  if(_timeOptionsCache) return _timeOptionsCache; var arr=[]; for(var sec=0;sec<=3600;sec+=1)arr.push(sec); _timeOptionsCache=arr; return arr;
}
function normalizeForTimeGoalSeconds(expectedSec){
  expectedSec = Math.round(Number(expectedSec || 0));
  if(!isFinite(expectedSec)) expectedSec = 0;
  return Math.max(0, Math.min(3600, expectedSec));
}

// Collecte tous les exercices du WOD courant avec leur cible de reps
// collectSessionExercises déplacé vers scripts/session/results.js



function resolveMovementKey(key){
  var mvKey=null;
  var cleanKey=chargeKeyFromName(key);
  Object.keys(movements).forEach(function(k){
    if(k===key || k===cleanKey || movements[k].name===key || movements[k].name===cleanKey){mvKey=k;}
  });
  return mvKey;
}

// updateRefsFromResults déplacé vers scripts/session/results.js


function historyDeleteUid(s){
  var n=normalizeRemoteSession(s||{});
  var id=sessionUid(n);
  if(id && id.replace(/\|/g,"").trim()) return id;
  return [
    s.uid||"",
    s.date||"",
    s.time||"",
    s.semaine||s.week||"",
    s.jour||s.day||"",
    s.focus||"",
    JSON.stringify(s.results||s.resultats||{})
  ].join("|");
}
function sameHistorySession(a,b){
  return historyDeleteUid(a) === historyDeleteUid(b);
}

function sessionUid(s){
  if(!s)return "";
  return [s.date||"",s.time||"",s.semaine||s.week||"",s.jour||s.day||"",s.focus||""].join("|");
}
function normalizeRemoteSession(s){
  var r=s&&s.resultats?s.resultats:(s&&s.results?s.results:{});
  return {
    date:s.date||"",
    time:s.time||"",
    week:s.semaine||s.week||state.week,
    day:s.jour||s.day||state.day,
    focus:s.focus||"",
    results:r||{},
    version:s.version||"remote"
  };
}
function mergeHistory(localHistory,remoteData){
  var map={},merged=[];
  (localHistory||[]).forEach(function(s){var n=normalizeRemoteSession(s),id=sessionUid(n);if(id&&!map[id]){map[id]=true;merged.push(n);}});
  (remoteData||[]).forEach(function(s){var n=normalizeRemoteSession(s),id=sessionUid(n);if(id&&!map[id]){map[id]=true;merged.push(n);}});
  merged.sort(function(a,b){return String((a.date||"")+" "+(a.time||"")).localeCompare(String((b.date||"")+" "+(b.time||"")));});
  return merged;
}
function rebuildRefsFromHistory(){
  state.movementRefs={};
  state.rpeHistory={};
  state.athleteState={movements:{},updatedAt:null,version:APP_VERSION};
  (state.history||[]).forEach(function(s){
    var res=s.results||s.resultats||{};
    updateRefsFromResults(res,s.date||new Date().toLocaleDateString("fr-CA"));
    CoachCharge.updateAthleteStateFromResults(res,s.date||new Date().toLocaleDateString("fr-CA"));
  });
  checkDeloadAlert();
}

// ─── Progression automatique basée sur RPE ────────────────────────────────────
// RPE ≤ 7 sur 2 séances → +5 lb suggéré
// RPE 8    → progression normale selon cycle
// RPE ≥ 9  sur 2 séances → maintien
// RPE 10   deux fois → alerte deload

// buildSessionSummary déplacé vers scripts/session/results.js

// showSessionSummaryModal déplacé vers scripts/session/results.js

// ─── Avancement automatique de semaine ───────────────────────────────────────

function markDayCompleted(day){
  if(state.completedDays.indexOf(day)<0){
    state.completedDays.push(day);
    state.missedDays=(state.missedDays||[]).filter(function(x){return !(x&&x.day===day&&Number(x.week)===Number(state.week)&&x.cycle===activeProgramId());});
    state.cycleState=buildCycleStatePayload();
    save();
  }
}

function markDayMissed(day, reason){
  reason=String(reason||"").trim();
  if(!reason)return false;
  state.missedDays=state.missedDays||[];
  state.missedDays=state.missedDays.filter(function(x){return !(x&&x.day===day&&Number(x.week)===Number(state.week)&&x.cycle===activeProgramId());});
  state.missedDays.push({week:state.week,day:day,cycle:activeProgramId(),reason:reason,date:new Date().toLocaleDateString("fr-CA"),actualDate:new Date().toLocaleDateString("fr-CA"),actualDayName:actualDayName()});
  state.cycleState=buildCycleStatePayload();
  save();
  render();
    return true;
}

function canAdvanceWeek(){
  var tw = totalWeeks();
  if(state.week >= tw) return false;
  return missingDaysForWeek().length===0;
}

function advanceWeek(reason){
  var tw = totalWeeks();
  if(state.week < tw){
    var fromWeek=state.week, fromCompleted=(state.completedDays||[]).slice(), fromMissed=(state.missedDays||[]).filter(function(x){return x&&Number(x.week)===Number(fromWeek)&&x.cycle===activeProgramId();});
    state.weekTransitions=state.weekTransitions||[];
    state.weekTransitions.push({cycle:activeProgramId(),fromWeek:fromWeek,toWeek:fromWeek+1,completedDays:fromCompleted,missedDays:fromMissed,reason:reason||"Semaine traitée",date:new Date().toLocaleDateString("fr-CA"),actualDayName:actualDayName()});
    state.week++;
    state.completedDays = [];
    state.cycleState=buildCycleStatePayload();
    save();
        render();
    renderWeekProgress();
  }
}

function requestMarkCurrentDayMissed(){
  if(isDayCompleted(state.day)){alert("Cette séance est déjà complétée.");return;}
  var reason=prompt("Pourquoi marquer "+dayLabel(state.day)+" comme manqué?", "Horaire impossible");
  if(reason===null)return;
  if(!String(reason).trim()){alert("Raison obligatoire.");return;}
  markDayMissed(state.day,reason);
}
function requestAdvanceWeek(){
  if(state.week>=totalWeeks()){alert("Tu es déjà à la dernière semaine du cycle.");return;}
  var missing=missingDaysForWeek();
  if(missing.length){
    var labels=missing.map(dayLabel).join(", ");
    var reason=prompt("Jours non traités : "+labels+". Raison pour passer quand même?", "Semaine incomplète — horaire impossible");
    if(reason===null)return;
    if(!String(reason).trim()){alert("Raison obligatoire.");return;}
    missing.forEach(function(d){ markDayMissed(d,reason); });
    advanceWeek(reason);
  }else{
    advanceWeek("Semaine complétée/traitée");
  }
}

// ─── Wake Lock — empêcher l'écran de se mettre en veille ─────────────────────

var wakeLock = null;
var wakeLockWanted = false;
var guidedWakeLockAuto = false;

function updateWakeLockButton(active, unsupported){
  var buttons=[];
  var main=$("wakeLockBtn");
  if(main)buttons.push(main);
  var wodPlus=$("wodPlusWakeBtn");
  if(wodPlus)buttons.push(wodPlus);
  if(!buttons.length)return;
  buttons.forEach(function(btn){
    if(unsupported){
      btn.textContent="⚠️ Écran non supporté";
      btn.classList.remove("active");
      return;
    }
    btn.textContent=active?"🔆 Écran actif":"💤 Écran";
    btn.classList.toggle("active",!!active);
  });
}

async function requestWakeLock(){
  wakeLockWanted = true;
  try{
    if(!("wakeLock" in navigator)){
      updateWakeLockButton(false,true);
      return false;
    }
    if(wakeLock){
      updateWakeLockButton(true,false);
      return true;
    }
    wakeLock = await navigator.wakeLock.request("screen");
    if(wakeLock && wakeLock.addEventListener){
      wakeLock.addEventListener("release",function(){
        wakeLock=null;
        if(wakeLockWanted && document.visibilityState==="visible"){
          setTimeout(function(){ requestWakeLock(); },250);
        }else{
          updateWakeLockButton(false,false);
        }
      });
    }
    updateWakeLockButton(true,false);
    return true;
  }catch(e){
    if(window.CoachLog)CoachLog.warn("wakelock_request_failed", {message:e&&e.message?e.message:String(e)});
    updateWakeLockButton(false,false);
    return false;
  }
}

function releaseWakeLock(){
  wakeLockWanted = false;
  if(wakeLock){try{wakeLock.release();}catch(e){}wakeLock=null;}
  updateWakeLockButton(false,false);
}

// Re-acquérir si l'app revient au premier plan pendant une séance ou si l'utilisateur l'a demandé.
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible" && wakeLockWanted && wakeLock===null){
    requestWakeLock();
  }
});

// volontairement neutralisé.
// Les résultats ne doivent plus réécrire les charges locales ou charges.js.
// - charges.js = configuration stable / équipement / charges de départ
// - data/resultats.json = journal brut
// - PR/historique = capacité déjà prouvée et upgrades
// updateCustomChargesFromResults déplacé vers scripts/session/save.js

// buildSessionPayload déplacé vers scripts/session/save.js

// Génère le contenu du fichier charges.js mis à jour avec les nouveaux poids
// supprimé/neutralisé : l'app ne doit jamais écrire charges.js automatiquement.
// charges.js est la seule configuration de charges. Les upgrades viennent des PR/historique.
function buildChargesJsContent(){ return ""; }


// ─── Indicateur profil actif ────────────────────────────────────────────────
function renderSyncStatusIndicator(){
  var el=$("syncStatusDot"); if(!el)return;
  var p = window.CoachProfiles && CoachProfiles.getActive ? CoachProfiles.getActive() : null;
  var name = (p && p.name) ? p.name : "?";
  el.className = "sync-dot profile-dot";
  el.textContent = name.trim().slice(0,1).toUpperCase() || "?";
  el.title = p ? ("Profil actif : " + p.name) : "Aucun profil actif";
}
function openSyncSettings(){
  switchView("settings");
}




// ─── Swipe ───────────────────────────────────────────────────────────────────

function setupSwipeGesture(el,cb){
  // Swipe désactivé.
  // Navigation seulement par boutons pour éviter les changements accidentels
  // de semaine/jour/cycle sur PC.
  return;
}
function setupSwipeNav(){
  // les swipes sont désactivés; seuls les boutons restent actifs.
  // Flèches semaine
  var wp=$("weekPrev"),wn=$("weekNext");
  if(wp)wp.onclick=function(){if(setActiveWeek(Number(state.week)-1)){save();render();}};
  if(wn)wn.onclick=function(){if(setActiveWeek(Number(state.week)+1)){save();render();}};
  // Flèches jour
  var dp=$("dayPrev"),dn=$("dayNext");
  if(dp)dp.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();render();}};
  if(dn)dn.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();render();}};
  // Flèches jour mode iPhone
  var pdp=$("phoneDayPrev"),pdn=$("phoneDayNext");
  if(pdp)pdp.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();renderPhoneWod();}};
  if(pdn)pdn.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();renderPhoneWod();}};
  // Swipe vue entraînement : horizontal = semaine, vertical = jour
  setupSwipeGesture($("trainingView"),function(dir){
    if(dir==="left"){if(setActiveWeek(Number(state.week)+1)){save();render();}}
    else if(dir==="right"){if(setActiveWeek(Number(state.week)-1)){save();render();}}
    else if(dir==="up"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();render();}}
    else if(dir==="down"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();render();}}
  });
  // Swipe mode iPhone : horizontal = jour
  setupSwipeGesture($("phoneView"),function(dir){
    if(dir==="left"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();renderPhoneWod();}}
    else if(dir==="right"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();renderPhoneWod();}}
  });
}

// ─── Hamburger ───────────────────────────────────────────────────────────────

function setupHamburger(){
  // V50.51 : menu hamburger fusionné dans la gear Réglages.
  // Conservé comme fonction no-op pour ne pas briser le tronc d'initialisation.
}

// ─── Rendu vue bureau (WOD) ───────────────────────────────────────────────────

function renderWeekProgress(){
  // Barre de progression semaine dans la vue entraînement
  var el=$("weekProgressBar");if(!el)return;
  var tw=totalWeeks(),w=state.week;
  var pct=Math.round(((w-1)/tw)*100);
  el.style.width=pct+"%";
  var lbl=$("weekProgressLabel");
  if(lbl){
    var days=currentDayOrder();
    var daysLeft=missingDaysForWeek().length;
    lbl.textContent="S"+w+"/"+tw+" · "+daysLeft+" jour"+(daysLeft>1?"s":"")+" à traiter cette semaine";
  }
  // Indicateur jours complétés
  var dc=$("daysCompleted");if(!dc)return;
  dc.innerHTML="";
  currentDayOrder().forEach(function(d){
    var done=isDayCompleted(d), missed=isDayMissed(d);
    var meta=currentDayMeta(d);
    var pip=document.createElement("span");
    pip.className="day-pip"+(done?" done":"")+(missed?" missed":"")+(d===state.day?" current":"");
    pip.title=((meta&&meta.label)||d)+(missed?" — manqué":"");
    dc.appendChild(pip);
  });
}

function daysToCompetition(){
  var now=new Date();
  var diff=Math.ceil((COMPETITION_DATE-now)/(1000*60*60*24));
  return Math.max(0,diff);
}


function programWeeks(id){
  var cfg=(focusConfigs&&focusConfigs[id])||{};
  return Number(cfg.durationWeeks||cfg.weeks||((cfg.weekLabels&&cfg.weekLabels.length)||0)||((cfg.sets&&cfg.sets.length)||0)||0)||0;
}
function roadmapProgramOrder(activeId){
  var compRoute=["shoulders3d","hypertrophy_base","force_performance","competition_peak"];
  if(activeId==="heritage225")return ["heritage225"];
  if(compRoute.indexOf(activeId)>=0)return compRoute.slice(compRoute.indexOf(activeId));
  return [activeId,"competition_peak"].filter(function(id,i,a){return id&&a.indexOf(id)===i;});
}
function roadmapRows(activeId, activeWeek){
  activeId=activeId||activeProgramId(); activeWeek=Number(activeWeek||state.week||1);
  var ids=roadmapProgramOrder(activeId), rows=[], cursor=new Date();
  ids.forEach(function(id,idx){
    var cfg=focusConfigs[id]||{};
    var total=programWeeks(id)||6;
    var remaining=idx===0?Math.max(0,total-activeWeek+1):total;
    var start=new Date(cursor);
    var end=new Date(cursor); end.setDate(end.getDate()+remaining*7);
    rows.push({id:id,label:cfg.label||id,totalWeeks:total,remainingWeeks:remaining,start:start,end:end,current:idx===0,phase:cfg.phase||""});
    cursor=end;
  });
  return rows;
}
function formatRoadDate(d){return d instanceof Date&&!isNaN(d.getTime())?d.toLocaleDateString("fr-CA",{month:"short",day:"numeric"}):"—";}
function roadmapSummary(){
  var rows=roadmapRows(activeProgramId(),state.week);
  var totalWeeks=rows.reduce(function(sum,r){return sum+(r.remainingWeeks||0);},0);
  var weeksToComp=Math.floor(daysToCompetition()/7);
  var margin=weeksToComp-totalWeeks;
  var status=margin>=4?"OK":margin>=1?"serré":"trop long";
  return {rows:rows,totalWeeks:totalWeeks,weeksToComp:weeksToComp,margin:margin,status:status};
}

function renderWeeks(){
  var weekInfo=buildWeekInfo();
  var w=$("weekButtons");if(!w)return;w.innerHTML="";
  var tw=totalWeeks();
  for(var k=1;k<=tw;k++){
    (function(wk){
      var info=weekInfo[wk]||{label:"S"+wk,goal:""};
      var b=document.createElement("button");
      b.textContent=info.label;
      b.className="tab"+(wk===state.week?" active":" secondary");
      // Marquer les semaines complétées
      if(wk<state.week)b.style.opacity="0.6";
      b.onclick=function(){if(setActiveWeek(wk)){save();render();}};
      w.appendChild(b);
    })(k);
  }
  var wi=weekInfo[state.week]||{label:"S"+state.week,goal:""};
  var wg=$("weekGoal");
  var cfg=focus();
  var phaseInfo=cfg.phaseName?"Phase "+cfg.phase+" — "+cfg.phaseName:"";
  var daysLeft=daysToCompetition();
  if(wg)wg.innerHTML=wi.goal+
    (phaseInfo?"<br><small style='color:var(--accent2)'>"+phaseInfo+"</small>":"")+
    (HAS_COMPETITION_GOAL?"<br><small style='color:var(--muted)'>⏱ "+daysLeft+" jours avant la compétition</small>":"");
  renderWeekProgress();
}
function renderDays(){
  var w=$("dayButtons");if(!w)return;w.innerHTML="";
  ensureCurrentDay().forEach(function(k){
    var d=currentDayMeta(k),b=document.createElement("button");
    b.textContent=(d&&d.label)||k;b.className="tab"+(k===state.day?" active":" secondary");
    b.onclick=function(){state.day=k;save();render();};w.appendChild(b);
  });
}
// ─── Rendu WOD+ ───────────────────────────────────────────────────────────────
// V50.57: le rendu WOD+ et ses helpers HTML sont maintenant dans scripts/view_wodplus.js.
// Garder ce module chargé avant app.js dans index.html.



// ─── Rendu Vue PC ───────────────────────────────────────────────────────
// V50.54: phoneWodLoadHints() et renderPhoneWod() sont maintenant dans scripts/view_pc.js.
// Garder ce module chargé avant app.js dans index.html.



// ─── Mode séance guidé (optionnel) ──────────────────────────────────────────
// V50.58: le rendu et les contrôles de la séance guidée sont maintenant dans scripts/view_session.js.
// Garder ce module chargé avant app.js dans index.html.


// ─── Cycle ───────────────────────────────────────────────────────────────────

var previewCycleGoal = null;
var previewCycleWeek = 1;
var previewCycleDay = null;

function previewProgramId(){return previewCycleGoal || (state.cycle&&state.cycle.goal) || defaultProgramId();}
function previewCfg(){return focusConfigs[previewProgramId()] || null;}
function previewDays(){
  var cfg=previewCfg();
  var days=(cfg&&Array.isArray(cfg.days)&&cfg.days.length)?cfg.days:DEFAULT_PROGRAM_DAYS;
  return days.filter(function(d){return ALL_DAYS.indexOf(d)>=0;});
}
function previewDayMeta(day){
  var cfg=previewCfg()||{};
  var d=Object.assign({}, baseDays[day] || {label:day,base:"",focus:""});
  if(cfg.dayMeta&&cfg.dayMeta[day])d=Object.assign(d,cfg.dayMeta[day]);
  return d;
}
function previewDayLabel(day){var m=previewDayMeta(day);return (m&&m.label)||day;}
function ensurePreviewPosition(){
  var cfg=previewCfg();
  var tw=cfg&&cfg.weekLabels&&cfg.weekLabels.length?cfg.weekLabels.length:(cfg&&cfg.sets&&cfg.sets.length?cfg.sets.length:1);
  previewCycleWeek=Math.max(1,Math.min(Number(previewCycleWeek)||1,tw));
  var days=previewDays();
  if(!previewCycleDay || days.indexOf(previewCycleDay)<0)previewCycleDay=days[0]||"lundi";
}
function resetPreviewPosition(programId){
  previewCycleGoal=programId||previewCycleGoal||activeProgramId();
  previewCycleWeek=1;
  var cfg=focusConfigs[previewCycleGoal]||{};
  var days=(cfg.days&&cfg.days.length?cfg.days:DEFAULT_PROGRAM_DAYS).filter(function(d){return ALL_DAYS.indexOf(d)>=0;});
  previewCycleDay=days[0]||"lundi";
}

function snapshotCurrentCycle(reason){
  return {
    uid:"cycle_"+Date.now()+"_"+Math.random().toString(16).slice(2),
    id:activeProgramId(),
    label:(focus()&&focus().label)||activeProgramId(),
    week:state.week,
    day:state.day,
    completedDays:(state.completedDays||[]).slice(),
    missedDays:(state.missedDays||[]).slice(),
    activeCycleStartDate:cycleStartDateForActive(),
    pausedAt:nowIso(),
    reason:reason||"Changement de cycle"
  };
}
function pauseCurrentCycle(reason){
  var snap=snapshotCurrentCycle(reason);
  state.savedCycles=state.savedCycles||[];
  // Ne pas dédupliquer par id : on peut avoir plusieurs essais du même programme à des semaines différentes.
  state.savedCycles.push(snap);
}
function populateCycleGoalOptions(){
  var sel=$("cycleGoal");if(!sel)return;
  sel.innerHTML="";
  var selected=previewProgramId();
  var phaseGroups={};
  var ids = programIndexIds().filter(function(id){ return !!focusConfigs[id]; });
  ids.forEach(function(id){
    var cfg=focusConfigs[id];
    var ph=cfg.phase||0;
    if(!phaseGroups[ph])phaseGroups[ph]=[];
    phaseGroups[ph].push({id:id,cfg:cfg});
  });
  Object.keys(phaseGroups).map(function(ph){ return Number(ph)||0; })
    .sort(function(a,b){ if(a===0)return 1; if(b===0)return -1; return a-b; })
    .forEach(function(ph){
    var group=phaseGroups[ph];if(!group||!group.length)return;
    var parent=sel;
    if(ph>0){var og=document.createElement("optgroup");og.label="Phase "+ph;sel.appendChild(og);parent=og;}
    group.forEach(function(item){
      var opt=document.createElement("option");
      opt.value=item.id;opt.textContent=item.cfg.label;
      if(item.id===selected)opt.selected=true;
      parent.appendChild(opt);
    });
  });
}
function programDetailsHtml(cfg){
  if(!cfg || !cfg.label)return '<strong>Aucun programme chargé</strong><br>Vérifie <code>programs/index.js</code>.';
  var target=cfg.phase&&PHASE_TARGETS[cfg.phase]?PHASE_TARGETS[cfg.phase]:null;
  var targetHtml="";
  if(target){targetHtml='<div style="margin-top:10px;padding:10px;background:rgba(124,106,255,.1);border-radius:10px;font-size:13px">'+
    '<strong style="color:var(--accent2)">Objectifs de la phase</strong><br>'+
    (target.bench?'Bench : <strong>'+target.bench+' lb</strong><br>':'')+
    (target.backSquat?'Back squat : <strong>'+target.backSquat+' lb x5</strong><br>':'')+
    '<span style="color:var(--muted)">'+target.note+'</span></div>';}
  var days=(cfg.days||DEFAULT_PROGRAM_DAYS).map(function(d){
    var m=(cfg.dayMeta&&cfg.dayMeta[d])||baseDays[d]||{label:d};
    return m.label||d;
  }).join(' · ');
  var draftHtml = cfg.draft ? '<div class="draft-cycle-warning">⚠️ Brouillon futur — À retravailler lorsque le projet sera activé.</div>' : '';
  return '<strong>'+CoachUI.escapeHtml(cfg.label)+'</strong>'+(cfg.status?' <span class="draft-pill">'+CoachUI.escapeHtml(cfg.status)+'</span>':'')+'<br>'+CoachUI.escapeHtml(cfg.impact||'')+draftHtml+
    '<br><br><strong>Jours :</strong> '+CoachUI.escapeHtml(days)+
    '<br><strong>Structure :</strong> '+CoachUI.escapeHtml((cfg.sets&&cfg.sets.length)?cfg.sets.join(" → "):"non définie")+
    '<br><strong>Repos :</strong> '+CoachUI.escapeHtml(cfg.rest||'—')+targetHtml;
}
function previewBlockHtml(block){
  if(!block)return '';
  var html='<div style="margin-top:8px;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03)">'+
    '<div style="font-weight:800">'+CoachUI.escapeHtml(block.title||'Bloc')+' <small style="color:var(--muted)">'+CoachUI.escapeHtml(block.time||'')+'</small></div>';
  if(block.text)html+='<div style="margin-top:5px;color:var(--muted);font-size:12px;line-height:1.35">'+CoachUI.escapeHtml(block.text)+'</div>';
  if(block.exercises&&block.exercises.length){
    html+='<div style="margin-top:6px">';
    block.exercises.forEach(function(e){
      html+='<div style="font-size:12px;margin-top:4px"><strong>'+CoachUI.escapeHtml(e.name||'')+'</strong> · '+CoachUI.escapeHtml(e.format||'')+' · '+CoachUI.escapeHtml(e.load||'')+(e.note?' <span style="color:var(--muted)">— '+CoachUI.escapeHtml(e.note)+'</span>':'')+'</div>';
    });
    html+='</div>';
  }
  html+='</div>';
  return html;
}
function renderProgramPreviewHtml(){
  var cfg=previewCfg();
  if(!cfg)return '<div class="draft-cycle-warning">Aperçu impossible : programme introuvable.</div>';
  ensurePreviewPosition();
  var weeks=cfg.weekLabels&&cfg.weekLabels.length?cfg.weekLabels.length:(cfg.sets&&cfg.sets.length?cfg.sets.length:1);
  var days=previewDays();
  var html='<div style="margin-top:14px;padding:12px;border:1px solid rgba(124,106,255,.28);border-radius:14px;background:rgba(124,106,255,.06)">'+
    '<strong>Aperçu du programme</strong><br><small style="color:var(--muted)">Tu peux parcourir sans changer le cycle actif.</small>';
  html+='<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">';
  for(var w=1;w<=weeks;w++)html+='<button type="button" class="tab'+(w===previewCycleWeek?' active':' secondary')+' preview-week-btn" data-week="'+w+'">S'+w+'</button>';
  html+='</div><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
  days.forEach(function(d){html+='<button type="button" class="tab'+(d===previewCycleDay?' active':' secondary')+' preview-day-btn" data-day="'+d+'">'+CoachUI.escapeHtml(previewDayLabel(d))+'</button>';});
  html+='</div>';
  var blocks=[];
  try{blocks=(typeof cfg.getBlocks==='function')?(cfg.getBlocks(previewCycleDay,previewCycleWeek)||[]):[];}catch(e){blocks=[{title:'Erreur aperçu',time:'—',text:e&&e.message?e.message:String(e),kind:'error'}];}
  if(!blocks.length)blocks=[{title:'Séance manquante',time:'—',text:'Ce programme déclare '+previewDayLabel(previewCycleDay)+', mais ne retourne aucun bloc.',kind:'error'}];
  html+='<div style="margin-top:10px"><strong>'+CoachUI.escapeHtml((cfg.weekLabels&&cfg.weekLabels[previewCycleWeek-1])||('S'+previewCycleWeek))+' · '+CoachUI.escapeHtml(previewDayLabel(previewCycleDay))+'</strong></div>';
  blocks.forEach(function(b){html+=previewBlockHtml(b);});
  html+='</div>';
  return html;
}
function cycleStatusLabel(c){
  var st=String((c&&c.status)||'archived');
  if(st==='abandoned')return 'Abandonné';
  if(st==='completed')return 'Terminé';
  if(st==='restored')return 'Restauré';
  return 'Archivé';
}
function cycleSmallMeta(c){
  var parts=[];
  parts.push('S'+CoachUI.escapeHtml(c.week||1));
  parts.push(CoachUI.escapeHtml(dayLabel(c.day)));
  if(c.completedDays&&c.completedDays.length)parts.push(CoachUI.escapeHtml(c.completedDays.length+' fait'+(c.completedDays.length>1?'s':'')));
  if(c.missedDays&&c.missedDays.length)parts.push(CoachUI.escapeHtml(c.missedDays.length+' manqué'+(c.missedDays.length>1?'s':'')));
  if(c.archivedAt)parts.push('archivé '+CoachUI.escapeHtml(String(c.archivedAt).slice(0,10)));
  else if(c.pausedAt)parts.push('pause '+CoachUI.escapeHtml(String(c.pausedAt).slice(0,10)));
  if(c.reason)parts.push(CoachUI.escapeHtml(c.reason));
  return parts.join(' · ');
}
function renderCycleCard(c, idx, type){
  var cls=(c&&c.status)==='abandoned'?'border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.06)':'border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)';
  var html='<div style="margin-top:8px;padding:10px;'+cls+';border-radius:10px">'+
    '<strong>'+CoachUI.escapeHtml((c&&c.label)||((c&&c.id)||'Cycle'))+'</strong>'+
    (type==='archived'?' <span class="draft-pill">'+CoachUI.escapeHtml(cycleStatusLabel(c))+'</span>':'')+
    '<br><small>'+cycleSmallMeta(c||{})+'</small><br>';
  if(type==='saved'){
    html+='<button type="button" class="btn-ghost resume-cycle-btn" data-idx="'+idx+'">Reprendre</button> '+
      '<button type="button" class="btn-ghost archive-saved-cycle-btn" data-idx="'+idx+'">Archiver</button> '+
      '<button type="button" class="btn-danger abandon-saved-cycle-btn" data-idx="'+idx+'">Abandonner</button>';
  }else{
    html+='<button type="button" class="btn-ghost resume-archived-cycle-btn" data-idx="'+idx+'">Reprendre</button> '+
      '<button type="button" class="btn-ghost restore-archived-cycle-btn" data-idx="'+idx+'">Remettre en pause</button> '+
      '<button type="button" class="btn-ghost toggle-archived-status-btn" data-idx="'+idx+'">Archivé/abandonné</button> '+
      '<button type="button" class="btn-danger delete-archived-cycle-btn" data-idx="'+idx+'">Supprimer</button>';
  }
  html+='</div>';
  return html;
}
function renderSavedCyclesHtml(){
  var html='';
  var saved=state.savedCycles||[], archived=state.archivedCycles||[];
  if(saved.length){
    html+='<div style="margin-top:14px"><strong>Cycles en pause</strong>';
    saved.slice().reverse().forEach(function(c,i){var idx=saved.length-1-i;html+=renderCycleCard(c,idx,'saved');});
    html+='</div>';
  }
  if(archived.length){
    html+='<div style="margin-top:14px"><strong>Cycles archivés / abandonnés</strong><br><small>Tu peux les reprendre, les remettre en pause ou les supprimer définitivement.</small>';
    archived.slice().reverse().forEach(function(c,i){var idx=archived.length-1-i;html+=renderCycleCard(c,idx,'archived');});
    html+='</div>';
  }
  return html;
}

function renderRoadmapCycleHtml(){
  if(!HAS_COMPETITION_GOAL) return '';
  var r=roadmapSummary();
  var cls=r.status==="OK"?"ok":(r.status==="serré"?"warn":"danger");
  var html='<div class="roadmap-card"><div><strong>Route compétition</strong><br><small>Calcul dynamique : durée des phases restantes, pas les vieux phaseEnd statiques.</small></div>'+
    '<div class="roadmap-status '+cls+'">'+CoachUI.escapeHtml(r.status.toUpperCase())+' · marge '+CoachUI.escapeHtml(String(r.margin))+' sem.</div>'+
    '<div class="roadmap-list">';
  r.rows.forEach(function(row){html+='<div class="roadmap-row"><span>'+(row.current?'▶ ':'')+CoachUI.escapeHtml(row.label)+'</span><b>'+CoachUI.escapeHtml(String(row.remainingWeeks))+' sem.</b><small>'+formatRoadDate(row.start)+' → '+formatRoadDate(row.end)+'</small></div>';});
  html+='</div><p class="muted">Compétition : '+COMPETITION_DATE.toLocaleDateString('fr-CA')+' · '+daysToCompetition()+' jours restants · route estimée '+r.totalWeeks+' semaines.</p></div>';
  return html;
}

function renderFocusDetails(){
  var fd=$("focusDetails");if(!fd)return;
  var id=previewProgramId(), cfg=focusConfigs[id];
  var activeHtml='<div style="margin-bottom:10px;padding:10px;background:rgba(34,197,94,.08);border-radius:10px"><strong>Cycle actif :</strong> '+CoachUI.escapeHtml((focus()&&focus().label)||activeProgramId())+' · S'+state.week+' · '+CoachUI.escapeHtml(dayLabel(state.day))+'</div>';
  var previewHtml=(id!==activeProgramId())?'<div style="margin-bottom:10px;padding:10px;background:rgba(245,158,11,.10);border-radius:10px"><strong>Aperçu seulement.</strong> Rien ne change tant que tu ne démarres pas ce programme.</div>':'<div style="margin-bottom:10px;padding:10px;background:rgba(255,255,255,.04);border-radius:10px"><strong>Aperçu du cycle actif.</strong></div>';
  var missingHtml=state.missingCycle?'<div class="draft-cycle-warning">⚠️ Programme absent détecté : '+CoachUI.escapeHtml(state.missingCycle.id)+'. L’app est revenue au premier programme disponible sans effacer la trace.</div>':'';
  fd.innerHTML=missingHtml+activeHtml+cycleDateSummaryHtml()+previewHtml+programDetailsHtml(cfg)+renderRoadmapCycleHtml()+renderProgramPreviewHtml()+renderSavedCyclesHtml();
  Array.prototype.forEach.call(fd.querySelectorAll('.preview-week-btn'),function(btn){btn.onclick=function(){previewCycleWeek=Number(btn.getAttribute('data-week'))||1;renderFocusDetails();};});
  Array.prototype.forEach.call(fd.querySelectorAll('.preview-day-btn'),function(btn){btn.onclick=function(){previewCycleDay=btn.getAttribute('data-day')||previewCycleDay;renderFocusDetails();};});
  Array.prototype.forEach.call(fd.querySelectorAll('.resume-cycle-btn'),function(btn){btn.onclick=function(){resumeSavedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.archive-saved-cycle-btn'),function(btn){btn.onclick=function(){archiveSavedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.abandon-saved-cycle-btn'),function(btn){btn.onclick=function(){abandonSavedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.resume-archived-cycle-btn'),function(btn){btn.onclick=function(){resumeArchivedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.restore-archived-cycle-btn'),function(btn){btn.onclick=function(){restoreArchivedCycleToPaused(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.toggle-archived-status-btn'),function(btn){btn.onclick=function(){toggleArchivedCycleStatus(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.delete-archived-cycle-btn'),function(btn){btn.onclick=function(){deleteArchivedCycle(Number(btn.getAttribute('data-idx')));};});
}
function renderCycle(){populateCycleGoalOptions();ensurePreviewPosition();var csi=$("cycleStartDateInput");if(csi&&!csi.value)csi.value=cycleStartDateForActive();renderFocusDetails();var sc=$("saveCycleBtn");if(sc)sc.textContent=(previewProgramId()===activeProgramId()?"Redémarrer ce programme":"Démarrer ce programme");var nc=$("newCycleBtn");if(nc)nc.textContent="Archiver cycle actif";}
function saveCycle(){
  var selected=$("cycleGoal").value;
  if(!selected||!focusConfigs[selected]){alert("Programme introuvable.");return;}
  var input=$("cycleStartDateInput");
  var startDate=(input&&input.value)||todayIsoDate();
  var wk=calcWeekFromCycleStart(startDate);
  var todayDay=dayFromDateIfProgramDay(todayIsoDate());
  var dayText=todayDay?dayLabel(todayDay):"premier jour du programme";
  if(!confirm("Démarrer “"+focusConfigs[selected].label+"” comme cycle actif?\n\nDate de départ : "+startDate+"\nPosition calculée : S"+wk+" · "+dayText+"\n\nLe cycle actuel sera mis en pause. Les charges et l’historique réel ne seront pas modifiés."))return;
  pauseCurrentCycle("Remplacé par "+focusConfigs[selected].label);
  state.cycle.goal=selected;previewCycleGoal=selected;state.week=1;state.day=(focusConfigs[selected].days||DEFAULT_PROGRAM_DAYS)[0]||"lundi";state.completedDays=[];state.missedDays=[];state.deloadAlert=false;state.activeCycleStartDate=startDate;
  applyCycleStartDate(startDate,{setDayFromToday:true,resetWeekTracking:true});
  resetPreviewPosition(selected);
  save();render();renderCycle();}
function newCycle(){ archiveActiveCycle(); }
function archiveActiveCycle(){
  if(!confirm("Archiver le cycle actif actuel?"))return;
  state.archivedCycles=state.archivedCycles||[];
  state.archivedCycles.push(Object.assign(snapshotCurrentCycle("Archivé"),{archivedAt:nowIso(),status:"archived"}));
  state.completedDays=[];state.missedDays=[];state.cycleState=buildCycleStatePayload();save();renderCycle();}
function resumeSavedCycle(idx){
  var saved=state.savedCycles||[], c=saved[idx];
  if(!c){alert("Cycle introuvable.");return;}
  if(!focusConfigs[c.id]){alert("Programme introuvable : "+c.id+". Restaure le fichier avant de reprendre ce cycle.");return;}
  if(!confirm("Reprendre “"+(c.label||c.id)+"” S"+c.week+" "+dayLabel(c.day)+"? Le cycle actuel sera mis en pause."))return;
  pauseCurrentCycle("Mis en pause par reprise d’un autre cycle");
  saved.splice(idx,1);state.savedCycles=saved;state.cycle.goal=c.id;previewCycleGoal=c.id;state.week=Number(c.week)||1;state.day=c.day||((focusConfigs[c.id].days||DEFAULT_PROGRAM_DAYS)[0]);state.completedDays=c.completedDays||[];state.missedDays=c.missedDays||[];state.activeCycleStartDate=c.activeCycleStartDate||state.activeCycleStartDate||todayIsoDate();ensureCurrentDay();state.cycleState=buildCycleStatePayload();resetPreviewPosition(c.id);save();render();renderCycle();}
function archiveSavedCycle(idx){
  var saved=state.savedCycles||[], c=saved[idx];if(!c)return;
  if(!confirm("Archiver ce cycle en pause?"))return;
  state.archivedCycles=state.archivedCycles||[];state.archivedCycles.push(Object.assign({},c,{archivedAt:nowIso(),status:"archived"}));saved.splice(idx,1);state.savedCycles=saved;state.cycleState=buildCycleStatePayload();save();renderCycle();}
function abandonSavedCycle(idx){
  var saved=state.savedCycles||[], c=saved[idx];if(!c)return;
  if(!confirm("Abandonner ce cycle en pause? Il disparaîtra de la liste des cycles récupérables."))return;
  state.archivedCycles=state.archivedCycles||[];state.archivedCycles.push(Object.assign({},c,{archivedAt:nowIso(),status:"abandoned",reason:"Abandonné"}));
  saved.splice(idx,1);state.savedCycles=saved;state.cycleState=buildCycleStatePayload();save();renderCycle();}

function resumeArchivedCycle(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c){alert("Cycle archivé introuvable.");return;}
  if(!focusConfigs[c.id]){alert("Programme introuvable : "+c.id+". Restaure le fichier avant de reprendre ce cycle.");return;}
  if(!confirm("Reprendre ce cycle archivé? Le cycle actif actuel sera mis en pause."))return;
  pauseCurrentCycle("Mis en pause par reprise d’un cycle archivé");
  archived.splice(idx,1);state.archivedCycles=archived;
  state.cycle.goal=c.id;previewCycleGoal=c.id;state.week=Number(c.week)||1;
  state.day=c.day||((focusConfigs[c.id].days||DEFAULT_PROGRAM_DAYS)[0]);
  state.completedDays=c.completedDays||[];state.missedDays=c.missedDays||[];
  state.activeCycleStartDate=c.activeCycleStartDate||state.activeCycleStartDate||todayIsoDate();
  ensureCurrentDay();state.cycleState=buildCycleStatePayload();resetPreviewPosition(c.id);
  save();render();renderCycle();}
function restoreArchivedCycleToPaused(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c)return;
  if(!confirm("Remettre ce cycle dans les cycles en pause?"))return;
  state.savedCycles=state.savedCycles||[];
  state.savedCycles.push(Object.assign({},c,{restoredAt:nowIso(),status:"paused",reason:"Restauré depuis archives"}));
  archived.splice(idx,1);state.archivedCycles=archived;
  state.cycleState=buildCycleStatePayload();save();renderCycle();}
function toggleArchivedCycleStatus(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c)return;
  var next=(c.status==="abandoned")?"archived":"abandoned";
  var label=next==="abandoned"?"abandonné":"archivé";
  if(!confirm("Marquer ce cycle comme "+label+"?"))return;
  c.status=next;c.statusChangedAt=nowIso();
  if(next==="abandoned")c.reason="Abandonné";
  archived[idx]=c;state.archivedCycles=archived;state.cycleState=buildCycleStatePayload();save();renderCycle();}
function deleteArchivedCycle(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c)return;
  if(!confirm("Supprimer définitivement ce cycle archivé/abandonné? Cette action ne supprimera pas les séances de l’historique, seulement la fiche du cycle."))return;
  archived.splice(idx,1);state.archivedCycles=archived;state.cycleState=buildCycleStatePayload();save();renderCycle();}

// ─── Historique ──────────────────────────────────────────────────────────────


async function deleteHistorySession(index){
  index = Number(index);
  if(isNaN(index) || !state.history || !state.history[index]) return;

  var item = state.history[index];
  var label = (item.date||"date inconnue")+" · "+((item.day&&baseDays[item.day])?baseDays[item.day].label:(item.jour||item.day||""))+" · "+(item.focus||"");
  if(!confirm("Supprimer cet entraînement de l’historique?\n\n"+label)) return;

  state.history.splice(index,1);
  rebuildRefsFromHistory();
  save();
  renderHistory();
  renderWorkout();
  renderReferences();
  renderWeekProgress();

  var status = $("historyStatus");
  if(status){status.textContent="✅ Entraînement supprimé.";status.className="status-msg ok";}
}

function renderHistory(){
  var h=$("history");if(!h)return;
  h.innerHTML="";
  var status=$("historyStatus");
  if(!status){
    status=document.createElement("div");
    status.id="historyStatus";
    status.className="status-msg";
    h.parentNode.insertBefore(status,h);
  }
  if(!state.history||!state.history.length){
    h.innerHTML='<p style="color:var(--muted);font-size:13px">Aucune séance enregistrée.</p>';
    return;
  }
  renderProgressCharts();

  state.history.slice().reverse().forEach(function(s,revIndex){
    var originalIndex = state.history.length - 1 - revIndex;
    var div=document.createElement("div");
    div.className="history-item deletable";
    var dayKey=s.day||s.jour;
    var title=(dayKey&&baseDays[dayKey]?baseDays[dayKey].label:dayKey||"")+" — S"+(s.week||s.semaine||"")+" — "+(s.focus||"");
    var rows="";
    var res=s.results||s.resultats||{};
    if(res){
      Object.keys(res).forEach(function(k){
        var r=res[k];
        if(r.load||r.result||r.note||r.rpe){
          var _mv=r.load
            ?escHtml(r.load+" lb"+(r.reps?" × "+r.reps:"")+(r.rpe?" RPE "+r.rpe:""))
            :escHtml(r.result||"");
          var _nt=r.note?'<span class="history-note">'+escHtml(r.note)+'</span>':"";
          rows+='<div class="history-row"><span class="mv">'+escHtml(k)+'</span><span class="val">'+_mv+_nt+'</span></div>';
        }
      });
    }
    div.innerHTML=
      '<div class="history-head">'+
        '<div>'+
          '<div class="history-date">'+escHtml(s.date||"")+'</div>'+
          '<div class="history-title">'+escHtml(title)+'</div>'+
        '</div>'+
        '<button type="button" class="history-delete-btn" data-history-index="'+originalIndex+'">Supprimer</button>'+
      '</div>'+
      (s.note?'<div class="history-note">'+escHtml(s.note)+'</div>':'')+
      '<div class="history-rows">'+rows+'</div>';
    h.appendChild(div);
  });

  h.querySelectorAll(".history-delete-btn").forEach(function(btn){
    btn.onclick=function(){
      deleteHistorySession(btn.getAttribute("data-history-index"));
    };
  });
}

function renderProgressCharts(){
  var c=$("progressCharts");if(!c)return;c.innerHTML="";
  var tracked=["strictPress","frontSquat","powerClean","bench"];
  tracked.forEach(function(mvKey){
    var mv=movements[mvKey];if(!mv)return;
    var loads=[];
    state.history.forEach(function(s){
      if(s.results&&s.results[mvKey]&&s.results[mvKey].load){loads.push(Number(s.results[mvKey].load));}
    });
    if(loads.length<2)return;
    var max=Math.max.apply(null,loads),min=Math.min.apply(null,loads);
    var card=document.createElement("div");card.className="chart-card";
    var bars=loads.slice(-8).map(function(v,i,arr){
      var h=max===min?50:Math.round(((v-min)/(max-min))*46)+4;
      var isLatest=i===arr.length-1;
      return'<div class="chart-bar'+(isLatest?' latest':'')+'" style="height:'+h+'px" title="'+v+' lb"></div>';
    }).join("");
    card.innerHTML='<div class="chart-title">'+mv.name+' — dernier : '+loads[loads.length-1]+' lb</div><div class="chart-bars">'+bars+'</div>';
    c.appendChild(card);
  });
}

// ─── Références ──────────────────────────────────────────────────────────────

function renderReferences(){
  var c=$("referencesList");if(!c)return;c.innerHTML="";
  var rangeLabels={strength:"FORCE 1-5",hypertrophy:"HYPERTROPHIE 6-12",endurance:"ENDURANCE 13+"};
  var rangeColors={strength:"var(--gold)",hypertrophy:"var(--cyan)",endurance:"var(--green)"};
  Object.keys(movements).forEach(function(mvKey){
    ["strength","hypertrophy","endurance"].forEach(function(range){
      var key=mvKey+"__"+range,ref=state.movementRefs[key];
      if(!ref)return;
      var div=document.createElement("div");div.className="ref-item";
      div.style.setProperty("--ref-color",rangeColors[range]);
      div.querySelector?null:null;
      div.innerHTML=
        '<div class="ref-name">'+
          movements[mvKey].name+
          '<span class="ref-range" style="color:'+rangeColors[range]+'">'+rangeLabels[range]+'</span>'+
        '</div>'+
        '<div class="ref-right">'+
          '<span class="ref-value">'+ref.load+' lb × '+ref.reps+'</span>'+
          '<span class="ref-meta">'+ref.date+' · RPE '+ref.rpe+'</span>'+
        '</div>';
      // Couleur de la barre gauche selon range
      div.style.setProperty('--bar-color', rangeColors[range]);
      div.style.cssText+=';--bar-color:'+rangeColors[range];
      c.appendChild(div);
    });
  });
  // Appliquer couleur barre gauche dynamiquement
  c.querySelectorAll('.ref-item').forEach(function(el,i){
    var ranges=["strength","hypertrophy","endurance"];
    var r=ranges[i%3];
    el.style.borderLeftColor=rangeColors[r]||"var(--blue)";
    el.style.borderLeftWidth="2px";
  });
}

// ─── Profil ──────────────────────────────────────────────────────────────────

var PR_FIELD_MAP = {
  prBench:          {profile:"bench",            label:"Bench press",          mvKey:"bench",       reps:1,  range:"strength"},
  prFrontSquat:     {profile:"frontSquat",       label:"Front squat",         mvKey:"frontSquat",  reps:1,  range:"strength"},
  prStrictPress:    {profile:"strictPress",      label:"Strict press",        mvKey:"strictPress", reps:1,  range:"strength"},
  prPowerClean:     {profile:"powerClean",       label:"Power clean",         mvKey:"powerClean",  reps:1,  range:"strength"},
  prBackSquat5RM:   {profile:"backSquat5RM",     label:"Back Squat",          mvKey:"backSquat",   reps:5,  range:"strength"},
  prHipThrust8RM:   {profile:"hipThrust8RM",     label:"Hip thrust",          mvKey:"hipThrust",   reps:8,  range:"hypertrophy"},
  prBulgarianDB:    {profile:"bulgarianDb",      label:"Bulgarian split squat",mvKey:"bulgarian",   reps:8,  range:"hypertrophy"},
  prDbRdl:          {profile:"dbRdl",            label:"DB RDL",              mvKey:null,          reps:8,  range:"hypertrophy"},
  prRow8RM:         {profile:"row8RM",           label:"Barbell row",         mvKey:"barbellRow", reps:8,  range:"hypertrophy"},
  prChestRow8RM:    {profile:"chestRow8RM",      label:"Chest Supported Row", mvKey:"chestRow",   reps:8,  range:"hypertrophy"},
  prLatPulldown10RM:{profile:"latPulldown10RM", label:"Weighted Pull-up",    mvKey:"latPulldown",reps:10, range:"hypertrophy"},
  prInclineDb10RM:  {profile:"inclineDb10RM",    label:"Incline DB press",    mvKey:"inclineDb",  reps:10, range:"hypertrophy"}
};

function todayDateString(){return new Date().toLocaleDateString("fr-CA");}

function renderProfile(){
  Object.keys(PR_FIELD_MAP).forEach(function(id){
    var el=$(id), cfg=PR_FIELD_MAP[id];
    if(el)el.value=state.profile[cfg.profile]||"";
  });
  var d=$("prDate");if(d&&!d.value)d.value=todayDateString();
  var st=$("prStatus");if(st){st.textContent="";st.className="status-msg";}
}

// rpe par défaut à 10 (vrai PR/maximum déclaré). Un appel avec un rpe < 9
// (ex. recalibrage à partir d'un test sous-maximal RPE 7-8) ne doit jamais
// se faire passer pour un essai proche de l'échec : ça déclencherait le
// frein "RPE >= 9 = aucune hausse automatique", ni pour "watch"/"recalibrating"
// (statuts lus par le cap defensif de scripts/charge/suggestion.js comme "sous
// surveillance, ne pas depasser sans confirmation") — un test controle reussi
// est un succes normal ("success"), pas un echec a surveiller.
function updateMovementRefFromPR(cfg,load,dateStr,rpe){
  if(!cfg||!cfg.mvKey||!load)return;
  rpe=(rpe===undefined||rpe===null)?10:Number(rpe);
  var isPr=rpe>=9;
  var refK=cfg.mvKey+"__"+(cfg.range||repRange(cfg.reps));
  state.movementRefs[refK]={
    movement:cfg.mvKey,
    range:cfg.range||repRange(cfg.reps),
    load:load,
    reps:cfg.reps,
    date:dateStr,
    lastActual:load,
    status:isPr?"pr":"success",
    quality:"clean",
    rpe:rpe,
    note:isPr?"PR saisi manuellement":"Recalibrage saisi manuellement"
  };
}

function updateAthleteStateFromPR(cfg,load,dateStr,rpe){
  if(!cfg||!load)return;
  rpe=(rpe===undefined||rpe===null)?10:Number(rpe);
  var isPr=rpe>=9;
  var status=isPr?"pr":"success";
  var source=isPr?"manual_pr":"manual_recalibration";
  var ast=ensureAthleteState();
  var label=cfg.label;
  var range=cfg.range||repRange(cfg.reps);
  var oneRM=epley1RM(load,cfg.reps);
  if(!ast.movements[label]){
    ast.movements[label]={ranges:{},history:[],lastUpdated:null,status:"new"};
  }
  var mv=ast.movements[label];
  mv.ranges=mv.ranges||{};mv.history=mv.history||[];
  mv.ranges[range]={
    currentLoad:load,
    currentReps:cfg.reps,
    actualLoad:load,
    actualReps:cfg.reps,
    rpe:rpe,
    confidence:isPr?0.90:0.65,
    status:status,
    estimated1RM:Math.round(oneRM),
    lastUpdated:dateStr,
    planned:{source:source}
  };
  mv.status=status;
  mv.upgradedAt=dateStr;
  mv.lastUpdated=dateStr;
  mv.history.push({date:dateStr,load:load,reps:cfg.reps,rpe:rpe,range:range,status:status,capacityLoad:load,planned:{source:source}});
  if(mv.history.length>12)mv.history=mv.history.slice(-12);
  ast.updatedAt=nowIso();ast.version=APP_VERSION;
}

function normalizePrCompareName(s){
  return String(s||"").toLowerCase()
    .replace(/^[a-z][0-9]?\.\s*/i,"")
    .replace(/technique|l[eé]ger|lourd|strict|contr[oô]l[eé]|c[aâ]ble bas|halt[eè]res|machine|\/|\(|\)/ig," ")
    .replace(/[^a-z0-9à-ÿ]+/g," ")
    .trim();
}
function prCfgMatchesResult(cfg,key){
  if(!cfg||!key)return false;
  var raw=String(key||"");
  var clean=chargeKeyFromName(raw);
  var a=normalizePrCompareName(clean);
  var label=normalizePrCompareName(cfg.label);
  if(a===label)return true;
  if(cfg.mvKey){
    if(clean===cfg.mvKey||raw===cfg.mvKey)return true;
    if(movements&&movements[cfg.mvKey]){
      var mvName=normalizePrCompareName(movements[cfg.mvKey].name);
      if(a===mvName)return true;
    }
  }
  // Correspondances pratiques pour les noms composés du programme.
  if(cfg.label==="Incline DB press" && /incline.*db.*press/i.test(clean))return true;
  if(cfg.label==="Chest Supported Row" && /chest.*supported.*row/i.test(clean))return true;
  if(cfg.label==="Weighted Pull-up" && /(weighted.*pull|pull.*up|ring row)/i.test(clean))return true;
  if(cfg.label==="Back Squat" && /back.*squat/i.test(clean))return true;
  if(cfg.label==="Front squat" && /front.*squat/i.test(clean))return true;
  if(cfg.label==="Hip thrust" && /hip.*thrust/i.test(clean))return true;
  if(cfg.label==="DB RDL" && /(db.*rdl|romanian)/i.test(clean))return true;
  if(cfg.label==="Bulgarian split squat" && /bulgarian/i.test(clean))return true;
  if(cfg.label==="Power clean" && /power.*clean/i.test(clean))return true;
  if(cfg.label==="Strict press" && /strict.*press/i.test(clean))return true;
  if(cfg.label==="Bench press" && /^bench press$/i.test(clean))return true;
  return false;
}
function detectAndApplyAutomaticPr(results,dateStr){
  var updates=[];
  dateStr=dateStr||todayDateString();
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod)return;
    var load=parseLoad(r.load), reps=Number(r.reps)||0;
    if(!load||!reps)return;
    Object.keys(PR_FIELD_MAP).forEach(function(id){
      var cfg=PR_FIELD_MAP[id];
      if(!cfg||!prCfgMatchesResult(cfg,key))return;
      var old=Number(state.profile[cfg.profile])||0;
      // Un 5RM/8RM/10RM automatique exige au moins le nombre de reps du PR enregistré.
      if(reps < Number(cfg.reps||1))return;
      if(load <= old)return;
      state.profile[cfg.profile]=load;
      updateMovementRefFromPR(cfg,load,dateStr);
      updateAthleteStateFromPR(cfg,load,dateStr);
      r.autoPr=true;
      r.prLabel=cfg.label;
      r.prOld=old||null;
      r.prNew=load;
      r.prReps=cfg.reps;
      r.note=(r.note?r.note+" · ":"")+"PR automatique détecté";
      updates.push({label:cfg.label,old:old||null,new:load,reps:cfg.reps,key:key});
    });
  });
  return updates;
}

async function savePrProfile(){
  var dateStr=($("prDate")&&$("prDate").value)||todayDateString();
  var changed={}, results={};
  Object.keys(PR_FIELD_MAP).forEach(function(id){
    var el=$(id), cfg=PR_FIELD_MAP[id];
    if(!el)return;
    var val=parseLoad(el.value);
    if(!val)return;
    var old=Number(state.profile[cfg.profile])||0;
    if(val!==old){
      state.profile[cfg.profile]=val;
      changed[cfg.label]={old:old||null,new:val,reps:cfg.reps};
      results[cfg.label]={load:String(val),reps:String(cfg.reps),rpe:"10",note:"PR saisi manuellement",status:"pr"};
      updateMovementRefFromPR(cfg,val,dateStr);
      updateAthleteStateFromPR(cfg,val,dateStr);
    }
  });
  var st=$("prStatus");
  if(!Object.keys(changed).length){
    if(st){st.textContent="Aucun PR modifié.";st.className="status-msg";}
    return;
  }
  var entry={
    uid:"pr_"+dateStr+"_"+Date.now(),
    type:"pr_update",
    date:dateStr,
    time:new Date().toLocaleTimeString("fr-CA"),
    semaine:state.week,
    jour:state.day,
    week:state.week,
    day:state.day,
    cycle:state.cycle&&state.cycle.goal?state.cycle.goal:null,
    focus:"PR / Records personnels",
    resultats:results,
    results:results,
    changes:changed,
    version:APP_VERSION
  };
  state.history.push(entry);
  save();
  renderReferences();
  renderHistory();

  var msg="✅ PR sauvegardés localement et inscrits dans l’historique.";
  if(st){st.textContent=msg;st.className="status-msg ok";}
}

// ─── Charges ─────────────────────────────────────────────────────────────────

// "Charges ajustables" peut rester sans effet une fois qu'un mouvement a un
// historique réel : les vraies séances ont priorité sur le seed du programme,
// par design (voir scripts/charge/suggestion.js). Pour corriger un poids de
// départ sous-estimé, on insère donc ici une entrée "success" à RPE 8 dans
// athlete_state — même mécanisme que le recalibrage de profil (rpe<9, statut
// non bloquant) : le moteur l'utilise tout de suite comme nouvelle référence,
// mais une vraie séance reste nécessaire pour progresser plus haut. Si le
// mouvement n'a pas encore d'historique, rien à corriger : le seed du
// programme est déjà la valeur utilisée par le moteur.
//
// Deux gardes :
// - on ne touche que le range le plus récemment actif, pas tous les ranges du
//   mouvement d'un coup (ex. capacité "strength" et "hypertrophy" distinctes
//   pour un même mouvement : ce ne sont pas la même charge) ;
// - on n'applique rien si canonicalMovementLabel() fait correspondre la clé
//   "charges ajustables" à un AUTRE mouvement (ex. "Hang Power Clean" se
//   résout en "Power Clean", le lift principal) : on écraserait sinon la
//   capacité d'un mouvement différent avec la charge d'une variante.
function applyChargeOverrideToAthleteState(key,loadNum,dateStr){
  if(!key||!(loadNum||loadNum===0))return;
  var label=canonicalMovementLabel(key);
  if(coachNormalizeMoveText(label)!==coachNormalizeMoveText(chargeKeyFromName(key)))return;
  var ast=ensureAthleteState();
  var mv=ast.movements[label];
  if(!mv||!mv.ranges)return;
  var ranges=Object.keys(mv.ranges);
  if(!ranges.length)return;
  var range=ranges[0];
  ranges.forEach(function(r){
    var a=(mv.ranges[r]||{}).lastUpdated, b=(mv.ranges[range]||{}).lastUpdated;
    if(a&&(!b||a>b))range=r;
  });
  var prev=mv.ranges[range]||{};
  if(Number(prev.currentLoad||0)===loadNum)return;
  var reps=Number(prev.currentReps||prev.actualReps)||8;
  mv.ranges[range]={
    currentLoad:loadNum,
    currentReps:reps,
    actualLoad:loadNum,
    actualReps:reps,
    rpe:8,
    confidence:0.65,
    status:"success",
    estimated1RM:Math.round(epley1RM(loadNum,reps)),
    lastUpdated:dateStr,
    planned:{source:"manual_charge_override"}
  };
  mv.history=mv.history||[];
  mv.history.push({date:dateStr,load:loadNum,reps:reps,rpe:8,range:range,status:"success",capacityLoad:loadNum,planned:{source:"manual_charge_override"}});
  if(mv.history.length>12)mv.history=mv.history.slice(-12);
  mv.status="success";
  mv.lastUpdated=dateStr;
  ast.updatedAt=nowIso();ast.version=APP_VERSION;
}

function renderChargeSettings(){
  var c=$("chargeSettingsList");if(!c)return;c.innerHTML="";
  chargeList().forEach(function(key){
    var div=document.createElement("div");div.className="charge-row";
    var val=(customCharges[key]!==undefined)?customCharges[key]:"";
    var official=officialCharges()[key]||"—";
    div.innerHTML='<label>'+key+'<br><small style="font-weight:400;color:var(--muted)">Base: '+official+'</small></label><input class="charge-input" data-charge-key="'+key+'" type="text" value="'+String(val).replace(/"/g,"&quot;")+'" placeholder="'+String(official).replace(/"/g,"&quot;")+'" />';
    c.appendChild(div);
  });
  Array.prototype.forEach.call(c.querySelectorAll("input[data-charge-key]"),function(inp){
    inp.addEventListener("change",function(){
      var key=inp.getAttribute("data-charge-key"),val=inp.value.trim();
      if(val){
        customCharges[key]=val;
        var loadNum=parseLoad(val);
        if(loadNum||loadNum===0)applyChargeOverrideToAthleteState(key,loadNum,todayDateString());
      }else{
        delete customCharges[key];
      }
      saveCustomCharges();save();renderWorkout();
      if($("phoneView")&&$("phoneView").classList.contains("view-active"))renderPhoneWod();
    });
  });
}
function resetCustomCharges(){if(confirm("Réinitialiser les charges personnalisées?")){customCharges={};saveCustomCharges();renderChargeSettings();renderWorkout();}}

// ─── Paramètres locaux ──────────────────────────────────────────────────────

function renderSettings(){
  if(window.CoachOnboarding && CoachOnboarding.renderSettingsPanel)CoachOnboarding.renderSettingsPanel();
  renderChargeSettings();
  if(typeof renderChargeDiagnosticPanel==="function")renderChargeDiagnosticPanel();
}
function setupSettingsSave(){
  // V1 multi-utilisateur : plus de token GitHub. Le panneau profil/agressivité
  // est entièrement géré par scripts/profiles/ui.js (CoachOnboarding.bindSettingsPanel).
  if(window.CoachOnboarding && CoachOnboarding.bindSettingsPanel)CoachOnboarding.bindSettingsPanel();
}

// ─── Export texte ─────────────────────────────────────────────────────────────

function stableIphoneText(day,week){
  day=day||state.day;week=week||state.week;
  var w=buildWorkout(day,week);
  var txt=w.day.label.toUpperCase()+" - "+w.day.base.toUpperCase()+" - SEMAINE "+week+"\nFocus: "+focus().label+"\n"+dayIntention(day)+"\n\n";
  w.blocks.forEach(function(b){
    txt+=b.title.toUpperCase()+" ("+b.time+")\n";
    if(b.exercises&&b.exercises.length){if(b.text)txt+=cleanLine(displayChargeText(b.text))+"\n";b.exercises.forEach(function(e){var smartLoad=CoachCharge.suggestLoad(e.name,e.load,(parseTargetReps(e.format,10).min||parseTargetReps(e.format,10).max),{kind:b.kind,blockTitle:b.title,note:e.note,text:b.text,format:e.format,day:state.day,week:state.week});txt+=e.name+"\nFormat: "+e.format+"\nPoids: "+smartLoad+"\nRepos: "+e.rest+"\n"+(e.note?"Note: "+e.note+"\n":"")+"\n";});}
    else if(b.progress&&b.progress.length){b.progress.forEach(function(mvKey,j){var reps=targetReps(j,b.kind),load=lb(suggestLoad(mvKey,progressionPct(j),reps));txt+=movements[mvKey].name+"\nFormat: "+setScheme(b.kind,j)+"\nPoids: "+load+"\nRepos: "+restFor(b.kind)+"\n\n";});}
    else{txt+=cleanLine(displayChargeText(b.text||""))+"\n\n";}
  });
  return txt;
}
function weekText(){var txt="SEMAINE "+state.week+" - "+focus().label+"\n\n";currentDayOrder().forEach(function(d){txt+=stableIphoneText(d,state.week)+"\n---\n\n";});return txt;}

function download(name,text){
  var type=name.endsWith(".json")?"application/json;charset=utf-8":"text/plain;charset=utf-8";
  var blob=new Blob([text],{type:type}),url=URL.createObjectURL(blob);
  var a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function exportBackup(){
  var v=String(APP_VERSION||"backup").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
  download("racine-"+v+"-profil.json",JSON.stringify({version:APP_VERSION,exportedAt:new Date().toISOString(),state:state},null,2));
}
function importBackup(file){
  if(!file)return;
  var r=new FileReader();
  r.onload=function(e){try{var d=JSON.parse(e.target.result);if(d.state){state=Object.assign(state,d.state);save();render();alert("Import réussi.");}}catch(ex){if(window.CoachLog)CoachLog.error("backup_import_invalid", ex, {});alert("Fichier invalide.");}};
  r.readAsText(file);
}

// ─── Navigation principale ────────────────────────────────────────────────────
// V50.57 : switchView() et la liste des vues sont extraits dans scripts/app_navigation.js.

// ─── Binding ─────────────────────────────────────────────────────────────────

function bind(){
  [["trainingTab","training"],["phoneTab","phone"],["profileTab","profile"],["referencesTab","references"],["cycleTab","cycle"],["historyTab","history"],["settingsTab","settings"]].forEach(function(pair){
    var t=$(pair[0]);if(t)t.onclick=function(){switchView(pair[1]);};
  });
  var pvb=$("phoneViewBtn");if(pvb)pvb.onclick=function(){switchView("phone");};
  var btb=$("backTrainingBtn");if(btb)btb.onclick=function(){switchView("training");};
  var fs=$("fullscreenBtn");if(fs)fs.onclick=function(){var el=document.documentElement,fn=el.requestFullscreen||el.webkitRequestFullscreen;if(fn)try{fn.call(el);}catch(e){}};
  var smb=$("sessionModeBtn");if(smb)smb.onclick=function(){CoachSession.openFrom("phone");};
  var wl=$("wakeLockBtn");if(wl)wl.onclick=function(){if(wakeLockWanted||wakeLock)releaseWakeLock();else requestWakeLock();};
  var wpl=$("wodPlusWakeBtn");if(wpl)wpl.onclick=function(){if(wakeLockWanted||wakeLock)releaseWakeLock();else requestWakeLock();};
  var wpt=$("wodPlusTmsBtn");if(wpt)wpt.onclick=function(){
    if(typeof window.openCoachBeurtTmsChoice==="function"){
      window.openCoachBeurtTmsChoice({fromWodPlus:true});
    }else{
      alert("TMS pas encore chargé. Recharge la page.");
    }
  };
  var cp=$("copyPhoneBtn");if(cp)cp.onclick=function(){navigator.clipboard.writeText(stableIphoneText()).then(function(){alert("Copié.");}).catch(function(){alert("Copie bloquée.");});};
  var sd=$("syncStatusDot");if(sd)sd.onclick=openSyncSettings;
  // Mini bouton switch profil — visible seulement si 2+ profils onboardés
  (function(){
    var dot = $("profileSwitchDot");
    if(!dot) return;
    var profiles = window.CoachProfiles ? CoachProfiles.list().filter(function(p){ return p.onboarded; }) : [];
    if(profiles.length > 1){
      dot.style.display = "";
      dot.onclick = function(){
        if(window.CoachOnboarding && CoachOnboarding.openPicker) CoachOnboarding.openPicker();
      };
    }
  })();
  var sc=$("saveCycleBtn");if(sc)sc.onclick=saveCycle;
  var nc=$("newCycleBtn");if(nc)nc.onclick=newCycle;
  var spr=$("savePrBtn");if(spr)spr.onclick=savePrProfile;
  var cg=$("cycleGoal");if(cg)cg.onchange=function(){resetPreviewPosition(cg.value);var csi=$("cycleStartDateInput");if(csi)csi.value=todayIsoDate();renderCycle();};
  var cst=$("cycleStartTodayBtn");if(cst)cst.onclick=function(){var i=$("cycleStartDateInput");if(i)i.value=todayIsoDate();};
  var csm=$("cycleStartMondayBtn");if(csm)csm.onclick=function(){var i=$("cycleStartDateInput");if(i)i.value=mondayOfCurrentWeekIso();};
  var csa=$("applyCycleStartDateBtn");if(csa)csa.onclick=function(){var i=$("cycleStartDateInput"), val=(i&&i.value)||todayIsoDate();if(applyCycleStartDate(val,{setDayFromToday:true,resetWeekTracking:true})){save();render();renderCycle();}};
  var eh=$("exportHistoryBtn");if(eh)eh.onclick=function(){download("racine-historique.txt","Historique "+APP_VERSION+"\n\n"+JSON.stringify(state.history,null,2));};
  var rh=$("resetHistoryBtn");if(rh)rh.onclick=function(){if(confirm("Effacer tout l'historique ? Le moteur de charge oubliera aussi les references apprises (athleteState, RPE) pour repartir a zero.")){state.history=[];rebuildRefsFromHistory();save();renderHistory();renderWorkout();renderReferences();renderWeekProgress();}};
  var rcb=$("resetCustomChargesBtn");if(rcb)rcb.onclick=resetCustomCharges;
  var ebb=$("exportBackupBtn");if(ebb)ebb.onclick=exportBackup;
  var ibf=$("importBackupFile");if(ibf)ibf.onchange=function(e){importBackup(e.target.files[0]);};
  var ewb=$("exportWeekBtn");if(ewb)ewb.onclick=function(){download("racine-semaine.txt",weekText());};
  var ebb2=$("exportBackupBtnSettings");if(ebb2)ebb2.onclick=exportBackup;
  var ibf2=$("importBackupFileSettings");if(ibf2)ibf2.onchange=function(e){importBackup(e.target.files[0]);};
  var ewb2=$("exportWeekBtnSettings");if(ewb2)ewb2.onclick=function(){download("racine-semaine.txt",weekText());};
  var cel=$("copyErrorLogBtn");
  if(cel)cel.onclick=function(){
    var status=$("errorLogStatus");
    if(!window.CoachLog){if(status)status.textContent="Logger non chargé.";return;}
    CoachLog.copyReport().then(function(){
      if(status)status.textContent="Rapport erreurs copié ("+CoachLog.count()+" entrée(s)).";
    }).catch(function(){
      try{download("racine-erreurs.txt",CoachLog.getReport()); if(status)status.textContent="Copie bloquée · fichier rapport téléchargé.";}
      catch(e){if(status)status.textContent="Impossible de copier/exporter le rapport.";}
    });
  };
  var clr=$("clearErrorLogBtn");
  if(clr)clr.onclick=function(){
    if(!window.CoachLog)return;
    if(confirm("Effacer le journal d’erreurs local?")){
      CoachLog.clear();
      var status=$("errorLogStatus");if(status)status.textContent="Journal d’erreurs effacé.";
    }
  };
  if(typeof setupChargeDiagnosticBindings==="function")setupChargeDiagnosticBindings();
}

function render(){ensureCurrentDay();renderWeeks();renderDays();renderWorkout();renderSyncStatusIndicator();}



// ─── Init ─────────────────────────────────────────────────────────────────────
// V1 multi-utilisateur : tout le boot principal est regroupé dans une fonction
// rappelable, pour pouvoir redémarrer proprement après création/changement de profil.

function coachFullBoot(){
  load();
  if(!focusConfigs[state.cycle.goal]){state.missingCycle={id:state.cycle.goal,date:nowIso()};state.cycle.goal=defaultProgramId();}
  if(!state.activeCycleStartDate)state.activeCycleStartDate=cycleStartDateForActive();
  ensureCurrentDay();
  loadCustomCharges();
  bind();
  setupHamburger();
  setupSwipeNav();
  setupRestBar();
  setupSettingsSave();
  CoachSession.setupSave();
  if(!window.__racineClockStarted){window.__racineClockStarted=true;startGlobalClock();}
  render();
  switchView("training");
}
window.coachFullBoot = coachFullBoot;

if(window.CoachProfiles && CoachProfiles.hasActiveOnboardedProfile()){
  coachFullBoot();
} else if(window.CoachOnboarding){
  // Toujours afficher le picker d'abord — il contient le bouton PIN admin.
  // Le picker a le bouton "+ Nouveau profil" qui lance l'onboarding.
  if(CoachOnboarding.openPicker) CoachOnboarding.openPicker();
  else if(CoachOnboarding.start) CoachOnboarding.start();
} else {
  // Filet de sécurité si le module profils n'a pas chargé.
  coachFullBoot();
}

if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("service-worker.js").catch(function(e){if(window.CoachLog)CoachLog.warn("service_worker_register_failed", {message:e&&e.message?e.message:String(e)});});});}

// V50.51 : l’ancien mode iPhone devient la vue PC / inspection. IDs conservés pour éviter de casser le tronc.


// V50.51 : PC placé près de la gear. Aucun bouton PC dans WOD+.


// V50.51 : ménage structurel conservateur. Les IDs phone* sont conservés comme compatibilité interne de la vue PC.
