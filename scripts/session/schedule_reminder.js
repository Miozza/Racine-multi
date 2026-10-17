// Racine — rappel de retard anticipé de la séance guidée.
// Décision de l'athlète (2026-10-17) : pas de chrono strict ni d'heure fixe —
// il démarre rarement à midi pile. Le repère est SON départ : à l'ouverture de
// la séance, on compare le temps passé aux créneaux prévus (block.time) des
// blocs déjà faits. Rien ne s'affiche tant qu'il est dans les temps ; dès
// 5 min de retard, une mention courte s'ajoute à la ligne du tag
// (« ⏱ +6 min · écourte D. Masse épaules ») — aucune hauteur prise aux
// charges, reps et RPE. La suggestion ne vise que les blocs de fin
// (hypertrophy, puis accessory) : jamais l'échauffement, le travail
// principal ni le cardio.
// Mémoire vive seulement, aucune clé de stockage. Porte : window.CoachScheduleReminder.

(function(){
  var SEUIL = 5;        // minutes de retard avant la première mention
  var ROUGE = 10;       // minutes de retard : la mention passe au rouge
  var TIC = 15000;      // la mention suit la montre sans re-rendre la carte

  var s = { startedAt: 0, furthest: 0, enteredAt: 0, blocks: [], tick: null };

  // « 16 min » → 16 ; « 10-12 min » → 10 ; absent ou illisible → 0.
  function slotMinutes(time){
    var m = String(time || "").match(/(\d+(?:[.,]\d+)?)\s*min/i);
    return m ? Number(m[1].replace(",", ".")) : 0;
  }

  // Retard en minutes à l'instant `now` (ms), sur le bloc le plus avancé
  // atteint. Attendu = début prévu de ce bloc + temps passé dedans, plafonné à
  // son créneau : entrer en retard compte, s'y attarder aussi.
  function lateMinutes(blocks, furthest, startedAt, enteredAt, now){
    if(!startedAt || !blocks || !blocks.length) return 0;
    var debut = 0;
    for(var i = 0; i < furthest && i < blocks.length; i++) debut += slotMinutes(blocks[i].time);
    var creneau = slotMinutes((blocks[furthest] || {}).time);
    var dedans = Math.max(0, (now - enteredAt) / 60000);
    var attendu = debut + Math.min(dedans, creneau);
    return (now - startedAt) / 60000 - attendu;
  }

  // Bloc à écourter parmi ceux qui restent après `index` : d'abord le volume
  // musculaire, sinon le dernier accessoire. null si rien n'est coupable.
  function suggestCut(blocks, index){
    var rest = (blocks || []).slice(index + 1);
    var hyp = rest.filter(function(b){ return b.kind === "hypertrophy"; })[0];
    if(hyp) return hyp.title;
    var acc = rest.filter(function(b){ return b.kind === "accessory"; });
    return acc.length ? acc[acc.length - 1].title : null;
  }

  function note(now){
    var late = lateMinutes(s.blocks, s.furthest, s.startedAt, s.enteredAt, now);
    if(late < SEUIL) return null;
    var min = Math.round(late);
    var cut = suggestCut(s.blocks, s.furthest);
    return { text: "⏱ +" + min + " min" + (cut ? " · écourte " + cut : ""), red: min >= ROUGE };
  }

  function paint(){
    var el;
    try{ el = document.getElementById("guidedLateNote"); }catch(e){ return; }
    if(!el) return;
    var n = note(Date.now());
    el.textContent = n ? " · " + n.text : "";
    el.className = "guided-late-note" + (n ? (n.red ? " is-red" : " is-on") : "");
    // La ligne reste une ligne : sur iPhone, la mention coupe en « … » plutôt
    // que de pousser la carte.
    if(el.parentNode && el.parentNode.classList) el.parentNode.classList.toggle("has-late", !!n);
  }

  function start(blocks, now){
    stop();
    s.blocks = blocks || [];
    s.startedAt = now || Date.now();
    s.enteredAt = s.startedAt;
    s.furthest = 0;
    s.tick = setInterval(paint, TIC);
  }

  // Appelé à chaque rendu de bloc. Revenir en arrière ne crée pas de faux
  // retard : seul le bloc le plus avancé atteint compte.
  function enter(index, now){
    if(!s.startedAt) return;
    if(index > s.furthest){ s.furthest = index; s.enteredAt = now || Date.now(); }
    paint();
  }

  function stop(){
    if(s.tick) clearInterval(s.tick);
    s.tick = null;
    s.startedAt = 0;
  }

  window.CoachScheduleReminder = {
    SEUIL: SEUIL, ROUGE: ROUGE,
    slotMinutes: slotMinutes, lateMinutes: lateMinutes, suggestCut: suggestCut,
    start: start, enter: enter, stop: stop, paint: paint,
    // Pour les garde-fous : la mention qu'afficherait la séance à `now`.
    noteAt: function(now){ return note(now); }
  };
})();
