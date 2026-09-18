// Racine — programme « Semaines Coach IA ».
//
// Programme autonome standard au sens de CLAUDE.md §3.1 : il expose
// getBlocks/dayMeta/dayIntentions/cycleRules comme n'importe quel autre, et
// l'app ne sait pas qu'il est différent. Sa seule particularité : ses blocs ne
// sont pas écrits dans ce fichier, ils sont lus dans le state du profil
// (CoachAIPlan → state.aiPlan), donc ils changent sans redéploiement.
//
// Pourquoi passer par un vrai programme plutôt que par un patch de séance :
// buildWorkout() est l'entonnoir unique de TOUTES les vues (séance guidée,
// Résultats, PC, WOD+). Un programme le traverse gratuitement. Un mécanisme
// parallèle aurait dû être rebranché dans chaque vue, et aurait divergé.
//
// Les charges : ce fichier n'en écrit aucune. Les exercices sortent de
// CoachAIPlan avec load "—", et CoachCharge.suggestForExercise() calcule le
// poids comme pour tout programme. Le moteur garde la main.
(function(){
  window.COACH_BERTIN_PROGRAMS = window.COACH_BERTIN_PROGRAMS || {};

  var ALL_DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];

  // Tableau MUTÉ SUR PLACE, jamais réassigné. registerProgramsFromIndex()
  // fait un Object.assign({}, programme) au chargement : la copie partage
  // CETTE référence. Muter le contenu met donc à jour focusConfigs aussi ;
  // réassigner la variable ne ferait rien du tout.
  var DAYS = ["lundi","mardi","jeudi","vendredi"];

  function plan(){
    try{ return window.CoachAIPlan || null; }catch(e){ return null; }
  }

  function generatedDays(){
    var p = plan();
    if(!p) return [];
    var seen = {};
    try{
      p.weekNumbers().forEach(function(n){
        var w = p.getWeek(n);
        if(!w || !w.days) return;
        Object.keys(w.days).forEach(function(d){ seen[d] = true; });
      });
    }catch(e){ return []; }
    return ALL_DAYS.filter(function(d){ return seen[d]; });
  }

  // Appelé après chaque écriture de plan (CoachAIPlan.write). Sans ça, une
  // semaine générée sur 5 jours resterait affichée sur 4.
  function refresh(){
    var days = generatedDays();
    if(!days.length) days = ["lundi","mardi","jeudi","vendredi"];
    DAYS.length = 0;
    for(var i = 0; i < days.length; i++) DAYS.push(days[i]);
    return DAYS;
  }

  function emptyBlock(week){
    return [{
      time: "—",
      title: "Aucune semaine générée",
      tag: "Coach IA",
      kind: "error",
      text: "Coach IA n'a pas encore écrit la semaine " + week + ". Ouvre l'onglet Coach IA et demande-lui de la construire. "
          + "Tant qu'elle n'existe pas, rien n'est affiché ici — l'app ne devine pas une séance à ta place."
    }];
  }

  window.COACH_BERTIN_PROGRAMS.ai_custom = {
    id: "ai_custom",
    label: "Semaines Coach IA",
    phase: 0,
    phaseName: "Programmation assistée",
    phaseEnd: "Aucune durée fixe : les semaines existent tant que Coach IA en écrit.",
    impact: "Les séances sont écrites par Coach IA à partir de ton historique, de tes notes et de ta progression réelle. "
          + "Les charges restent calculées par le moteur de Racine.",
    days: DAYS,
    weekLabels: [],
    weekGoals: [],
    rest: "—",
    tag: "COACH IA",
    objective: "assisté",
    audience: "admin",
    frequency: 4,
    versionDate: "2026-09-18",
    versionLabel: "2026-09-18 — semaines générées V1",
    dayIntentions: {},
    dayMeta: {},
    cycleRules: [
      "Coach IA propose, l'athlète accepte : aucune semaine n'apparaît sans validation explicite.",
      "Les charges viennent du moteur de Racine, jamais du texte généré.",
      "Une semaine générée se retire à tout moment — le programme d'origine n'a pas été modifié."
    ],

    getDayLabel: function(day, week){
      try{
        var w = plan() && CoachAIPlan.getWeek(week);
        if(w && w.label) return w.label + " · " + day;
      }catch(e){}
      return null;
    },

    getBlocks: function(day, week){
      var p = plan();
      if(!p) return emptyBlock(week);
      var blocks = null;
      try{ blocks = p.blocksFor(day, week); }catch(e){ blocks = null; }
      if(!blocks || !blocks.length) return emptyBlock(week);
      return blocks;
    }
  };

  // Porte de rafraîchissement, appelée par CoachAIPlan après écriture.
  window.RacineAICustomProgram = {refresh: refresh, days: function(){ return DAYS.slice(); }};
  refresh();
})();
