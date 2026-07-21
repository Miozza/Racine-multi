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
      '<li>Touche les <strong>trois petits points (⋯)</strong> en bas de l’écran, à droite de la barre d’adresse.</li>'+
      '<li>Touche le bouton <strong>Partager</strong> — le carré avec la flèche vers le haut. (Sur certains iPhone, ce bouton est directement en bas de l’écran, sans passer par les ⋯.)</li>'+
      '<li>Descends dans la liste et touche <strong>« Sur l’écran d’accueil »</strong>, puis <strong>Ajouter</strong>.</li>'+
    '</ol>'+
    '<p class="muted">Racine aura ensuite sa propre icône et fonctionnera même sans réseau.</p>';

  function section(title, bodyHtml, open){
    return '<details class="help-section"'+(open?' open':'')+'>'+
      '<summary>'+title+'</summary>'+
      '<div class="help-section-body">'+bodyHtml+'</div>'+
    '</details>';
  }

  function guideHtml(showInstall){
    var install = showInstall
      ? section('📲 Installer sur ton iPhone', INSTALL_STEPS_HTML, true)
      : '';
    return '<div class="tuto-modal-inner help-guide-inner">'+
      '<h2>Guide rapide</h2>'+
      '<p class="muted">Touche une section pour l’ouvrir. Tu peux revenir ici en tout temps : ⚙ Réglages → Guide rapide.</p>'+
      install+
      section('🏋️ Ta séance du jour',
        '<p>L’onglet <strong>WOD</strong> montre ta séance du jour, avec les charges déjà proposées. En haut : les semaines de ton cycle (S1, S2…) et les jours de la semaine — les flèches te déplacent, mais l’app se place déjà au bon endroit toute seule.</p>'+
        '<p>Touche <strong>▶ Séance</strong> pour passer en mode entraînement : un bloc à la fois, en gros, lisible même fatigué. Le <strong>timer</strong> est intégré quand le bloc en demande un, et l’écran reste allumé pendant la séance.</p>'+
        '<p>Chaque mouvement affiche : le format (ex. 4×8 = 4 séries de 8 répétitions), la charge proposée, et le repos suggéré.</p>')+
      section('✍️ Noter tes résultats',
        '<p>Pendant la séance (ou à la fin, dans l’écran Résultats), note pour chaque mouvement : le <strong>poids</strong> réellement utilisé, les <strong>reps</strong> faites, et ton <strong>RPE</strong>.</p>'+
        '<p><strong>Le RPE, c’est l’effort ressenti sur 10 :</strong></p>'+
        '<ul class="help-list">'+
          '<li><strong>6 et moins</strong> — facile, tu avais encore beaucoup de réserve.</li>'+
          '<li><strong>7</strong> — solide mais confortable, ~3 reps en réserve.</li>'+
          '<li><strong>8</strong> — exigeant, ~2 reps en réserve.</li>'+
          '<li><strong>9</strong> — très dur, 1 rep en réserve au mieux.</li>'+
          '<li><strong>10</strong> — maximum absolu, rien dans le réservoir.</li>'+
        '</ul>'+
        '<p>Sois honnête : c’est ce chiffre qui permet à l’app d’ajuster tes prochaines charges. Note ce que tu as <em>vraiment</em> fait, pas ce qui était prévu — et laisse vide ce que tu n’as pas fait.</p>'+
        '<p>Termine par <strong>💾 Sauvegarder la séance</strong>. C’est ce qui alimente ton historique et ta progression.</p>')+
      section('🧠 Les charges proposées',
        '<p>L’app apprend de tes séances : plus tu en enregistres, plus les suggestions deviennent justes. Les premières semaines, elles peuvent être prudentes — c’est normal, elles se calent sur toi.</p>'+
        '<p>Une charge te semble trop lourde ou trop légère ? <strong>Change-la simplement</strong> pendant la séance, c’est prévu pour. L’app tiendra compte de ce que tu as réellement fait.</p>'+
        '<p>Le bouton <strong>(!)</strong> à côté d’une charge explique pourquoi elle est proposée. Le <strong>?</strong> à côté d’un mouvement ouvre sa fiche technique : placement, exécution, erreurs à éviter.</p>')+
      section('📈 PR, Historique et Cycle',
        '<p><strong>PR</strong> : inscris tes records personnels (ton meilleur bench, squat…). Ils servent de point de départ aux suggestions et se sauvegardent avec la date.</p>'+
        '<p><strong>Réfs</strong> : tes charges de référence par mouvement, celles que l’app utilise au quotidien. Tu peux les consulter et les corriger.</p>'+
        '<p><strong>Historique</strong> : toutes tes séances passées, avec des graphiques de progression. C’est ta preuve que ça avance.</p>'+
        '<p><strong>Cycle</strong> : où tu en es dans ton programme — semaine courante, jours faits, jours manqués. Un programme dure en général 6 semaines ; la dernière est souvent plus légère (deload) : c’est voulu, c’est là que le corps encaisse les gains. À la fin d’un cycle, l’app te propose la suite logique.</p>')+
      section('🔒 Tes données',
        '<p>Tout reste sur ton téléphone. Rien n’est envoyé nulle part, pas de compte, pas d’abonnement.</p>'+
        '<p>Dans <strong>⚙ Réglages → Profil</strong>, « Exporter mon profil » crée un fichier de secours (.json) ; « Importer un profil » le recharge. Fais-en une de temps en temps.</p>'+
        '<p><strong>⚠️ Important :</strong> ne supprime pas les « données de sites web » de Safari pour Racine — c’est là que vivent ton historique et tes réglages. En cas de doute, fais une sauvegarde d’abord.</p>')+
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
