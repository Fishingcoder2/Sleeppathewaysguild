(function(root){
'use strict';
const engine=root.RPSGTHookupLabEngine;
if(!engine)return;
const questions=[
  {
    id:'v3-hookup-aasm-d2a-001',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'International 10-20 measured placement',questionType:'app-authored-lab',
    prompt:'Why should cephalic electrode sites be measured from reproducible landmarks instead of placed by visual symmetry alone?',
    options:['Measured placement supports repeatable International 10-20 positioning','Visual symmetry produces lower impedance than measurement','The 10-20 system is used only after lights out','Measurements are needed only when hair is present'],
    answer:'Measured placement supports repeatable International 10-20 positioning',
    rationale:'International 10-20 placement is based on proportional measurements from reproducible cranial landmarks, which makes site location more consistent across patients and technologists.'
  },
  {
    id:'v3-hookup-aasm-d2a-002',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'10-20 EEG electrode positions',questionType:'app-authored-lab',
    prompt:'Which system determines the standard EEG electrode positions used for routine PSG sleep-staging derivations?',
    options:['International 10-20 system','Modified Lead II system','Borg scale','STOP-BANG system'],
    answer:'International 10-20 system',
    rationale:'Routine PSG EEG electrode nomenclature and positioning are based on the International 10-20 system.'
  },
  {
    id:'v3-hookup-aasm-d2a-003',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Recommended adult PSG EEG derivations',questionType:'app-authored-lab',
    prompt:'Which set matches the AASM-recommended adult EEG derivations for routine sleep staging?',
    options:['F4-M1, C4-M1, O2-M1','Fp1-Fp2, T7-T8, P3-P4','Fz-Cz, Cz-Oz, E1-E2','C3-C4, O1-O2, M1-M2'],
    answer:'F4-M1, C4-M1, O2-M1',
    rationale:'The recommended adult PSG EEG montage includes frontal, central, and occipital channels referenced to the contralateral mastoid/ear reference.'
  },
  {
    id:'v3-hookup-aasm-d2a-004',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'EEG backup electrodes',questionType:'app-authored-lab',
    prompt:'Which backup electrodes best support continued adult PSG EEG display if a recommended right-sided EEG electrode or M1 fails?',
    options:['F3, C3, O1, and M2','Fp1, Fp2, T7, and T8','E1, E2, Chin1, and Chin2','P3, P4, ECG+, and ECG-'],
    answer:'F3, C3, O1, and M2',
    rationale:'Contralateral frontal, central, occipital, and mastoid backup electrodes allow the corresponding left-sided derivations to be displayed when needed.'
  },
  {
    id:'v3-hookup-aasm-d2a-005',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Minimum EEG regional coverage',questionType:'app-authored-lab',
    prompt:'At minimum, which scalp regions must be represented by EEG derivations for routine sleep staging?',
    options:['Frontal, central, and occipital','Temporal, parietal, and mastoid only','Frontal and temporal only','Occipital and mastoid only'],
    answer:'Frontal, central, and occipital',
    rationale:'Routine sleep staging requires EEG coverage that represents frontal, central, and occipital activity.'
  },
  {
    id:'v3-hookup-aasm-d2a-006',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Recommended EOG derivations',questionType:'app-authored-lab',
    prompt:'Which pair matches the AASM-recommended EOG derivations for adult PSG?',
    options:['E1-M2 and E2-M2','E1-E2 and F4-M1','E1-F3 and E2-F4','E1-C3 and E2-C4'],
    answer:'E1-M2 and E2-M2',
    rationale:'The recommended EOG channels reference both eye electrodes to M2.'
  },
  {
    id:'v3-hookup-aasm-d2a-007',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Recommended EOG electrode placement',questionType:'app-authored-lab',
    prompt:'For the recommended adult EOG setup, which placement relationship is correct?',
    options:['E1 is below/lateral to the left outer canthus and E2 is above/lateral to the right outer canthus','Both E1 and E2 are centered directly below the pupils','E1 is above the left eyebrow and E2 is on the right mastoid','Both electrodes are placed on the forehead midline'],
    answer:'E1 is below/lateral to the left outer canthus and E2 is above/lateral to the right outer canthus',
    rationale:'The recommended EOG geometry places the two electrodes on opposite vertical sides of the eyes so conjugate eye movements generate useful opposing deflections.'
  },
  {
    id:'v3-hookup-aasm-d2a-008',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Chin EMG three-electrode placement',questionType:'app-authored-lab',
    prompt:'Why are three electrodes applied for the standard chin EMG setup?',
    options:['Two form the working derivation and the third provides a backup option','All three must be averaged into one channel','One is required to measure oxygen saturation','The third is used as the ECG ground'],
    answer:'Two form the working derivation and the third provides a backup option',
    rationale:'The chin arrangement provides a standard working derivation plus an additional inferior electrode that can preserve recording if one working electrode becomes unusable.'
  },
  {
    id:'v3-hookup-aasm-d2a-009',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Chin EMG electrode geometry',questionType:'app-authored-lab',
    prompt:'Which description best matches standard chin EMG electrode geometry?',
    options:['One electrode just above the inferior mandibular edge near midline and two electrodes below the mandible on opposite sides','Three electrodes placed in a straight horizontal row across the forehead','Two electrodes on the mastoids and one on the chin','One electrode on each cheek and one on the nose'],
    answer:'One electrode just above the inferior mandibular edge near midline and two electrodes below the mandible on opposite sides',
    rationale:'The standard chin EMG arrangement uses one superior midline site and two inferior lateral sites beneath the mandible.'
  },
  {
    id:'v3-hookup-aasm-d2a-010',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'EEG EOG chin impedance target',questionType:'app-authored-lab',
    prompt:'Which maximum impedance target applies to measured EEG, EOG, and chin EMG electrodes in the AASM routine PSG technical specifications?',
    options:['5 kΩ','10 kΩ','25 kΩ','No impedance target is specified'],
    answer:'5 kΩ',
    rationale:'The routine PSG technical specification sets a 5 kΩ maximum for measured EEG, EOG, and chin EMG electrode impedance.'
  },
  {
    id:'v3-hookup-aasm-d2a-011',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Leg EMG anterior tibialis placement',questionType:'app-authored-lab',
    prompt:'Which leg EMG placement best follows AASM technical specifications for monitoring leg movements?',
    options:['Surface electrodes placed longitudinally and symmetrically over the middle of each anterior tibialis','One electrode on each patella with a shared abdominal reference','Electrodes placed transversely over the calf only on the dominant leg','One electrode on each ankle referenced to M1'],
    answer:'Surface electrodes placed longitudinally and symmetrically over the middle of each anterior tibialis',
    rationale:'Leg movement monitoring uses paired surface electrodes over the anterior tibialis, with both legs monitored and separate channels preferred.'
  },
  {
    id:'v3-hookup-aasm-d2a-012',domain:'D2',taskCode:'D2A',task:'Prepare and perform patient hookup',topic:'Leg EMG electrode spacing',questionType:'app-authored-lab',
    prompt:'How should the two electrodes on one anterior tibialis generally be spaced for routine leg EMG monitoring?',
    options:['About 2-3 cm apart or one-third of the muscle length, whichever is shorter','Exactly 10 cm apart on every patient','Directly touching to minimize impedance','One at the knee and one at the ankle'],
    answer:'About 2-3 cm apart or one-third of the muscle length, whichever is shorter',
    rationale:'The recommended spacing adapts to patient anatomy while keeping the pair centered longitudinally over the anterior tibialis.'
  },
  {
    id:'v3-hookup-aasm-d2b-001',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'Artifact and impedance recheck',questionType:'app-authored-lab',
    prompt:'A previously clean EEG channel develops a new pattern that may be artifact. What technical check is specifically appropriate during the recording?',
    options:['Recheck the relevant electrode impedances and signal pathway','Immediately rescore every prior epoch','Disable the channel without investigation','Increase notch filtering on every channel first'],
    answer:'Recheck the relevant electrode impedances and signal pathway',
    rationale:'When a suspicious artifactual pattern appears, electrode impedance and the associated signal pathway should be reassessed rather than hidden with display changes.'
  },
  {
    id:'v3-hookup-aasm-d2b-002',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'Leg EMG impedance',questionType:'app-authored-lab',
    prompt:'A leg EMG pair measures 8 kΩ with a stable clean signal. How does that compare with AASM technical guidance?',
    options:['It is within the acceptable limb EMG range, although 5 kΩ or less is preferred','It automatically fails because every PSG electrode must be under 2 kΩ','It is acceptable only for ECG','Leg EMG impedance is never checked'],
    answer:'It is within the acceptable limb EMG range, although 5 kΩ or less is preferred',
    rationale:'Limb EMG impedances of 10 kΩ or less are acceptable, with 5 kΩ or less preferred.'
  },
  {
    id:'v3-hookup-aasm-d2b-003',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'Diagnostic apnea airflow sensor',questionType:'app-authored-lab',
    prompt:'During an adult diagnostic PSG, which airflow sensor is the recommended primary signal for identifying an apnea?',
    options:['Oronasal thermal airflow sensor','Nasal pressure transducer only','Pulse oximeter plethysmography','Thoracic effort belt only'],
    answer:'Oronasal thermal airflow sensor',
    rationale:'For diagnostic apnea identification, the recommended primary airflow signal is oronasal thermal airflow; alternative signals are used when it is unavailable or unreliable.'
  },
  {
    id:'v3-hookup-aasm-d2b-004',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'Diagnostic hypopnea airflow sensor',questionType:'app-authored-lab',
    prompt:'During an adult diagnostic PSG, which airflow signal is the recommended primary signal for identifying a hypopnea?',
    options:['Nasal pressure transducer','Oronasal thermal sensor only','Body position channel','ECG rhythm channel'],
    answer:'Nasal pressure transducer',
    rationale:'Nasal pressure is the recommended primary diagnostic airflow signal for hypopnea identification.'
  },
  {
    id:'v3-hookup-aasm-d2b-005',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'EOG physiologic calibration',questionType:'app-authored-lab',
    prompt:'During pre-study calibration the patient performs the requested eye movements, but one EOG channel remains flat. What is the best next action?',
    options:['Troubleshoot the EOG electrode and connection pathway before lights out','Assume the channel will recover in REM sleep','Score the calibration as normal because the patient followed directions','Replace the EOG channel with SpO2'],
    answer:'Troubleshoot the EOG electrode and connection pathway before lights out',
    rationale:'Physiologic calibration should demonstrate that requested maneuvers produce the expected recorded response; a missing response should be corrected before relying on the channel.'
  },
  {
    id:'v3-hookup-aasm-d2b-006',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'Chin EMG physiologic calibration',questionType:'app-authored-lab',
    prompt:'Which calibration finding best supports a usable chin EMG channel before lights out?',
    options:['Relaxed chin activity is visible and chewing or teeth gritting clearly increases the signal','The chin channel remains flat during every maneuver','The chin signal matches the pulse oximeter waveform','The chin signal disappears when the eyes move'],
    answer:'Relaxed chin activity is visible and chewing or teeth gritting clearly increases the signal',
    rationale:'A usable chin EMG calibration shows visible awake baseline activity and a clear increase with voluntary jaw muscle activation.'
  },
  {
    id:'v3-hookup-aasm-d2b-007',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'Respiratory calibration signal direction',questionType:'app-authored-lab',
    prompt:'What should the technologist verify about airflow and respiratory-effort channels during calibration?',
    options:['Each breath produces large clean signals and the direction/relationship of the respiratory channels is understood','All respiratory channels are made visually identical by filtering','Effort belts are left unadjusted once applied','Signal direction is irrelevant as long as SpO2 is present'],
    answer:'Each breath produces large clean signals and the direction/relationship of the respiratory channels is understood',
    rationale:'Calibration should confirm readable respiratory signals and document how inhalation and exhalation appear so overnight changes can be interpreted correctly.'
  },
  {
    id:'v3-hookup-aasm-d2b-008',domain:'D2',taskCode:'D2B',task:'Monitor and respond during the study',topic:'ECG modified Lead II monitoring',questionType:'app-authored-lab',
    prompt:'Why is a single-channel modified Lead II configuration commonly useful in PSG?',
    options:['It supports heart-rate and rhythm/dysrhythmia monitoring during the study','It replaces the EEG montage for sleep staging','It is the primary signal for scoring hypopneas','It determines body position'],
    answer:'It supports heart-rate and rhythm/dysrhythmia monitoring during the study',
    rationale:'A modified Lead II configuration provides a practical single ECG channel for monitoring cardiac rate and rhythm in PSG.'
  }
];
for(const question of questions){
  question.referenceKeys=['aasm-scoring-manual-v3','hookup-10-20'];
  question.studyRecommendationKeys=['aasm-scoring-manual-v3','hookup-10-20'];
  question.source='Sleep Pathways Guild app-authored AASM/10-20 Hookup supplement';
  question.qa={manualReviewRecommended:false,appAuthored:true};
}
const baseEligible=engine.eligibleQuestions.bind(engine);
const baseSelect=engine.selectQuestions.bind(engine);
const combine=records=>[...(Array.isArray(records)?records:[]),...questions];
engine.eligibleQuestions=records=>baseEligible(combine(records));
engine.selectQuestions=(records,count,seed)=>{
  const desired=Math.max(0,Number(count)||engine.SESSION_SIZE||10);
  const supplementCount=Math.min(6,desired,questions.length);
  const supplement=baseSelect(questions,supplementCount,String(seed||'hookup')+'|aasm-1020');
  const legacy=baseSelect(Array.isArray(records)?records:[],Math.max(0,desired-supplement.length),String(seed||'hookup')+'|legacy');
  return baseSelect([...supplement,...legacy],desired,String(seed||'hookup')+'|mix');
};
root.RPSGTHookupAasmSupplement={version:'1.0.0',appAuthored:true,questionCount:questions.length,checkpointTarget:6,questions};
})(typeof window!=='undefined'?window:globalThis);
