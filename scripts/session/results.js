// Coach Beurt V51.63 — session results domain
// Résultats de séance : collecte, rendu, résumé et références.

function collectSessionExercises(){
  var w=buildWorkout(state.day,state.week);
  var items=[];
  w.blocks.forEach(function(b){
    if(b.kind==="warmup"||b.kind==="mobility"||b.kind==="bonus")return;
    if(b.exercises&&b.exercises.length){
      b.exercises.forEach(function(e){
        var parsed = parseTargetReps(e.format, 10);
        items.push({key:e.name.replace(/^[A-Z][0-9]?\.\s*/,"").trim(),name:e.name,
          suggested:CoachCharge.suggestLoad(e.name,e.load,parsed.min||parsed.max,{kind:b.kind,blockTitle:b.title,note:e.note,text:b.text,format:e.format,day:state.day,week:state.week}),format:e.format,targetMin:parsed.min,targetMax:parsed.max,kind:b.kind,blockTitle:b.title,note:e.note||"",text:b.text||"",isWod:false});
      });
    } else if(b.progress&&b.progress.length){
      b.progress.forEach(function(mvKey,j){
        var reps=targetReps(j,b.kind),fmt=setScheme(b.kind,j),parsed=parseTargetReps(fmt,reps);
        items.push({key:mvKey,name:movements[mvKey].name,
          suggested:lb(suggestLoad(mvKey,progressionPct(j),reps)),
          format:fmt,targetMin:parsed.min,targetMax:parsed.max,kind:b.kind,blockTitle:b.title,note:"",text:b.text||"",isWod:false});
      });
    } else if(b.kind==="wod"){
      var wodText=b.text||"";
      var durMin=parseTimeToSeconds(b.time)/60;
      var moves=parseWodStructure(wodText);
      var rounds=estimateWodRounds(wodText,durMin);
      items.push({
        key:"wod_"+b.title, name:"WOD — "+b.title, suggested:"",
        kind:"wod", isWod:true,
        wodText:wodText, wodMoves:moves, wodRounds:rounds,
        isAmrap:/amrap/i.test(wodText), isEmom:/emom/i.test(wodText),
        isForTime:/for time|cap/i.test(wodText), durationMin:durMin
      });
    }
  });
  return items;
}

function renderSessionEntry(){
  var items=collectSessionExercises();
  var container=$("sessionFields");if(!container)return;
  container.innerHTML="";

  items.forEach(function(item){
    var card=document.createElement("div");
    card.className="sf-card";

    if(item.isWod){
      // ── Carte WOD intelligente ──
      card.innerHTML = '<div class="sf-name">'+item.name+'</div>';
      container.appendChild(card);

      var wodInner = '';

      if(item.isEmom){
        wodInner += '<div class="wod-expected">EMOM — <strong>RPE seulement</strong></div>';
      } else if(item.isAmrap){
        var r = item.wodRounds;
        wodInner += '<div class="wod-expected">Résultat attendu : <strong>'+r.min+'–'+r.max+' rounds</strong></div>';
      } else if(item.isForTime){
        var expectedSec = parseCapSeconds(item.wodText,item.durationMin);
        if(!expectedSec || isNaN(expectedSec)) expectedSec = Math.max(60, Math.round((item.durationMin || 8) * 60));
        expectedSec = normalizeForTimeGoalSeconds(expectedSec);
        wodInner += '<div class="wod-expected">For time — objectif présélectionné : <strong>'+formatClock(expectedSec)+'</strong> · choix 00:00–60:00</div>';
        wodInner += '<span class="sf-label">TEMPS FINAL</span>';
        wodInner += '<select class="sf-input" id="wod_time_'+item.key+'" data-key="'+item.key+'" data-field="result">';
        buildTimeOptions(expectedSec).forEach(function(sec){
          wodInner += '<option value="'+formatClock(sec)+'"'+(sec===expectedSec?' selected':'')+'>'+formatClock(sec)+'</option>';
        });
        wodInner += '</select>';
        wodInner += '<input class="sf-input" data-key="'+item.key+'" data-field="note" type="text" inputmode="text" placeholder="si cap : reps complétées ou note"/>';
      }

      if(item.isAmrap && item.wodRounds.max > 1){
        var r2 = item.wodRounds;
        wodInner += '<span class="sf-label">ROUNDS COMPLÉTÉS</span>';
        wodInner += '<div class="sf-chips" id="wod_rounds_'+item.key+'">';
        for(var ri=0; ri<=r2.max+2; ri++){
          var inRange = ri>=r2.min && ri<=r2.max;
          wodInner += '<button type="button" class="sf-chip'+(inRange?' target':'')+'" data-round="'+ri+'">'+ri+'</button>';
        }
        wodInner += '</div>';
      }

      if(item.isAmrap && item.wodMoves && item.wodMoves.length){
        wodInner += '<span class="sf-label">REPS DU DERNIER ROUND — 0 inclus pour corriger</span>';
        item.wodMoves.forEach(function(mv, mi){
          var maxReps = mv.reps - (mi === item.wodMoves.length-1 ? 1 : 0);
          var hint = mi < item.wodMoves.length-1
            ? 'si tu complètes les '+mv.reps+' → '+item.wodMoves[mi+1].name+' commence'
            : mv.reps+' = round complet → clique +1 round à la place';
          wodInner += '<div class="wod-mv-label '+mv.color+'">'+mv.name+' <span class="wod-mv-max">(0–'+maxReps+')</span></div>';
          wodInner += '<div class="sf-chips" id="wod_mv_'+item.key+'_'+mi+'">';
          for(var ri2=0; ri2<=maxReps; ri2++){
            wodInner += '<button type="button" class="sf-chip '+mv.color+(ri2===0?' zero':'')+'" data-mv="'+mi+'" data-rep="'+ri2+'">'+ri2+'</button>';
          }
          wodInner += '</div>';
          wodInner += '<div class="wod-mv-hint">'+hint+'</div>';
        });
      }

      if(item.isAmrap){
        wodInner += '<div class="sf-divider">— ou saisie libre —</div>';
        wodInner += '<input class="sf-input" id="wod_free_'+item.key
          +'" data-key="'+item.key+'" data-field="result" type="text" inputmode="text" placeholder="ex: 4 rounds + 1 burpees + 0 row + 0 sit-ups"/>';
      } else if(item.isEmom){
        wodInner += '<input class="sf-input" id="wod_free_'+item.key+'" data-key="'+item.key+'" data-field="result" type="hidden" value="EMOM complété"/>';
      }

      wodInner += '<input class="sf-input" id="wod_rpe_value_'+item.key+'" data-key="'+item.key+'" data-field="rpe" type="hidden" value="8"/>';
      wodInner += '<span class="sf-label" style="margin-top:12px">RPE</span>';
      wodInner += '<div class="sf-chips" id="wod_rpe_'+item.key+'">';
      [6,7,8,9,10].forEach(function(n){
        wodInner += '<button type="button" class="sf-chip'+(n===8?' active':'')+'" data-rpe="'+n+'">'+n+'</button>';
      });
      wodInner += '</div>';

      if(!item.isForTime){
        wodInner += '<span class="sf-label">NOTE (optionnel)</span>';
        wodInner += '<input class="sf-input" data-key="'+item.key+'" data-field="note" type="text" inputmode="text" placeholder="ex: burpees lents, bon rythme row"/>';
      }

      wodInner += '<div class="wod-result-preview" id="wod_preview_'+item.key+'">Résultat prêt</div>';
      card.innerHTML += wodInner;

      (function(it){
        var selectedRounds = it.isAmrap && it.wodRounds ? it.wodRounds.def : 0;
        var selectedMvReps = {};
        if(it.wodMoves) it.wodMoves.forEach(function(_,i){ selectedMvReps[i]=0; });
        var selectedRpe = 8;

        function updatePreview(){
          var freeInp = document.getElementById('wod_free_'+it.key);
          var preview = document.getElementById('wod_preview_'+it.key);
          var rpeInp = document.getElementById('wod_rpe_value_'+it.key);
          if(rpeInp) rpeInp.value = selectedRpe;
          if(!preview) return;

          if(it.isEmom){
            preview.innerHTML = '<strong style="color:var(--cyan)">EMOM</strong> · RPE '+selectedRpe;
            return;
          }

          if(it.isForTime){
            var sel = document.getElementById('wod_time_'+it.key);
            var val = sel ? sel.value : '';
            preview.innerHTML = '<strong style="color:var(--cyan)">'+(val||'—')+'</strong> · RPE '+selectedRpe;
            return;
          }

          var parts = [];
          if(selectedRounds>0) parts.push(selectedRounds+' round'+(selectedRounds>1?'s':''));

          var repParts = [];
          if(it.wodMoves){
            it.wodMoves.forEach(function(mv,i){
              if(selectedMvReps[i]>0) repParts.push(selectedMvReps[i]+' '+mv.name);
            });
          }
          if(repParts.length) parts.push(repParts.join(' + '));

          var resultStr = parts.join(' + ');
          if(freeInp) freeInp.value = resultStr;

          var partialTotal = 0;
          if(it.wodMoves){
            it.wodMoves.forEach(function(mv,i){
              if(selectedMvReps[i]>0){
                for(var pi=0; pi<i; pi++) partialTotal += it.wodMoves[pi].reps;
                partialTotal += selectedMvReps[i];
              }
            });
          }

          var totalStr = '<strong style="color:var(--cyan)">'+(resultStr||'—')+'</strong>';
          if(partialTotal>0) totalStr += ' <span style="color:var(--muted);font-size:11px">(+'+partialTotal+' reps partielles)</span>';
          totalStr += ' · RPE '+selectedRpe;
          preview.innerHTML = totalStr;
        }

        var roundsEl = document.getElementById('wod_rounds_'+it.key);
        if(roundsEl){
          var defBtn = roundsEl.querySelector('[data-round="'+selectedRounds+'"]');
          if(defBtn) defBtn.classList.add('active');
          roundsEl.querySelectorAll('[data-round]').forEach(function(btn){
            btn.addEventListener('click',function(){
              selectedRounds = Number(btn.getAttribute('data-round'));
              roundsEl.querySelectorAll('[data-round]').forEach(function(b){b.classList.remove('active');});
              btn.classList.add('active');
              updatePreview();
            });
          });
        }

        if(it.wodMoves){
          it.wodMoves.forEach(function(mv,mi){
            var mvEl = document.getElementById('wod_mv_'+it.key+'_'+mi);
            if(!mvEl) return;
            var zeroBtn = mvEl.querySelector('[data-rep="0"]');
            if(zeroBtn) zeroBtn.classList.add('active');
            mvEl.querySelectorAll('[data-mv]').forEach(function(btn){
              btn.addEventListener('click',function(){
                var rep = Number(btn.getAttribute('data-rep'));
                selectedMvReps[mi]=rep;
                mvEl.querySelectorAll('[data-mv]').forEach(function(b){b.classList.remove('active');});
                btn.classList.add('active');
                for(var ni=mi+1; ni<it.wodMoves.length; ni++){
                  selectedMvReps[ni]=0;
                  var nextEl=document.getElementById('wod_mv_'+it.key+'_'+ni);
                  if(nextEl){
                    nextEl.querySelectorAll('[data-mv]').forEach(function(b){b.classList.remove('active');});
                    var z=nextEl.querySelector('[data-rep="0"]'); if(z) z.classList.add('active');
                  }
                }
                updatePreview();
              });
            });
          });
        }

        var timeSel = document.getElementById('wod_time_'+it.key);
        if(timeSel) timeSel.addEventListener('change',updatePreview);

        var rpeEl = document.getElementById('wod_rpe_'+it.key);
        if(rpeEl){
          rpeEl.querySelectorAll('[data-rpe]').forEach(function(btn){
            btn.addEventListener('click',function(){
              selectedRpe = Number(btn.getAttribute('data-rpe'));
              rpeEl.querySelectorAll('[data-rpe]').forEach(function(b){b.classList.remove('active');});
              btn.classList.add('active');
              updatePreview();
            });
          });
        }

        updatePreview();
      })(item);

    } else {
      var suggestedNum = parseLoad(item.suggested)||0;
      var suggestedDisplay = suggestedNum?suggestedNum:"";

      // Label cible reps pour affichage
      var repLabel = item.targetMin===item.targetMax
        ? item.targetMin+" reps"
        : item.targetMin+"–"+item.targetMax+" reps";

      var safeKey = escHtml(item.key);
      var loadValue = escHtml(getGuidedResult(item.key,'load',suggestedDisplay));
      var defaultReps = Math.round((item.targetMin + item.targetMax) / 2);
      var currentReps = Number(getGuidedResult(item.key,'reps',defaultReps)) || defaultReps;
      var currentRpe = Number(getGuidedResult(item.key,'rpe',8)) || 8;

      card.innerHTML=
        '<div class="sf-header">'+
          '<div class="sf-name">'+escHtml(typeof displayMovementName==='function'?displayMovementName(item.name):item.name)+'</div>'+
          (suggestedNum?'<div class="sf-badge">'+suggestedNum+' lb · '+repLabel+'</div>':'')+
        '</div>'+
        '<div class="results-step-control results-load-step">'+
          '<span class="sf-label">POIDS</span>'+
          '<div class="results-step-row results-load-row">'+
            '<button type="button" class="results-step-btn minus" data-key="'+safeKey+'" data-exercise="'+escHtml(item.name||item.key)+'" data-results-step="load" data-step="-5">−</button>'+
            '<div class="sf-weight-wrap">'+
              '<span class="sf-weight-unit">lb</span>'+
              '<input class="sf-input sf-weight-input" '+
                'data-key="'+safeKey+'" data-field="load" '+
                'type="number" inputmode="decimal" '+
                'value="'+loadValue+'" '+
                'placeholder="'+(suggestedNum||0)+'"/>'+
            '</div>'+
            '<button type="button" class="results-step-btn plus" data-key="'+safeKey+'" data-exercise="'+escHtml(item.name||item.key)+'" data-results-step="load" data-step="5">+</button>'+
          '</div>'+
        '</div>'+
        '<div class="results-step-grid">'+
          '<div class="results-step-control reps-step">'+
            '<span class="sf-label">REPS — cible '+repLabel+'</span>'+
            '<div class="results-step-row">'+
              '<button type="button" class="results-step-btn minus" data-key="'+safeKey+'" data-results-step="reps" data-step="-1" data-min="0">−</button>'+
              '<input class="sf-input sf-reps-input results-mini-input" data-key="'+safeKey+'" data-field="reps" type="number" inputmode="numeric" min="0" step="1" value="'+escHtml(guidedNumberText(currentReps))+'"/>'+
              '<button type="button" class="results-step-btn plus" data-key="'+safeKey+'" data-results-step="reps" data-step="1" data-min="0">+</button>'+
            '</div>'+
          '</div>'+
          '<div class="results-step-control rpe-step">'+
            '<span class="sf-label">RPE</span>'+
            '<div class="results-step-row">'+
              '<button type="button" class="results-step-btn minus" data-key="'+safeKey+'" data-results-step="rpe" data-step="-0.5" data-min="1" data-max="10">−</button>'+
              '<input class="sf-input sf-rpe-input results-mini-input" data-key="'+safeKey+'" data-field="rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="'+escHtml(guidedNumberText(currentRpe))+'"/>'+
              '<button type="button" class="results-step-btn plus" data-key="'+safeKey+'" data-results-step="rpe" data-step="0.5" data-min="1" data-max="10">+</button>'+
            '</div>'+
          '</div>'+
        '</div>';
    }

    container.appendChild(card);

    if(!item.isWod){
      // ── Résultats compacts : poids / reps / RPE en contrôles − valeur + ──
      function syncResultField(field, value){
        setGuidedResult(item.key, field, value);
      }

      card.querySelectorAll('[data-results-step]').forEach(function(btn){
        btn.addEventListener('click',function(){
          var field=btn.getAttribute('data-results-step');
          var step=Number(btn.getAttribute('data-step'))||0;
          var selector='.sf-input[data-field="'+field+'"]';
          var inp=card.querySelector(selector);
          if(!inp)return;

          var current;
          if(field==='load'){
            current=parseLoad(inp.value)||parseLoad(item.suggested)||0;
            inp.value=nextLoadForExercise(item.name||item.key, current, step<0?-1:1, item.suggested||item.load);
          } else {
            current=Number(inp.value)||0;
            var min=btn.getAttribute('data-min');
            var max=btn.getAttribute('data-max');
            var next=current+step;
            if(min!==null&&min!==''&&!isNaN(Number(min))) next=Math.max(Number(min),next);
            if(max!==null&&max!==''&&!isNaN(Number(max))) next=Math.min(Number(max),next);
            inp.value=guidedNumberText(next);
          }
          syncResultField(field, inp.value);
        });
      });

      card.querySelectorAll('.sf-input[data-key][data-field]').forEach(function(inp){
        inp.addEventListener('input',function(){ syncResultField(inp.getAttribute('data-field'), inp.value); });
        inp.addEventListener('change',function(){
          var field=inp.getAttribute('data-field');
          if(field==='load'){
            var n=parseLoad(inp.value);
            if(n!==null&&n!==undefined){
              var rounded=roundLoadForExercise(item.name||item.key, n, 'nearest', item.suggested||item.load);
              if(rounded!==null&&rounded!==undefined) inp.value=guidedNumberText(rounded);
            }
          }
          syncResultField(field, inp.value);
        });
      });
    }
  });
}

function collectSessionResults(){
  var results={};
  var scope=$("sessionFields")||document;
  scope.querySelectorAll(".sf-input").forEach(function(inp){
    var key=inp.getAttribute("data-key"),field=inp.getAttribute("data-field");
    if(!key||!field)return;
    var val=String(inp.value||"").trim();
    if(!val)return;
    if(!results[key])results[key]={};
    results[key][field]=val;
  });
  Object.keys(guidedResultCache||{}).forEach(function(key){
    var r=guidedResultCache[key]||{};
    Object.keys(r).forEach(function(field){
      var val=String(r[field]||"").trim();
      if(!val)return;
      if(!results[key])results[key]={};
      results[key][field]=val;
    });
  });
  return results;
}

function updateRefsFromResults(results,dateStr){
  dateStr = dateStr || new Date().toLocaleDateString("fr-CA");
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    var load=parseLoad(r.load),reps=Number(r.reps)||0;
    if(!load||!reps)return;
    var mvKey=resolveMovementKey(key);
    if(!mvKey)return;
    var refK=refKey(mvKey,reps);
    var existing=state.movementRefs[refK];
    if(!existing||load>=existing.load){
      state.movementRefs[refK]={
        movement:mvKey,range:repRange(reps),load:load,reps:reps,
        date:dateStr,lastActual:load,
        status:Number(r.rpe)>=9?"hard":"success",quality:"clean",
        rpe:Number(r.rpe)||8,note:"Saisi depuis l’app"
      };
    }
    // Enregistrer RPE dans l'historique pour progression automatique
    var rpeKey=refK;
    if(!state.rpeHistory[rpeKey])state.rpeHistory[rpeKey]=[];
    state.rpeHistory[rpeKey].push(Number(r.rpe)||8);
    // Garder seulement les 3 dernières
    if(state.rpeHistory[rpeKey].length>3)state.rpeHistory[rpeKey].shift();
  });
}

function sessionSummaryEscape(value){
  var text=String(value==null?"":value);
  if(typeof escHtml==='function')return escHtml(text);
  return text.replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});
}

function sessionSummaryMovementName(key){
  var name=key;
  if(typeof movementLabelFromKeyOrName==='function')name=movementLabelFromKeyOrName(key);
  else if(typeof movements!=='undefined'&&movements&&movements[key])name=movements[key].name||key;
  if(typeof displayMovementName==='function')name=displayMovementName(name);
  return name;
}

function previousMovementHistoryRow(name, currentLoad, currentReps, currentRpe){
  if(window.CoachHistory && CoachHistory.previousMovementHistoryRow){
    return CoachHistory.previousMovementHistoryRow(name, currentLoad, currentReps, currentRpe);
  }
  var mv=(typeof athleteMovementRecord==='function')?athleteMovementRecord(name):null;
  var history=(mv&&Array.isArray(mv.history))?mv.history:[];
  if(history.length<2)return null;
  for(var i=history.length-2;i>=0;i--){
    var row=history[i]||{};
    var load=Number(row.load||row.actualLoad||row.capacityLoad||0)||0;
    var reps=Number(row.reps||row.actualReps||row.currentReps||0)||0;
    var rpe=Number(row.rpe||0)||0;
    if(load===Number(currentLoad)&&reps===Number(currentReps)&&rpe===Number(currentRpe))continue;
    return row;
  }
  return null;
}

function pushUniqueSummaryLine(list, line){
  if(line&&list.indexOf(line)<0)list.push(line);
}

function buildSessionSummary(results){
  if(window.CoachSummary && CoachSummary.buildSessionSummary){
    return CoachSummary.buildSessionSummary(results,{
      movementName:sessionSummaryMovementName,
      previousMovementHistoryRow:previousMovementHistoryRow,
      parseLoad:parseLoad,
      round5:round5,
      progress:window.CoachProgress
    });
  }
  return {
    lines: [],
    prLines: [],
    avgRpe: 8,
    rpeSignal: "Bon",
    totalExercises: 0,
    autoPrLines: [],
    progressionLines: [],
    watchLines: ["Resume indisponible : CoachSummary non charge."],
    blockedLines: []
  };
}

function sessionSummarySection(title,items,emptyText){
  var list=(items&&items.length)?items:[emptyText];
  return '<div class="summary-section"><div class="summary-section-title">'+sessionSummaryEscape(title)+'</div>'+list.map(function(line){return '<div class="summary-line">'+sessionSummaryEscape(line)+'</div>';}).join('')+'</div>';
}

function showSessionSummaryModal(summary){
  var existing=document.getElementById("summaryModal");
  if(existing)existing.remove();

  var autoPrSection = summary.autoPrLines&&summary.autoPrLines.length>0
    ? '<div class="modal-pr">Nouveau PR automatique : '+summary.autoPrLines.map(sessionSummaryEscape).join(" · ")+'</div>'
    : '';
  var prSection = summary.prLines.length>0
    ? '<div class="modal-pr">Progression : '+summary.prLines.map(sessionSummaryEscape).join(", ")+'</div>'
    : '';

  var weekAdvanceHtml = "";
  if(canAdvanceWeek()){
    weekAdvanceHtml = '<div class="modal-advance">'+
      '<p>Tu as complété les '+currentDayOrder().length+' jours de la semaine '+state.week+' !</p>'+
      '<button id="advanceWeekBtn" class="btn-accent" style="width:100%;margin-top:8px">Passer à S'+(state.week+1)+' →</button>'+
    '</div>';
  }

  var deloadHtml = state.deloadAlert
    ? '<div class="modal-deload">RPE moyen élevé sur plusieurs séances. Considère un deload cette semaine ou la prochaine.</div>'
    : '';

  var modal = document.createElement("div");
  modal.id = "summaryModal";
  modal.className = "summary-modal";
  modal.innerHTML =
    '<div class="summary-modal-inner">'+
      '<div class="summary-modal-title">Résumé de la séance</div>'+
      '<div class="summary-modal-sub">'+sessionSummaryEscape(currentDayLabel())+' S'+state.week+' · RPE moyen '+summary.avgRpe+' '+sessionSummaryEscape(summary.rpeSignal)+'</div>'+
      autoPrSection+
      prSection+
      deloadHtml+
      sessionSummarySection('Ce qui progresse', summary.progressionLines, 'Rien de net à monter aujourd’hui.')+
      sessionSummarySection('À surveiller', summary.watchLines, 'Aucun signal rouge côté fatigue ou historique.')+
      sessionSummarySection('Ce qui bloque', summary.blockedLines, 'Aucun blocage clair détecté.')+
      '<div class="summary-lines summary-raw-lines">'+
        '<div class="summary-section-title">Détail</div>'+
        summary.lines.map(function(l){return'<div class="summary-line">'+sessionSummaryEscape(l)+'</div>';}).join("")+
      '</div>'+
      weekAdvanceHtml+
      '<button id="closeSummaryBtn" class="btn-ghost" style="width:100%;margin-top:12px">Fermer</button>'+
    '</div>';
  document.body.appendChild(modal);
  setTimeout(function(){modal.classList.add("visible");},30);

  document.getElementById("closeSummaryBtn").onclick = function(){
    modal.classList.remove("visible");
    setTimeout(function(){modal.remove();},300);
  };
  var adv = document.getElementById("advanceWeekBtn");
  if(adv) adv.onclick = function(){
    advanceWeek("Semaine complétée/traitée");
    modal.classList.remove("visible");
    setTimeout(function(){modal.remove();},300);
  };
}


