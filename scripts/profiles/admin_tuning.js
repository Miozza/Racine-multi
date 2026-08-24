// Racine — Panneau admin « Calibration du moteur » (Réglages, admin seulement).
// Rend visibles et modifiables les paramètres du moteur de charges déclarés
// dans scripts/charge/tuning_override.js, pour le PROFIL ACTIF uniquement.
//
// Le panneau ne connaît aucun seuil : il lit la table PARAMS (chemin, libellé,
// bornes) et la valeur d'usine capturée au chargement. Ajouter un paramètre
// surchargeable se fait donc dans tuning_override.js seul — ce fichier suit.
//
// Trois garde-fous visibles à l'écran, parce qu'un réglage invisible qu'on ne
// sait pas défaire est pire que pas de réglage du tout :
//   · la valeur d'usine et les bornes sont affichées sous chaque champ;
//   · toute valeur qui s'écarte de l'usine est marquée;
//   · un bandeau dit clairement qu'une calibration est active sur CE profil.
window.RacineAdminTuning = window.RacineAdminTuning || {};

(function(){
  var api = window.RacineAdminTuning;

  function esc(s){
    if(typeof escapeHtml === "function") return escapeHtml(s);
    return String(s==null?"":s).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c];
    });
  }
  function host(){ return document.getElementById("adminTuningBody"); }
  function isAdmin(){ return !!(window.CoachProfiles && CoachProfiles.isActiveAdmin && CoachProfiles.isActiveAdmin()); }
  function engine(){ return window.CoachTuningOverride || null; }
  function status(msg, ok){
    var s = document.getElementById("adminTuningStatus");
    if(s){ s.textContent = msg || ""; s.className = "status-msg" + (ok ? " ok" : (msg ? " err" : "")); }
  }
  function activeName(){
    var p = (window.CoachProfiles && CoachProfiles.getActive) ? CoachProfiles.getActive() : null;
    return (p && p.name) || "profil actif";
  }
  // Affichage court : un entier reste entier, une part garde ses décimales
  // utiles. Sans ça, 0,35 s'affiche « 0.35000000000000003 » après un
  // aller-retour de calcul flottant.
  function fmt(v){
    if(v===null||v===undefined||isNaN(Number(v))) return "—";
    var n = Number(v);
    return (Math.abs(n - Math.round(n)) < 1e-9) ? String(Math.round(n)) : String(Math.round(n*1000)/1000);
  }

  function rowHtml(p){
    var eng = engine();
    var value = eng.value(p.path);
    var factory = eng.factoryValue(p.path);
    var changed = eng.isChanged(p.path);
    return '<div class="tuning-row'+(changed?' tuning-row-changed':'')+'">'
      + '<label for="tuning-'+esc(p.path)+'">'+esc(p.label)+'</label>'
      + '<div class="tuning-controls">'
      +   '<input class="input-field" type="number" inputmode="decimal" id="tuning-'+esc(p.path)+'"'
      +     ' data-tuning-path="'+esc(p.path)+'" value="'+esc(fmt(value))+'"'
      +     ' min="'+esc(String(p.min))+'" max="'+esc(String(p.max))+'" step="'+esc(String(p.step))+'"/>'
      +   '<button type="button" class="btn-ghost" data-tuning-reset="'+esc(p.path)+'">Usine</button>'
      + '</div>'
      + '<div class="tuning-meta">usine '+esc(fmt(factory))+' · bornes '+esc(fmt(p.min))+' – '+esc(fmt(p.max))
      +   (changed?' · <strong>modifié</strong>':'')+'</div>'
      + '</div>';
  }

  function ceilingsHtml(){
    var caps = engine().ceilings();
    var names = Object.keys(caps).sort();
    var h = '<h3>Plafonds manuels</h3>'
      + '<p class="muted">Un plafond posé ici s\'applique immédiatement, sans attendre l\'historique. '
      + 'Laisse le champ vide pour laisser le moteur déduire lui-même le plafond du mouvement.</p>';
    if(!names.length){
      h += '<p class="muted">Aucun plafond manuel : tous les mouvements sont déduits du comportement.</p>';
    }else{
      names.forEach(function(name){
        h += '<div class="tuning-cap-row">'
          + '<span class="tuning-cap-name">'+esc(name)+'</span>'
          + '<span class="tuning-cap-load">'+esc(fmt(caps[name]))+' lb</span>'
          + '<button type="button" class="btn-ghost" data-cap-remove="'+esc(name)+'">Retirer</button>'
          + '</div>';
      });
    }
    h += '<div class="tuning-cap-add">'
      + '<input class="input-field" type="text" id="adminTuningCapName" placeholder="Nom exact du mouvement" autocomplete="off"/>'
      + '<input class="input-field" type="number" inputmode="decimal" id="adminTuningCapLoad" placeholder="lb" min="1" max="2000" step="1"/>'
      + '<button type="button" class="btn-accent" id="adminTuningCapAdd">Fixer le plafond</button>'
      + '</div>';
    return h;
  }

  api.render = function(){
    var h = host();
    if(!h) return;
    if(!isAdmin() || !engine()){ h.innerHTML = ""; return; }

    var eng = engine();
    var params = eng.PARAMS || [];
    var html = "";
    if(eng.isActive()){
      html += '<div class="tuning-banner">Calibration active sur « '+esc(activeName())+' ». '
        + 'Les autres profils gardent les valeurs d\'usine.</div>';
    }
    var groups = [];
    params.forEach(function(p){ if(groups.indexOf(p.group)===-1) groups.push(p.group); });
    groups.forEach(function(g){
      html += '<h3>'+esc(g)+'</h3>';
      params.filter(function(p){ return p.group===g; }).forEach(function(p){ html += rowHtml(p); });
    });
    html += ceilingsHtml();
    html += '<div class="tuning-actions">'
      + '<button type="button" class="btn-danger" id="adminTuningReset">Tout remettre à l\'usine</button>'
      + '</div>'
      + '<p id="adminTuningStatus" class="status-msg"></p>';
    h.innerHTML = html;

    Array.prototype.forEach.call(h.querySelectorAll("[data-tuning-path]"), function(input){
      input.onchange = function(){
        var path = input.getAttribute("data-tuning-path");
        var applied = eng.set(path, input.value);
        if(applied === null){ status("Valeur refusée : entre un nombre dans les bornes affichées.", false); api.render(); return; }
        api.render();
        status("« "+path+" » réglé à "+fmt(applied)+" pour "+activeName()+".", true);
      };
    });
    Array.prototype.forEach.call(h.querySelectorAll("[data-tuning-reset]"), function(btn){
      btn.onclick = function(){
        eng.clear(btn.getAttribute("data-tuning-reset"));
        api.render();
        status("Paramètre revenu à la valeur d'usine.", true);
      };
    });
    Array.prototype.forEach.call(h.querySelectorAll("[data-cap-remove]"), function(btn){
      btn.onclick = function(){
        eng.removeCeiling(btn.getAttribute("data-cap-remove"));
        api.render();
        status("Plafond manuel retiré — le moteur redéduit ce mouvement.", true);
      };
    });
    var capAdd = document.getElementById("adminTuningCapAdd");
    if(capAdd) capAdd.onclick = function(){
      var name = (document.getElementById("adminTuningCapName")||{}).value;
      var load = (document.getElementById("adminTuningCapLoad")||{}).value;
      // Nom exact obligatoire, comme pour les remplacements : le moteur
      // compare des noms de mouvement normalisés, pas des approximations.
      var canonical = (typeof canonicalMovementLabel === "function" && name) ? canonicalMovementLabel(name) : name;
      if(!eng.setCeiling(canonical, load)){
        status("Il faut un nom de mouvement et une charge entre 1 et 2000 lb.", false);
        return;
      }
      api.render();
      status("Plafond fixé à "+fmt(load)+" lb pour « "+canonical+" ».", true);
    };
    var resetAll = document.getElementById("adminTuningReset");
    if(resetAll) resetAll.onclick = function(){
      if(!confirm("Remettre TOUTE la calibration du moteur aux valeurs d'usine pour "+activeName()+" ?")) return;
      eng.reset();
      api.render();
      status("Calibration remise à l'usine.", true);
    };
  };
})();
