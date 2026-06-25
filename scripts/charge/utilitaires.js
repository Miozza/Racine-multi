// Coach Beurt V51.63 — extraction prudente moteur de charges.
// Script global volontaire : pas de ES modules, pas de changement de comportement.

function chargeKeyFromName(n){return String(n||"").replace(/^[A-Z][0-9]?\.\s*/,"").trim();}

function officialCharges(){return window.DEFAULT_CHARGES||{};}

function charge(name,fallback){
  var key=chargeKeyFromName(name);
  var c=customCharges[key];
  if(c!==undefined&&String(c).trim()!=="")return String(c).trim();
  var o=officialCharges()[key];
  if(o!==undefined&&String(o).trim()!=="")return String(o).trim();
  return fallback||"—";
}

function displayChargeText(t){
  t=String(t||"");
  t=t.replace(/Wall Ball 14 lb/g,"Wall Ball "+charge("Wall Ball","14 lb"));
  t=t.replace(/wall balls 14 lb/g,"wall balls "+charge("Wall Ball","14 lb"));
  t=t.replace(/Wall balls 14 lb/g,"Wall balls "+charge("Wall Ball","14 lb"));
  return t;
}

function chargeList(){
  var defs=officialCharges(),order=window.CHARGE_ORDER||Object.keys(defs),seen={},list=[];
  order.forEach(function(k){if(defs[k]!==undefined&&!seen[k]){seen[k]=true;list.push(k);}});
  Object.keys(defs).forEach(function(k){if(!seen[k]){seen[k]=true;list.push(k);}});
  return list;
}


// ─── Athlete State : force actuelle durable par mouvement ─────────────────────
