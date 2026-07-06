/* Coach Beurt — Navigation helpers
   Extraction prudente : gestion des vues seulement.
   Aucun changement voulu au comportement de l'app.
*/

/* PC est le nom officiel. phone/phoneView restent des alias hérités
   pour préserver les anciens sélecteurs CSS et appels historiques. */
var VIEW_ALIASES={phone:"pc"};
var VIEW_MAIN_IDS={pc:"pcView"};
var VIEW_TAB_IDS={pc:"phoneTab"};
var VIEWS=["training","pc","session","results","cycle","history","settings","profile","references","backup"];

function normalizeViewName(v){
  return VIEW_ALIASES[v] || v;
}
function viewMainId(v){
  return VIEW_MAIN_IDS[v] || (v+"View");
}
function viewTabId(v){
  return VIEW_TAB_IDS[v] || (v+"Tab");
}
function ensurePcViewHost(){
  var view=$("pcView");
  var legacy=$("phoneView");
  if(view) return view;
  if(!legacy) return null;

  view=document.createElement("main");
  view.id="pcView";
  view.className=legacy.className||"";
  legacy.parentNode.insertBefore(view, legacy);

  var legacyHost=document.createElement("section");
  legacyHost.id="phoneView";
  legacyHost.className="pc-view-legacy-host";
  while(legacy.firstChild){
    legacyHost.appendChild(legacy.firstChild);
  }
  view.appendChild(legacyHost);
  legacy.parentNode.removeChild(legacy);
  return view;
}

ensurePcViewHost();

function switchView(v){
  v=normalizeViewName(v);
  // Garde client : la vue PC (inspection coach) est réservée à l'admin.
  if(v==="pc" && window.CoachProfiles && CoachProfiles.isActiveAdmin && !CoachProfiles.isActiveAdmin()) v="training";
  ensurePcViewHost();
  VIEWS.forEach(function(x){
    var main=$(viewMainId(x)),tab=$(viewTabId(x));
    if(main){if(v===x)main.classList.add("view-active");else main.classList.remove("view-active");}
    if(tab)tab.classList.toggle("active",v===x);
  });
  var legacyPc=$("phoneView");
  if(legacyPc) legacyPc.classList.toggle("view-active", v==="pc");
  document.body.classList.toggle("results-view-active", v==="results");
  if(v!=="results") document.body.classList.remove("guided-results-active");
  if(v==="pc"){renderPhoneWod();updateRestDisplay();}
  if(v==="results"){document.body.classList.add("guided-results-active");CoachSession.renderResults();}
  if(v==="cycle")renderCycle();
  if(v==="history")renderHistory();
  if(v==="profile")renderProfile();
  if(v==="references")renderReferences();
  if(v==="settings")renderSettings();
}
