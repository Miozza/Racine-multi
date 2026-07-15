// Racine V2.9 — Brain Movement Profiles
(function(){
  "use strict";

  function s(v){ return String(v==null?'':v).trim(); }
  function n(v){ return s(v).toLowerCase(); }

  var PROFILES = [
    {
      match:/lat\s*pull\s*down/i,
      profile:{
        family:'cable_pull',
        sensitivity:'low',
        progressionStyle:'reps_first',
        confidenceBias:3,
        ambitionBias:-3,
        defaultDecision:'reps_quality_first',
        vocabulary:{
          base:'tirage vertical au câble',
          progression:'qualité et reps avant charge',
          risk:'la charge ne doit pas transformer le tirage en mouvement de bras ou de tronc'
        },
        explain:{
          validation:'Je privilégie une amplitude complète et un torse stable avant une hausse.',
          next:'Je veux confirmer les répétitions propres avant de monter la pile.'
        }
      }
    },
    {
      match:/weighted\s*pull|pull[- ]?up|chin[- ]?up|muscle[- ]?up/i,
      profile:{
        family:'bodyweight_heavy',
        sensitivity:'very_high',
        progressionStyle:'consolidation_first',
        confidenceBias:-8,
        ambitionBias:-12,
        defaultDecision:'consolidation',
        vocabulary:{
          base:'poids de corps',
          progression:'consolidation avant hausse',
          risk:'très sensible aux petites hausses et au poids corporel'
        },
        explain:{
          highRpe:'Dernier signal RPE élevé : la charge est validée, mais pas encore confortable.',
          validation:'Une charge lestée doit être confirmée avant d’ajouter du poids.',
          next:'Je veux confirmer que la charge devient plus confortable avant une hausse.'
        }
      }
    },
    {
      match:/\bdip\b|weighted\s*dip|ring\s*dip/i,
      profile:{
        family:'bodyweight_heavy',
        sensitivity:'very_high',
        progressionStyle:'consolidation_first',
        confidenceBias:-7,
        ambitionBias:-10,
        defaultDecision:'consolidation',
        vocabulary:{
          base:'poids de corps',
          progression:'consolidation avant lest',
          risk:'très sensible à l’amplitude et à la fatigue des épaules/triceps'
        },
        explain:{
          highRpe:'Effort élevé sur un mouvement au poids du corps.',
          validation:'Le poids du corps doit être maîtrisé avant d’ajouter du lest.',
          next:'Je veux confirmer la charge avec des reps propres avant une hausse.'
        }
      }
    },
    {
      match:/front\s*squat/i,
      profile:{
        family:'barbell_strength',
        sensitivity:'high',
        progressionStyle:'confirm_then_step',
        confidenceBias:-3,
        ambitionBias:-5,
        defaultDecision:'validate',
        vocabulary:{
          base:'force bas du corps',
          progression:'validation avant hausse',
          risk:'sensible au plafond et à la fatigue systémique'
        },
        explain:{
          validation:'Une nouvelle charge de force doit être validée au moins deux fois.',
          next:'Je veux une validation solide avant de proposer la prochaine hausse.'
        }
      }
    },
    {
      match:/strict\s*press|shoulder\s*press/i,
      profile:{
        family:'vertical_press',
        sensitivity:'high',
        progressionStyle:'slow_strength',
        confidenceBias:-4,
        ambitionBias:-7,
        defaultDecision:'validate',
        vocabulary:{
          base:'poussée verticale',
          progression:'petites hausses et validations',
          risk:'les hausses deviennent vite coûteuses'
        },
        explain:{
          validation:'La poussée verticale progresse lentement : confirmation recommandée.',
          next:'Je veux confirmer la charge sans compensation avant de monter.'
        }
      }
    },
    {
      match:/hip\s*thrust/i,
      profile:{
        family:'posterior_chain',
        sensitivity:'low',
        progressionStyle:'momentum_allowed',
        confidenceBias:8,
        ambitionBias:10,
        defaultDecision:'normal_progression',
        vocabulary:{
          base:'chaîne postérieure',
          progression:'progression normale si les reps restent propres',
          risk:'moins sensible que les mouvements de force technique'
        },
        explain:{
          progression:'La progression récente est le facteur dominant sur ce mouvement.',
          next:'Je veux confirmer la nouvelle charge; si elle passe proprement, la progression peut continuer.'
        }
      }
    },
    {
      match:/barbell\s*row|row/i,
      profile:{
        family:'pull_strength',
        sensitivity:'medium',
        progressionStyle:'steady_progression',
        confidenceBias:2,
        ambitionBias:0,
        defaultDecision:'normal_or_validate',
        vocabulary:{
          base:'tirage lourd',
          progression:'progression régulière avec contrôle technique',
          risk:'la charge peut monter si le buste reste solide'
        },
        explain:{
          progression:'La progression est acceptable si la technique reste stricte.',
          next:'Je veux confirmer la charge sans swing du dos.'
        }
      }
    },
    {
      match:/db\s*rdl|romanian/i,
      profile:{
        family:'hinge_db',
        sensitivity:'medium',
        progressionStyle:'equipment_limited',
        confidenceBias:0,
        ambitionBias:-2,
        defaultDecision:'equipment_aware',
        vocabulary:{
          base:'charnière hanche',
          progression:'progression limitée par les haltères disponibles et la technique',
          risk:'risque de surestimation si l’incrément DB est trop grand'
        },
        explain:{
          validation:'Je vérifie surtout si la charge réelle suit la charge proposée.',
          next:'Je veux voir si la charge prévue est réellement utilisée et validée.'
        }
      }
    },
    {
      match:/curl|face\s*pull|lateral\s*raise|rear\s*delt|extension|pushdown|trap-?3/i,
      profile:{
        family:'accessory',
        sensitivity:'low',
        progressionStyle:'reps_first',
        confidenceBias:4,
        ambitionBias:-4,
        defaultDecision:'reps_quality_first',
        vocabulary:{
          base:'accessoire',
          progression:'qualité et reps avant charge',
          risk:'la charge ne doit pas dégrader la forme'
        },
        explain:{
          validation:'Je privilégie la qualité des reps avant une hausse.',
          next:'Je veux confirmer les reps propres avant de monter.'
        }
      }
    }
  ];

  function get(name){
    var label=s(name);
    for(var i=0;i<PROFILES.length;i++){
      if(PROFILES[i].match.test(label)){
        var p=Object.assign({name:label}, PROFILES[i].profile);
        p.matched=true;
        return p;
      }
    }
    return {
      name:label,
      family:'general',
      sensitivity:'medium',
      progressionStyle:'standard',
      confidenceBias:0,
      ambitionBias:0,
      defaultDecision:'standard',
      matched:false,
      vocabulary:{base:'mouvement général', progression:'progression standard', risk:'sensibilité moyenne'},
      explain:{next:'Je veux confirmer la charge avec des répétitions stables.'}
    };
  }

  function normalizeSensitivity(value){
    value=n(value);
    if(value==='very_high'||value==='very high'||value==='très élevée'||value==='tres elevee') return 'very_high';
    if(value==='high'||value==='élevée'||value==='elevee') return 'high';
    if(value==='low'||value==='faible') return 'low';
    if(value==='medium'||value==='moyenne') return 'medium';
    return value||'medium';
  }

  function labelSensitivity(value){
    value=normalizeSensitivity(value);
    if(value==='very_high') return 'très élevée';
    if(value==='high') return 'élevée';
    if(value==='low') return 'faible';
    return 'moyenne';
  }

  window.CoachMovementProfiles={get:get, normalizeSensitivity:normalizeSensitivity, labelSensitivity:labelSensitivity};
})();

