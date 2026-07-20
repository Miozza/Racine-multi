// Racine V2.5 — source unique de vérité équipement local.
// Script global volontaire : aucune donnée durable utilisateur.

window.RACINE_EQUIPMENT = {
  dumbbells: {
    unit: "lb",
    rounding: "nearest",
    values: [2.5, 5, 8, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 85]
  },
  barbells: {
    unit: "lb",
    step: 5,
    values: [45]
  },
  bumperPlates: {
    unit: "lb",
    values: [2.5, 5, 10, 25, 45]
  },
  cable: {
    unit: "lb",
    step: 10
  },
  kettlebells: {
    unit: "kg",
    rounding: "nearest",
    values: [4, 8, 10, 12, 16, 18, 24, 28, 32]
  },
  bands: {
    values: ["petit", "moyen", "large", "très large"]
  }
};

window.EQUIPMENT_LOAD_RULES = window.EQUIPMENT_LOAD_RULES || {};
window.EQUIPMENT_LOAD_RULES.cable = {
  match:["câble","cable","poulie","rope","face pull","triceps pushdown","triceps rope","lat pulldown","upright row"],
  step: window.RACINE_EQUIPMENT.cable.step
};
window.EQUIPMENT_LOAD_RULES.band = {
  match:["élastique","elastique","band"],
  available: window.RACINE_EQUIPMENT.bands.values
};
window.EQUIPMENT_LOAD_RULES.dumbbell = {
  match:["haltère","haltères","haltere","halteres","dumbbell","db ","db-","lateral raise","rear delt fly","bulgarian","farmer carry","db rdl","db snatch","shoulder press"],
  available: window.RACINE_EQUIPMENT.dumbbells.values
};
window.EQUIPMENT_LOAD_RULES.barbell = {
  match:["barbell","bench","squat","strict press","push press","deadlift","clean","row","hip thrust"],
  step: window.RACINE_EQUIPMENT.barbells.step
};
// Seule famille en kg (convention : KB = kg, tout le reste = lb). Un mouvement
// nommé KB est traité en kg même sans unité dans le texte ; seul un « lb »
// explicite le fait retomber sur le comportement lb. Arrondit aux vraies
// tailles du rack au lieu de l'arrondi générique aux 5.
window.EQUIPMENT_LOAD_RULES.kettlebell = {
  match:["kb ","kettlebell"],
  unit: window.RACINE_EQUIPMENT.kettlebells.unit,
  available: window.RACINE_EQUIPMENT.kettlebells.values
};
