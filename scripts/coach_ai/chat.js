// Racine — Coach IA : la conversation et sa mémoire.
//
// Tient le fil du dialogue, le carnet du coach, construit la consigne système,
// fait tourner la boucle d'outils et rend à l'UI un tour de coach : du texte,
// et éventuellement des propositions à valider.
//
// DEUX MÉMOIRES, toutes deux plafonnées et HORS du state du profil :
//  - le FIL (`racine_coach_ai_thread_v2::<profil>`) : les derniers échanges,
//    en TEXTE SEUL. Les blocs techniques (tool_use, tool_result, réflexion)
//    ne sont jamais stockés : ils servaient à la boucle, pas à la mémoire, et
//    une coupe au milieu d'une paire tool_use / tool_result rendait la
//    requête suivante invalide (bug de la v1). Le fil est réaffiché tel quel
//    à l'ouverture de l'écran, réponses du coach comprises ;
//  - le CARNET (`racine_coach_ai_memory_v1::<profil>`) : 20 faits durables
//    que le coach retient lui-même (outil `retenir`) ou que l'athlète ajoute.
//    C'est lui qui fait la mémoire longue : quelques Ko, relus à chaque
//    message, au lieu de mois de conversation.
//
// Ce qui sort du fil n'est pas perdu si la sauvegarde GitHub est active :
// chaque échange y est archivé (scripts/sync/github_backup.js), en sens
// unique. Le téléphone ne garde que ce qui sert à la conversation en cours.
//
// Pourquoi hors du state : l'export JSON sert à restaurer un athlète
// (CLAUDE.md §2.1), pas à archiver un chat ; et le quota local n'a aucune
// copie serveur — entre une séance de 2024 et une conversation de la semaine
// dernière, la séance gagne.
(function(){
  "use strict";

  var api = window.CoachAIChat = window.CoachAIChat || {};

  var KEY_BASE = "racine_coach_ai_thread_v2";
  var LEGACY_BASE = "racine_coach_ai_chat_v1";   // v1 : messages API bruts
  var MEMORY_BASE = "racine_coach_ai_memory_v1";
  var SCHEMA = 2;
  var MAX_MESSAGES = 40;     // tours gardés sur l'appareil
  var MAX_BYTES = 60000;     // plafond du fil (≈ 60 Ko), le plus ancien part d'abord
  var MAX_TEXT = 6000;       // un tour au-delà est tronqué
  var API_WINDOW = 12;       // tours renvoyés au modèle à chaque message
  var MAX_FACTS = 20;        // carnet du coach
  var MAX_FACT_LEN = 240;
  var MAX_TOOL_ROUNDS = 8;   // garde-fou de coût : borne la boucle d'outils (lire semaine + historique + mouvement tient dedans)

  function str(v){ return String(v==null?"":v).trim(); }
  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }
  function uid(){ return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function normFact(v){
    var s = str(v).toLowerCase();
    try{ s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }catch(e){}
    return s.replace(/[^a-z0-9]+/g, " ").trim();
  }

  function profileId(){
    try{ return window.CoachProfiles ? str(CoachProfiles.getActiveId()) : ""; }catch(e){ return ""; }
  }
  function storageKey(){ var id = profileId(); return id ? (KEY_BASE + "::" + id) : KEY_BASE; }
  function legacyKey(){ var id = profileId(); return id ? (LEGACY_BASE + "::" + id) : LEGACY_BASE; }
  function memoryKey(){ var id = profileId(); return id ? (MEMORY_BASE + "::" + id) : MEMORY_BASE; }

  // ── Le fil ─────────────────────────────────────────────────────────────

  function emptyThread(){ return {schema: SCHEMA, turns: [], archivedAt: ""}; }

  // Migration v1 → v2 : la v1 stockait les messages API bruts. On en garde
  // le texte (questions ET réponses), on jette les rouages. Les réponses de
  // la v1 n'étaient jamais réaffichées : la migration les rend visibles.
  function migrateLegacy(){
    var raw = null;
    try{ raw = localStorage.getItem(legacyKey()); }catch(e){ return null; }
    if(!raw) return null;
    var list = [];
    try{ list = JSON.parse(raw); }catch(e){ list = []; }
    var thread = emptyThread();
    (Array.isArray(list) ? list : []).forEach(function(m){
      if(!m) return;
      var text = "";
      if(typeof m.content === "string") text = m.content;
      else if(Array.isArray(m.content)){
        text = m.content.filter(function(b){ return b && b.type === "text"; }).map(function(b){ return str(b.text); }).join("\n\n");
      }
      if(!str(text)) return;
      thread.turns.push({id: uid(), role: m.role === "assistant" ? "coach" : "user", text: str(text).slice(0, MAX_TEXT), at: "", via: "api"});
    });
    if(!writeThread(thread)) return null;
    // La v1 n'est retirée qu'une fois la v2 écrite : rien ne se perd en route.
    try{ localStorage.removeItem(legacyKey()); }catch(e){}
    return thread;
  }

  function readThread(){
    try{
      var raw = localStorage.getItem(storageKey());
      if(!raw){ return migrateLegacy() || emptyThread(); }
      var parsed = JSON.parse(raw);
      if(!parsed || !Array.isArray(parsed.turns)) return emptyThread();
      return {schema: SCHEMA, turns: parsed.turns, archivedAt: str(parsed.archivedAt)};
    }catch(e){ return emptyThread(); }
  }
  function writeThread(thread){
    thread = thread || emptyThread();
    var turns = (thread.turns || []).slice(-MAX_MESSAGES);
    var out = {schema: SCHEMA, turns: turns, archivedAt: str(thread.archivedAt)};
    var json = JSON.stringify(out);
    while(json.length > MAX_BYTES && out.turns.length > 2){
      out.turns.shift();
      json = JSON.stringify(out);
    }
    try{ localStorage.setItem(storageKey(), json); return true; }
    catch(e){ return false; /* quota : la conversation est jetable, on n'échoue pas dessus */ }
  }

  function cleanProposal(p){
    return {name: str(p && p.name), input: (p && p.input) || {}, status: str(p && p.status) || "pending", decidedAt: str(p && p.decidedAt)};
  }

  api.turns = function(){ return readThread().turns.slice(); };
  api.addTurn = function(turn){
    turn = turn || {};
    var t = {
      id: uid(),
      role: (turn.role === "coach" || turn.role === "system") ? turn.role : "user",
      text: str(turn.text).slice(0, MAX_TEXT),
      at: nowIso(),
      via: turn.via === "pont" ? "pont" : "api"
    };
    if(Array.isArray(turn.proposals) && turn.proposals.length) t.proposals = turn.proposals.slice(0, 12).map(cleanProposal);
    if(Array.isArray(turn.memos) && turn.memos.length) t.memos = turn.memos.slice(0, 5).map(str);
    if(!t.text && !t.proposals && !t.memos) return null;
    var thread = readThread();
    thread.turns.push(t);
    writeThread(thread);
    return t;
  };
  // Décision de l'athlète sur une proposition : on garde la trace dans le fil,
  // ce qui permet au coach de savoir ce qui a été accepté ou refusé.
  api.setProposalStatus = function(turnId, index, status){
    var thread = readThread();
    var turn = thread.turns.filter(function(t){ return t.id === turnId; })[0];
    if(!turn || !turn.proposals || !turn.proposals[index]) return false;
    turn.proposals[index].status = status;
    turn.proposals[index].decidedAt = nowIso();
    return writeThread(thread);
  };
  api.findProposal = function(turnId, index){
    var turn = readThread().turns.filter(function(t){ return t.id === turnId; })[0];
    return (turn && turn.proposals && turn.proposals[index]) || null;
  };
  api.history = api.turns;   // compatibilité
  api.clear = function(){
    // removeItem sur CETTE clé de conversation uniquement. Jamais
    // localStorage.clear() ni de suppression en masse (CLAUDE.md §2.1).
    // Le carnet du coach n'est pas touché : il a son propre bouton.
    try{ localStorage.removeItem(storageKey()); }catch(e){}
    return [];
  };

  // ── Le carnet du coach ─────────────────────────────────────────────────

  function readMemory(){
    try{
      var parsed = JSON.parse(localStorage.getItem(memoryKey()) || "null");
      return (parsed && Array.isArray(parsed.facts)) ? parsed.facts : [];
    }catch(e){ return []; }
  }
  function writeMemory(facts){
    try{ localStorage.setItem(memoryKey(), JSON.stringify({schema: 1, facts: facts.slice(-MAX_FACTS)})); return true; }
    catch(e){ return false; }
  }
  api.memory = function(){ return readMemory().slice(); };
  api.remember = function(text, source){
    text = str(text).replace(/\s+/g, " ").slice(0, MAX_FACT_LEN);
    if(!text) return {ok:false, error:"Fait vide."};
    var facts = readMemory();
    // Un fait déjà noté n'est pas dupliqué : il remonte simplement en tête.
    var key = normFact(text);
    facts = facts.filter(function(f){ return normFact(f.text) !== key; });
    var fact = {id: uid(), text: text, at: nowIso(), source: source === "athlete" ? "athlete" : "coach"};
    facts.push(fact);
    if(!writeMemory(facts)) return {ok:false, error:"Écriture impossible (stockage local)."};
    return {ok:true, fact: fact};
  };
  api.forget = function(id){
    var facts = readMemory();
    var next = facts.filter(function(f){ return f.id !== id; });
    if(next.length === facts.length) return false;
    return writeMemory(next);
  };
  api.clearMemory = function(){
    try{ localStorage.removeItem(memoryKey()); }catch(e){}
    return [];
  };
  api.memoryText = function(){
    var facts = readMemory();
    if(!facts.length) return "";
    return facts.map(function(f){ return "- " + f.text + " (" + str(f.at).slice(0, 10) + (f.source === "athlete" ? ", noté par l'athlète" : "") + ")"; }).join("\n");
  };

  // Taille réelle sur l'appareil — affichée dans les réglages.
  api.usage = function(){
    var t = 0, m = 0;
    try{ t = (localStorage.getItem(storageKey()) || "").length; }catch(e){}
    try{ m = (localStorage.getItem(memoryKey()) || "").length; }catch(e){}
    return {turns: readThread().turns.length, bytes: t + m, facts: readMemory().length, maxTurns: MAX_MESSAGES, maxFacts: MAX_FACTS};
  };

  // ── Rendu texte du fil (pont et archive) ───────────────────────────────

  function proposalSummary(p){
    var title = "";
    try{ title = window.CoachAIPatch ? CoachAIPatch.describe(p).title : p.name; }catch(e){ title = p.name; }
    var st = {accepted: "acceptée", refused: "refusée", pending: "en attente"}[p.status] || p.status;
    return title + " (" + st + ")";
  }
  function turnText(t){
    var out = str(t.text);
    if(t.proposals && t.proposals.length) out += (out ? "\n" : "") + "[Propositions : " + t.proposals.map(proposalSummary).join(" · ") + "]";
    if(t.memos && t.memos.length) out += (out ? "\n" : "") + "[Retenu dans le carnet : " + t.memos.join(" · ") + "]";
    return out;
  }
  // Les derniers échanges, pour le pont copier-coller (qui n'a pas de fil).
  api.recentText = function(n){
    var turns = readThread().turns.filter(function(t){ return t.role !== "system"; }).slice(-(n || 6));
    return turns.map(function(t){
      var who = t.role === "coach" ? "Coach" : "Athlète";
      var txt = turnText(t);
      if(txt.length > 1500) txt = txt.slice(0, 1500) + " […]";
      return "**" + who + "** (" + str(t.at).slice(0, 16).replace("T", " ") + ") :\n" + txt;
    }).join("\n\n");
  };

  // Archive GitHub : les tours postérieurs à la dernière archive, en Markdown.
  api.pendingArchive = function(){
    var thread = readThread();
    var since = str(thread.archivedAt);
    var turns = thread.turns.filter(function(t){ return t.role !== "system" && str(t.at) && (!since || t.at > since); });
    if(!turns.length) return null;
    var md = turns.map(function(t){
      return "### " + (t.role === "coach" ? "Coach" : "Athlète") + " · " + str(t.at).slice(0, 16).replace("T", " ") + " UTC"
        + (t.via === "pont" ? " · copier-coller" : "") + "\n\n" + turnText(t) + "\n";
    }).join("\n");
    return {upTo: turns[turns.length - 1].at, from: turns[0].at, count: turns.length, markdown: md};
  };
  api.markArchived = function(iso){
    var thread = readThread();
    if(str(iso) > str(thread.archivedAt)){ thread.archivedAt = str(iso); writeThread(thread); }
  };

  // Ce qu'on renvoie au modèle : une fenêtre courte de texte, alternée
  // user / assistant, commençant par user. Jamais de bloc d'outil orphelin.
  function windowMessages(){
    var turns = readThread().turns.filter(function(t){ return (t.role === "user" || t.role === "coach") && turnText(t); }).slice(-API_WINDOW);
    var msgs = [];
    turns.forEach(function(t){
      var role = t.role === "coach" ? "assistant" : "user";
      var text = turnText(t);
      var last = msgs[msgs.length - 1];
      if(last && last.role === role) last.content += "\n\n" + text;
      else msgs.push({role: role, content: text});
    });
    while(msgs.length && msgs[0].role !== "user") msgs.shift();
    return msgs;
  }

  // ── Consigne système ───────────────────────────────────────────────────
  //
  // Le contexte athlète est mis en cache : il est long, stable d'un message à
  // l'autre, et se place donc AVANT tout ce qui varie (prompt caching = match
  // de préfixe). La question de l'athlète, elle, vit dans `messages`.

  // Le manuel de l'application : ce qu'un coach intégré doit savoir de son
  // environnement sans avoir à le deviner. Texte fixe, donc dans le préfixe
  // mis en cache. À tenir à jour quand un écran ou un outil change.
  var MANUEL = [
    "MANUEL DE RACINE — ton environnement.",
    "- Racine est une application web (PWA) de CrossFit et de force. Les données de l'athlète vivent sur son téléphone ; une copie part sur GitHub après chaque séance. Tu parles au profil admin.",
    "- Écrans : WOD (la séance du jour et la séance guidée, où l'athlète saisit charges, reps et RPE), Charge (charges de travail et records), Cycle (programme actif, semaine en cours, choix du programme), Historique (séances faites, progression), Coach IA (toi), Réglages.",
    "- Un programme = des semaines × des jours d'entraînement. Une séance = des blocs (échauffement, principal, secondaire, accessoires, metcon/WOD, mobilité). Un exercice = nom, format (séries × reps), repos, consigne. La semaine du cycle avance quand l'athlète la passe dans l'app, pas avec le calendrier.",
    "- Les charges viennent du moteur : e1RM calculés sur l'historique réel, RPE (pas de hausse après un RPE ≥ 9), ratios de force du profil, arrondi au matériel disponible. Un % écrit dans un programme est un % d'un athlète de référence, ramené au niveau réel par le moteur. Une semaine dont le libellé dit deload/récupération/facile, ou une consigne technique/léger/facile, coupe la progression automatique.",
    "- Deux charges différentes, à ne jamais confondre : « suggéré avant la séance » est ce que le moteur proposait au moment de la séance (figé dans le résultat) ; « suggestion actuelle » ou « charge du moteur » est ce qu'il propose MAINTENANT pour la prochaine fois, recalculé après les dernières séances. Pour comparer suggéré et fait, utilise toujours la première. Quand une série porte « aucune suggestion enregistrée », dis-le : ne la remplace jamais par la suggestion actuelle.",
    "- Brain est la mémoire du moteur : il note si chaque charge prédite était juste, trop ambitieuse ou trop prudente, et corrige la suivante.",
    "- Ce que tu fais : LIRE (outils consulter_*, sans permission), RETENIR un fait durable (outil retenir, carnet visible par l'athlète), PROPOSER (outils proposer_*, carte Accepter / Refuser).",
    "- Ce qu'une proposition acceptée change : un remplacement s'applique partout jusqu'à son retrait ; un ajustement modifie un exercice d'une séance précise ; une semaine écrite va dans le programme « Semaines Coach IA », que l'athlète doit choisir dans l'onglet Cycle pour la suivre. Tout est réversible.",
    "- Ce que tu ne peux pas faire : écrire une charge, changer de programme ou de semaine, saisir ou corriger un résultat, modifier l'historique. Quand l'athlète le demande, dis-lui où le faire dans l'app (écran et geste)."
  ].join("\n");

  function systemBlocks(){
    var contexte = "";
    try{ contexte = window.CoachAIContext ? CoachAIContext.build() : ""; }catch(e){}

    var consigne = [
      "Tu es le coach d'entraînement intégré à Racine, une application de CrossFit et de force.",
      "Tu parles à l'athlète directement, en français, au tutoiement. Il te lit sur un iPhone, souvent debout dans un gym : réponds court et concret. Pas de listes à rallonge, pas de préambule.",
      "",
      "CE QUE TU DÉCIDES :",
      "- le choix des mouvements, leur ordre, le volume, les séries et les répétitions ;",
      "- la structure d'une semaine et l'intention de chaque journée ;",
      "- le repérage de ce qui stagne, de ce qui progresse, et de ce qui revient dans les notes de l'athlète.",
      "",
      "CE QUE TU NE DÉCIDES PAS — LES CHARGES.",
      "Racine possède un moteur de charges calibré sur l'historique réel de cet athlète : ses e1RM, sa fiabilité de RPE par mouvement, son matériel, ses arrondis de rack. Il sait des choses que tu ne peux pas deviner depuis une conversation.",
      "N'écris donc jamais un poids en livres dans une proposition. Les outils n'ont d'ailleurs aucun champ pour ça.",
      "Pour exprimer une intensité, sers-toi du champ `intention` (« technique », « legere », « facile » coupent l'auto-progression) et du format de séries.",
      "Si l'athlète te demande explicitement un poids, réponds-lui dans la conversation — c'est un conseil, il reste libre de le saisir — mais ne le mets pas dans un patch.",
      "",
      "TA MÉTHODE :",
      "- Le contexte ci-dessous contient TOUTE la semaine en cours en détail (aujourd'hui et demain sont marqués) et un aperçu de la semaine suivante, tels qu'ils s'affichent dans l'app. Pour le détail d'une autre journée ou une autre semaine, appelle `consulter_seance` ; pour la carte du programme, `consulter_programme`. Ne réponds jamais « je ne sais pas ce qui est prévu » sans avoir lu.",
      "- Avant de te prononcer sur un mouvement précis, appelle `consulter_mouvement`. Le contexte n'est qu'un résumé ; l'outil te donne le détail et la suggestion courante du moteur.",
      "- Lire ne demande aucune permission. Écrire, si : quand tu proposes un changement (remplacer, ajuster, retirer, écrire une semaine), appelle l'outil `proposer_*` correspondant. L'athlète verra une carte Accepter / Refuser. Tu ne peux rien appliquer toi-même, et c'est voulu.",
      "- Une proposition à la fois, sauf si l'athlète en demande plusieurs.",
      "- Tu as un CARNET (voir « Carnet du coach » dans le contexte) : quand l'athlète t'apprend quelque chose de durable — une blessure, une contrainte d'horaire ou de matériel, un objectif, une préférence — appelle `retenir`. Une phrase courte et datable par fait. Ne note ni un résultat de séance (il est déjà dans l'historique) ni une banalité.",
      "- Les échanges précédents de cette conversation te sont rendus ; ce qui est plus ancien n'est que dans le carnet. Ne prétends pas te souvenir de ce qui n'y est pas.",
      "- Si les données sont trop minces pour conclure, dis-le. Ne comble pas un trou par une supposition présentée comme un fait.",
      "- Ne propose jamais d'ajustement pour un jour marqué manqué. Si des jours manqués ont une raison liée à la santé, adapte la reprise de la semaine suivante.",
      "",
      "",
      MANUEL,
      "",
      "Tu ne parles que d'entraînement. Tu n'es pas médecin : devant une douleur qui persiste ou qui inquiète, dis-le simplement et suggère un professionnel, puis propose l'adaptation d'entraînement qui évite la zone."
    ].join("\n");

    return [
      // Bloc stable → mis en cache. Le contexte athlète bouge une fois par
      // séance, pas à chaque message : c'est exactement ce qu'on veut cacher.
      {type: "text", text: consigne},
      {type: "text", text: "Voici l'état actuel de l'athlète.\n\n" + contexte, cache_control: {type: "ephemeral"}}
    ];
  }

  // ── Boucle ─────────────────────────────────────────────────────────────

  function toolResult(id, content, isError){
    var block = {type: "tool_result", tool_use_id: id, content: String(content)};
    if(isError) block.is_error = true;
    return block;
  }

  // Envoie un message, fait tourner les outils jusqu'à une réponse finale ou
  // une proposition, et enregistre les deux tours dans le fil.
  // Retourne {text, proposals[], memos[], turn}.
  api.send = async function(userText, opts){
    opts = opts || {};
    userText = str(userText);
    if(!userText) throw new Error("Message vide.");
    if(!window.CoachAIConfig || !CoachAIConfig.isReady()){
      throw new Error(CoachAIConfig ? CoachAIConfig.unavailableReason() : "Coach IA indisponible.");
    }

    // Le tour de l'athlète est écrit AVANT l'appel : s'il échoue, la question
    // reste dans le fil et sera reprise au message suivant.
    api.addTurn({role: "user", text: userText, via: "api"});

    // Messages de travail : vivent le temps de la boucle, jamais stockés.
    var messages = windowMessages();
    var tools = window.CoachAIPatch ? CoachAIPatch.tools() : [];
    // Consigne construite UNE fois par message : `retenir` modifie le carnet
    // au milieu de la boucle, et le carnet est dans le contexte. Reconstruire
    // le système entre deux tours changerait le préfixe sous des blocs de
    // réflexion déjà rendus — Haiku/Sonnet/Opus 5.5 refusent alors la requête
    // (400, « preserved thinking ») et le cache serait perdu.
    var system = systemBlocks();
    var proposals = [];
    var memos = [];
    var texts = [];
    var rounds = 0;

    while(rounds < MAX_TOOL_ROUNDS){
      rounds++;

      var reply = await CoachAIClient.send({
        system: system,
        messages: messages,
        tools: tools,
        effort: opts.effort
      });

      var text = CoachAIClient.textOf(reply);
      if(text) texts.push(text);

      // Refus d'un filtre de sécurité (faux positif possible sur une blessure
      // ou un médicament) : on le dit, plutôt qu'une « réponse vide ».
      if(reply.stop_reason === "refusal"){
        texts.push("Le modèle a décliné cette question (filtre de sécurité). Reformule-la en parlant d'entraînement, ou passe à un autre modèle dans les réglages.");
        break;
      }

      // Toujours réinjecter le contenu complet : un tool_use sans son bloc
      // d'origine dans l'historique rend la requête suivante invalide.
      messages.push({role: "assistant", content: reply.content});

      var uses = CoachAIClient.toolUsesOf(reply);
      if(!uses.length || reply.stop_reason !== "tool_use") break;

      var results = [];
      var stopAfter = false;

      uses.forEach(function(use){
        var name = str(use.name);
        var input = use.input || {};

        // Lecture : exécutée immédiatement, la boucle continue.
        if(CoachAIPatch.isRead(name)){
          var detail = "";
          try{ detail = CoachAIContext.read(name, input); }
          catch(e){ detail = "Lecture impossible : " + (e && e.message ? e.message : String(e)); }
          results.push(toolResult(use.id, detail));
          return;
        }

        // Carnet : le coach note un fait durable. Ce n'est pas l'entraînement
        // — aucune séance, aucune charge ne change — et l'athlète le voit
        // dans le fil et peut l'effacer d'un geste.
        if(CoachAIPatch.isMemo(name)){
          var noted = api.remember(input.fait, "coach");
          if(noted.ok) memos.push(noted.fact.text);
          results.push(toolResult(use.id, noted.ok ? "Noté dans le carnet." : noted.error, !noted.ok));
          return;
        }

        // Proposition : rien n'est appliqué. On rend au modèle un accusé de
        // réception honnête et on sort de la boucle — la suite appartient à
        // l'athlète, pas au modèle.
        if(CoachAIPatch.isProposal(name)){
          proposals.push({name: name, input: input, status: "pending"});
          results.push(toolResult(use.id, "Proposition affichée à l'athlète. En attente de sa décision (Accepter ou Refuser). Ne la répète pas."));
          stopAfter = true;
          return;
        }

        results.push(toolResult(use.id, "Outil inconnu : " + name, true));
      });

      // Tous les tool_result dans UN SEUL message utilisateur : les répartir
      // sur plusieurs messages apprend au modèle à ne plus paralléliser.
      messages.push({role: "user", content: results});

      if(stopAfter) break;
    }

    var turn = api.addTurn({role: "coach", text: texts.join("\n\n"), proposals: proposals, memos: memos, via: "api"});
    // Archive GitHub de l'échange (si active) : différée, jamais bloquante.
    try{ if(window.RacineGitHubBackup) RacineGitHubBackup.schedule("coach"); }catch(e){}
    return {
      text: texts.join("\n\n"),
      proposals: proposals,
      memos: memos,
      turn: turn
    };
  };

  api.MAX_MESSAGES = MAX_MESSAGES;
  api.MAX_TOOL_ROUNDS = MAX_TOOL_ROUNDS;
  api.API_WINDOW = API_WINDOW;
  api.MAX_FACTS = MAX_FACTS;
  api.KEY_BASE = KEY_BASE;
  api.MEMORY_BASE = MEMORY_BASE;
})();
