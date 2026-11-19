// Racine — durée réelle d'une séance : le temps écrit + le temps humain.
//
// Pourquoi (2026-11-19) : le créneau `block.time` d'un programme compte le
// travail, pas ce qui l'entoure. Sur Moteur + jambes S3, l'athlète manquait de
// temps lundi et mardi : les blocs de fin sautaient chaque fois. Ce qui
// manquait au compte, c'est le temps humain — charger la barre et monter en
// charge, aller chercher les haltères, changer de machine au milieu de
// l'aérobie, passer d'un poste à l'autre entre deux blocs.
//
// Ce module estime ce temps, de façon volontairement prudente (mieux vaut
// annoncer 5 min de trop que 5 de moins). Il ne modifie rien : il sert à
// l'affichage de la durée (vue WOD), au rappel de retard de la séance guidée
// (scripts/session/schedule_reminder.js) et aux garde-fous des programmes.
// Aucune donnée, aucune clé de stockage. Porte : window.CoachTimeBudget.
(function(){
  // Constantes en minutes, sauf mention. Une seule table : c'est ici qu'on
  // règle le modèle, jamais dans un appelant.
  var T = {
    between: 2,        // entre deux blocs : ranger, changer de poste, lire la carte
    barbellSetup: 2,   // charger la barre, régler le rack ou le banc
    gearSetup: 1,      // haltères, KB, câble, machine, élastique
    bodySetup: 0.5,    // poids du corps : se mettre en place
    ramp: 4,           // montée en charge d'un mouvement principal à la barre
    wodSetup: 1.5,     // installer machine, box, régler le chrono
    machineChange: 1,  // Bike → Row au milieu d'un aérobie continu
    secPerRep: 3,      // une répétition (secondes)
    secPerRepHeavy: 4, // une répétition lourde à la barre (secondes)
    sideSwitch: 10     // changer de côté (secondes)
  };

  var BARBELL = /\b(back squat|front squat|bench press|deadlift|strict press|push press|power clean|clean|snatch|barbell|hip thrust|good morning|pause|tempo)\b/i;
  var BODY = /poids du corps|bodyweight/i;

  function num(s){ return Number(String(s).replace(",", ".")) || 0; }

  // « 16 min » → 16 ; « 10-12 min » → 12 (la borne longue : prudence).
  function writtenMinutes(time){
    var m = String(time || "").match(/(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*min/i);
    if(!m) return 0;
    return m[2] ? num(m[2]) : num(m[1]);
  }

  // « 1:00 avant A2 » → 60 ; « 0:45–2:00 » → 120 ; « 90 sec » → 90 ; « — » → 0.
  function restSeconds(rest){
    var s = String(rest || ""), best = 0, m;
    var rx = /(\d+):(\d{2})/g;
    while((m = rx.exec(s))) best = Math.max(best, num(m[1]) * 60 + num(m[2]));
    if(!best){
      var sec = s.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:s|sec|secondes?)\b/i);
      if(sec) best = num(sec[2] || sec[1]);
    }
    return best;
  }

  // « 5×3 » · « 3×8/jambe » · « 3×30 s/côté » · « 4×10 ». Un format sans
  // séries (« EMOM 8 : … », « 6 min ») renvoie null : il n'est pas compté ici.
  function parseFormat(format){
    var f = String(format || "");
    var m = f.match(/(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*(s|sec|secondes?)?\b/i);
    if(!m) return null;
    return {
      sets: num(m[1]),
      reps: num(m[3] || m[2]),
      timed: !!m[4],
      sided: /\/\s*(jambe|côté|cote|bras|main|side)/i.test(f)
    };
  }

  function setupFor(e){
    if(BODY.test(String(e.load || ""))) return T.bodySetup;
    if(BARBELL.test(String(e.name || ""))) return T.barbellSetup;
    return T.gearSetup;
  }

  // Minutes d'un bloc d'exercices : chaque série, chaque repos écrit (sauf le
  // dernier), l'installation de chaque poste, et la montée en charge du
  // mouvement principal à la barre.
  function exerciseMinutes(block){
    var exs = block.exercises || [];
    var sec = 0, setup = 0, parsedAny = false;
    exs.forEach(function(e){
      var p = parseFormat(e.format);
      setup += setupFor(e);
      if(!p) return;
      parsedAny = true;
      var heavy = block.kind === "main" && BARBELL.test(String(e.name || ""));
      var one = p.timed ? p.reps : p.reps * (heavy ? T.secPerRepHeavy : T.secPerRep);
      if(p.sided) one = one * 2 + T.sideSwitch;
      sec += p.sets * (one + restSeconds(e.rest));
    });
    if(!parsedAny) return 0;
    // Le dernier repos du bloc n'est pas attendu : on passe au bloc suivant.
    var last = exs[exs.length - 1];
    sec -= restSeconds(last && last.rest);
    var ramp = (block.kind === "main" && exs[0] && BARBELL.test(String(exs[0].name || ""))) ? T.ramp : 0;
    return sec / 60 + setup + ramp;
  }

  // Minutes d'un metcon : le temps écrit, plus l'installation et chaque
  // changement de machine d'un aérobie continu (Bike → Row → Bike).
  function wodMinutes(block){
    var w = block.wod || {};
    var base = writtenMinutes(block.time) || num(w.minutes) || num(w.cap);
    var extra = T.wodSetup;
    if(w.format === "steady" && w.moves && w.moves.length > 1){
      for(var i = 1; i < w.moves.length; i++){
        if(String(w.moves[i].name) !== String(w.moves[i - 1].name)) extra += T.machineChange;
      }
    }
    return base + extra;
  }

  // Estimation d'un bloc : jamais moins que ce que le programme a écrit.
  function blockMinutes(block){
    block = block || {};
    var written = writtenMinutes(block.time);
    var est = written;
    if(block.kind === "wod") est = Math.max(written, wodMinutes(block));
    else if(block.exercises && block.exercises.length) est = Math.max(written, exerciseMinutes(block));
    return {written: written, estimated: est};
  }

  // Blocs « en trop » : ce qui suit le metcon et peut sauter sans toucher au
  // cœur de la séance (accessoires, volume, gainage). Le retour au calme n'en
  // fait pas partie : 3 min qui comptent pour la suite.
  var EXTRA = {accessory:1, hypertrophy:1, core:1};

  // Résumé d'une séance. `essential` = ce qui doit tenir ; `full` = tout,
  // accessoires de fin compris.
  function session(blocks){
    var list = (blocks || []).filter(function(b){ return b && b.kind !== "bonus"; });
    var seenWod = false, out = {written: 0, full: 0, essential: 0, transitions: 0, blocks: []};
    list.forEach(function(b, i){
      var m = blockMinutes(b);
      var tr = i > 0 ? T.between : 0;
      if(b.kind === "wod") seenWod = true;
      var extra = seenWod && !!EXTRA[b.kind];
      out.written += m.written;
      out.full += m.estimated + tr;
      out.transitions += tr;
      if(!extra) out.essential += m.estimated + tr;
      out.blocks.push({title: b.title, kind: b.kind, written: m.written, estimated: Math.round(m.estimated * 10) / 10, transition: tr, extra: extra});
    });
    out.full = Math.round(out.full);
    out.essential = Math.round(out.essential);
    return out;
  }

  // Créneau d'un bloc pour le rappel de retard : estimé + la transition qui le
  // précède. Un rappel calé sur le seul temps écrit criait « en retard » à
  // chaque changement de poste.
  function slotMinutes(block, index){
    return blockMinutes(block).estimated + (index > 0 ? T.between : 0);
  }

  window.CoachTimeBudget = {
    T: T,
    writtenMinutes: writtenMinutes,
    restSeconds: restSeconds,
    parseFormat: parseFormat,
    blockMinutes: blockMinutes,
    slotMinutes: slotMinutes,
    session: session
  };
})();
