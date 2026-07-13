// Racine — prescription coach → client par lien, sans serveur.
// Le coach compose « programme + remplacements de mouvements » dans
// Réglages → Programmes clients et partage un lien; la prescription voyage
// dans le fragment #rx= de l'URL (jamais envoyée sur le réseau — le fragment
// ne quitte pas le navigateur). Côté client, l'app propose Accepter/Refuser :
// rien ne s'applique sans accord explicite et l'historique n'est jamais
// touché. Secours iPhone (le lien peut s'ouvrir dans Safari alors que
// l'app installée a son propre stockage) : coller le lien dans
// Réglages → Profil → « J'ai reçu un lien du coach ».
// Indépendant d'Avis IA (même esprit d'import par texte, autre mécanisme).
// Voir docs/IDEES_FUTURES.md (idée 2 — v1 minimale).
(function(){
  var api = window.RacinePrescription = window.RacinePrescription || {};
  var VERSION = 1;
  var MAX_AGE_DAYS = 30;

  function norm(s){ return String(s||"").trim().toLowerCase(); }
  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];
    });
  }

  // base64url unicode-safe (accents dans les notes), compatible Safari iOS.
  function b64encode(str){
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }
  function b64decode(str){
    str = String(str||"").replace(/-/g,"+").replace(/_/g,"/");
    while(str.length % 4) str += "=";
    return decodeURIComponent(escape(atob(str)));
  }

  // ── Construction côté coach ────────────────────────────────────────────────
  api.buildPatch = function(opts){
    opts = opts || {};
    var swaps = Array.isArray(opts.swaps) ? opts.swaps.filter(function(s){ return s && s.from && s.to; })
      .map(function(s){ return { from:String(s.from), to:String(s.to), note:String(s.note||"") }; }) : [];
    var patch = {
      kind: "racine-rx",
      v: VERSION,
      createdAt: new Date().toISOString(),
      coach: opts.coach || null,
      clientName: opts.clientName || null,
      programId: opts.programId || null,
      swaps: swaps
    };
    if(!patch.programId && !patch.swaps.length) return null;
    return patch;
  };

  api.buildLink = function(patch){
    if(!patch) return null;
    try{
      var base = location.origin + location.pathname + location.search;
      return base + "#rx=" + b64encode(JSON.stringify(patch));
    }catch(e){ return null; }
  };

  // ── Lecture côté client ────────────────────────────────────────────────────
  // Accepte un hash (#rx=…), un lien complet collé, ou le code seul.
  api.parse = function(text){
    text = String(text||"").trim();
    var m = /[#&]rx=([A-Za-z0-9_\-]+)/.exec(text);
    var code = m ? m[1] : (/^[A-Za-z0-9_\-]{24,}$/.test(text) ? text : null);
    if(!code) return null;
    var patch = null;
    try{ patch = JSON.parse(b64decode(code)); }catch(e){ return null; }
    if(!patch || patch.kind !== "racine-rx") return null;
    if(Number(patch.v) > VERSION){
      return { error: "Cette prescription vient d'une version plus récente de Racine. Recharge l'app pour la mettre à jour, puis rouvre le lien." };
    }
    var age = Date.now() - Date.parse(patch.createdAt || "");
    if(!isFinite(age) || age < 0 || age > MAX_AGE_DAYS * 86400000){
      return { error: "Cette prescription a expiré. Demande un nouveau lien à ton coach." };
    }
    if(!patch.programId && !(Array.isArray(patch.swaps) && patch.swaps.length)){
      return { error: "Prescription vide." };
    }
    return { patch: patch };
  };

  function programEntry(id){
    var cat = window.COACH_BERTIN_PROGRAM_INDEX || [];
    for(var i=0;i<cat.length;i++) if(cat[i].id === id) return cat[i];
    return null;
  }

  api.describe = function(patch){
    var lines = [];
    if(patch.programId){
      var entry = programEntry(patch.programId);
      lines.push("Nouveau cycle : " + (entry ? entry.name : patch.programId));
    }
    (patch.swaps||[]).forEach(function(s){
      lines.push("Remplacement : " + s.from + " → " + s.to + (s.note ? " — " + s.note : ""));
    });
    return lines;
  };

  // ── Application (profil ACTIF seulement, après accord explicite) ──────────
  api.applyToActiveProfile = function(patch){
    if(!(window.CoachProfiles && CoachProfiles.getActiveId)) return { ok:false, error:"Profils non chargés." };
    var id = CoachProfiles.getActiveId();
    if(!id || !CoachProfiles.hasActiveOnboardedProfile()) return { ok:false, error:"Aucun profil actif." };
    if(patch.programId && !programEntry(patch.programId)){
      return { ok:false, error:"Programme inconnu dans cette version de l'app. Recharge la page (mise à jour), puis rouvre le lien." };
    }
    // Remplacements d'abord : l'activation du programme re-boote l'UI.
    if(window.RacineMovementSwaps && Array.isArray(patch.swaps)){
      patch.swaps.forEach(function(s){
        if(s && s.from && s.to) RacineMovementSwaps.add(id, s.from, s.to, s.note || "");
      });
    }
    if(patch.programId){
      // Accorde la permission des programmes privés, préserve l'historique,
      // re-boote l'UI du profil actif.
      var res = CoachProfiles.setProfileActiveProgram(id, patch.programId);
      if(!res || !res.ok) return { ok:false, error:(res && res.error) || "Activation impossible." };
    } else if(typeof window.coachFullBoot === "function"){
      window.coachFullBoot();
    }
    return { ok:true };
  };

  // ── Carte Accepter / Refuser ───────────────────────────────────────────────
  function el(html){
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }
  function ensureOverlay(){
    var g = document.getElementById("racineRxGate");
    if(!g){
      g = document.createElement("div");
      g.id = "racineRxGate";
      g.className = "racine-gate";
      document.body.appendChild(g);
    }
    return g;
  }
  function closeOverlay(){
    var g = document.getElementById("racineRxGate");
    if(g) g.remove();
  }
  function stripHash(){
    try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){}
  }
  function showInfoCard(msg){
    var g = ensureOverlay();
    g.innerHTML = "";
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Racine · prescription du coach</div>'+
        '<div class="racine-gate-sub">'+esc(msg)+'</div>'+
        '<button class="btn-ghost" id="rxCloseBtn" style="width:100%">Fermer</button>'+
      '</div>'
    );
    card.querySelector("#rxCloseBtn").onclick = closeOverlay;
    g.appendChild(card);
  }

  function showProposalCard(patch){
    var active = window.CoachProfiles ? CoachProfiles.getActive() : null;
    var lines = api.describe(patch).map(function(l){
      return '<div style="padding:7px 0;border-top:1px solid var(--border);font-size:13px">'+esc(l)+'</div>';
    }).join("");
    var mismatch = (patch.clientName && active && norm(patch.clientName) !== norm(active.name))
      ? '<p class="status-msg err">Prescription préparée pour « '+esc(patch.clientName)+' » — ton profil actif est « '+esc(active.name)+' ».</p>'
      : '';
    var g = ensureOverlay();
    g.innerHTML = "";
    var card = el(
      '<div class="racine-gate-card">'+
        '<div class="racine-gate-eyebrow">Racine · prescription du coach</div>'+
        '<div class="racine-gate-title">'+esc(patch.coach ? patch.coach + " te propose :" : "Ton coach te propose :")+'</div>'+
        lines+
        '<div class="racine-gate-sub" style="margin-top:12px">Rien ne s\'applique sans ton accord. Ton historique et tes résultats sont conservés.</div>'+
        mismatch+
        '<div class="btn-row">'+
          '<button class="btn-accent" id="rxAcceptBtn" style="flex:1">Accepter</button>'+
          '<button class="btn-ghost" id="rxRefuseBtn" style="flex:1">Refuser</button>'+
        '</div>'+
      '</div>'
    );
    card.querySelector("#rxAcceptBtn").onclick = function(){
      var res = api.applyToActiveProfile(patch);
      stripHash();
      if(res.ok) showInfoCard("✅ Appliqué. Ta séance est à jour dans l'onglet WOD.");
      else showInfoCard(res.error || "Application impossible.");
    };
    card.querySelector("#rxRefuseBtn").onclick = function(){
      stripHash();
      closeOverlay();
    };
    g.appendChild(card);
  }

  // Point d'entrée commun : hash au chargement, ou texte collé (Réglages).
  api.propose = function(text){
    var parsed = api.parse(text);
    if(!parsed){ return false; }
    if(parsed.error){ showInfoCard(parsed.error); stripHash(); return true; }
    var active = window.CoachProfiles ? CoachProfiles.getActive() : null;
    if(!active || !active.onboarded){
      // On garde le hash : après avoir choisi son profil, rouvrir le lien marche.
      showInfoCard("Choisis (ou crée) d'abord ton profil, puis rouvre le lien de ton coach.");
      return true;
    }
    showProposalCard(parsed.patch);
    return true;
  };

  function proposeFromHash(){
    try{
      if(location.hash && location.hash.indexOf("rx=") !== -1) api.propose(location.hash);
    }catch(e){}
  }
  if(typeof document !== "undefined"){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", proposeFromHash);
    else proposeFromHash();
  }
})();
