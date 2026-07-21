// Racine — export de fichiers JSON robuste (profil & historique).
// Objectif : produire un VRAI fichier .json téléchargeable/partageable,
// y compris sur les anciens Safari iOS (iPhone SE 2019-2020, iOS 13-14) où
// l'attribut `download` d'une ancre n'est pas honoré : le clic navigue alors
// vers l'URL blob: et Safari affiche le JSON en texte brut dans une nouvelle
// page au lieu de télécharger. On privilégie donc navigator.share({files})
// (qui expose « Enregistrer dans Fichiers »), avec repli <a download> pour
// les plateformes où il fonctionne, et un message clair en dernier recours.
(function(root){
  "use strict";
  root = root || (typeof self !== "undefined" ? self : this);

  function isIOS(){
    var nav = root.navigator || ((typeof navigator !== "undefined") ? navigator : null);
    if(!nav) return false;
    var ua = nav.userAgent || "";
    if(/iP(hone|ad|od)/.test(ua)) return true;
    // iPadOS 13+ se présente comme un Mac : détecter via le tactile.
    return nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1;
  }

  // Le repli <a download> ne doit être utilisé que là où il télécharge
  // vraiment. Sur iOS Safari il ne fait que naviguer vers le blob (bug ciblé),
  // donc on ne l'autorise jamais sur iOS : la voie correcte y est le partage.
  function canAnchorDownload(doc){
    if(!doc || typeof doc.createElement !== "function") return false;
    var a = doc.createElement("a");
    if(!("download" in a)) return false;
    if(isIOS()) return false;
    return true;
  }

  function buildBlob(text){
    return new root.Blob([text], { type: "application/json;charset=utf-8" });
  }

  // Repli compatible Safari (desktop/Android) : Blob → createObjectURL →
  // <a download> → click → revokeObjectURL. Aucune ouverture d'onglet.
  function anchorDownload(doc, blob, name){
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    if(doc.body && doc.body.appendChild) doc.body.appendChild(a);
    a.click();
    if(a.remove) a.remove();
    // Laisser au navigateur le temps de démarrer le téléchargement.
    var revoke = function(){ try{ root.URL.revokeObjectURL(url); }catch(e){} };
    if(typeof root.setTimeout === "function") root.setTimeout(revoke, 1500);
    else revoke();
  }

  var DEFAULT_MESSAGE =
    "Ton navigateur ne peut pas télécharger directement le fichier. " +
    "Ouvre la feuille de partage puis « Enregistrer dans Fichiers », " +
    "ou mets Safari à jour.";

  // saveJson(name, data, opts) → Promise<{method, name, mime, text}>
  //   name : nom de fichier clair et unique, terminé par .json
  //   data : objet (sérialisé en JSON indenté UTF-8) ou chaîne déjà sérialisée
  //   opts : { shareTitle, shareText, onMessage }
  // La STRUCTURE des données n'est jamais modifiée : on sérialise tel quel.
  function saveJson(name, data, opts){
    opts = opts || {};
    var doc = root.document;
    var nav = root.navigator;
    var mime = "application/json";
    var text = (typeof data === "string") ? data : JSON.stringify(data, null, 2);
    var result = { method: null, name: name, mime: mime, text: text };
    var notify = opts.onMessage || (typeof root.alert === "function" ? root.alert : function(){});

    var blob;
    try{ blob = buildBlob(text); }
    catch(e){ blob = null; }

    // 1) Partage natif d'un vrai fichier (voie privilégiée sur iOS moderne).
    var file = null;
    if(typeof root.File === "function" && blob){
      try{ file = new root.File([text], name, { type: mime }); }
      catch(e){ file = null; }
    }
    if(file && nav && typeof nav.share === "function" &&
       typeof nav.canShare === "function"){
      var canShareFiles = false;
      try{ canShareFiles = nav.canShare({ files: [file] }); }
      catch(e){ canShareFiles = false; }
      if(canShareFiles){
        var payload = { files: [file] };
        if(opts.shareTitle) payload.title = opts.shareTitle;
        if(opts.shareText) payload.text = opts.shareText;
        return Promise.resolve(nav.share(payload)).then(function(){
          result.method = "share";
          return result;
        }, function(err){
          // L'utilisateur a annulé la feuille de partage : ne rien forcer.
          if(err && (err.name === "AbortError" || err.name === "NotAllowedError")){
            result.method = "share-cancelled";
            return result;
          }
          // Autre erreur : tenter le repli téléchargement si disponible.
          return fallback();
        });
      }
    }
    return Promise.resolve(fallback());

    function fallback(){
      if(blob && canAnchorDownload(doc)){
        anchorDownload(doc, blob, name);
        result.method = "download";
        return result;
      }
      // 3) Aucune voie fiable (vieux iOS sans partage de fichiers) :
      // message clair, surtout PAS d'ouverture du JSON en nouvelle page.
      notify(DEFAULT_MESSAGE);
      result.method = "message";
      return result;
    }
  }

  // Horodatage compact pour des noms de fichiers uniques (YYYY-MM-DD-HHMM).
  function stamp(d){
    d = d || new Date();
    function p(n){ return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      "-" + p(d.getHours()) + p(d.getMinutes());
  }

  root.RacineExport = {
    saveJson: saveJson,
    stamp: stamp,
    isIOS: isIOS,
    DEFAULT_MESSAGE: DEFAULT_MESSAGE
  };
})(typeof self !== "undefined" ? self : this);
