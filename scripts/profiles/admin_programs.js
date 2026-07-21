// Racine — Panneau admin « Programmes spécialisés » (Réglages, admin seulement).
// Tous les profils vivent sur cet appareil : la grille d'accès accorde/retire
// directement les programmes privés (effet local immédiat, ex-onglet Admin de
// la vue PC). Les remplacements de mouvements gardent un profil ciblé. Le
// panneau ne prétend jamais connaître ou modifier un état distant ; le lien de
// prescription reste disponible pour partager les remplacements.
window.RacineAdminPrograms = window.RacineAdminPrograms || {};

(function(){
  var api = window.RacineAdminPrograms;
  var selectedId = null;   // profil ciblé des remplacements (persiste entre rendus)
  var moveCatCache = null; // { profileId, programGoal, cat } — évite de rebalayer tout le cycle à chaque rendu

  // Délègue au helper global (scripts/ui_modals.js) — même convention que
  // scripts/view_pc.js:pcEsc — pour ne pas faire diverger l'échappement HTML.
  function esc(s){
    if(typeof escapeHtml === "function") return escapeHtml(s);
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c];
    });
  }
  function host(){ return document.getElementById("adminProgramsBody"); }
  function isAdmin(){ return !!(window.CoachProfiles && CoachProfiles.isActiveAdmin && CoachProfiles.isActiveAdmin()); }
  function profiles(){ return (window.CoachProfiles ? CoachProfiles.list() : []).filter(function(p){ return p.onboarded; }); }
  function catalog(){ return window.COACH_BERTIN_PROGRAM_INDEX || []; }
  function levelLabel(lvl){
    var m = (window.CoachOnboarding && CoachOnboarding.EXPERIENCE_LEVELS) || {};
    return (m[lvl] && m[lvl].label) || lvl || "";
  }
  function readState(id){
    var blob = (window.CoachProfiles && CoachProfiles.exportProfileBlob) ? CoachProfiles.exportProfileBlob(id) : null;
    return (blob && blob.state) || {};
  }
  function status(msg, ok){
    var s = document.getElementById("adminProgStatus");
    if(s){ s.textContent = msg || ""; s.className = "status-msg" + (ok ? " ok" : (msg ? " err" : "")); }
  }
  // movementCatalog() balaie tout le cycle actif du profil ciblé (semaines ×
  // jours) : coûteux à refaire à chaque frappe dans le filtre de programmes,
  // qui n'a pourtant aucun rapport avec ce catalogue. Mis en cache par
  // (profil, programme actif) et invalidé seulement quand l'un des deux change.
  function getMovementCatalog(target, st){
    var goal = st.cycle && st.cycle.goal;
    if(moveCatCache && moveCatCache.profileId === target.id && moveCatCache.programGoal === goal){
      return moveCatCache.cat;
    }
    var cat = (window.RacineMovementSwaps && RacineMovementSwaps.movementCatalog)
      ? RacineMovementSwaps.movementCatalog(target.id) : { program:[], others:[] };
    moveCatCache = { profileId: target.id, programGoal: goal, cat: cat };
    return cat;
  }

  api.render = function(){
    var h = host();
    if(!h) return;
    if(!isAdmin()){ h.innerHTML = ""; return; }

    var list = profiles();
    if(!list.length){ h.innerHTML = '<p class="muted">Aucun profil onboardé pour l\'instant.</p>'; return; }
    var activeId = window.CoachProfiles ? CoachProfiles.getActiveId() : null;
    if(!selectedId || !list.some(function(p){ return p.id === selectedId; })) selectedId = activeId || list[0].id;

    var target = list.filter(function(p){ return p.id === selectedId; })[0] || list[0];
    var st = readState(target.id);
    var privates = catalog().filter(function(p){
      return p && p.id && p.visibility !== "public";
    });

    // Grille d'accès : profils en lignes, programmes privés en colonnes.
    // ✓ = accès accordé, · = pas d'accès. Clic = bascule, effet immédiat.
    var gridHtml;
    if(!privates.length){
      gridHtml = '<p class="muted">Aucun programme spécialisé défini.</p>';
    }else{
      var headers = privates.map(function(prog){
        var short = prog.name.replace(/^Phase \d+ — /,'').replace(/^Strict /,'').slice(0,22);
        return '<th style="font-size:10px;font-weight:600;padding:4px 6px;text-align:center;opacity:.7">'+esc(short)+'</th>';
      }).join('');
      var rows = list.map(function(p){
        var cells = privates.map(function(prog){
          var has = Array.isArray(p.programPermissions) && p.programPermissions.indexOf(prog.id) !== -1;
          return '<td style="text-align:center">'+
            '<button type="button" class="pcx-perm-toggle '+(has?'active':'')+'" '+
              'data-perm-profile="'+esc(p.id)+'" data-perm-program="'+esc(prog.id)+'" '+
              'title="'+(has?'Retirer':'Donner')+' «'+esc(prog.name)+'» à '+esc(p.name)+'" '+
              'style="font-size:16px;background:none;border:none;cursor:pointer;opacity:'+(has?'1':'0.25')+'">'+(has?'✓':'·')+'</button>'+
            '</td>';
        }).join('');
        return '<tr><td style="padding:6px 10px 6px 0;white-space:nowrap"><strong>'+esc(p.name)+'</strong></td>'+cells+'</tr>';
      }).join('');
      gridHtml =
        '<p class="muted" style="margin:4px 0 8px">Coche ✓ pour donner accès, · pour retirer. Effet immédiat sur cet appareil.</p>'+
        '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%">'+
          '<thead><tr><th style="text-align:left;padding:4px 10px 4px 0"></th>'+headers+'</tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table></div>';
    }
    var accessHtml =
      '<div class="admin-prog-group"><div class="admin-prog-group-title">Accès aux programmes spécialisés</div>'+
      gridHtml+
      '</div>';

    // Remplacements de mouvements du profil ciblé (scripts/profiles/swaps.js).
    var swaps = (window.RacineMovementSwaps && RacineMovementSwaps.listFor) ? RacineMovementSwaps.listFor(target.id) : [];
    function swapRow(s){
      return '<div class="admin-prog-card">'+
        '<div class="admin-prog-head"><strong>'+esc(s.from)+'</strong> → <strong>'+esc(s.to)+'</strong>'+
        (s.note?' <span class="muted">('+esc(s.note)+')</span>':'')+'</div>'+
        '<div class="admin-prog-actions"><button type="button" class="btn-ghost admin-prog-btn" data-swap-remove="'+esc(s.from)+'">Retirer</button></div>'+
      '</div>';
    }
    var swapsHtml =
      '<div class="admin-prog-group"><div class="admin-prog-group-title">Remplacements de mouvements</div>'+
      // Seule cette section a besoin d'un profil ciblé : les remplacements
      // sont propres à un profil (la grille d'accès, elle, montre tout le monde).
      '<label for="adminProgSelectProfile">Profil</label>'+
      '<select id="adminProgSelectProfile" class="input-field">'+
        list.map(function(p){ return '<option value="'+esc(p.id)+'"'+(p.id===target.id?' selected':'')+'>'+esc(p.name)+(p.id===activeId?' (actif)':'')+'</option>'; }).join("")+
      '</select>'+
      '<p class="muted" style="margin:6px 0 8px">'+esc(levelLabel(target.experienceLevel))+'</p>'+
      '<p class="muted" style="margin:4px 0 8px">Propre à ce profil : partout où sa séance affiche le mouvement d\'origine, l\'app montre le remplaçant (le moteur de charges suit le nouveau nom). Retirer la ligne = retour au programme original.</p>'+
      (swaps.length ? swaps.map(swapRow).join("") : '<p class="muted">Aucun remplacement actif.</p>')+
      // Sélection par liste avec recherche : la syntaxe exacte du nom est
      // requise pour que le moteur de charges reconnaisse le mouvement.
      '<label style="margin-top:6px">Mouvement d\'origine</label>'+
      '<input id="adminSwapFrom" class="input-field" type="text" placeholder="Rechercher un mouvement…" autocomplete="off"/>'+
      '<div id="adminSwapFromList" class="admin-swap-list hidden"></div>'+
      '<label>Remplaçant</label>'+
      '<input id="adminSwapTo" class="input-field" type="text" placeholder="Rechercher un mouvement…" autocomplete="off"/>'+
      '<div id="adminSwapToList" class="admin-swap-list hidden"></div>'+
      '<label>Note pour le client (optionnel)</label>'+
      '<input id="adminSwapNote" class="input-field" type="text" placeholder="ex. épaule sensible — 4 semaines"/>'+
      '<button type="button" class="btn-accent admin-prog-btn" id="adminSwapAdd">+ Ajouter le remplacement</button>'+
      (window.RacinePrescription && swaps.length ? '<button type="button" class="btn-ghost admin-prog-btn" id="adminSwapsShare" style="margin-top:8px">Partager les remplacements (lien)</button>' : '')+
      '</div>';

    var html =
      accessHtml+
      swapsHtml+
      '<p id="adminProgStatus" class="status-msg"></p>';
    h.innerHTML = html;

    // Bascule d'accès direct : même geste que l'ex-onglet Admin de la vue PC.
    Array.prototype.forEach.call(h.querySelectorAll("[data-perm-profile]"), function(btn){
      btn.onclick = function(){
        var pid = btn.getAttribute("data-perm-profile");
        var progId = btn.getAttribute("data-perm-program");
        if(!pid || !progId || !window.CoachProfiles) return;
        var has = btn.classList.contains("active");
        if(has) CoachProfiles.revokeProgramPermission(pid, progId);
        else CoachProfiles.grantProgramPermission(pid, progId);
        api.render();
        var name = (list.filter(function(p){ return p.id===pid; })[0]||{}).name || pid;
        status((has ? "❌ Retiré : " : "✅ Accordé : ") + progId + " → " + name, true);
      };
    });
    var sel = document.getElementById("adminProgSelectProfile");
    if(sel) sel.onchange = function(){ selectedId = sel.value; api.render(); };

    // Génère et copie le lien de prescription (remplacements actifs du profil
    // ciblé ; programme optionnel, plus utilisé depuis la grille d'accès
    // directe). Fallback : prompt avec le lien si le presse-papier est refusé.
    function sharePrescription(programId){
      if(!window.RacinePrescription) return;
      var me = (window.CoachProfiles && CoachProfiles.getActive && CoachProfiles.getActive()) || {};
      var patch = RacinePrescription.buildPatch({
        coach: me.name || null,
        clientName: target.name,
        programId: programId || null,
        swaps: (window.RacineMovementSwaps && RacineMovementSwaps.listFor) ? RacineMovementSwaps.listFor(target.id) : []
      });
      var link = patch && RacinePrescription.buildLink(patch);
      if(!link){ status("Rien à partager (aucun programme ni remplacement).", false); return; }
      function fallback(){ try{ prompt("Copie ce lien et envoie-le à "+target.name+" :", link); }catch(e){} }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(link).then(function(){
          status("Lien copié — envoie-le à "+target.name+".", true);
        }, fallback);
      } else { fallback(); }
    }
    var swapsShare = document.getElementById("adminSwapsShare");
    if(swapsShare) swapsShare.onclick = function(){ sharePrescription(null); };
    // Sélecteurs de mouvements avec recherche. Le groupe « Programme actuel »
    // liste les mouvements réellement présents dans le cycle du profil ciblé
    // (les candidats naturels), puis le catalogue complet.
    var moveCat = getMovementCatalog(target, st);
    function canonicalMovement(v){
      var n = String(v||"").trim().toLowerCase();
      if(!n) return null;
      var pool = moveCat.program.concat(moveCat.others);
      for(var i=0;i<pool.length;i++) if(pool[i].toLowerCase() === n) return pool[i];
      return null;
    }
    function bindMovementPicker(inputId, listId){
      var inp = document.getElementById(inputId), listEl = document.getElementById(listId);
      if(!inp || !listEl) return;
      function optBtn(n){ return '<button type="button" class="admin-swap-option" data-pick="'+esc(n)+'">'+esc(n)+'</button>'; }
      function openList(){
        var q = String(inp.value||"").trim().toLowerCase();
        function match(n){ return !q || n.toLowerCase().indexOf(q) !== -1; }
        var prog = moveCat.program.filter(match);
        var rest = moveCat.others.filter(match);
        var html = "";
        if(prog.length) html += '<div class="admin-swap-group">Programme actuel de '+esc(target.name)+'</div>'+prog.slice(0,30).map(optBtn).join("");
        if(rest.length) html += '<div class="admin-swap-group">Tous les mouvements</div>'+rest.slice(0,30).map(optBtn).join("");
        listEl.innerHTML = html || '<div class="admin-swap-group">Aucun mouvement trouvé</div>';
        listEl.classList.remove("hidden");
        Array.prototype.forEach.call(listEl.querySelectorAll("[data-pick]"), function(b){
          b.onclick = function(){
            inp.value = b.getAttribute("data-pick");
            listEl.classList.add("hidden");
          };
        });
      }
      inp.oninput = openList;
      inp.onfocus = openList;
    }
    bindMovementPicker("adminSwapFrom", "adminSwapFromList");
    bindMovementPicker("adminSwapTo", "adminSwapToList");
    var swapAdd = document.getElementById("adminSwapAdd");
    if(swapAdd) swapAdd.onclick = function(){
      if(!(window.RacineMovementSwaps && RacineMovementSwaps.add)) return;
      // Syntaxe exacte obligatoire : on ne pose que des noms du catalogue,
      // sinon le moteur de charges ne reconnaîtrait pas le mouvement.
      var fromC = canonicalMovement((document.getElementById("adminSwapFrom")||{}).value);
      var toC = canonicalMovement((document.getElementById("adminSwapTo")||{}).value);
      if(!fromC || !toC){
        status("Choisis les deux mouvements dans la liste (le moteur de charges exige le nom exact).", false);
        return;
      }
      var res = RacineMovementSwaps.add(target.id, fromC, toC,
        (document.getElementById("adminSwapNote")||{}).value);
      // "fromC" hors du groupe "Programme actuel" n'est pas le nom exact d'un
      // exercice structuré de ce cycle : le remplacement ne touchera que les
      // mentions en texte libre (warm-up, circuits), pas la séance chargée.
      var fromInProgram = moveCat.program.some(function(n){ return n.toLowerCase() === fromC.toLowerCase(); });
      var warn = (res.ok && !fromInProgram)
        ? " ⚠️ « "+fromC+" » n'est pas un exercice structuré du programme actuel de "+target.name+" : le remplacement ne s'appliquera qu'aux mentions en texte libre, pas à une séance chargée avec ce nom."
        : "";
      if(res.ok){ api.render(); status("✅ Remplacement ajouté pour "+target.name+"."+warn, true); }
      else{ status(res.error || "Ajout impossible.", false); }
    };
    Array.prototype.forEach.call(h.querySelectorAll("[data-swap-remove]"), function(b){
      b.onclick = function(){
        if(!(window.RacineMovementSwaps && RacineMovementSwaps.remove)) return;
        RacineMovementSwaps.remove(target.id, b.getAttribute("data-swap-remove"));
        api.render();
        status("Remplacement retiré — retour au programme original.", true);
      };
    });
  };
})();
