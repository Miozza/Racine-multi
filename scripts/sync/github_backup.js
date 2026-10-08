// Racine — Sauvegarde GitHub du profil admin.
//
// POURQUOI. Le stockage local est la seule source de vérité et n'a aucune
// copie serveur (CLAUDE.md §2.1) : un Safari qui purge, et tout est perdu.
// L'export JSON manuel protège, mais il faut y penser après chaque séance.
// Ce module dépose tout seul, après chaque séance sauvegardée, l'historique
// d'entraînement dans un dépôt GitHub privé de l'athlète — en JSON brut, en
// résumé lisible, et en export complet pour la restauration. Effet voulu :
// un Claude qui a accès au dépôt connaît l'historique sans extraction.
//
// Décision explicite du 2026-10-08 (CLAUDE.md §3.4) — portée stricte :
//   - UN SEUL PROFIL : celui qui a enregistré le jeton, et seulement s'il est
//     admin. Un profil client n'est jamais envoyé, même sur le même appareil.
//   - SENS UNIQUE à l'automatique : Racine ÉCRIT la copie, il ne relit jamais
//     rien tout seul. La restauration est un geste explicite, et elle passe
//     par l'import existant (CoachProfiles.importProfileBlob) qui crée un
//     NOUVEAU profil : rien de local n'est jamais écrasé par le distant.
//   - MÊME FORMAT que l'export manuel (CoachProfiles.exportProfileBlob) : le
//     fichier déposé sur GitHub est un export JSON ordinaire, importable à la
//     main dans n'importe quelle version (compatibilité ascendante §2.1).
//   - JAMAIS le dépôt de code : le déploiement Pages part de Racine-multi, une
//     sauvegarde poussée là serait publiée sur le site. Refusé ici.
//   - Le jeton vit au niveau appareil, hors du state de profil : il ne part ni
//     dans un export ni dans un lien #rx= (même règle que la clé Coach IA).
//   - Hors-ligne, rien ne casse : l'envoi est marqué en attente et repart au
//     retour du réseau. Racine ne dépend jamais de GitHub pour fonctionner.
//
// C'est le seul fichier du runtime, avec scripts/coach_ai/client.js, qui
// appelle fetch() vers l'extérieur.
(function(){
  "use strict";

  var api = window.RacineGitHubBackup = window.RacineGitHubBackup || {};

  var KEY = "racine_github_backup_v1";   // niveau appareil, hors state de profil
  var SCHEMA = 1;
  var API_ROOT = "https://api.github.com";
  var DEBOUNCE_MS = 4000;
  // Dépôts de CODE : une sauvegarde n'y a pas sa place (Pages la publierait).
  var CODE_REPOS = ["racine-multi", "coach-beurt-dev", "coach-beurt"];

  function str(v){ return String(v==null?"":v).trim(); }
  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }
  function slug(s){ return str(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profil"; }

  // ── Configuration (appareil) ───────────────────────────────────────────

  function defaults(){
    return {schema: SCHEMA, token: "", owner: "", repo: "", branch: "main", path: "", profileId: "", auto: true,
            lastPushAt: "", lastError: "", pending: false};
  }
  function read(){
    var out = defaults();
    try{
      var raw = localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if(parsed && typeof parsed === "object") out = Object.assign(out, parsed, {schema: SCHEMA});
    }catch(e){}
    return out;
  }
  function write(cfg){
    try{ localStorage.setItem(KEY, JSON.stringify(Object.assign(read(), cfg || {}, {schema: SCHEMA}))); return true; }
    catch(e){ return false; }
  }

  function isAdmin(){
    try{ return !!(window.CoachProfiles && CoachProfiles.isActiveAdmin && CoachProfiles.isActiveAdmin()); }catch(e){ return false; }
  }
  function activeId(){
    try{ return window.CoachProfiles ? str(CoachProfiles.getActiveId()) : ""; }catch(e){ return ""; }
  }
  function isCodeRepo(repo){ return CODE_REPOS.indexOf(str(repo).toLowerCase()) >= 0; }

  api.get = function(){ var c = read(); return Object.assign({}, c, {token: c.token ? "•••" : ""}); };
  api.hasToken = function(){ return !!read().token; };
  api.isConfigured = function(){
    var c = read();
    return !!(c.token && c.owner && c.repo && c.profileId && !isCodeRepo(c.repo));
  };
  // Ce profil-ci est-il celui qu'on sauvegarde ? Admin ET propriétaire du réglage.
  api.isActiveTarget = function(){
    var c = read();
    return api.isConfigured() && isAdmin() && activeId() === c.profileId;
  };
  // Trois fichiers, un seul commit par séance :
  //  - <profil>-historique.json : l'historique d'entraînement brut
  //    (state.history), le journal qui fait foi (docs/DATA_FLOW_CONTRACT.md).
  //    C'est lui qu'on veut garder, et lui que Claude lit directement.
  //  - <profil>-resume.md : le même état, rédigé pour être LU (séances,
  //    notes, séances prévues, mémoire Brain) — CoachAIContext.build(), le
  //    texte que Coach IA reçoit déjà. Un Claude qui a accès au dépôt connaît
  //    l'athlète sans extraction ni copier-coller.
  //  - <profil>-profil.json : l'export complet, celui que « Restaurer » relit.
  function folder(c){ return str(c.path).replace(/^\/+|\/+$/g, "") || "racine"; }
  function files(c){
    var name = "";
    try{ var prof = CoachProfiles.get(c.profileId); name = prof && prof.name; }catch(e){}
    var base = folder(c) + "/" + slug(name);
    return {historique: base + "-historique.json", resume: base + "-resume.md", profil: base + "-profil.json"};
  }
  function filePath(c){ return files(c).profil; }
  api.filePath = function(){ return filePath(read()); };
  api.files = function(){ return files(read()); };

  // Enregistre les réglages. Le profil sauvegardé est le profil ACTIF au
  // moment de l'enregistrement — il faut donc être sur son profil admin.
  api.configure = function(patch){
    patch = patch || {};
    if(!isAdmin()) return {ok:false, error:"Réservé au profil admin."};
    if(!activeId()) return {ok:false, error:"Aucun profil actif."};
    var next = {};
    if(str(patch.token)) next.token = str(patch.token);
    ["owner", "repo", "branch", "path"].forEach(function(k){ if(patch[k] !== undefined) next[k] = str(patch[k]); });
    if(patch.auto !== undefined) next.auto = !!patch.auto;
    if(next.repo && isCodeRepo(next.repo)) return {ok:false, error:"« " + next.repo + " » est un dépôt de code : une sauvegarde y serait publiée par le déploiement. Crée un dépôt PRIVÉ séparé (ex. racine-sauvegarde)."};
    if(!next.branch && !read().branch) next.branch = "main";
    next.profileId = activeId();
    next.lastError = "";
    return write(next) ? {ok:true} : {ok:false, error:"Écriture impossible (stockage local)."};
  };

  // Efface les réglages GitHub de cet appareil — removeItem sur CETTE clé
  // seulement, jamais de suppression en masse (CLAUDE.md §2.1).
  api.forget = function(){
    try{ localStorage.removeItem(KEY); }catch(e){}
    return {ok:true};
  };

  // ── Réseau ─────────────────────────────────────────────────────────────

  function errorMessage(status, body){
    var detail = "";
    try{ detail = body && body.message ? String(body.message) : ""; }catch(e){}
    if(status === 401) return "Jeton refusé (401) : expiré, révoqué ou mal collé. Crée un nouveau jeton et recolle-le.";
    if(status === 403) return "Accès refusé (403)" + (detail ? " : " + detail : "") + ". Le jeton doit avoir « Contents : Read and write » sur ce dépôt.";
    if(status === 404) return "Dépôt ou branche introuvable (404). Vérifie propriétaire / dépôt / branche, et que le jeton donne accès à ce dépôt.";
    if(status === 409 || status === 422) return "Conflit d'écriture (" + status + ")" + (detail ? " : " + detail : "") + ".";
    return "Erreur GitHub " + status + (detail ? " : " + detail : ".");
  }

  async function gh(c, method, url, body, accept){
    var res;
    try{
      res = await fetch(API_ROOT + url, {
        method: method,
        headers: {
          "Accept": accept || "application/vnd.github+json",
          "Authorization": "Bearer " + c.token,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store"
      });
    }catch(e){
      var err = new Error("Pas de connexion. La sauvegarde repartira au retour du réseau.");
      err.offline = true;
      throw err;
    }
    return res;
  }
  function contentsUrl(c){
    return "/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo)
      + "/contents/" + filePath(c).split("/").map(encodeURIComponent).join("/");
  }
  function repoUrl(c){ return "/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo); }
  async function json(res){ try{ return await res.json(); }catch(e){ return null; } }

  // Les trois fichiers en UN commit (API Git Data) : ref → commit parent →
  // arbre → commit → déplacement de la ref. Le contenu part en texte UTF-8
  // dans l'arbre, sans étape base64. La ref n'avance que si personne ne l'a
  // déplacée entre-temps (force: false) : sinon on recommence une fois.
  async function commitFiles(c, entries, message){
    var branch = c.branch || "main";
    var refUrl = repoUrl(c) + "/git/ref/heads/" + encodeURIComponent(branch);
    var res = await gh(c, "GET", refUrl);
    var ref = await json(res);
    if(res.status === 404 || res.status === 409) throw new Error("Branche « " + branch + " » introuvable : le dépôt est peut-être vide. Crée-le avec un README, puis réessaie.");
    if(!res.ok) throw new Error(errorMessage(res.status, ref));
    var parentSha = ref.object.sha;
    res = await gh(c, "GET", repoUrl(c) + "/git/commits/" + parentSha);
    var parent = await json(res);
    if(!res.ok) throw new Error(errorMessage(res.status, parent));
    res = await gh(c, "POST", repoUrl(c) + "/git/trees", {
      base_tree: parent.tree.sha,
      tree: entries.map(function(e){ return {path: e.path, mode: "100644", type: "blob", content: e.content}; })
    });
    var tree = await json(res);
    if(!res.ok) throw new Error(errorMessage(res.status, tree));
    if(tree.sha === parent.tree.sha) return {unchanged: true};
    res = await gh(c, "POST", repoUrl(c) + "/git/commits", {message: message, tree: tree.sha, parents: [parentSha]});
    var commit = await json(res);
    if(!res.ok) throw new Error(errorMessage(res.status, commit));
    res = await gh(c, "PATCH", repoUrl(c) + "/git/refs/heads/" + encodeURIComponent(branch), {sha: commit.sha, force: false});
    var moved = await json(res);
    if(res.status === 422 || res.status === 409){ var err = new Error(errorMessage(res.status, moved)); err.conflict = true; throw err; }
    if(!res.ok) throw new Error(errorMessage(res.status, moved));
    return {sha: commit.sha};
  }

  function historyPayload(blob, name){
    var history = (blob && blob.state && Array.isArray(blob.state.history)) ? blob.state.history : [];
    return {
      schema: "racine-history-v1",
      exportedAt: nowIso(),
      appVersion: (blob && blob.appVersion) || null,
      profile: name || null,
      sessions: history.length,
      note: "Journal brut des séances (state.history), la plus ancienne en premier. Les charges sont en livres. Restauration : utiliser le fichier -profil.json.",
      history: history
    };
  }
  function summaryText(blob, name){
    var body = "";
    // Le contexte Coach IA décrit le profil ACTIF : c'est le profil
    // sauvegardé (isActiveTarget), sauf envoi forcé — alors on s'abstient.
    try{
      if(window.CoachAIContext && activeId() === read().profileId){
        body = CoachAIContext.build({sessions: 60, notes: 40, planned: "week"});
      }
    }catch(e){ body = ""; }
    var history = (blob && blob.state && Array.isArray(blob.state.history)) ? blob.state.history : [];
    return "# Racine — " + (name || "profil") + "\n\n"
      + "Mis à jour : " + nowIso().slice(0, 16).replace("T", " ") + " UTC · " + history.length + " séance(s) · " + ((blob && blob.appVersion) || "") + "\n\n"
      + "Résumé écrit par Racine pour être lu tel quel. L'historique complet est dans le fichier -historique.json voisin. "
      + "Les charges suggérées viennent du moteur de Racine : un poids conseillé ailleurs est un conseil, l'athlète le saisit lui-même.\n\n"
      + (body || "(Résumé indisponible pour cet envoi : voir -historique.json.)") + "\n";
  }

  // Vérifie le jeton et le dépôt sans rien écrire.
  api.test = async function(){
    var c = read();
    if(!api.isConfigured()) return {ok:false, error:"Réglages incomplets (jeton, propriétaire, dépôt)."};
    try{
      var res = await gh(c, "GET", "/repos/" + encodeURIComponent(c.owner) + "/" + encodeURIComponent(c.repo));
      var body = null; try{ body = await res.json(); }catch(e){}
      if(!res.ok) return {ok:false, error:errorMessage(res.status, body)};
      if(body && body.private === false) return {ok:true, warning:"Ce dépôt est PUBLIC : ton historique y serait lisible par tout le monde. Passe-le en privé."};
      return {ok:true};
    }catch(e){ return {ok:false, error:e.message}; }
  };

  var running = null;

  // Envoie l'export du profil sauvegardé. N'écrit RIEN localement d'autre que
  // son propre état (date, erreur) et l'horodatage d'export du registre.
  api.push = async function(opts){
    opts = opts || {};
    var c = read();
    if(!api.isConfigured()) return {ok:false, error:"Sauvegarde GitHub non configurée."};
    if(!opts.force && !api.isActiveTarget()) return {ok:false, error:"Profil actif différent du profil sauvegardé."};
    if(running) return running;

    running = (async function(){
      try{
        var blob = CoachProfiles.exportProfileBlob(c.profileId);
        if(!blob) throw new Error("Export du profil impossible.");
        var name = (blob.profile && blob.profile.name) || "";
        var f = files(c);
        var entries = [
          {path: f.historique, content: JSON.stringify(historyPayload(blob, name), null, 2) + "\n"},
          {path: f.resume, content: summaryText(blob, name)},
          {path: f.profil, content: JSON.stringify(blob, null, 2) + "\n"}
        ];
        var count = (blob.state && Array.isArray(blob.state.history)) ? blob.state.history.length : 0;
        var message = "Historique Racine : " + count + " séance(s) · " + nowIso().slice(0, 16).replace("T", " ")
          + (blob.appVersion ? " (" + blob.appVersion + ")" : "");
        // Deux essais : si la branche a bougé entre-temps (autre appareil),
        // on reconstruit sur la nouvelle tête. Le contenu envoyé reste le local.
        for(var attempt = 0; attempt < 2; attempt++){
          try{
            await commitFiles(c, entries, message);
            write({lastPushAt: nowIso(), lastError: "", pending: false});
            // Compte comme un export : le rappel « jamais exporté » se tait.
            try{ if(CoachProfiles.markExported) CoachProfiles.markExported(c.profileId); }catch(e){}
            try{ var b = document.getElementById("exportReminderBanner"); if(b) b.remove(); }catch(e){}
            return {ok:true, at: nowIso()};
          }catch(e){
            if(e.conflict && attempt === 0) continue;
            throw e;
          }
        }
        throw new Error("Conflit d'écriture persistant.");
      }catch(e){
        write({lastError: e.message, pending: true});
        return {ok:false, error:e.message, offline: !!e.offline};
      }finally{
        running = null;
        renderPanel();
      }
    })();
    return running;
  };

  // Appelé après chaque séance sauvegardée (scripts/session/save.js). Jamais
  // bloquant : un échec réseau ne doit pas gêner la fin de séance.
  var timer = null;
  api.schedule = function(){
    try{
      if(!api.isActiveTarget() || !read().auto) return false;
      write({pending: true});
      if(timer) clearTimeout(timer);
      timer = setTimeout(function(){ timer = null; api.push(); }, DEBOUNCE_MS);
      return true;
    }catch(e){ return false; }
  };

  // Restauration : relit le fichier et l'importe comme NOUVEAU profil, par le
  // chemin d'import existant. Aucun profil local n'est touché.
  api.fetchBlob = async function(){
    var c = read();
    if(!api.isConfigured()) return {ok:false, error:"Sauvegarde GitHub non configurée."};
    try{
      var res = await gh(c, "GET", contentsUrl(c) + "?ref=" + encodeURIComponent(c.branch || "main"), null, "application/vnd.github.raw+json");
      if(!res.ok){ var b = null; try{ b = await res.json(); }catch(e){} return {ok:false, error:errorMessage(res.status, b)}; }
      var blob = JSON.parse(await res.text());
      return {ok:true, blob: blob};
    }catch(e){ return {ok:false, error:"Lecture impossible : " + e.message}; }
  };
  api.restoreAsNewProfile = async function(){
    var got = await api.fetchBlob();
    if(!got.ok) return got;
    if(!(window.CoachProfiles && CoachProfiles.importProfileBlob)) return {ok:false, error:"Import indisponible."};
    var id = CoachProfiles.importProfileBlob(got.blob, {setActive: false});
    return id ? {ok:true, id: id} : {ok:false, error:"Le fichier n'est pas un export de profil Racine."};
  };

  // ── Panneau Réglages (admin) ───────────────────────────────────────────

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(ch){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]; }); }
  function $(id){ return document.getElementById(id); }
  function status(text, ok){
    var s = $("ghBackupStatus");
    if(s){ s.textContent = text; s.className = "status-msg " + (ok ? "ok" : "err"); }
  }
  function when(iso){
    if(!iso) return "jamais";
    try{ return new Date(iso).toLocaleString("fr-CA", {dateStyle: "medium", timeStyle: "short"}); }catch(e){ return iso; }
  }

  function renderPanel(){
    var host = $("githubBackupBody");
    if(!host) return;
    if(!isAdmin()){ host.innerHTML = "<p class='muted'>Réservé au profil admin.</p>"; return; }
    var c = read();
    var target = "";
    try{ var p = c.profileId && CoachProfiles.get(c.profileId); target = p ? p.name : ""; }catch(e){}
    var other = c.profileId && c.profileId !== activeId();
    host.innerHTML = ""
      + (api.isConfigured()
          ? "<p>Profil sauvegardé : <strong>" + esc(target || "?") + "</strong> → <code>" + esc(c.owner + "/" + c.repo + " : " + folder(c) + "/") + "</code><br>"
            + "Fichiers : <code>" + esc(files(c).historique.split("/").pop()) + "</code> (historique), <code>" + esc(files(c).resume.split("/").pop()) + "</code> (résumé lisible), <code>" + esc(files(c).profil.split("/").pop()) + "</code> (restauration)<br>"
            + "Dernier envoi : <strong>" + esc(when(c.lastPushAt)) + "</strong>"
            + (c.pending ? " · <strong>envoi en attente</strong>" : "")
            + (c.lastError ? "<br><span class='status-msg err'>" + esc(c.lastError) + "</span>" : "") + "</p>"
            + (other ? "<p class='muted'>Le profil actif n'est pas le profil sauvegardé : rien n'est envoyé pour lui.</p>" : "")
          : "<p class='muted'>Non configurée. Il faut un dépôt GitHub <strong>privé</strong> séparé (ex. <code>racine-sauvegarde</code>) et un jeton « fine-grained » limité à ce dépôt, permission <em>Contents : Read and write</em>.</p>")
      + "<label for='ghToken'>Jeton GitHub</label>"
      + "<input id='ghToken' class='select-field' type='password' autocomplete='off' spellcheck='false' placeholder='" + (c.token ? "Jeton enregistré — laisser vide pour le garder" : "github_pat_…") + "'>"
      + "<label for='ghOwner'>Propriétaire</label>"
      + "<input id='ghOwner' class='select-field' autocomplete='off' spellcheck='false' value='" + esc(c.owner || "Miozza") + "'>"
      + "<label for='ghRepo'>Dépôt (privé)</label>"
      + "<input id='ghRepo' class='select-field' autocomplete='off' spellcheck='false' placeholder='racine-sauvegarde' value='" + esc(c.repo) + "'>"
      + "<label for='ghBranch'>Branche</label>"
      + "<input id='ghBranch' class='select-field' autocomplete='off' spellcheck='false' value='" + esc(c.branch || "main") + "'>"
      + "<label><input id='ghAuto' type='checkbox'" + (c.auto ? " checked" : "") + "> Envoyer automatiquement après chaque séance</label>"
      + "<p class='field-hint'>Le jeton reste sur cet appareil : il n'entre jamais dans un export ni dans un lien. Seul ton profil admin est envoyé. "
      +   "Racine ne relit jamais GitHub tout seul : restaurer crée un nouveau profil, sans toucher aux tiens.</p>"
      + "<div class='btn-row'>"
      +   "<button id='ghSaveBtn' class='btn-ghost' type='button'>Enregistrer (profil actif)</button>"
      +   (api.isConfigured() ? "<button id='ghPushBtn' class='btn-accent' type='button'>Sauvegarder maintenant</button>" : "")
      + "</div>"
      + (api.isConfigured()
          ? "<div class='btn-row'>"
            + "<button id='ghTestBtn' class='btn-ghost' type='button'>Tester l'accès</button>"
            + "<button id='ghRestoreBtn' class='btn-ghost' type='button'>Restaurer (nouveau profil)</button>"
            + "<button id='ghForgetBtn' class='btn-danger' type='button'>Oublier le jeton</button>"
            + "</div>"
          : "")
      + "<p id='ghBackupStatus' class='status-msg'></p>";
    bindPanel();
  }

  function bindPanel(){
    var save = $("ghSaveBtn");
    if(save) save.onclick = function(){
      var out = api.configure({
        token: $("ghToken").value, owner: $("ghOwner").value, repo: $("ghRepo").value,
        branch: $("ghBranch").value, auto: $("ghAuto").checked
      });
      renderPanel();
      status(out.ok ? "✅ Réglages enregistrés." + (api.isConfigured() ? " Teste l'accès, puis sauvegarde." : " Il manque encore le jeton ou le dépôt.") : out.error, out.ok);
    };
    var push = $("ghPushBtn");
    if(push) push.onclick = async function(){
      status("Envoi…", true);
      var out = await api.push();
      status(out.ok ? "✅ Sauvegardé sur GitHub." : out.error, out.ok);
    };
    var test = $("ghTestBtn");
    if(test) test.onclick = async function(){
      status("Vérification…", true);
      var out = await api.test();
      status(out.ok ? (out.warning ? "⚠️ " + out.warning : "✅ Jeton et dépôt OK.") : out.error, out.ok && !out.warning);
    };
    var restore = $("ghRestoreBtn");
    if(restore) restore.onclick = async function(){
      if(!confirm("Importer la sauvegarde GitHub comme NOUVEAU profil ? Tes profils actuels ne sont pas modifiés.")) return;
      status("Lecture…", true);
      var out = await api.restoreAsNewProfile();
      status(out.ok ? "✅ Sauvegarde importée comme nouveau profil (voir « Changer de profil »)." : out.error, out.ok);
    };
    var forget = $("ghForgetBtn");
    if(forget) forget.onclick = function(){
      if(!confirm("Oublier le jeton et les réglages GitHub sur cet appareil ? Le fichier sur GitHub n'est pas supprimé.")) return;
      api.forget();
      renderPanel();
      status("Réglages GitHub effacés de cet appareil.", true);
    };
  }

  api.renderPanel = renderPanel;

  // ── Démarrage : renvoyer un envoi resté en attente ─────────────────────
  function flushPending(){
    try{ if(read().pending && api.isActiveTarget() && read().auto) api.push(); }catch(e){}
  }
  function boot(){
    renderPanel();
    setTimeout(flushPending, 3000);
    try{ window.addEventListener("online", flushPending); }catch(e){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  api.KEY = KEY;
  api.SCHEMA = SCHEMA;
})();
