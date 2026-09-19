// Racine — rendu de la carte « Ce que tes données disent ».
//
// Propriétaire, au sens de docs/ARCHITECTURE.md, de CETTE carte à l'intérieur
// de la vue Historique — comme scripts/session/extra_movements.js possède sa
// carte à l'intérieur de Résultats. renderHistory() ne porte que le point
// d'accroche ; toute la logique d'affichage vit ici.
//
// Pourquoi dans Historique et pas dans Coach IA : l'analyse est gratuite,
// hors-ligne et utile à TOUS les profils, alors que Coach IA est réservé à
// l'admin. L'enfermer derrière la porte admin l'aurait privée de ses lecteurs
// pour aucune raison technique.
(function(){
  "use strict";

  var api = window.CoachInsightsUI = window.CoachInsightsUI || {};

  function esc(s){
    if(window.CoachUI && CoachUI.escapeHtml) return CoachUI.escapeHtml(String(s==null?"":s));
    return String(s==null?"":s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function section(title, items){
    if(!items.length) return "";
    return "<div class='ins-block'>"
      + "<div class='ins-block-title'>" + esc(title) + "</div>"
      + "<ul class='ins-list'>" + items.join("") + "</ul>"
      + "</div>";
  }

  // Chaque constat porte ses chiffres : sans eux, c'est une affirmation qu'on
  // ne peut ni vérifier ni contredire.
  function li(main, detail){
    return "<li><span class='ins-main'>" + esc(main) + "</span>"
         + (detail ? "<span class='ins-detail'>" + esc(detail) + "</span>" : "")
         + "</li>";
  }

  api.render = function(){
    var host = document.getElementById("insightsCard");
    if(!host) return;

    var d;
    try{ d = CoachInsights.build(); }
    catch(e){ host.innerHTML = ""; return; }

    if(!d || d.empty){
      host.innerHTML = "<div class='ins-card'>"
        + "<div class='ins-head'><span class='ins-title'>Ce que tes données disent</span></div>"
        + "<p class='ins-empty'>Pas encore assez de séances enregistrées sur les "
        + d.windowDays + " derniers jours. L'analyse apparaîtra d'elle-même.</p>"
        + "</div>";
      return;
    }

    var html = "";

    html += section("Plateaux", d.plateaus.slice(0, 4).map(function(p){
      return li(p.label,
        p.gainPct + " % d'e1RM sur " + p.sessions + " séances, mais RPE "
        + (p.rpeDelta > 0 ? "+" : "") + p.rpeDelta);
    }));

    html += section("Progresse bien", d.strengths.slice(0, 4).map(function(p){
      return li(p.label, "+" + p.gainPct + " % d'e1RM, RPE "
        + (p.rpeDelta > 0 ? "+" : "") + p.rpeDelta);
    }));

    var b = d.balance || {};
    var bal = [];
    [b.pushPull, b.squatHinge, b.verticalHorizontalPull].forEach(function(x){
      if(!x) return;
      bal.push(li(x.more + " ×" + x.ratio + " plus que " + x.less,
                  x.moreCount + " expositions contre " + x.lessCount));
    });
    html += section("Déséquilibres", bal);

    html += section("Prévus, pas faits récemment", d.gaps.slice(0, 4).map(function(g){
      return li(g.label, g.days === null ? "jamais sur la fenêtre" : "il y a " + g.days + " jours");
    }));

    html += section("Revient dans tes notes", d.noteThemes.slice(0, 4).map(function(t){
      return li(t.label, t.hits + " fois" + (t.movements.length ? " · " + t.movements.join(", ") : ""));
    }));

    if(!html){
      html = "<p class='ins-empty'>Rien de notable à signaler sur les " + d.windowDays
           + " derniers jours. C'est une bonne nouvelle : pas de plateau, pas de déséquilibre marqué.</p>";
    }

    host.innerHTML = "<div class='ins-card'>"
      + "<div class='ins-head'>"
      +   "<span class='ins-title'>Ce que tes données disent</span>"
      +   "<span class='ins-meta'>" + d.sessions + " séances · " + d.windowDays + " jours</span>"
      + "</div>"
      + html
      // La limite de la donnée est dite, pas maquillée : l'historique garde une
      // ligne par mouvement et par séance, pas une ligne par série.
      + "<p class='ins-foot'>Calculé sur ton appareil, sans réseau. « Exposition » = un mouvement "
      + "travaillé dans une séance — l'historique ne compte pas les séries une à une.</p>"
      + "</div>";
  };
})();
