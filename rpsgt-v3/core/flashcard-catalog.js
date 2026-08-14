(function(root){
  'use strict';

  const VERSION='2026-08-14-v2-restore-1';
  const UPDATED_AT='2026-08-14T00:00:00.000Z';
  const domain='Scoring, Reporting, and Data Verification';
  const task='Score adult studies';
  const taskCode='D3A';

  const cards=[
    {
      id:'builtin:v2-ekg-nsr',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which rhythm is described by a regular rate of 60–100 bpm, with every P wave followed by a normal QRS complex and a normal PR interval?',
      back:'Normal Sinus Rhythm',
      explanation:'Regular rhythm, rate 60–100 bpm. Every P wave is followed by a normal QRS complex, PR interval is normal.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-sinus-bradycardia',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which sinus rhythm is regular and has the same basic P-QRS relationship as normal sinus rhythm, but with a rate below 60 bpm?',
      back:'Sinus Bradycardia',
      explanation:'Regular rhythm, rate < 60 bpm. Identical to NSR but slower.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-sinus-tachycardia',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which sinus rhythm is regular, has normal P, PR, and QRS features, and has a rate above 100 bpm?',
      back:'Sinus Tachycardia',
      explanation:'Regular rhythm, rate > 100 bpm. Normal P, PR, and QRS.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-sinus-pause',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which rhythm finding is characterized by sudden failure of the SA node to initiate an impulse, producing a visibly prolonged pause?',
      back:'Sinus Pause',
      explanation:'Sudden failure of the SA node to initiate an impulse, creating a long visible pause (> 3 sec = asystole).',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-atrial-fibrillation',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which rhythm is irregularly irregular and lacks distinct P waves, with a fibrillatory baseline instead?',
      back:'Atrial Fibrillation',
      explanation:'Irregularly irregular rhythm. Absent distinct P waves, replaced by a fibrillatory (squiggly) baseline.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-atrial-flutter',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which atrial rhythm shows continuous sawtooth or picket-fence flutter waves instead of standard P waves?',
      back:'Atrial Flutter',
      explanation:"Continuous 'sawtooth' or 'picket fence' pattern of flutter waves instead of standard P waves.",
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-bundle-branch-block',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which conduction pattern may have an underlying normal rhythm but a widened QRS complex greater than 0.12 seconds that can appear notched?',
      back:'Bundle Branch Block',
      explanation:"Underlying rhythm is normal, but QRS complex is widened (>0.12s), often notched or looking like 'rabbit ears'.",
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-ventricular-tachycardia',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which ventricular rhythm is fast and characterized by wide, bizarre QRS complexes at a rate above 100 bpm?',
      back:'Ventricular Tachycardia',
      explanation:'Wide, fast, bizarre QRS complexes >100 bpm. Often resembles continuous mountains.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-ventricular-fibrillation',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which ventricular rhythm is chaotic, with no identifiable P waves, QRS complexes, or T waves?',
      back:'Ventricular Fibrillation',
      explanation:'Chaotic, bizarre electrical activity with no identifiable P, QRS, or T waves. A medical emergency.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-pvc-bigeminy',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which pattern alternates one normal beat with one premature ventricular contraction?',
      back:'PVC (Bigeminy)',
      explanation:'A regular alternating pattern: one normal beat immediately followed by one Premature Ventricular Contraction.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-wenckebach',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which AV block shows progressive PR-interval lengthening until a QRS complex is dropped?',
      back:'2nd Degree AV Block (Wenckebach)',
      explanation:'Progressively lengthening PR interval beat-by-beat until a QRS is entirely dropped.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-ekg-complete-av-block',custom:false,domain,task,taskCode,topic:'Cardiac rhythm recognition',
      front:'Which AV block shows atria and ventricles beating independently, with P waves marching through the QRS complexes without a consistent relationship?',
      back:'3rd Degree (Complete) AV Block',
      explanation:'Atria and ventricles beat completely independently. P waves march through the QRS indiscriminately.',
      sourceContext:'RPSGT V2 EKG flashcard'
    },
    {
      id:'builtin:v2-cardiac-adult-bradycardia',custom:false,domain,task,taskCode,topic:'Cardiac scoring rules',
      front:'What are the AASM criteria for scoring Sinus Bradycardia in an adult during sleep?',
      back:'Sustained HR < 40 bpm',
      explanation:'While 60 bpm is the clinical waking threshold, heart rates drop naturally during sleep, so the AASM threshold is lower.',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-adult-tachycardia',custom:false,domain,task,taskCode,topic:'Cardiac scoring rules',
      front:'What are the AASM criteria for scoring Sinus Tachycardia in an adult during sleep?',
      back:'Sustained HR > 90 bpm',
      explanation:'Requires a sustained rate, not just a brief acceleration following an arousal.',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-asystole',custom:false,domain,task,taskCode,topic:'Cardiac scoring rules',
      front:'How is Asystole scored in both adults and children according to AASM?',
      back:'A cardiac pause lasting 3 seconds or longer',
      explanation:'This is scored as a specific event in the PSG report.',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-wide-complex-tachycardia',custom:false,domain,task,taskCode,topic:'Cardiac scoring rules',
      front:'What defines Wide Complex Tachycardia?',
      back:'≥ 3 consecutive beats | Rate > 100 bpm | QRS duration ≥ 120 msec',
      explanation:'This definition typically captures Ventricular Tachycardia (V-Tach).',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-ecg-derivation-sampling',custom:false,domain,task,taskCode,topic:'Cardiac technical specifications',
      front:'What is the recommended AASM derivation and minimum sampling rate for the ECG channel?',
      back:'Modified Lead II | Minimum 200 Hz',
      explanation:'500 Hz is desirable. Modified Lead II provides the best axis to view P, QRS, and T waves.',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-ecg-filters',custom:false,domain,task,taskCode,topic:'Cardiac technical specifications',
      front:'What are the recommended Low and High Frequency Filter (LFF/HFF) settings for the ECG channel?',
      back:'LFF: 0.3 Hz | HFF: 70 Hz',
      explanation:'0.3 Hz stops respiratory wander. 70 Hz ensures the sharp peaks of the QRS are not rounded off.',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-wenckebach-rule',custom:false,domain,task,taskCode,topic:'Cardiac scoring rules',
      front:'What is the defining characteristic of a 2nd Degree AV Block, Type I (Wenckebach)?',
      back:'Progressively lengthening PR interval until a QRS is dropped.',
      explanation:"Also known as the 'going, going, gone' pattern.",
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    },
    {
      id:'builtin:v2-cardiac-pvc-definition',custom:false,domain,task,taskCode,topic:'Cardiac scoring rules',
      front:'What defines a Premature Ventricular Contraction (PVC)?',
      back:'A wide, bizarre QRS complex with no preceding P wave.',
      explanation:'Because the impulse starts in the ventricles, it bypasses normal fast pathways, causing a wide complex.',
      sourceContext:'RPSGT V2 cardiac-rules flashcard'
    }
  ];

  root.RPSGTFlashcardCatalog={VERSION,UPDATED_AT,cards};
})(typeof window!=='undefined'?window:globalThis);
