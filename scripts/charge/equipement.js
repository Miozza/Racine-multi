// @ts-check
// Coach Beurt V51.63 — extraction prudente moteur de charges.
// Script global volontaire : pas de ES modules, pas de changement de comportement.

function defaultEquipmentLoadRules(){
  return {
    // Seule famille en kg de l'app (convention : KB = kg, tout le reste = lb).
    // Un mouvement nommé KB est traité en kg même sans unité dans le texte
    // (l'étape de scaling arrondit sans le texte de charge) ; seul un « lb »
    // explicite le fait retomber sur le comportement lb historique.
    kettlebell: {
      match:["kb ","kettlebell"],
      unit:"kg",
      available:[4,8,10,12,16,18,24,28,32]
    },
    cable: {
      match:["câble","cable","poulie","rope","face pull","triceps pushdown","triceps rope","lat pulldown","upright row"],
      step:10
    },
    band: {
      match:["élastique","elastique","band"],
      available:["petit","moyen","large","très large"]
    },
    dumbbell: {
      match:["haltère","haltères","haltere","halteres","dumbbell","db ","db-","lateral raise","rear delt fly","bulgarian","farmer carry","db rdl","db snatch","shoulder press"],
      available:[2.5,5,8,10,12.5,15,17.5,20,22.5,25,30,35,40,45,50,55,60,65,70,75,85]
    },
    barbell: {
      match:["barbell","bench","squat","strict press","push press","deadlift","clean","row","hip thrust"],
      step:5,
      // Poids de la barre vide : le plancher physique de la famille. Une barre
      // ne descend pas en dessous, quel que soit le qualificatif ecrit.
      barWeight:45
    }
  };
}

function effectiveEquipmentLoadRules(){
  var rules=window.EQUIPMENT_LOAD_RULES;
  if(rules&&Object.keys(rules).length)return rules;
  return defaultEquipmentLoadRules();
}

function normalizeChargeText(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}

function equipmentRuleForExercise(nameOrKey, loadText){
  var rules=effectiveEquipmentLoadRules();
  var text=normalizeChargeText((nameOrKey||"")+" "+(loadText||""));
  function has(rule){return (rule&&rule.match||[]).some(function(x){return text.indexOf(normalizeChargeText(x))!==-1;});}
  // Kettlebells : testés AVANT le court-circuit kg pour que les charges KB
  // s'arrondissent aux vraies tailles du rack (16 kg) au lieu de l'arrondi
  // générique aux 5 (15 kg, un bell qui n'existe pas). Un mouvement nommé KB
  // sans unité est kg par convention ; « lb » explicite = comportement lb.
  if(has(rules.kettlebell) && !/\blb\b/.test(text))return rules.kettlebell;
  if(/\bkg\b/.test(text))return null;
  if(has(rules.cable))return rules.cable;
  if(has(rules.band))return rules.band;
  if(has(rules.dumbbell))return rules.dumbbell;
  if(has(rules.barbell))return rules.barbell;
  return null;
}

// ── Le qualificatif ECRIT est une consigne, pas une decoration ─────────────
// « bande ou cable leger », « bande legere », « 15-25 lb total » : quand le
// programme n'ecrit pas un nombre, il ecrit quand meme quelque chose. Rien ne
// le lisait. Le moteur retombait alors sur la derniere charge loggee — ou, a
// defaut, sur un repere generique multiplie par le ratio de l'athlete — et
// proposait 70 lb pour un Pallof Press decrit comme leger.
//
// Le plafond vient de l'EQUIPEMENT ECRIT, jamais du profil de l'athlete : un
// athlete fort ne rend pas une bande plus lourde. Les valeurs sont derivees de
// RACINE_EQUIPMENT — le bas de la pile reellement disponible — et non ecrites
// a la main : un nombre invente ici serait le « leger » du createur.
function coachWrittenLoadIsLight(loadText, note){
  var t=normalizeChargeText(String(loadText||"")+" "+String(note||""));
  return /\bleger\b|\blegere\b|\blight\b|\bfacile\b/.test(t);
}

// Repere bas d'une famille d'equipement. Pour une liste de tailles reelles :
// le premier tiers du rack. Pour un equipement a pas constant (cable) :
// quatre crans, soit la premiere zone utile de la pile.
function coachLightCeilingForEquipment(rule){
  if(!rule)return null;
  if(Array.isArray(rule.available)&&rule.available.length){
    var nums=rule.available.filter(function(v){return typeof v==='number'&&v>0;});
    if(!nums.length)return null; // bandes : aucune valeur numerique, rien a plafonner
    var idx=Math.max(0,Math.floor((nums.length-1)/3));
    return nums[idx];
  }
  if(!(rule.step>0))return null;
  var ceiling=rule.step*4;
  // Un plafond ne descend jamais sous le materiel lui-meme. Une « barre
  // legere » reste une barre : quatre crans de 5 lb donnaient 20 lb, un poids
  // qui n'existe pas — la barre vide en pese deja 45.
  var bar=Number(rule.barWeight)||0;
  if(!bar){
    var floors=(typeof window!=='undefined'&&window.RACINE_EQUIPMENT)?window.RACINE_EQUIPMENT:null;
    var rules=effectiveEquipmentLoadRules();
    if(rules&&rule===rules.barbell&&floors&&floors.barbells&&Array.isArray(floors.barbells.values)&&floors.barbells.values.length){
      bar=Math.min.apply(Math, floors.barbells.values);
    }
  }
  if(bar>0)ceiling=Math.max(ceiling, bar);
  return ceiling;
}

// Plafond ecrit pour un mouvement, ou null quand le texte ne dit rien d'utile.
function coachWrittenLoadCeiling(nameOrKey, loadText, note){
  if(!coachWrittenLoadIsLight(loadText, note))return null;
  var rule=equipmentRuleForExercise(nameOrKey, loadText);
  var ceiling=coachLightCeilingForEquipment(rule);
  return (ceiling>0)?ceiling:null;
}

function roundToStep(n, step, mode){
  n=Number(n)||0;step=Number(step)||5;if(n<=0)return 0;
  if(mode==="down")return Math.floor(n/step)*step;
  if(mode==="up")return Math.ceil(n/step)*step;
  return Math.round(n/step)*step;
}

function roundToAvailableList(n, list, mode){
  n=Number(n)||0;if(n<=0)return 0;if(!Array.isArray(list)||!list.length)return round5(n);
  var sorted=list.map(Number).filter(function(x){return !isNaN(x);}).sort(function(a,b){return a-b;});
  if(!sorted.length)return round5(n);
  if(mode==="down"){
    for(var d=sorted.length-1;d>=0;d--){if(sorted[d]<=n)return sorted[d];}
    return sorted[0];
  }
  if(mode==="up"){
    for(var u=0;u<sorted.length;u++){if(sorted[u]>=n)return sorted[u];}
    return sorted[sorted.length-1];
  }
  var best=sorted[0], bestDiff=Math.abs(n-best);
  sorted.forEach(function(v){var diff=Math.abs(n-v);if(diff<bestDiff||(diff===bestDiff&&v>best)){best=v;bestDiff=diff;}});
  return best;
}

function roundLoadForExercise(nameOrKey, n, mode, loadText){
  if(n===0)return 0;if(!n||isNaN(n))return null;
  var rule=equipmentRuleForExercise(nameOrKey, loadText);
  if(rule&&Array.isArray(rule.available)){
    var numericList=rule.available.map(Number).filter(function(x){return !isNaN(x);});
    if(numericList.length)return roundToAvailableList(n, numericList, mode||"nearest");
    return n;
  }
  if(rule&&rule.step)return roundToStep(n, rule.step, mode||"nearest");
  return round5(n);
}

function lbForExercise(nameOrKey, n, mode, loadText){
  var r=roundLoadForExercise(nameOrKey,n,mode,loadText);return(r===0||r)?r+" lb":"—";
}

function displayLoadForEquipment(nameOrKey, loadText){
  var raw=String(loadText||"").trim();
  var n=parseLoad(raw);
  if(n===null||n===undefined)return raw;
  var rule=equipmentRuleForExercise(nameOrKey, raw);
  if(!rule)return raw;
  var rounded=roundLoadForExercise(nameOrKey, n, "nearest", raw);
  if(rounded===null||rounded===undefined)return raw;
  if(Number(rounded)!==Number(n))return rounded+" lb";
  return raw;
}

function nextLoadForExercise(nameOrKey, current, direction, loadText){
  var n=Number(current)||0;var dir=direction<0?-1:1;
  var rule=equipmentRuleForExercise(nameOrKey, loadText);
  if(rule&&Array.isArray(rule.available)){
    var list=rule.available.map(Number).filter(function(x){return !isNaN(x);}).sort(function(a,b){return a-b;});
    if(!list.length)return n;
    if(dir>0){for(var i=0;i<list.length;i++){if(list[i]>n)return list[i];}return list[list.length-1];}
    for(var j=list.length-1;j>=0;j--){if(list[j]<n)return list[j];}return 0;
  }
  var step=(rule&&rule.step)?Number(rule.step):5;
  if(dir>0)return Math.max(0, (Math.floor(n/step)*step)+step);
  return Math.max(0, (Math.ceil(n/step)*step)-step);
}

function equipmentStepLabelForExercise(nameOrKey, loadText){
  var rule=equipmentRuleForExercise(nameOrKey, loadText);
  if(!rule)return "arrondi 5 lb";
  if(Array.isArray(rule.available)){
    var hasNumeric=rule.available.some(function(x){return !isNaN(Number(x));});
    if(hasNumeric)return "charges disponibles: "+rule.available.join(", ")+" "+(rule.unit||"lb");
    return "tailles disponibles: "+rule.available.join(" → ");
  }
  return "incréments de "+rule.step+" lb";
}
