// Coach Beurt V51.63 — extraction prudente moteur de charges.
// Script global volontaire : pas de ES modules, pas de changement de comportement.

function normalizeExerciseName(name){return chargeKeyFromName(name).toLowerCase().replace(/[^a-z0-9à-ÿ]+/g," ").trim();}

function coachNormalizeMoveText(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}

function coachMovementEquipmentFamily(nameOrKey){
  var n=coachNormalizeMoveText(chargeKeyFromName(nameOrKey||''));
  if(!n)return '';
  if(/cable|poulie|rope|face pull|pushdown/.test(n))return 'cable';
  if(/machine/.test(n))return 'machine';
  if(/haltere|halteres|dumbbell|db|bulgarian|db rdl|db reverse lunge|farmer carry/.test(n))return 'db';
  if(/landmine/.test(n))return 'landmine';
  if(/ring row|pull up|pullup|poids du corps|bodyweight/.test(n))return 'bodyweight';
  if(/barbell|barre|bench|squat|strict press|push press|deadlift|power clean|clean/.test(n))return 'barbell';
  return '';
}

function coachEquipmentCompatibleForAlias(a,b){
  var fa=coachMovementEquipmentFamily(a), fb=coachMovementEquipmentFamily(b);
  return !fa||!fb||fa===fb;
}

function canonicalMovementLabel(nameOrKey){
  var raw=chargeKeyFromName(nameOrKey||"");
  var n=coachNormalizeMoveText(raw);
  if(!n)return "Mouvement";
  // Séparer les mouvements ambigus : aucun mapping partiel entre deux options.
  if(n.indexOf("weighted pull up ring row lourd")>=0 || n.indexOf("weighted pull up ring row")>=0)return "Weighted Pull-up / Ring Row lourd";
  if(n.indexOf("ring row lourd")>=0)return "Ring Row lourd";
  if(n.indexOf("ring row strict")>=0 || n.indexOf("ring rows strict")>=0)return "Ring Row";
  if(n.indexOf("pull up technique")>=0)return "Pull-Up";
  if(n.indexOf("pull up")>=0 && n.indexOf("weighted")<0 && n.indexOf("chest to bar")<0)return "Pull-Up";
  if(n.indexOf("hanging knee raise progression")>=0 || n.indexOf("hanging knee raise")>=0 || n.indexOf("knee raise progression")>=0)return "Knee Raise";
  if(n.indexOf("knee raise")>=0)return "Knee Raise";
  if(n.indexOf("weighted pull up")>=0)return "Weighted Pull-up";
  if(n.indexOf("db shoulder press landmine press")>=0)return "DB Shoulder Press";
  if(n.indexOf("landmine press")>=0)return "Landmine Press";
  if(n.indexOf("db shoulder press")>=0)return "DB Shoulder Press";
  if(n.indexOf("power clean technique")>=0 || n.indexOf("clean technique")>=0)return "Power Clean technique";
  if(n.indexOf("power clean wod")>=0)return "Power Clean WOD";
  if(n.indexOf("power clean")>=0)return "Power Clean";
  if(n.indexOf("overhead rope extension rappel vendredi")>=0)return "Overhead Rope Extension";
  if(n.indexOf("overhead rope extension")>=0)return "Overhead Rope Extension";
  if(n.indexOf("strict press")>=0)return "Strict Press";
  if(n.indexOf("barbell row")>=0)return "Barbell Row";
  if(n.indexOf("face pull")>=0)return "Face Pull";
  if(n.indexOf("cable curl")>=0)return "Cable Curl";
  if(n.indexOf("rear delt fly cable bas")>=0 || n.indexOf("rear delt fly cable")>=0)return "Rear Delt Fly câble";
  if(n.indexOf("rear delt fly db")>=0 || n.indexOf("rear delt fly halteres")>=0)return "Rear Delt Fly DB";
  if(n.indexOf("rear delt fly machine")>=0)return "Rear Delt Fly machine";
  if(n.indexOf("rear delt fly")>=0)return "Rear Delt Fly";
  if(n.indexOf("lateral raise cable bas")>=0 || n.indexOf("lateral raise cable")>=0)return "Lateral Raise câble";
  if(n.indexOf("lateral raise db")>=0 || n.indexOf("lateral raise halteres")>=0)return "Lateral Raise DB";
  if(n.indexOf("lateral raise machine")>=0)return "Lateral Raise machine";
  if(n.indexOf("lateral raise")>=0)return "Lateral Raise";
  if(n.indexOf("trap 3 raise")>=0)return "Trap-3 Raise";
  if(n.indexOf("cable band hip abduction")>=0 || n.indexOf("cable band abduction")>=0 || n.indexOf("cable ou band hip abduction")>=0 || n.indexOf("cable hip abduction")>=0)return "Cable Hip Abduction";
  if(n.indexOf("db reverse lunge ou step up")>=0 || n.indexOf("db reverse lunge")>=0)return "DB Reverse Lunge";
  if(n.indexOf("db rdl ou barbell rdl")>=0 || n.indexOf("db rdl")>=0)return "DB RDL";
  if(n.indexOf("bulgarian split squat")>=0)return "Bulgarian Split Squat";
  if(n.indexOf("hip thrust leger")>=0 || n.indexOf("hip thrust pump")>=0 || n.indexOf("hip thrust tempo")>=0)return "Hip Thrust";
  if(n.indexOf("hip thrust")>=0)return "Hip Thrust";
  if(n.indexOf("front squat")>=0)return "Front Squat";
  var mvKey=(typeof resolveMovementKey==='function')?resolveMovementKey(raw):null;
  if(mvKey&&movements[mvKey])return movements[mvKey].name;
  return raw;
}

function athleteMoveId(nameOrKey){return canonicalMovementLabel(nameOrKey);}

function movementLabelFromKeyOrName(key){return canonicalMovementLabel(key);}

function coachMovementLookupLabels(nameOrKey){
  var raw=chargeKeyFromName(nameOrKey||"");
  var canonical=canonicalMovementLabel(raw);
  var n=coachNormalizeMoveText(raw+" "+canonical);
  var list=[];
  function add(x){x=String(x||"").trim();if(x&&list.indexOf(x)===-1)list.push(x);}
  add(canonical);add(raw);
  // V51.34 : les noms de mouvements affichés restent simples, mais les anciens noms
  // avec préfixe de sous-bloc ou intention restent lisibles pour préserver l’historique.
  ["A1. ","A2. ","B1. ","B2. ","B3. ","C1. ","C2. ","C3. ","D1. ","D2. "].forEach(function(prefix){
    add(prefix+canonical);
    if(raw && raw!==canonical)add(prefix+raw);
  });

  // Aliases officiels anti-régression : prudents par équipement.
  // Règle V51.30 : DB ≠ câble ≠ machine ≠ barre ≠ poids du corps.
  // Un alias peut rapprocher des noms seulement si la logique de charge est compatible.
  if(/db shoulder press landmine press/.test(n)){
    add("DB Shoulder Press / Landmine Press");
  }else if(/db shoulder press/.test(n)){
    add("DB Shoulder Press");
    add("DB Shoulder Press / Landmine Press"); // ancien nom ambigu conservé pour transition historique, pas pour Landmine Press.
  }else if(/landmine press/.test(n)){
    add("Landmine Press");
  }
  if(/overhead rope extension/.test(n)){
    add("Overhead Rope Extension");
    add("Overhead Rope Extension — rappel vendredi"); // ancien nom possible dans historique, jamais affiché.
  }
  if(/pull up/.test(n) && !/weighted/.test(n) && !/chest to bar/.test(n)){
    add("Pull-Up");
    add("Pull-Up technique"); // ancien nom possible dans historique, jamais affiché.
  }
  if(/knee raise/.test(n)){
    add("Knee Raise");
    add("Hanging Knee Raise progression"); // ancien nom possible dans historique, jamais affiché.
    add("Hanging Knee Raise");
  }
  if(/lateral raise/.test(n)){
    if(/cable|cable bas|poulie/.test(n)){
      add("Lateral Raise câble");
      add("Lateral Raise câble bas");
    }else if(/haltere|halteres|dumbbell|db/.test(n)){
      add("Lateral Raise DB");
      add("Lateral Raise haltères");
    }else if(/machine/.test(n)){
      add("Lateral Raise machine");
    }else{
      add("Lateral Raise");
    }
  }
  if(/rear delt fly/.test(n)){
    if(/cable|cable bas|poulie/.test(n)){
      add("Rear Delt Fly câble");
      add("Rear Delt Fly câble bas");
    }else if(/haltere|halteres|dumbbell|db/.test(n)){
      add("Rear Delt Fly DB");
      add("Rear Delt Fly haltères");
    }else if(/machine/.test(n)){
      add("Rear Delt Fly machine");
    }else{
      add("Rear Delt Fly");
    }
  }
  if(/wide grip cable upright row|upright row/.test(n)){
    add("Wide-Grip Cable Upright Row");
    add("Cable Upright Row");
    add("Upright Row");
  }
  if(/face pull/.test(n))add("Face Pull");
  if(/cable curl/.test(n))add("Cable Curl");
  if(/cable hip abduction|cable band hip abduction|cable band abduction|cable ou band hip abduction/.test(n)){
    add("Cable Hip Abduction");
    add("Cable/Band Hip Abduction");
    add("Cable/Band Abduction");
    add("Cable ou Band Hip Abduction");
  }
  if(/db reverse lunge/.test(n)){
    add("DB Reverse Lunge");
    add("DB Reverse Lunge ou Step-up");
  }
  if(/db rdl/.test(n)){
    add("DB RDL");
    add("DB RDL ou Barbell RDL");
  }
  if(/hip thrust/.test(n)){
    add("Hip Thrust");
    add("Hip Thrust Pump");
    add("Hip Thrust Tempo");
    add("Hip Thrust léger");
    add("B1. Hip Thrust");
    add("C1. Hip Thrust");
  }
  if(/goblet squat/.test(n)){add("Goblet Squat");add("Goblet Squat Tempo");add("B1. Goblet Squat Tempo");}
  if(/ring row/.test(n)){add("Ring Row");add("Ring Row Strict");}
  if(/step up|step\-up/.test(n)){add("Step-Up");add("Step-Up haut contrôlé");add("DB Step-up");}
  if(/wall slide/.test(n)){add("Wall Slide");add("Wall Slide Lift-off");}
  if(/face pull external rotation/.test(n)){add("Face Pull External Rotation");add("Face Pull to External Rotation");}
  if(/frog pump|frog bridge/.test(n)){add("Frog Bridge");add("Frog Pump");add("Frog Pumps");}
  if(/bike/.test(n)){add("Bike");add("Bike facile");}
  if(/transition/.test(n)){add("Transitions");add("Primer transitions");add("Wall Ball to Burpee Transitions");add("Wall Ball + Burpee");}
  if(/power clean technique|clean technique/.test(n)){
    add("Power Clean technique");
    add("Power Clean");
  }else if(/power clean wod/.test(n)){
    add("Power Clean WOD");
    add("Power Clean");
  }else if(/power clean/.test(n)){
    add("Power Clean");
    add("Power Clean technique"); // ancien nom possible dans historique, filtré par contexte quand disponible.
    add("Power Clean WOD");
  }
  return list;
}

// V51.40 — contexte mouvement/intention.
// Objectif : garder les noms de mouvements simples, mais transporter l'intention
// séparément pour les futures décisions du moteur.
// Cette étape ne change pas la suggestion de charge : le contexte est collecté
// et exposé, mais les règles de progression existantes restent inchangées.
function coachTextIncludesAny(text, words){
  var n=coachNormalizeMoveText(text);
  return (words||[]).some(function(w){return n.indexOf(coachNormalizeMoveText(w))>=0;});
}

function coachExtractMovementIntent(parts){
  var raw=(Array.isArray(parts)?parts.join(' '):String(parts||''));
  var n=coachNormalizeMoveText(raw);
  var intents=[];
  function add(x){if(x&&intents.indexOf(x)===-1)intents.push(x);}
  if(/amrap|emom|for time|wod|cap|time cap/.test(n))add('wod');
  if(/technique|qualite|quality|drill|skill|vitesse|speed|primer|transition|ramp up|rampup/.test(n))add('technique');
  if(/rappel|recall/.test(n))add('recall');
  if(/progression|regression|scale|scaling/.test(n))add('progression');
  if(/leger|legere|light|facile|easy|warm up|warmup|activation|mobilite|mobility/.test(n))add('light');
  if(/lourd|heavy|force|strength|principal|prioritaire/.test(n))add('strength');
  if(/hypertrophie|pump|volume|accessoire|support/.test(n))add('hypertrophy');
  if(/deload|recuperation|reset/.test(n))add('recovery');
  return intents;
}

function coachBuildMovementContext(nameOrKey, opts){
  opts=opts||{};
  var raw=String(nameOrKey||opts.name||opts.key||'').trim();
  var label=canonicalMovementLabel(raw);
  var textParts=[raw,label,opts.kind,opts.blockKind,opts.blockTitle,opts.title,opts.note,opts.text,opts.format].filter(Boolean);
  var intents=coachExtractMovementIntent(textParts);
  var kind=String(opts.kind||opts.blockKind||'').toLowerCase();
  if(kind==='wod'&&intents.indexOf('wod')===-1)intents.push('wod');
  if(kind==='warmup'&&intents.indexOf('light')===-1)intents.push('light');
  var equipment=coachMovementEquipmentFamily(label)||coachMovementEquipmentFamily(raw)||'';
  return {
    rawName:raw,
    label:label,
    equipment:equipment,
    intents:intents,
    primaryIntent:intents[0]||'',
    kind:opts.kind||opts.blockKind||'',
    blockTitle:opts.blockTitle||opts.title||'',
    note:opts.note||'',
    text:opts.text||'',
    format:opts.format||'',
    day:opts.day||(window.state&&state.day)||'',
    week:opts.week||(window.state&&state.week)||'',
    isWod:intents.indexOf('wod')>=0,
    isTechnical:intents.indexOf('technique')>=0,
    isLight:intents.indexOf('light')>=0,
    isProgression:intents.indexOf('progression')>=0,
    isRecall:intents.indexOf('recall')>=0,
    isStrength:intents.indexOf('strength')>=0,
    isHypertrophy:intents.indexOf('hypertrophy')>=0,
    isRecovery:intents.indexOf('recovery')>=0
  };
}

function coachMovementContextSummary(ctx){
  ctx=ctx||{};
  var bits=[];
  if(ctx.equipment)bits.push('équipement='+ctx.equipment);
  if(ctx.primaryIntent)bits.push('intention='+ctx.primaryIntent);
  if(ctx.kind)bits.push('bloc='+ctx.kind);
  if(ctx.day)bits.push('jour='+ctx.day);
  return bits.join(' · ');
}



// V51.41 — helpers de contexte utilisés par le moteur de progression.
// Le nom reste simple; les décisions prudentes lisent maintenant l'intention séparée.
function coachContextHasIntent(ctx,intent){
  return !!(ctx&&Array.isArray(ctx.intents)&&ctx.intents.indexOf(intent)>=0);
}

function coachIsLimitedProgressionContext(ctx){
  return !!(ctx&&(ctx.isTechnical||ctx.isLight||ctx.isProgression||ctx.isWod||ctx.isRecovery||coachContextHasIntent(ctx,'technique')||coachContextHasIntent(ctx,'light')||coachContextHasIntent(ctx,'progression')||coachContextHasIntent(ctx,'wod')||coachContextHasIntent(ctx,'recovery')));
}

function coachContextProgressionReason(ctx){
  if(!ctx)return '';
  if(ctx.isWod||coachContextHasIntent(ctx,'wod'))return 'Contexte WOD : ne pas auto-progresser comme un mouvement principal.';
  if(ctx.isTechnical||coachContextHasIntent(ctx,'technique'))return 'Contexte technique : pas d’auto-progression comme un mouvement principal.';
  if(ctx.isLight||coachContextHasIntent(ctx,'light'))return 'Contexte léger/warm-up : pas d’auto-progression comme un mouvement principal.';
  if(ctx.isProgression||coachContextHasIntent(ctx,'progression'))return 'Contexte progression/scale : pas d’auto-progression comme un mouvement principal.';
  if(ctx.isRecovery||coachContextHasIntent(ctx,'recovery'))return 'Contexte récupération/deload : pas d’auto-progression comme un mouvement principal.';
  return '';
}

// V51.68 — Caps de progression par mouvement.
// Permet au moteur de suggestion de lire des règles spécifiques sans connaître
// les noms de mouvements individuels.
var MOVEMENT_PROGRESSION_CAPS = {
  "overhead rope extension": {
    maxJumpWhenEasy: 5,      // +5 lb max si RPE <= 8
    maxJumpWhenHard: 0,      // +0 lb si RPE > 8
    fridayUsesWeekBest: true // vendredi : utiliser le meilleur contrôlé de la semaine
  }
};

function coachGetMovementProgressionCap(label) {
  var n = coachNormalizeMoveText(label);
  for (var key in MOVEMENT_PROGRESSION_CAPS) {
    if (n.indexOf(key) >= 0) return MOVEMENT_PROGRESSION_CAPS[key];
  }
  return null;
}
