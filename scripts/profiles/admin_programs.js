// Racine — Panneau admin « Programmes clients » (Réglages, admin seulement).
// Point unique pour activer un programme (public OU privé) comme cycle courant
// de n'importe quel profil, sans basculer dans son profil. Lecture seule sur le
// state des profils (via CoachProfiles.exportProfileBlob) ; toute écriture passe
// par CoachProfiles.setProfileActiveProgram / grant / revoke (pas d'état parallèle).
window.RacineAdminPrograms = window.RacineAdminPrograms || {};

(function(){
  var api = window.RacineAdminPrograms;
  var selectedId = null;   // profil ciblé (persiste entre rendus)
  var filterText = "";
  var moveCatCache = null; // { profileId, programGoal, cat } — évite de rebalayer tout le cycle à chaque frappe du filtre

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
  function programName(id){
    var e = catalog().filter(function(p){ return p.id === id; })[0];
    return e ? e.name : (id || "—");
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
    var currentGoal = st.cycle && st.cycle.goal;
    var perms = Array.isArray(target.programPermissions) ? target.programPermissions : [];

    var f = filterText.trim().toLowerCase();
    var progs = catalog().filter(function(p){ return !f || String(p.name||"").toLowerCase().indexOf(f) !== -1; });
    var publics = progs.filter(function(p){ return p.visibility !== "private"; });
    var privates = progs.filter(function(p){ return p.visibility === "private"; });

    function card(p){
      var isActive = p.id === currentGoal;
      var granted = perms.indexOf(p.id) !== -1;
      var badge = (p.visibility === "private") ? '<span class="admin-prog-badge priv">Privé</span>' : '<span class="admin-prog-badge pub">Public</span>';
      var stat = isActive ? '<span class="admin-prog-stat actif">ACTIF</span>' : (granted ? '<span class="admin-prog-stat accorde">Accordé</span>' : '');
      var actions = '';
      if(p.visibility === "private"){
        actions += granted
          ? '<button type="button" class="btn-ghost admin-prog-btn" data-revoke="'+esc(p.id)+'">Retirer</button>'
          : '<button type="button" class="btn-ghost admin-prog-btn" data-grant="'+esc(p.id)+'">Accorder</button>';
      }
      if(!isActive) actions += '<button type="button" class="btn-accent admin-prog-btn" data-activate="'+esc(p.id)+'">Activer comme cycle</button>';
      // Prescription par lien : à envoyer au client (texto/WhatsApp) pour
      // appliquer sur SON appareil, sans PIN admin chez lui.
      if(window.RacinePrescription) actions += '<button type="button" class="btn-ghost admin-prog-btn" data-share="'+esc(p.id)+'">Partager le lien</button>';
      return '<div class="admin-prog-card'+(isActive?' is-active':'')+'">'+
        '<div class="admin-prog-head"><strong>'+esc(p.name)+'</strong> '+badge+' '+stat+'</div>'+
        '<div class="admin-prog-actions">'+actions+'</div>'+
      '</div>';
    }

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
      '<label for="adminProgSelectProfile">Profil</label>'+
      '<select id="adminProgSelectProfile" class="input-field">'+
        list.map(function(p){ return '<option value="'+esc(p.id)+'"'+(p.id===target.id?' selected':'')+'>'+esc(p.name)+(p.id===activeId?' (actif)':'')+'</option>'; }).join("")+
      '</select>'+
      '<p class="muted" style="margin:6px 0 12px">'+esc(levelLabel(target.experienceLevel))+
        ' · Cycle actuel : <strong>'+esc(currentGoal ? programName(currentGoal) : "aucun")+'</strong>'+
        (st.week ? (' · Semaine '+esc(st.week)) : '')+'</p>'+
      '<input id="adminProgFilter" class="input-field" type="text" placeholder="Filtrer par nom…" value="'+esc(filterText)+'"/>'+
      '<div class="admin-prog-group"><div class="admin-prog-group-title">Publics</div>'+ (publics.length?publics.map(card).join(""):'<p class="muted">—</p>') +'</div>'+
      '<div class="admin-prog-group"><div class="admin-prog-group-title">Privés</div>'+ (privates.length?privates.map(card).join(""):'<p class="muted">—</p>') +'</div>'+
      swapsHtml+
      '<p id="adminProgStatus" class="status-msg"></p>';
    h.innerHTML = html;

    var sel = document.getElementById("adminProgSelectProfile");
    if(sel) sel.onchange = function(){ selectedId = sel.value; filterText = ""; api.render(); };
    var flt = document.getElementById("adminProgFilter");
    if(flt) flt.oninput = function(){ filterText = flt.value; var pos=flt.selectionStart; api.render(); var f2=document.getElementById("adminProgFilter"); if(f2){ f2.focus(); try{ f2.setSelectionRange(pos,pos); }catch(e){} } };

    Array.prototype.forEach.call(h.querySelectorAll("[data-grant]"), function(b){
      b.onclick = function(){ CoachProfiles.grantProgramPermission(target.id, b.getAttribute("data-grant")); status("Programme accordé.", true); api.render(); };
    });
    Array.prototype.forEach.call(h.querySelectorAll("[data-revoke]"), function(b){
      b.onclick = function(){ CoachProfiles.revokeProgramPermission(target.id, b.getAttribute("data-revoke")); status("Permission retirée.", true); api.render(); };
    });
    // Génère et copie le lien de prescription (programme optionnel + les
    // remplacements actifs du profil ciblé). Fallback : prompt avec le lien
    // si le presse-papier est refusé.
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
          status("✅ Lien copié — envoie-le à "+target.name+" (texto/WhatsApp). Il proposera Accepter/Refuser sur son téléphone.", true);
        }, fallback);
      } else { fallback(); }
    }
    Array.prototype.forEach.call(h.querySelectorAll("[data-share]"), function(b){
      b.onclick = function(){ sharePrescription(b.getAttribute("data-share")); };
    });
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
    Array.prototype.forEach.call(h.querySelectorAll("[data-activate]"), function(b){
      b.onclick = function(){
        var pid = b.getAttribute("data-activate");
        if(!confirm('Activer "'+programName(pid)+'" comme cycle actif de '+target.name+' ? Sa semaine repartira à 1, son historique est conservé.')) return;
        var res = CoachProfiles.setProfileActiveProgram(target.id, pid);
        if(res && res.ok){ status('✅ "'+programName(pid)+'" activé pour '+target.name+'.', true); api.render(); }
        else{ status((res && res.error) || "Activation impossible.", false); }
      };
    });
  };
})();
