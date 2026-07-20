// Racine — interface du système multi-profil (assistant d'intégration,
// sélecteur de profil, panneau "Profil" des réglages).
// Charge AVANT app.js (comme onboarding.js) : ne référence les fonctions
// d'app.js (PR_FIELD_MAP, state, save, defaultProfile, load, render...) que
// depuis des gestionnaires d'événements, jamais au chargement du script.
(function(){
  var api = window.CoachOnboarding = window.CoachOnboarding || {};

  var wiz = null; // état courant de l'assistant (null = fermé)

  function el(html){
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }

  // Téléchargement d'un objet JSON (exports de profil). Pattern <a download>
  // + Blob URL, supporté par Safari iOS.
  function downloadJsonFile(obj, name){
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)],{type:"application/json"}));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function fileSlug(s){
    return String(s||"profil").toLowerCase().replace(/[^a-z0-9]+/g,"-") || "profil";
  }
  // Export du profil actif : télécharge le JSON et horodate l'export dans le
  // registre (utilisé par le bouton des réglages et par le rappel d'export).
  function exportActiveProfile(){
    if(!window.CoachProfiles) return false;
    var id = CoachProfiles.getActiveId();
    var blob = CoachProfiles.exportProfileBlob(id);
    if(!blob) return false;
    downloadJsonFile(blob, "racine-profil-"+fileSlug(blob.profile.name)+".json");
    if(CoachProfiles.markExported) CoachProfiles.markExported(id);
    removeExportReminder();
    return true;
  }
  // Export "tous les profils" : un seul fichier JSON avec tout le registre.
  // Horodate l'export de chaque profil inclus.
  function exportAllProfiles(){
    if(!(window.CoachProfiles && CoachProfiles.exportAllProfilesBlob)) return false;
    var blob = CoachProfiles.exportAllProfilesBlob();
    if(!blob) return false;
    var date = new Date().toISOString().slice(0,10);
    downloadJsonFile(blob, "racine-profils-"+date+".json");
    if(CoachProfiles.markExported){
      blob.profiles.forEach(function(entry){
        if(entry.profile && entry.profile.id) CoachProfiles.markExported(entry.profile.id);
      });
    }
    removeExportReminder();
    return true;
  }

  // Import d'un fichier d'export (mono ou multi-profils). Retourne {ok, error}.
  // Format multi : propose l'import de chaque profil, un par un. Aucun profil
  // existant n'est écrasé implicitement (l'import crée toujours un profil).
  function importExportPayload(payload){
    var parsed = (window.CoachProfiles && CoachProfiles.parseExportPayload) ? CoachProfiles.parseExportPayload(payload) : null;
    if(!parsed) return { ok:false, error:"Fichier de profil invalide." };
    var single = parsed.kind === "single";
    var prevActiveId = CoachProfiles.getActiveId();
    var imported = 0, firstId = null, activeReplaced = false;
    parsed.entries.forEach(function(entry){
      var name = (entry.profile && entry.profile.name) || "profil";
      if(!single && !confirm("Importer le profil « "+name+" » ?")) return;
      var res = importOneEntry(entry, single);
      if(res.id){
        imported++;
        if(!firstId) firstId = res.id;
        if(res.replacedId && res.replacedId === prevActiveId) activeReplaced = true;
      }
    });
    if(!imported) return { ok:false, error:"Aucun profil importé." };
    // Le profil actif a été remplacé pendant que l'app tourne : recharger la
    // page pour que le state en mémoire ne réécrive pas les données importées.
    if(activeReplaced){
      closeGate();
      location.reload();
      return { ok:true };
    }
    if(single || !CoachProfiles.hasActiveOnboardedProfile()){
      if(!single) CoachProfiles.setActive(firstId);
      closeGate();
      window.coachFullBoot();
    } else {
      api.renderSettingsPanel();
      var s = document.getElementById("profileSettingsStatus");
      if(s){ s.textContent = "✅ "+imported+" profil(s) importé(s)."; s.className = "status-msg ok"; }
    }
    return { ok:true };
  }
  // Importe une entrée mono-profil. Si un profil du même nom existe déjà,
  // demande une confirmation explicite avant de le remplacer; en cas de refus,
  // l'import crée un profil séparé — un import n'écrase jamais rien sans accord.
  function importOneEntry(entry, setActive){
    var name = (entry.profile && entry.profile.name) || "";
    var existing = name ? CoachProfiles.list().filter(function(p){ return p.onboarded && p.name === name; })[0] : null;
    var opts = { setActive: !!setActive };
    if(existing && confirm("Un profil « "+name+" » existe déjà sur cet appareil.\n\nOK : le remplacer par la version importée (ses données locales actuelles seront perdues).\nAnnuler : garder les deux (import en profil séparé).")){
      opts.replaceId = existing.id;
    }
    var id = CoachProfiles.importProfileBlob(entry, opts);
    return { id: id, replacedId: (id && opts.replaceId) ? opts.replaceId : null };
  }

  function ensureGateEl(){
    var g = document.getElementById("racineGate");
    if(!g){
      g = document.createElement("div");
      g.id = "racineGate";
      g.className = "racine-gate";
      document.body.appendChild(g);
    }
    return g;
  }
  function closeGate(){
    var g = document.getElementById("racineGate");
    if(g) g.remove();
  }

  // Vérification du PIN admin par empreinte SHA-256 : le code n'apparaît plus
  // en clair dans le source. Limite assumée : côté client, ça décourage la
  // lecture casuelle, pas un utilisateur déterminé avec la console ouverte.
  // Pour changer le code : node -e "console.log(require('crypto').createHash('sha256').update('NOUVEAU_CODE').digest('hex'))"
  var ADMIN_PIN_SHA256 = "03aaef0fd45d47ee37afee60b41f0a80010f58f95d3d34e9b7dc253c8558bf2a";
  function verifyAdminPin(pin){
    if(!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve(false);
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(pin)))
      .then(function(buf){
        var hex = Array.prototype.map.call(new Uint8Array(buf), function(b){ return ("0"+b.toString(16)).slice(-2); }).join("");
        return hex === ADMIN_PIN_SHA256;
      })
      .catch(function(){ return false; });
  }

  // Bascule de profil. Si l'app tournait déjà sur un autre profil, on recharge
  // la page au lieu de re-booter à chaud : des timers ou closures encore
  // vivants (mode séance, chrono) pourraient sinon écrire les données de
  // l'ancien profil sous les clés localStorage du nouveau.
  function switchToProfile(id){
    var prevId = CoachProfiles.getActiveId ? CoachProfiles.getActiveId() : null;
    var wasBooted = !!(prevId && CoachProfiles.hasActiveOnboardedProfile && CoachProfiles.hasActiveOnboardedProfile());
    CoachProfiles.setActive(id);
    closeGate();
    if(wasBooted && prevId !== id){ location.reload(); return; }
    window.coachFullBoot();
  }

  function stepDots(total, current){
    var html = '<div class="racine-gate-steps">';
    for(var i=0;i<total;i++){
      var cls = i<current ? "done" : (i===current ? "current" : "");
      html += '<span class="racine-gate-step-dot '+cls+'"></span>';
    }
    return html + '</div>';
  }

  // Étapes principales de l'assistant (hors écran "welcome", qui n'affiche pas
  // les points). Utilisé pour le fil d'avancement affiché sur chaque page.
  var WIZARD_STEPS = ["welcome", "keyMovements", "calculated", "aggressiveness"];
  function wizStepIndex(){ return WIZARD_STEPS.indexOf(wiz && wiz.step); }

  function canCancel(){
    return (window.CoachProfiles ? CoachProfiles.list() : []).some(function(p){ return p.onboarded; });
  }
  function addCancelAffordance(card){
    if(!canCancel()) return;
    var btn = el('<button type="button" class="btn-ghost" style="position:absolute;top:14px;right:14px;padding:4px 9px;font-size:10px">Annuler</button>');
    card.style.position = "relative";
    card.appendChild(btn);
    btn.onclick = function(){
      if(wiz && wiz.mode==="create" && wiz.profileCreated && window.CoachProfiles){
        CoachProfiles.remove(CoachProfiles.getActiveId());
      }
      wiz = null;
      render();
    };
  }

  // ── Détection et migration legacy Coach-Beurt ───────────────────────────
  function detectLegacyState(){
    var stateKeys = ["coachBertinState","coachBertinV46","coachBertinV43","coachBertinV41"];
    for(var i = 0; i < stateKeys.length; i++){
      try{
        var raw = localStorage.getItem(stateKeys[i]);
        if(raw){ var d = JSON.parse(raw); if(d && typeof d === "object") return d; }
      }catch(e){}
    }
    return null;
  }

  function runLegacyMigration(){
    if(!window.migrateBertin){ return false; }
    var result = window.migrateBertin();
    return !!(result);
  }

  // ── Écran : sélecteur de profil ─────────────────────────────────────────
  function renderPicker(){
    var list = (window.CoachProfiles ? CoachProfiles.list() : []).filter(function(p){ return p.onboarded; });
    var rows = list.map(function(p){
      var sub = (api.EXPERIENCE_LEVELS[p.experienceLevel]||{}).label || "";
      return '<div class="racine-profile-pick">'+
        '<div><strong>'+esc(p.name)+'</strong><small>'+esc(sub)+(p.bodyweightLb?(' · '+esc(p.bodyweightLb)+' lb'):'')+'</small></div>'+
        '<button class="btn-accent" data-pick="'+esc(p.id)+'">Continuer</button>'+
      '</div>';
    }).join("");
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Racine · multi-utilisateur</div>'+
        '<div class="racine-gate-title">Qui s\'entraîne aujourd\'hui ?</div>'+
        '<div class="racine-gate-sub">Chaque profil a ses propres charges, son propre historique et son propre rythme de progression. Tout reste sur cet appareil.</div>'+
        rows+
        '<button class="btn-ghost" id="racineNewProfileBtn" style="width:100%;margin-top:10px">+ Nouveau profil</button>'+
        (list.length ? '<button class="btn-ghost" id="racineExportAllBtn" style="width:100%;margin-top:8px">Exporter tous les profils (JSON)</button>' : '')+
        // Import disponible dès l'écran d'accueil : indispensable pour restaurer
        // un export sur un appareil vierge (après purge Safari), sans devoir
        // créer un profil temporaire pour atteindre les Réglages.
        '<label class="btn-ghost file-label" style="width:100%;margin-top:8px;display:block;text-align:center">Importer un profil (JSON)<input id="racinePickerImportFile" type="file" accept="application/json"/></label>'+
        '<p id="racinePickerStatus" class="status-msg"></p>'+

        '<button class="btn-ghost" id="racineCloseGateBtn" style="width:100%;margin-top:8px">Fermer</button>'+
        '<div style="text-align:center;margin-top:20px"><button type="button" id="racineAdminPinBtn" style="background:none;border:none;cursor:pointer;opacity:.15;color:var(--text2);font-size:11px;padding:4px 8px">▪</button></div>'+
      '</div>'
    );
    Array.prototype.forEach.call(card.querySelectorAll("[data-pick]"), function(btn){
      btn.onclick = function(){
        switchToProfile(btn.getAttribute("data-pick"));
      };
    });
    card.querySelector("#racineNewProfileBtn").onclick = function(){
      wiz = { mode:"create", step:"welcome", answers:{} };
      render();
    };
    var exportAllBtn = card.querySelector("#racineExportAllBtn");
    if(exportAllBtn) exportAllBtn.onclick = function(){ exportAllProfiles(); };
    var pickerImport = card.querySelector("#racinePickerImportFile");
    if(pickerImport) pickerImport.onchange = function(e){
      var file = e.target.files[0]; if(!file) return;
      var r = new FileReader();
      r.onload = function(ev){
        var s = card.querySelector("#racinePickerStatus");
        try{
          var payload = JSON.parse(ev.target.result);
          var result = importExportPayload(payload);
          if(!result.ok){
            if(s){ s.textContent = result.error || "Fichier de profil invalide."; s.className = "status-msg err"; }
            return;
          }
          // Import multi sans bascule de profil : le gate est encore ouvert,
          // on re-rend le sélecteur pour montrer les profils ajoutés.
          if(document.getElementById("racineGate")) render();
        }catch(err){
          if(s){ s.textContent = "Fichier de profil invalide."; s.className = "status-msg err"; }
        }
      };
      r.readAsText(file);
      e.target.value = "";
    };

    var pinBtn = card.querySelector("#racineAdminPinBtn");
    if(pinBtn) pinBtn.onclick = function(){
      var pin = prompt("Code :");
      if(!pin) return;
      verifyAdminPin(pin.trim()).then(function(ok){
        if(!ok) return;
        // PIN correct — chercher ou créer le profil Bertin. Le PIN est la seule
        // porte admin : il pose le flag isAdmin sur le profil au passage.
        var existing = window.CoachProfiles ? CoachProfiles.list().filter(function(p){ return p.name === "Bertin"; }) : [];
        if(existing.length){
          CoachProfiles.update(existing[0].id, { isAdmin: true });
          switchToProfile(existing[0].id);
          return;
        }
        if(window.migrateBertin){
          var prevBooted = !!(CoachProfiles.getActiveId() && CoachProfiles.hasActiveOnboardedProfile());
          var id = window.migrateBertin();
          if(id){
            CoachProfiles.update(id, { isAdmin: true });
            closeGate();
            if(prevBooted){ location.reload(); return; }
            window.coachFullBoot();
            return;
          }
        }
        alert("Profil Bertin introuvable.");
      });
    };
    var closeBtn = card.querySelector("#racineCloseGateBtn");
    if(closeBtn){
      if(CoachProfiles.hasActiveOnboardedProfile()){
        closeBtn.onclick = function(){ closeGate(); };
      } else {
        closeBtn.remove();
      }
    }
    return card;
  }

  // ── Écran : bienvenue / infos de base ───────────────────────────────────
  function renderWelcome(){
    var levels = api.EXPERIENCE_LEVELS;
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Nouveau profil</div>'+
        '<div class="racine-gate-title">On commence par te connaître</div>'+
        '<div class="racine-gate-sub">Ça prend 2 minutes. On va ensuite tester rapidement 5 mouvements clés pour partir avec des poids qui te ressemblent — pas les miens.</div>'+
        '<label>Prénom ou surnom</label>'+
        '<input id="rwName" type="text" class="input-field" placeholder="Ex. Charles"/>'+
        '<label>Poids de corps (optionnel)</label>'+
        '<input id="rwBw" type="number" class="input-field" placeholder="lb"/>'+
        '<label>Niveau d\'expérience</label>'+
        '<div class="btn-row" id="rwLevelRow">'+
          Object.keys(levels).map(function(k){
            return '<button type="button" class="btn-ghost" data-level="'+k+'">'+esc(levels[k].label)+'</button>';
          }).join("")+
        '</div>'+
        '<p class="field-hint" id="rwLevelHint">&nbsp;</p>'+
        '<div class="btn-row">'+
          '<button class="btn-accent" id="rwNext">Suivant</button>'+
        '</div>'+
        '<p id="rwError" class="status-msg err"></p>'+
      '</div>'
    );
    var selectedLevel = "intermediaire";
    var levelBtns = card.querySelectorAll("[data-level]");
    function markLevel(){
      Array.prototype.forEach.call(levelBtns, function(b){
        b.className = (b.getAttribute("data-level")===selectedLevel) ? "btn-accent" : "btn-ghost";
      });
      card.querySelector("#rwLevelHint").textContent = (levels[selectedLevel]||{}).hint || "";
    }
    Array.prototype.forEach.call(levelBtns, function(b){
      b.onclick = function(){ selectedLevel = b.getAttribute("data-level"); markLevel(); };
    });
    markLevel();
    card.querySelector("#rwNext").onclick = function(){
      var name = card.querySelector("#rwName").value.trim();
      if(!name){ card.querySelector("#rwError").textContent = "Donne au moins un prénom ou un surnom."; return; }
      var bw = Number(card.querySelector("#rwBw").value)||null;
      var meta = { name:name, bodyweightLb:bw, experienceLevel:selectedLevel,
        aggressiveness:(levels[selectedLevel]||levels.intermediaire).defaultAggressiveness };
      if(wiz.mode === "create" && !wiz.profileCreated){
        // Nettoie les brouillons abandonnés d'une création précédente non terminée.
        if(window.CoachProfiles){
          CoachProfiles.list().filter(function(p){ return !p.onboarded; }).forEach(function(p){ CoachProfiles.remove(p.id); });
          CoachProfiles.create(meta);
        }
        wiz.profileCreated = true;
      }
      wiz.meta = meta;
      wiz.step = "keyMovements";
      render();
    };
    addCancelAffordance(card);
    return card;
  }

  // ── Écran : mouvements clés (les 5 mini-tests sur une seule page) ───────
  function renderKeyMovements(){
    var plan = api.TEST_PLAN;
    var rows = plan.map(function(test, i){
      var inputs = test.repsOnly
        ? '<div class="racine-test-row">'+
            '<div style="flex:1"><label>Tractions (poids du corps)</label><input id="rk_r_'+test.id+'" type="number" class="input-field" placeholder="ex. 8"/></div>'+
          '</div>'
        : '<div class="racine-test-row">'+
            '<div style="flex:1"><label>Charge (lb)</label><input id="rk_w_'+test.id+'" type="number" class="input-field" placeholder="ex. 135"/></div>'+
            '<div style="flex:0 0 64px"><label>Reps</label><div class="racine-test-fixed-reps">× 8</div></div>'+
            '<div style="flex:1"><label>RPE ressenti</label><input id="rk_p_'+test.id+'" type="number" class="input-field" placeholder="7-8" min="5" max="10" step="0.5"/></div>'+
          '</div>';
      return '<div style="margin-top:'+(i===0?"4":"18")+'px;padding-top:'+(i===0?"0":"14")+'px;'+(i===0?"":"border-top:1px solid var(--border);")+'">'+
        '<strong>'+esc(test.title)+'</strong>'+
        '<div class="field-hint">'+esc(test.subtitle)+' — '+esc(test.guidance)+'</div>'+
        inputs+
      '</div>';
    }).join("");
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Mouvements clés</div>'+
        stepDots(WIZARD_STEPS.length, wizStepIndex())+
        '<div class="racine-gate-title">Tes poids actuels sur 5 mouvements clés</div>'+
        '<div class="racine-gate-sub">Pour chaque mouvement que tu connais : une série de travail propre de <strong>8 répétitions</strong> (pas un essai maximal). Le RPE ressenti affine l\'estimation — sois honnête. Laisse un mouvement vide si tu ne peux pas le tester : on estime pour toi à partir de ton niveau.</div>'+
        rows+
        '<div class="btn-row">'+
          '<button class="btn-accent" id="rkNext">Voir mon estimation</button>'+
        '</div>'+
      '</div>'
    );
    card.querySelector("#rkNext").onclick = function(){
      plan.forEach(function(test){
        if(test.repsOnly){
          var rr = Number(card.querySelector("#rk_r_"+test.id).value)||0;
          wiz.answers[test.id] = (rr>0) ? {reps:rr, repsOnly:true} : null;
          return;
        }
        var w = Number(card.querySelector("#rk_w_"+test.id).value)||0;
        var fixedReps = (window.CoachOnboarding && CoachOnboarding.TEST_REPS) || 8;
        var rpe = Number(card.querySelector("#rk_p_"+test.id).value)||0;
        wiz.answers[test.id] = (w>0) ? {weight:w, reps:fixedReps, rpe:rpe} : null;
      });
      wiz.step = "calculated";
      render();
    };
    addCancelAffordance(card);
    return card;
  }

  // ── Écran : mouvements calculés (estimation dérivée, ajustable) ─────────
  function aggressivenessLabel(v){
    if(v < 0.8) return "Conservateur";
    if(v < 1.1) return "Modéré";
    if(v < 1.35) return "Agressif";
    return "Très agressif";
  }

  // Saut de charge type (lb) pour un mouvement principal à la barre, pour le
  // réglage d'agressivité v — même formule que coachMaxJumpForExercise (base
  // 10 lb, pas 5 lb) mais calculée localement pour refléter la valeur du
  // curseur EN DIRECT, avant qu'elle soit écrite dans state.profile.
  function mainLiftJumpForAggressiveness(v){
    var step = 5, base = 10;
    return Math.max(step, Math.round((base*(Number(v)||1))/step)*step);
  }
  function projectWeeks(startLoad, jump, weeks){
    var out = [], load = Number(startLoad)||0;
    for(var i=0;i<weeks;i++){ load += jump; out.push(load); }
    return out;
  }
  // Exemple concret de vitesse de progression pour 1-2 mouvements déjà
  // calculés à l'écran précédent, pour rendre le curseur d'agressivité
  // interprétable (et plus seulement une étiquette abstraite).
  function aggressivenessExampleHtml(v){
    var jump = mainLiftJumpForAggressiveness(v);
    var vals = (wiz.computed && wiz.computed.values) || {};
    var candidates = [
      {key:"bench", label:"Bench press"},
      {key:"frontSquat", label:"Front squat"}
    ].filter(function(c){ return vals[c.key] || vals[c.key]===0; });
    if(!candidates.length) candidates = [{key:null, label:"Mouvement principal", start:200}];
    return candidates.map(function(c){
      var start = c.start!==undefined ? c.start : vals[c.key];
      var weeks = projectWeeks(start, jump, 3);
      return esc(c.label)+" : "+start+" lb → "+weeks.join(" → ")+" lb sur 3 semaines de séances faciles (RPE ≤ 7)";
    }).join("<br>");
  }

  function renderCalculated(){
    var computed = wiz.computed || api.computeFromAnswers(wiz.answers, wiz.meta.experienceLevel);
    wiz.computed = computed;
    var fieldMapPreview = (typeof PR_FIELD_MAP==="object") ? PR_FIELD_MAP : null;
    var rows = "";
    if(fieldMapPreview){
      var basisMap = (window.CoachOnboarding && CoachOnboarding.REFERENCE_BASIS) || {};
      Object.keys(fieldMapPreview).forEach(function(id){
        var cfg = fieldMapPreview[id];
        var val = computed.values[cfg.profile];
        if(val===undefined) return;
        var basis = basisMap[cfg.profile];
        rows += '<div class="racine-review-item"><label>'+esc(cfg.label)+'</label>'+
          '<input type="number" data-profile-key="'+esc(cfg.profile)+'" value="'+esc(val)+'"/>'+
          (basis ? '<span class="racine-review-basis">'+esc(basis)+'</span>' : '')+
          '</div>';
      });
    }
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Mouvements calculés</div>'+
        stepDots(WIZARD_STEPS.length, wizStepIndex())+
        '<div class="racine-gate-title">Tes poids de départ estimés</div>'+
        '<div class="racine-gate-sub">Calculés à partir de ce que tu as testé. Tu peux ajuster chaque valeur avant de continuer — le moteur de charge prendra ensuite le relais à chaque séance.</div>'+
        '<div class="racine-review-grid">'+rows+'</div>'+
        '<div class="btn-row">'+
          '<button class="btn-accent" id="rcNext">Suivant</button>'+
        '</div>'+
      '</div>'
    );
    card.querySelector("#rcNext").onclick = function(){
      Array.prototype.forEach.call(card.querySelectorAll("[data-profile-key]"), function(inp){
        var key = inp.getAttribute("data-profile-key");
        var v = Number(inp.value);
        // Un champ vidé donne Number("") === 0 : une charge de départ à 0 (ou
        // négative) n'existe pas et produirait un ratio de scaling 0 — on garde
        // alors la valeur calculée au lieu d'enregistrer la corruption.
        if(String(inp.value).trim() !== "" && isFinite(v) && v > 0) computed.values[key] = v;
      });
      if(typeof api.ratiosFromValues==="function"){
        computed.ratios = api.ratiosFromValues(computed.values, wiz.meta.experienceLevel);
      }
      wiz.computed = computed;
      wiz.step = "aggressiveness";
      render();
    };
    addCancelAffordance(card);
    return card;
  }

  // Options du sélecteur d'objectif d'entraînement (vocabulaire CoachSeasonGoals).
  function trainingGoalOptionsHtml(selected){
    var goals = window.CoachSeasonGoals;
    var html = '<option value=""' + (!selected ? ' selected' : '') + '>— À définir plus tard —</option>';
    if(goals) goals.KEYS.forEach(function(k){
      html += '<option value="' + k + '"' + (selected === k ? ' selected' : '') + '>' + esc(goals.LABELS[k]) + '</option>';
    });
    return html;
  }

  // ── Écran : agressivité de la progression + objectif long terme ─────────
  function renderAggressiveness(){
    var agg = wiz.meta.aggressiveness;
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Dernière étape</div>'+
        stepDots(WIZARD_STEPS.length, wizStepIndex())+
        '<div class="racine-gate-title">Vitesse de progression</div>'+
        '<div class="racine-gate-sub">Ce réglage contrôle la taille des sauts de charge proposés quand tes séances sont faciles. Les freins de sécurité (RPE élevé, échecs) restent actifs peu importe ce réglage.</div>'+
        '<label>Pourquoi t\'entraînes-tu ?</label>'+
        '<select id="rrTrainingGoal" class="select-field">'+trainingGoalOptionsHtml(null)+'</select>'+
        '<p class="field-hint">Ton objectif guide les programmes proposés en fin de cycle. Modifiable à tout moment dans Réglages.</p>'+
        '<label style="margin-top:16px">Agressivité de la progression</label>'+
        '<div class="racine-agg-row">'+
          '<input id="rrAgg" type="range" min="0.5" max="1.5" step="0.05" value="'+agg+'"/>'+
          '<span class="racine-agg-label" id="rrAggLabel">'+aggressivenessLabel(agg)+'</span>'+
        '</div>'+
        '<p class="field-hint" id="rrAggExample">'+aggressivenessExampleHtml(agg)+'</p>'+
        '<label style="margin-top:16px">As-tu un objectif de compétition à long terme à suivre ?</label>'+
        '<div class="racine-toggle-row">'+
          '<label><input type="radio" name="rrHasGoal" id="rrHasGoalNo" value="no" checked/> Non, je fais des cycles sans objectif daté</label>'+
          '<label><input type="radio" name="rrHasGoal" id="rrHasGoalYes" value="yes"/> Oui, j\'ai une date à viser</label>'+
        '</div>'+
        '<div id="rrCompDateWrap" style="display:none">'+
          '<label>Date de compétition</label>'+
          '<input id="rrCompDate" type="date" class="input-field"/>'+
        '</div>'+
        '<div class="btn-row">'+
          '<button class="btn-accent" id="rrConfirm">Confirmer et commencer</button>'+
        '</div>'+
      '</div>'
    );
    var aggInput = card.querySelector("#rrAgg");
    aggInput.oninput = function(){
      var v = Number(aggInput.value);
      card.querySelector("#rrAggLabel").textContent = aggressivenessLabel(v);
      card.querySelector("#rrAggExample").innerHTML = aggressivenessExampleHtml(v);
    };
    var compDateWrap = card.querySelector("#rrCompDateWrap");
    Array.prototype.forEach.call(card.querySelectorAll("[name='rrHasGoal']"), function(radio){
      radio.onchange = function(){
        compDateWrap.style.display = card.querySelector("#rrHasGoalYes").checked ? "" : "none";
      };
    });
    card.querySelector("#rrConfirm").onclick = function(){
      wiz.meta.aggressiveness = Number(aggInput.value)||1;
      var goalSel = card.querySelector("#rrTrainingGoal");
      wiz.meta.trainingGoal = goalSel ? (goalSel.value || null) : null;
      var hasGoal = card.querySelector("#rrHasGoalYes").checked;
      var compDate = hasGoal ? card.querySelector("#rrCompDate").value : "";
      wiz.meta.competitionDateIso = compDate || null;
      api.applyToActiveProfile(wiz.meta, wiz.computed);
      wiz = null;
      closeGate();
      window.coachFullBoot();
    };
    addCancelAffordance(card);
    return card;
  }

  function render(){
    var gate = ensureGateEl();
    gate.innerHTML = "";
    var card;
    if(!wiz){
      card = renderPicker();
    } else if(wiz.step === "welcome"){
      card = renderWelcome();
    } else if(wiz.step === "keyMovements"){
      card = renderKeyMovements();
    } else if(wiz.step === "calculated"){
      card = renderCalculated();
    } else {
      card = renderAggressiveness();
    }
    gate.appendChild(card);
  }

  // ── Entrée principale appelée par app.js au boot si aucun profil actif/onboardé.
  api.start = function(){
    var hasOnboarded = (window.CoachProfiles ? CoachProfiles.list() : []).some(function(p){ return p.onboarded; });
    if(hasOnboarded){
      wiz = null; // écran sélecteur
    } else {
      wiz = { mode:"create", step:"welcome", answers:{} };
    }
    render();
  };

  // Ouvre directement le sélecteur de profil (depuis les réglages, "Changer de profil").
  api.openPicker = function(){ wiz = null; render(); };

  // Ouvre directement la création d'un nouveau profil (depuis les réglages).
  api.openCreate = function(){ wiz = { mode:"create", step:"welcome", answers:{} }; render(); };

  // Relance le mini-test pour le profil ACTUELLEMENT actif (recalibrage).
  api.openRecalibrate = function(){
    var p = window.CoachProfiles ? CoachProfiles.getActive() : null;
    wiz = { mode:"recalibrate", step:"welcome", answers:{} };
    render();
    if(p){
      var nameInput = document.getElementById("rwName");
      var bwInput = document.getElementById("rwBw");
      if(nameInput) nameInput.value = p.name||"";
      if(bwInput && p.bodyweightLb) bwInput.value = p.bodyweightLb;
      var btn = document.querySelector('[data-level="'+(p.experienceLevel||"intermediaire")+'"]');
      if(btn) btn.click();
    }
  };

  // ── Écran : tableau de bord clients (aperçu de tous les profils locaux) ──
  function formatLastSession(st){
    var hist = (st && Array.isArray(st.history)) ? st.history : [];
    var dates = hist.map(function(s){ return s && s.date; }).filter(Boolean).sort();
    var last = dates[dates.length-1];
    return last ? ("Dernière séance : "+last) : "Aucune séance enregistrée";
  }
  function renderClientDashboard(){
    var profiles = (window.CoachProfiles ? CoachProfiles.list() : []).filter(function(p){ return p.onboarded; });
    var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
    var rows = profiles.map(function(p){
      var blob = CoachProfiles.exportProfileBlob(p.id) || {};
      var st = blob.state || {};
      var lvl = (api.EXPERIENCE_LEVELS[p.experienceLevel]||{}).label || "";
      var programId = st.cycle && st.cycle.goal;
      var programLabel = (window.focusConfigs && programId && window.focusConfigs[programId]) ? window.focusConfigs[programId].label : "Aucun programme actif";
      var weekLabel = st.week ? ("Semaine "+st.week) : "";
      var isActive = p.id === activeId;
      return '<div class="racine-profile-pick">'+
        '<div><strong>'+esc(p.name)+(isActive?' (actif)':'')+'</strong><small>'+esc(lvl)+'</small>'+
        '<br><small>'+esc(programLabel)+(weekLabel?(' · '+esc(weekLabel)):'')+'</small>'+
        '<br><small>'+esc(formatLastSession(st))+'</small></div>'+
        '<button class="btn-ghost" data-dashpick="'+esc(p.id)+'">Voir</button>'+
      '</div>';
    }).join("") || '<p class="racine-gate-sub">Aucun profil pour l\'instant.</p>';
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Racine · suivi</div>'+
        '<div class="racine-gate-title">Tableau de bord clients</div>'+
        '<div class="racine-gate-sub">Aperçu de tous les profils présents sur cet appareil (le tien, et ceux importés via un fichier reçu d\'un client). "Voir" bascule dans ce profil pour le consulter en détail.</div>'+
        rows+
        '<button class="btn-ghost" id="racineDashCloseBtn" style="width:100%;margin-top:10px">Fermer</button>'+
      '</div>'
    );
    Array.prototype.forEach.call(card.querySelectorAll("[data-dashpick]"), function(btn){
      btn.onclick = function(){
        switchToProfile(btn.getAttribute("data-dashpick"));
      };
    });
    card.querySelector("#racineDashCloseBtn").onclick = function(){ closeGate(); };
    return card;
  }
  // Ouvre le tableau de bord sans toucher au profil actif (lecture seule tant
  // qu'on ne clique pas "Voir"). Indépendant de l'assistant d'intégration.
  api.openClientDashboard = function(){
    if(window.CoachProfiles && CoachProfiles.isActiveAdmin && !CoachProfiles.isActiveAdmin()) return;
    var gate = ensureGateEl();
    gate.innerHTML = "";
    gate.appendChild(renderClientDashboard());
  };

  // ── Panneau "Profil" des réglages (vue Réglages, #profileSettingsBody) ─
  api.renderSettingsPanel = function(){
    var host = document.getElementById("profileSettingsBody");
    if(!host) return;
    var profiles = window.CoachProfiles ? CoachProfiles.list() : [];
    var active = window.CoachProfiles ? CoachProfiles.getActive() : null;
    var lvl = active ? (api.EXPERIENCE_LEVELS[active.experienceLevel]||{}).label : "";
    var agg = (active && Number(active.aggressiveness)) || 1;
    var others = profiles.filter(function(p){ return !active || p.id!==active.id; });
    // L'activation de programmes (privés ou publics) a déménagé dans le panneau
    // admin « Programmes clients » (RacineAdminPrograms) : plus fiable et pour
    // n'importe quel profil. On ne rend plus le sélecteur ici.
    var isAdmin = !!(window.CoachProfiles && CoachProfiles.isActiveAdmin && CoachProfiles.isActiveAdmin());
    host.innerHTML =
      '<p><strong>'+esc(active?active.name:"—")+'</strong>'+(lvl?(' · '+esc(lvl)):'')+(active&&active.bodyweightLb?(' · '+esc(active.bodyweightLb)+' lb'):'')+'</p>'+
      '<label>Pourquoi t\'entraînes-tu ?</label>'+
      '<select id="settingsTrainingGoal" class="select-field">'+trainingGoalOptionsHtml((typeof state==="object"&&state.profile&&state.profile.trainingGoal)||(active&&active.trainingGoal)||null)+'</select>'+
      '<label>Agressivité de la progression</label>'+
      '<div class="racine-agg-row">'+
        '<input id="settingsAggSlider" type="range" min="0.5" max="1.5" step="0.05" value="'+agg+'"/>'+
        '<span class="racine-agg-label" id="settingsAggLabel">'+aggressivenessLabel(agg)+'</span>'+
      '</div>'+
      '<div class="btn-row">'+
        '<button id="recalibrateBtn" class="btn-ghost">Recalibrer mes poids</button>'+
        '<button id="switchProfileBtn" class="btn-ghost">Changer de profil'+(others.length?(' ('+others.length+')'):'')+'</button>'+
        '<button id="newProfileSettingsBtn" class="btn-ghost">Nouveau profil</button>'+
      '</div>'+
      (isAdmin?('<div class="btn-row">'+
        '<button id="clientDashboardBtn" class="btn-ghost">Tableau de bord clients'+(profiles.length>1?(' ('+profiles.length+')'):'')+'</button>'+
      '</div>'):'')+
      '<div class="btn-row">'+
        '<button id="exportProfileBtn" class="btn-ghost">Exporter ce profil (JSON)</button>'+
        '<label class="btn-ghost file-label">Importer un profil<input id="importProfileFile" type="file" accept="application/json"/></label>'+
      '</div>'+
      '<div class="btn-row">'+
        '<button id="exportAllProfilesBtn" class="btn-ghost">Exporter tous les profils (JSON)</button>'+
      '</div>'+
      '<div class="btn-row">'+
        '<button id="coachRxBtn" class="btn-ghost">J\'ai reçu un lien du coach</button>'+
      '</div>'+
      '<div class="btn-row">'+
        '<button id="deleteProfileBtn" class="btn-danger" type="button">Supprimer ce profil</button>'+
      '</div>'+

      '<p id="profileSettingsStatus" class="status-msg"></p>';
    api.bindSettingsPanel();
  };
  api.bindSettingsPanel = function(){
    var slider = document.getElementById("settingsAggSlider");
    if(slider){
      slider.oninput = function(){
        document.getElementById("settingsAggLabel").textContent = aggressivenessLabel(Number(slider.value));
      };
      slider.onchange = function(){
        var v = Number(slider.value)||1;
        if(typeof state!=="object"||!state.profile) return;
        state.profile.aggressiveness = v;
        if(typeof save==="function") save();
        var id = window.CoachProfiles && CoachProfiles.getActiveId();
        if(id) CoachProfiles.update(id, {aggressiveness:v});
        var s=document.getElementById("profileSettingsStatus");
        if(s){s.textContent="✅ Agressivité mise à jour.";s.className="status-msg ok";}
      };
    }
    var goalSel = document.getElementById("settingsTrainingGoal");
    if(goalSel){
      goalSel.onchange = function(){
        var v = (window.CoachSeasonGoals ? CoachSeasonGoals.normalize(goalSel.value) : goalSel.value) || null;
        if(typeof state!=="object"||!state.profile) return;
        state.profile.trainingGoal = v;
        if(typeof save==="function") save();
        var id = window.CoachProfiles && CoachProfiles.getActiveId();
        if(id) CoachProfiles.update(id, {trainingGoal:v});
        var s=document.getElementById("profileSettingsStatus");
        if(s){s.textContent="✅ Objectif mis à jour.";s.className="status-msg ok";}
      };
    }
    var recal = document.getElementById("recalibrateBtn");
    if(recal) recal.onclick = function(){ api.openRecalibrate(); };
    var switchBtn = document.getElementById("switchProfileBtn");
    if(switchBtn) switchBtn.onclick = function(){ api.openPicker(); };
    var newBtn = document.getElementById("newProfileSettingsBtn");
    if(newBtn) newBtn.onclick = function(){ api.openCreate(); };
    var dashBtn = document.getElementById("clientDashboardBtn");
    if(dashBtn) dashBtn.onclick = function(){ api.openClientDashboard(); };
    var exportBtn = document.getElementById("exportProfileBtn");
    if(exportBtn) exportBtn.onclick = function(){
      if(exportActiveProfile()){
        var s=document.getElementById("profileSettingsStatus");
        if(s){s.textContent="✅ Profil exporté.";s.className="status-msg ok";}
      }
    };
    // Prescription du coach reçue par texto : coller le lien (ou le code)
    // ici si le lien s'est ouvert dans Safari au lieu de l'app installée.
    var rxBtn = document.getElementById("coachRxBtn");
    if(rxBtn) rxBtn.onclick = function(){
      if(!(window.RacinePrescription && RacinePrescription.propose)) return;
      var text = prompt("Colle ici le lien (ou le code) reçu de ton coach :");
      if(!text) return;
      if(!RacinePrescription.propose(text)){
        var s = document.getElementById("profileSettingsStatus");
        if(s){ s.textContent = "Lien non reconnu. Recopie le lien complet du message."; s.className = "status-msg err"; }
      }
    };
    var exportAllBtn = document.getElementById("exportAllProfilesBtn");
    if(exportAllBtn) exportAllBtn.onclick = function(){
      if(exportAllProfiles()){
        var s=document.getElementById("profileSettingsStatus");
        if(s){s.textContent="✅ Tous les profils exportés.";s.className="status-msg ok";}
      }
    };
    var importFile = document.getElementById("importProfileFile");
    if(importFile) importFile.onchange = function(e){
      var file = e.target.files[0]; if(!file) return;
      var r = new FileReader();
      r.onload = function(ev){
        var s = document.getElementById("profileSettingsStatus");
        try{
          var payload = JSON.parse(ev.target.result);
          var result = importExportPayload(payload);
          if(!result.ok){
            if(s){s.textContent=result.error||"Fichier de profil invalide.";s.className="status-msg err";}
          }
        }catch(err){
          if(s){s.textContent="Fichier de profil invalide.";s.className="status-msg err";}
        }
      };
      r.readAsText(file);
      e.target.value = ""; // permet de resélectionner le même fichier plus tard
    };
    var delBtn = document.getElementById("deleteProfileBtn");
    if(delBtn) delBtn.onclick = function(){
      var active = CoachProfiles.getActive();
      if(!active) return;
      if(!confirm("Supprimer définitivement le profil \""+active.name+"\" et toutes ses données locales ?")) return;
      CoachProfiles.remove(active.id);
      closeGate();
      if(CoachProfiles.hasActiveOnboardedProfile()){
        window.coachFullBoot();
      } else {
        api.start();
      }
    };
  };

  // ── Rappel d'export ───────────────────────────────────────────────────────
  // Safari peut purger le localStorage d'une web app peu visitée; sans serveur,
  // l'export JSON est la seule sauvegarde. Bannière discrète en haut de l'app
  // si le profil actif a de l'historique et n'a pas été exporté depuis 7 jours
  // (ou jamais). Fermable pour la session (sessionStorage), jamais bloquante.
  var EXPORT_REMINDER_DAYS = 7;
  var EXPORT_REMINDER_DISMISS_KEY = "racineExportReminderDismissed";
  function exportReminderDismissed(){
    try{ return sessionStorage.getItem(EXPORT_REMINDER_DISMISS_KEY) === "1"; }catch(e){ return false; }
  }
  function dismissExportReminder(){
    try{ sessionStorage.setItem(EXPORT_REMINDER_DISMISS_KEY, "1"); }catch(e){}
  }
  function removeExportReminder(){
    var b = document.getElementById("exportReminderBanner");
    if(b) b.remove();
  }
  function renderExportReminder(){
    if(exportReminderDismissed()) return;
    if(!(window.CoachProfiles && CoachProfiles.getActive)) return;
    var p = CoachProfiles.getActive();
    if(!p || !p.onboarded) return;
    // Rien à protéger tant que le profil n'a aucune séance sauvegardée.
    if(!(CoachProfiles.profileHasHistory && CoachProfiles.profileHasHistory(p.id))) return;
    var last = p.lastExportAt ? Date.parse(p.lastExportAt) : NaN;
    var ageDays = isNaN(last) ? null : Math.floor((Date.now() - last) / 86400000);
    if(ageDays !== null && ageDays <= EXPORT_REMINDER_DAYS) return;
    var app = document.querySelector(".app");
    if(!app || document.getElementById("exportReminderBanner")) return;
    var msg = (ageDays === null)
      ? "Ce profil n'a jamais été exporté."
      : "Dernier export il y a " + ageDays + " jours.";
    var banner = el(
      '<div id="exportReminderBanner" class="export-reminder-banner">'+
        '<span class="export-reminder-text">💾 '+msg+' <span>Safari peut effacer les données locales — garde une copie JSON.</span></span>'+
        '<button type="button" class="btn-accent export-reminder-btn" data-export-now>Exporter</button>'+
        '<button type="button" class="export-reminder-close" data-export-dismiss aria-label="Masquer">✕</button>'+
      '</div>'
    );
    app.insertBefore(banner, app.firstChild);
    banner.querySelector("[data-export-now]").onclick = function(){ exportActiveProfile(); };
    banner.querySelector("[data-export-dismiss]").onclick = function(){
      dismissExportReminder();
      removeExportReminder();
    };
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderExportReminder);
  else renderExportReminder();
})();
