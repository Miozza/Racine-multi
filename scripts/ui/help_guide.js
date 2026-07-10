// Racine — Guide rapide + bannière d'installation iPhone
// Aide intégrée : l'essentiel de l'utilisation en une modale, sans tutoriel long.
// La bannière d'installation n'apparaît que sur iOS quand l'app tourne dans
// Safari sans être installée sur l'écran d'accueil. Aucune donnée durable modifiée.
(function(){
  "use strict";

  var api = window.RacineHelp = window.RacineHelp || {};
  var BANNER_DISMISS_KEY = "racineInstallBannerDismissed_v1";

  function isStandalone(){
    if(window.navigator.standalone === true) return true;
    try{ if(window.matchMedia && matchMedia("(display-mode: standalone)").matches) return true; }catch(e){}
    return false;
  }
  function isIOS(){
    var ua = navigator.userAgent || "";
    if(/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS se présente comme macOS mais avec écran tactile.
    return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  }
  function bannerDismissed(){
    try{ return localStorage.getItem(BANNER_DISMISS_KEY) === "1"; }catch(e){ return false; }
  }
  function dismissBanner(){
    try{ localStorage.setItem(BANNER_DISMISS_KEY, "1"); }catch(e){}
  }

  var INSTALL_STEPS_HTML =
    '<ol class="help-steps">'+
      '<li>Ouvre Racine dans <strong>Safari</strong> (pas Chrome, pas le navigateur de Messenger).</li>'+
      '<li>Touche le bouton <strong>Partager</strong> — le carré avec la flèche vers le haut, en bas de l’écran.</li>'+
      '<li>Descends dans la liste et touche <strong>« Sur l’écran d’accueil »</strong>, puis <strong>Ajouter</strong>.</li>'+
    '</ol>'+
    '<p class="muted">Racine aura ensuite sa propre icône et fonctionnera même sans réseau.</p>';

  function guideHtml(showInstall){
    var install = showInstall
      ? '<h3>📲 Installer sur ton iPhone</h3>' + INSTALL_STEPS_HTML
      : '';
    return '<div class="tuto-modal-inner help-guide-inner">'+
      '<h2>Guide rapide</h2>'+
      install+
      '<h3>🏋️ Ta séance du jour</h3>'+
      '<p>Ouvre l’onglet <strong>WOD</strong> : c’est ta séance du jour, avec les charges déjà proposées. '+
      'Touche <strong>Mode Séance</strong> pour t’entraîner écran par écran : un bloc à la fois, le timer intégré, et les champs pour noter <strong>poids · reps · RPE</strong> au fur et à mesure.</p>'+
      '<h3>✍️ Noter tes résultats</h3>'+
      '<p>Note ce que tu as vraiment fait, pas ce qui était prévu. Le RPE, c’est l’effort ressenti sur 10 : sois honnête, c’est ce qui permet à l’app d’ajuster tes prochaines charges. Sauvegarde à la fin de la séance.</p>'+
      '<h3>🧠 Les charges proposées</h3>'+
      '<p>L’app apprend de tes séances : plus tu enregistres, plus les suggestions deviennent justes. Une charge te semble trop lourde ou trop légère ? Change-la simplement pendant la séance — c’est prévu pour. Le bouton <strong>(!)</strong> à côté d’une charge explique pourquoi elle est proposée, et le <strong>?</strong> à côté d’un mouvement montre la technique.</p>'+
      '<h3>📈 Suivre ta progression</h3>'+
      '<p><strong>PR</strong> : tes records personnels. <strong>Historique</strong> : toutes tes séances passées. <strong>Cycle</strong> : où tu en es dans ton programme (semaine, jours faits, jours manqués).</p>'+
      '<h3>🔒 Tes données</h3>'+
      '<p>Tout reste sur ton téléphone. Rien n’est envoyé nulle part. Dans <strong>⚙ Réglages</strong>, tu peux sauvegarder tes données dans un fichier au besoin.</p>'+
      '<button type="button" class="btn-accent" data-help-close style="width:100%;margin-top:12px">Fermer</button>'+
    '</div>';
  }

  api.openGuide = function(opts){
    var existing = document.getElementById("helpGuideModal");
    if(existing) existing.remove();
    var showInstall = (opts && opts.install === true) || (isIOS() && !isStandalone());
    var modal = document.createElement("div");
    modal.id = "helpGuideModal";
    modal.className = "tuto-modal";
    modal.innerHTML = guideHtml(showInstall);
    document.body.appendChild(modal);
    setTimeout(function(){ modal.classList.add("visible"); }, 20);
    var close = function(){ modal.classList.remove("visible"); setTimeout(function(){ modal.remove(); }, 220); };
    modal.addEventListener("click", function(e){ if(e.target === modal) close(); });
    var btn = modal.querySelector("[data-help-close]");
    if(btn) btn.addEventListener("click", close);
  };

  function renderInstallBanner(){
    if(!isIOS() || isStandalone() || bannerDismissed()) return;
    var app = document.querySelector(".app");
    if(!app || document.getElementById("installBanner")) return;
    var banner = document.createElement("div");
    banner.id = "installBanner";
    banner.className = "install-banner";
    banner.innerHTML =
      '<span class="install-banner-text">📲 Installe Racine sur ton écran d’accueil</span>'+
      '<button type="button" class="btn-accent install-banner-how" data-install-how>Comment&nbsp;?</button>'+
      '<button type="button" class="install-banner-close" data-install-close aria-label="Masquer">✕</button>';
    app.insertBefore(banner, app.firstChild);
    banner.querySelector("[data-install-how]").addEventListener("click", function(){
      api.openGuide({ install: true });
    });
    banner.querySelector("[data-install-close]").addEventListener("click", function(){
      dismissBanner();
      banner.remove();
    });
  }

  function wireSettingsButton(){
    var btn = document.getElementById("openHelpGuideBtn");
    if(btn) btn.addEventListener("click", function(){ api.openGuide(); });
  }

  function init(){
    renderInstallBanner();
    wireSettingsButton();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
