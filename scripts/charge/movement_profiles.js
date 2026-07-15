// Racine V2.9 â€” Brain Movement Profiles
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
          base:'tirage vertical au cÃ¢ble',
          progression:'qualitÃ© et reps avant charge',
          risk:'la charge ne doit pas transformer le tirage en mouvement de bras ou de tronc'
        },
        explain:{
          validation:'Je privilÃ©gie une amplitude complÃ¨te et un torse stable avant une hausse.',
          next:'Je veux confirmer les rÃ©pÃ©titions propres avant de monter la pile.'
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
          risk:'trÃ¨s sensible aux petites hausses et au poids corporel'
        },
        explain:{
          highRpe:'Dernier signal RPE Ã©levÃ© : la charge est validÃ©e, mais pas encore confortable.',
          validation:'Une charge lestÃ©e doit Ãªtre confirmÃ©e avant dâ€™ajouter du poids.',
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
          risk:'trÃ¨s sensible Ã  lâ€™amplitude et Ã  la fatigue des Ã©paules/triceps'
        },
        explain:{
          highRpe:'Effort Ã©levÃ© sur un mouvement au poids du corps.',
          validation:'Le poids du corps doit Ãªtre maÃ®trisÃ© avant dâ€™ajouter du lest.',
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
          risk:'sensible au plafond et Ã  la fatigue systÃ©mique'
        },
        explain:{
          validation:'Une nouvelle charge de force doit Ãªtre validÃ©e au moins deux fois.',
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
          base:'poussÃ©e verticale',
          progression:'petites hausses et validations',
          risk:'les hausses deviennent vite coÃ»teuses'
        },
        explain:{
          validation:'La poussÃ©e verticale progresse lentement : confirmation recommandÃ©e.',
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
          base:'chaÃ®ne postÃ©rieure',
          progression:'progression normale si les reps restent propres',
          risk:'moins sensible que les mouvements de force technique'
        },
        explain:{
          progression:'La progression rÃ©cente est le facteur dominant sur ce mouvement.',
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
          progression:'progression rÃ©guliÃ¨re avec contrÃ´le technique',
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
          base:'charniÃ¨re hanche',
          progression:'progression limitÃ©e par les haltÃ¨res disponibles et la technique',
          risk:'risque de surestimation si lâ€™incrÃ©ment DB est trop grand'
        },
        explain:{
          validation:'Je vÃ©rifie surtout si la charge rÃ©elle suit la charge proposÃ©e.',
          next:'Je veux voir si la charge prÃ©vue est rÃ©ellement utilisÃ©e et validÃ©e.'
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
          progression:'qualitÃ© et reps avant charge',
          risk:'la charge ne doit pas dÃ©grader la forme'
        },
        explain:{
          validation:'Je privilÃ©gie la qualitÃ© des reps avant une hausse.',
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
      vocabulary:{base:'mouvement gÃ©nÃ©ral', progression:'progression standard', risk:'sensibilitÃ© moyenne'},
      explain:{next:'Je veux confirmer la charge avec des rÃ©pÃ©titions stables.'}
    };
  }

  function normalizeSensitivity(value){
    value=n(value);
    if(value==='very_high'||value==='very high'||value==='trÃ¨s Ã©levÃ©e'||value==='tres elevee') return 'very_high';
    if(value==='high'||value==='Ã©levÃ©e'||value==='elevee') return 'high';
    if(value==='low'||value==='faible') return 'low';
    if(value==='medium'||value==='moyenne') return 'medium';
    return value||'medium';
  }

  function labelSensitivity(value){
    value=normalizeSensitivity(value);
    if(value==='very_high') return 'trÃ¨s Ã©levÃ©e';
    if(value==='high') return 'Ã©levÃ©e';
    if(value==='low') return 'faible';
    return 'moyenne';
  }

  window.CoachMovementProfiles={get:get, normalizeSensitivity:normalizeSensitivity, labelSensitivity:labelSensitivity};
})();

