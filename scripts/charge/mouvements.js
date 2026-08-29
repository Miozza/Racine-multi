// @ts-check
// Coach Beurt V51.63 — extraction prudente moteur de charges.
// Script global volontaire : pas de ES modules, pas de changement de comportement.

function normalizeExerciseName(name){return chargeKeyFromName(name).toLowerCase().replace(/[^a-z0-9à-ÿ]+/g," ").trim();}

function coachNormalizeMoveText(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}

function coachMovementEquipmentFamily(nameOrKey){
  var n=coachNormalizeMoveText(chargeKeyFromName(nameOrKey||''));
  if(!n)return '';
  if(/cable|poulie|rope|face pull|pushdown|pulldown|pull down/.test(n))return 'cable';
  if(/machine/.test(n))return 'machine';
  // Goblet et kettlebell AVANT la ligne barre : un goblet squat contient
  // « squat » et tombait dans la famille barre, avec un pas de 5 lb au lieu
  // de 2,5. A 5 lb de depart, la seule progression possible devenait +100 %,
  // que le reste du moteur refusait ensuite — le mouvement etait fige.
  if(/goblet/.test(n))return 'db';
  if(/kettlebell|kb swing|kb /.test(n))return 'kb';
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
  // TEMPORAIRE (V4.5) — pont pour l'historique déjà loggé sous les anciens noms
  // ambigus. Les programmes n'émettent plus ces noms (contrat « Règle des noms
  // de mouvements ») ; retirer ces deux lignes quand plus aucun historique actif
  // ne les contient.
  if(n.indexOf("weighted pull up ring row lourd")>=0 || n.indexOf("weighted pull up ring row")>=0)return "Weighted Pull-up / Ring Row lourd";
  if(n.indexOf("ring row lourd")>=0)return "Ring Row lourd";
  if(n.indexOf("ring row strict")>=0 || n.indexOf("ring rows strict")>=0)return "Ring Row";
  if(n.indexOf("lat pulldown")>=0 || n.indexOf("lat pull down")>=0)return "Lat Pulldown";
  if(n.indexOf("pull up technique")>=0)return "Pull-Up";
  if(n.indexOf("pull up")>=0 && n.indexOf("weighted")<0 && n.indexOf("chest to bar")<0)return "Pull-Up";
  if(n.indexOf("hanging knee raise progression")>=0 || n.indexOf("hanging knee raise")>=0 || n.indexOf("knee raise progression")>=0)return "Knee Raise";
  if(n.indexOf("knee raise")>=0)return "Knee Raise";
  if(n.indexOf("weighted pull up")>=0)return "Weighted Pull-up";
  if(n.indexOf("db shoulder press landmine press")>=0)return "DB Shoulder Press";
  if(n.indexOf("landmine press")>=0)return "Landmine Press";
  if(n.indexOf("db shoulder press")>=0)return "DB Shoulder Press";
  // TEMPORAIRE (V4.5) — même pont : les nouvelles séances loggent "Power Clean"
  // (l'intention technique vit dans format/note/contexte, plus dans le nom).
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
  if(/lat pull ?down/.test(n))add("Lat Pulldown");
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

// ── Bloc VITESSE : intention a part entiere ─────────────────────────────────
// Un bloc vitesse (effort dynamique) est defini par un POURCENTAGE du 1RM,
// pas par une charge absolue. C'est ce qui le distingue d'un drill technique,
// avec lequel il etait confondu : le mot « vitesse » tombait dans la regex
// `technique` et coupait toute auto-progression, si bien qu'une charge de
// programme figee restait figee pendant que l'athlete progressait.
//
// La detection est volontairement etroite (voir COACH_MOVEMENT_TUNING.
// speedStimulus) : le mot « vitesse » sert partout dans le catalogue de
// simple consigne d'arret (« Stop si la vitesse meurt »). Trois conditions
// cumulatives, dans cet ordre :
//   1. aucune consigne d'avertissement ne porte le mot ;
//   2. un mot-cle de vitesse/explosivite est present ;
//   3. une cible en POURCENTAGE sous-maximale est declaree.
// La condition 3 est aussi ce qui rend la recalibration possible : sans
// pourcentage cible, il n'y a rien vers quoi converger.
//
// Le texte brut est indispensable ici : coachNormalizeMoveText() retire le
// signe « % ». On normalise donc seulement la casse et les accents.
function coachNormalizeKeepSymbols(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

// Cible en POURCENTAGE du 1RM lue dans un texte de charge de programme.
// « 60-65 % », « ~60 % », « RPE 7 / ~70 % » : ces textes ne sont PAS des
// livres. parseLoad() y attrape pourtant le premier nombre — « 60-65 % »
// devenait 60 lb pour un Push Press a 60-65 % du 1RM. Le pourcentage doit
// etre resolu contre la capacite reelle de l'athlete, ou a defaut ignore.
//
// Exige un `%` ET l'absence d'unite explicite : « 60 % (135 lb) » reste une
// charge en livres et suit le chemin habituel.
function coachPercentTargetFromText(raw){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.speedStimulus)||null;
  if(!T||!T.pctPattern)return null;
  var text=coachNormalizeKeepSymbols(raw);
  if(!text||/\b(lb|lbs|kg)\b/.test(text))return null;
  var m=text.match(T.pctPattern);
  if(!m)return null;
  var a=Number(m[1])/100;
  var b=m[2]?Number(m[2])/100:0;
  var lo=b?Math.min(a,b):a;
  var hi=b?Math.max(a,b):a;
  if(!(lo>0.15)||!(hi<=1.10))return null;
  var r2=function(x){return Math.round(x*100)/100;};
  return {min:r2(lo),max:r2(hi),aim:r2(b?(lo+hi)/2:a)};
}

// `declaredPct` (R5) : une cible posee EXPLICITEMENT par le programme, en
// clair, sur l'exercice — `pctOf1RM: 0.60`. Elle est lue en premier et evite
// toute dependance a une tournure de phrase. La lecture par regex reste le
// repli pour les programmes existants, qui ecrivent « ~60 % » dans leur note.
// Le mot « vitesse » employe comme CONSIGNE D'ARRET (« si la vitesse meurt »,
// « vitesse de barre comme juge ») n'est pas une intention de programmation.
// La liste vit dans COACH_MOVEMENT_TUNING.speedStimulus.cuePatterns ; deux
// lecteurs s'en servent — la detection de bloc vitesse ci-dessous et le
// detecteur d'intention technique (coachExtractMovementIntent). Une seule
// liste, un seul proprietaire.
function coachIsSpeedCueText(raw){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.speedStimulus)||null;
  if(!T)return false;
  var text=coachNormalizeKeepSymbols(raw);
  if(!text)return false;
  return (T.cuePatterns||[]).some(function(re){return re.test(text);});
}

function coachSpeedStimulusBandFromText(raw, declaredPct){
  var T=(window.COACH_MOVEMENT_TUNING&&window.COACH_MOVEMENT_TUNING.speedStimulus)||null;
  if(!T)return null;
  var text=coachNormalizeKeepSymbols(raw);
  if(!text)return null;
  if(coachIsSpeedCueText(raw))return null;
  if(!(T.keywordPatterns||[]).some(function(re){return re.test(text);}))return null;
  var a,b=0;
  var declared=Number(declaredPct);
  if(declared>0){
    // Tolere 0,60 comme 60 : un programme peut ecrire l'un ou l'autre.
    a=declared>1?declared/100:declared;
  }else{
    var m=T.pctPattern?text.match(T.pctPattern):null;
    if(!m)return null;
    a=Number(m[1])/100;
    b=m[2]?Number(m[2])/100:0;
  }
  var lo=b?Math.min(a,b):a;
  var hi=b?Math.max(a,b):a;
  var minPct=Number(T.minDeclaredPct)||0.30;
  var maxPct=Number(T.maxDeclaredPct)||0.80;
  if(!(lo>=minPct)||!(hi<=maxPct))return null;
  if(!b){
    var spread=Number(T.singlePctSpread)||0.05;
    lo=Math.max(minPct,a-spread);
    hi=Math.min(maxPct,a+spread);
  }
  // Arrondi au point de pourcentage : sans lui, 0,60 - 0,05 sort a
  // 0,5499999999999999 et s'affiche « 54 % » dans l'explication du bouton (!).
  var r2=function(x){return Math.round(x*100)/100;};
  // La cible visee : le pourcentage DECLARE quand le bloc en annonce un seul
  // (« ~60 % » vise 60 %, pas le bas de la bande), le milieu quand il annonce
  // une plage. La bande, elle, reste les garde-fous.
  var aim=b?r2((lo+hi)/2):r2(a);
  return {min:r2(lo),max:r2(hi),declared:r2(a),aim:aim};
}

// `declaredPct` (optionnel) : cible en pourcentage posee explicitement par le
// programme sur l'exercice (`pctOf1RM`). Elle vaut declaration d'intention au
// meme titre qu'un « ~60 % » ecrit dans la note — sinon un programme qui fait
// les choses proprement, en clair, serait le seul a ne pas etre reconnu.
function coachExtractMovementIntent(parts, declaredPct, kind){
  var raw=(Array.isArray(parts)?parts.join(' '):String(parts||''));
  var n=coachNormalizeMoveText(raw);
  var intents=[];
  function add(x){if(x&&intents.indexOf(x)===-1)intents.push(x);}
  // ── « EMOM » dans un format n'est pas une declaration de WOD ─────────────
  // Le texte teste inclut le FORMAT de l'exercice (coachBuildMovementContext).
  // Un bloc principal dont le format s'ecrit « EMOM 8 : 2 Power Clean » se
  // declarait donc contexte WOD, et coachRuleContextLimited coupait toute
  // auto-progression : Power Clean figé a 125 lb sur les 8 semaines de
  // phase2_fable5, sans aucun rapport avec les reps ou le RPE.
  //
  // Le `kind` du bloc tranche, parce qu'il est la seule declaration EXPLICITE
  // de ce qu'est le bloc. Un vrai metcon porte kind:"wod" — et n'a d'ailleurs
  // pas d'exercices charges : les quatre blocs kind:"wod" de phase2_fable5
  // sont du texte, donc aucune charge n'y est jamais suggeree. Le mot EMOM
  // ecrit dans le format d'un bloc de travail charge (main, secondary,
  // strength, hypertrophy, accessory, technique, core) decrit la MISE EN
  // FORME de la serie, pas sa nature.
  //
  // Meme raisonnement que le mot « vitesse » traite plus bas, et meme
  // contrainte d'emplacement : cette regle vit ICI et pas dans
  // coachBuildMovementContext(), parce que coachRederiveStoredContext()
  // (historique.js) relit les lignes DEJA LOGGEES avec ce meme detecteur. Les
  // deux cotes de la comparaison de contexte bougent donc ensemble, et
  // l'historique deja stocke beneficie retroactivement du correctif.
  var kindDeclared=coachNormalizeMoveText(kind||'');
  var loadedBlockKind=/^(main|secondary|strength|hypertrophy|accessory|technique|core)$/.test(kindDeclared);
  if(/amrap|emom|for time|wod|cap|time cap/.test(n)&&!loadedBlockKind)add('wod');
  // Mots qui declarent VRAIMENT une intention technique, quel que soit le reste
  // de la phrase.
  if(/technique|qualite|quality|drill|skill|primer|ramp up|rampup/.test(n))add('technique');
  // « vitesse » / « speed » sont ambigus. Employes comme consigne d'arret — « si
  // la vitesse meurt, c'est fini », « vitesse de barre comme juge » — ils
  // parlent de la QUALITE d'execution d'une serie lourde, pas d'un drill.
  // Les lire comme une intention technique coupait toute auto-progression sur
  // un mouvement principal, ET faisait disparaitre l'historique des semaines
  // voisines : le filtre de progression ne compare que des contextes de meme
  // nature (limite vs non limite), donc les seances precedentes, elles non
  // limitees, etaient ecartees. Le moteur reproposait alors indefiniment la
  // charge ecrite dans le programme. Cas reel : « Pause Back Squat — 3RM avec
  // pause. Aucune bataille : si la vitesse meurt, c'est fini. » (S3 de
  // phase2_fable5), ou deux semaines a 170 lb x 3 @ RPE 7 ne pesaient rien.
  // Un VRAI bloc vitesse, lui, declare un pourcentage cible : il reste un
  // contexte a progression limitee via `speed` juste en dessous.
  else if(/vitesse|speed/.test(n)&&!coachIsSpeedCueText(raw))add('technique');
  // `speed` s'AJOUTE a `technique`, elle ne le remplace pas : un bloc vitesse
  // reste un contexte a progression limitee (il ne remplace jamais une
  // capacite principale dans athlete_state). La regle dediee du moteur lui
  // rend seulement sa derive vers la bande cible.
  if(coachSpeedStimulusBandFromText(raw, declaredPct)){
    add('speed');
    // Un bloc vitesse reconnu reste technique meme si le mot « vitesse » a ete
    // ecarte ci-dessus : c'est la declaration de pourcentage qui fait foi.
    add('technique');
  }
  if(/rappel|recall/.test(n))add('recall');
  if(/progression|regression|scale|scaling/.test(n))add('progression');
  if(/leger|legere|light|facile|easy|warm up|warmup|activation|mobilite|mobility/.test(n))add('light');
  if(/lourd|heavy|force|strength|principal|prioritaire/.test(n))add('strength');
  if(/hypertrophie|pump|volume|accessoire|support/.test(n))add('hypertrophy');
  if(/deload|recuperation|reset/.test(n))add('recovery');
  // ─── Le `kind` du bloc produit son intention (V4.6.9) ────────────────────
  // Deux definitions de « principal » cohabitaient sans se parler :
  // coachIsMainLoadContext() matche /main/ et traite donc un bloc kind:"main"
  // comme principal pour le deload et le plafond, pendant qu'ICI le mot
  // « main » ne declarait rien — il fallait ecrire « lourd », « force » ou
  // « principal ». Mesure sur le catalogue : 1 643 exercices d'un bloc
  // kind:"main" et 1 720 d'un bloc kind:"hypertrophy" tombaient sur le repli
  // generique au lieu de leur propre reglage.
  //
  // L'effet n'est pas le meme des deux cotes, et c'est le point :
  //  · main : 0,40 -> 0,50, soit +0,7 a +3,4 lb avant arrondi. Le cran du rack
  //    fait 5 lb sur une barre, donc l'ecart disparait presque toujours
  //    (1 cas sur 11 mesures). Cette moitie corrige une incoherence, pas une
  //    charge.
  //  · hypertrophie : 0,40 -> 0,30, un ecart qui SURVIT a l'arrondi (5 cas sur
  //    11). Le moteur rattrapait plus vite que ce que la programmation demande
  //    — sur un bloc d'hypertrophie, des reps en plus viennent souvent du
  //    volume, pas d'une reserve de force.
  //
  // Surchargeable : un mot explicite dans le bloc ou la note l'emporte
  // toujours. Le kind ne fait que combler le silence.
  //
  // EMPLACEMENT NON NEGOCIABLE — cette regle doit vivre ICI et pas dans
  // coachBuildMovementContext(), parce que coachRederiveStoredContext()
  // (historique.js) relit les lignes DEJA LOGGEES avec ce meme detecteur. Les
  // deux cotes de la comparaison de contexte bougent donc ensemble. Placee
  // dans le constructeur de contexte, elle changerait la cle du jour sans
  // changer celle des lignes stockees : les 28 Power Clean d'un bloc principal
  // perdraient tout leur historique, exactement le bug « vitesse » de V4.6.1.
  if(intents.indexOf('strength')===-1&&intents.indexOf('hypertrophy')===-1){
    if(kindDeclared==='main')add('strength');
    else if(kindDeclared==='hypertrophy')add('hypertrophy');
  }
  return intents;
}

function coachBuildMovementContext(nameOrKey, opts){
  opts=opts||{};
  var raw=String(nameOrKey||opts.name||opts.key||'').trim();
  var label=canonicalMovementLabel(raw);
  var textParts=[raw,label,opts.kind,opts.blockKind,opts.blockTitle,opts.title,opts.note,opts.text,opts.format].filter(Boolean);
  var intents=coachExtractMovementIntent(textParts, opts.pctOf1RM, opts.kind||opts.blockKind);
  var kind=String(opts.kind||opts.blockKind||'').toLowerCase();
  if(kind==='wod'&&intents.indexOf('wod')===-1)intents.push('wod');
  if(kind==='warmup'&&intents.indexOf('light')===-1)intents.push('light');
  var equipment=coachMovementEquipmentFamily(label)||coachMovementEquipmentFamily(raw)||'';
  // La bande cible est calculee une seule fois ici : le moteur la relit sans
  // re-parser le texte, et le bouton (!) peut l'afficher telle quelle.
  var speedBand=coachSpeedStimulusBandFromText(textParts.join(' '), opts.pctOf1RM);
  // Cible en pourcentage de la CHARGE du programme (« 60-65 % »), lue a part :
  // elle sert a resoudre la charge, meme quand le bloc n'est pas un bloc
  // vitesse (voir coachBuildSuggestionContext).
  var percentTarget=coachPercentTargetFromText(opts.load);
  // ── La FOURCHETTE de reps, pas seulement sa borne basse ──────────────────
  // « 3×15-20 » ne demande pas 15 reps, il en demande entre 15 et 20 : faire
  // 18 n'est pas un depassement, c'est la cible. Tout le moteur ne recevait
  // pourtant qu'UN nombre — `parsed.min` — et lisait donc 18 comme un surplus
  // de 3 reps. Les deux bornes voyagent desormais avec le contexte, pour que
  // l'ecart de reps se mesure contre la bonne.
  var repsRange=null;
  if(opts.targetMin||opts.targetMax){
    repsRange={min:Number(opts.targetMin)||Number(opts.targetMax)||0, max:Number(opts.targetMax)||Number(opts.targetMin)||0};
  }else if(typeof parseTargetReps==='function'&&opts.format){
    var p=parseTargetReps(opts.format, Number(opts.targetReps)||0);
    if(p&&(p.min||p.max))repsRange={min:Number(p.min)||Number(p.max)||0, max:Number(p.max)||Number(p.min)||0};
  }
  return {
    rawName:raw,
    label:label,
    targetMin:repsRange?repsRange.min:null,
    targetMax:repsRange?repsRange.max:null,
    equipment:equipment,
    intents:intents,
    speedBand:speedBand,
    percentTarget:percentTarget,
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
    isRecovery:intents.indexOf('recovery')>=0,
    isSpeed:intents.indexOf('speed')>=0
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
  if(ctx.isSpeed||coachContextHasIntent(ctx,'speed'))return 'Contexte vitesse : la charge suit le pourcentage cible du bloc, pas une progression de mouvement principal.';
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

