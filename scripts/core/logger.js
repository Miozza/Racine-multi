// Coach Beurt — Core logger local
// Capture les erreurs runtime et permet d’exporter un rapport depuis l’app.
(function(){
  var STORAGE_KEY = "coachBeurtErrorLog";
  var MAX_ENTRIES = 120;
  var installed = false;

  function safeString(value){
    try{
      if(value === undefined) return "undefined";
      if(value === null) return "null";
      if(typeof value === "string") return value;
      if(value && value.stack) return String(value.stack);
      if(typeof value === "object") return JSON.stringify(value);
      return String(value);
    }catch(e){
      return "[unserializable]";
    }
  }

  function getStateContext(){
    var s = window.state || {};
    var cfg = null;
    try{
      if(typeof window.focus === "function") cfg = window.focus();
    }catch(e){}
    return {
      version: window.APP_VERSION || "unknown",
      view: document.body && document.body.getAttribute ? (document.body.getAttribute("data-view") || "") : "",
      week: s.week || null,
      day: s.day || null,
      cycle: s.focus || s.cycle || null,
      program: cfg && (cfg.label || cfg.name || cfg.id) || null,
      url: location && location.href ? location.href.split("#")[0] : ""
    };
  }

  function readLog(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }

  function writeLog(arr){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_ENTRIES)));
    }catch(e){}
  }

  function normalize(level, code, error, meta){
    var errObj = error || null;
    var message = "";
    var stack = "";
    if(errObj && typeof errObj === "object"){
      message = errObj.message || safeString(errObj);
      stack = errObj.stack || "";
    }else{
      message = safeString(errObj || code || "log");
    }
    return {
      id: Date.now() + "-" + Math.random().toString(36).slice(2,8),
      at: new Date().toISOString(),
      level: level || "info",
      code: String(code || "log"),
      message: String(message || ""),
      stack: String(stack || "").slice(0,4000),
      meta: meta || {},
      context: getStateContext()
    };
  }

  function push(level, code, error, meta){
    try{
      var arr = readLog();
      arr.push(normalize(level, code, error, meta));
      writeLog(arr);
    }catch(e){}
  }

  function info(code, meta){ push("info", code, null, meta || {}); }
  function warn(code, meta){ push("warn", code, null, meta || {}); }
  function error(code, err, meta){ push("error", code, err, meta || {}); }
  function getEntries(){ return readLog(); }
  function clear(){ try{ localStorage.removeItem(STORAGE_KEY); }catch(e){} }
  function count(){ return readLog().length; }

  function getReport(){
    var entries = readLog();
    var header = [
      "Rapport erreurs Racine",
      "Version: " + (window.APP_VERSION || "unknown"),
      "Exporté: " + new Date().toISOString(),
      "Entrées: " + entries.length,
      "URL: " + (location && location.href ? location.href.split("#")[0] : ""),
      ""
    ];
    var body = entries.map(function(e, idx){
      return [
        "#" + (idx+1) + " [" + e.level + "] " + e.code,
        "Date: " + e.at,
        "Contexte: " + safeString(e.context),
        "Message: " + e.message,
        e.stack ? ("Stack: " + e.stack) : "Stack: —",
        "Meta: " + safeString(e.meta),
        ""
      ].join("\n");
    });
    return header.concat(body).join("\n");
  }

  function copyReport(){
    var report = getReport();
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(report).then(function(){ return true; });
    }
    return Promise.reject(new Error("Clipboard non disponible"));
  }

  function installGlobalHandlers(){
    if(installed) return;
    installed = true;
    window.addEventListener("error", function(ev){
      try{
        var target = ev && ev.target;
        if(target && target !== window && (target.src || target.href)){
          push("error", "resource_load_failed", null, {
            tag: target.tagName || "",
            src: target.src || target.href || ""
          });
          return;
        }
        push("error", "window_error", ev.error || ev.message, {
          message: ev.message || "",
          source: ev.filename || "",
          line: ev.lineno || null,
          column: ev.colno || null
        });
      }catch(e){}
    }, true);

    window.addEventListener("unhandledrejection", function(ev){
      try{
        push("error", "unhandled_rejection", ev.reason || "Promise rejetée", {});
      }catch(e){}
    });
  }

  window.CoachLog = {
    info: info,
    warn: warn,
    error: error,
    getEntries: getEntries,
    getReport: getReport,
    copyReport: copyReport,
    clear: clear,
    count: count,
    install: installGlobalHandlers
  };
  installGlobalHandlers();
})();
