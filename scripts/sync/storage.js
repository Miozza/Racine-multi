// Coach Beurt V51.63 - sync storage domain
(function(){
  var api = window.CoachSync = window.CoachSync || {};
  var TOKEN_KEY = "coachBertinGithubToken";
  var SYNC_STATUS_KEY = "coachBeurt.syncStatus";

  function nowIso(){
    try{return new Date().toISOString();}
    catch(e){return String(new Date());}
  }

  api.getToken = function(){
    try{return localStorage.getItem(TOKEN_KEY) || "";}
    catch(e){return "";}
  };

  api.setToken = function(token){
    token = String(token || "").trim();
    if(!token)return api.clearToken();
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  };

  api.clearToken = function(){
    try{localStorage.removeItem(TOKEN_KEY);}catch(e){}
    return "";
  };

  api.defaultStatus = function(){
    return api.getToken() ?
      {state:"pending",message:"Sync non verifiee",lastOk:null,lastTry:null} :
      {state:"missing",message:"Token absent",lastOk:null,lastTry:null};
  };

  api.readStatus = function(){
    try{
      var raw = localStorage.getItem(SYNC_STATUS_KEY);
      if(raw)return Object.assign(api.defaultStatus(), JSON.parse(raw) || {});
    }catch(e){}
    return api.defaultStatus();
  };

  api.writeStatus = function(stateName, message){
    var st = api.readStatus();
    st.state = stateName || st.state || "pending";
    st.message = message || st.message || "";
    st.lastTry = nowIso();
    if(st.state === "ok")st.lastOk = st.lastTry;
    try{localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(st));}catch(e){}
    return st;
  };

  api.keys = {token:TOKEN_KEY, status:SYNC_STATUS_KEY};
})();
