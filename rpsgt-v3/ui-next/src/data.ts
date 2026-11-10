import type { ArtifactType, CaseData, CommandItem } from './model';

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  hypnogram: 'Hypnogram',
  psg_report: 'PSG report',
  hsat_report: 'HSAT report',
  actigraphy: 'Actigraphy',
  histogram: 'Histogram',
  cpap_log: 'CPAP usage log',
};

// These are original demonstration questions, NOT clinical facts extracted
// from the PDF/HTML report. Replace with the audited case catalog when ready.
export const DEMO_CASES: readonly CaseData[] = [
  {
    id: 'psg-report-intro',
    title: 'PSG report verification',
    category: 'PSG Reports',
    domain: 'D3C',
    descriptor: 'Fictional teaching report · no patient-identifying information',
    isFictional: true,
    artifacts: [
      { id: 'psg-report', type: 'psg_report', title: 'Sample PSG report',
        description: 'Existing Sleep Pathways Guild fictional diagnostic teaching report',
        src: '/sample-psg-report.html', format: 'html' },
    ],
    questions: [
      {
        id: 'psg-q1',
        prompt: 'When verifying the apnea-hypopnea index (AHI) for an attended PSG, which time base belongs in the denominator?',
        choices: [
          'Total sleep time expressed in hours',
          'The number of recording channels',
          'The number of 30-second epochs in the full recording',
          'Total recording time expressed in seconds',
        ],
        correctIndex: 0,
        explanation: 'AHI uses the number of scored apneas plus hypopneas divided by total sleep time in hours. Confirm that both the event count and the sleep-time denominator describe the same study.',
        evidenceNote: 'Original concept question; not a diagnosis or a finding about the displayed report.',
      },
      {
        id: 'psg-q2',
        prompt: 'A report summary conflicts with its underlying scored events. What is the best first verification step?',
        choices: [
          'Accept the summary as definitive without checking the record',
          'Reconcile the event counts, sleep time, and source scoring before drawing a conclusion',
          'Change the summary until it matches a typical patient profile',
          'Treat the discrepancy as a confirmed equipment failure',
        ],
        correctIndex: 1,
        explanation: 'A discrepancy should prompt a source-data and calculation review. Document inconsistencies and follow facility procedures and the supervising clinician’s review process.',
        evidenceNote: 'Original quality-control scenario; no patient-specific interpretation is being made.',
      },
    ],
    coachPrompts: [
      { title: 'Verify the AHI', advice: 'Start with the scored apnea and hypopnea counts. Confirm the total sleep time in hours. Compute the index, compare with the report, and document any discrepancy.' },
      { title: 'Compare report sections', advice: 'Check that study timing, sleep-stage totals, respiratory counts, oxygen metrics, and the written interpretation are internally consistent before concluding anything.' },
      { title: 'Scope of practice', advice: 'Technologists verify data and document issues within policy. Clinical diagnosis and treatment decisions belong to the authorized clinician.' },
    ],
  },
  {
    id: 'pap-report-intro',
    title: 'PAP titration report review',
    category: 'PAP Reports',
    domain: 'D4A',
    descriptor: 'Fictional titration report · educational practice',
    isFictional: true,
    artifacts: [
      { id: 'pap-report', type: 'psg_report', title: 'Sample PAP titration report',
        description: 'Existing Sleep Pathways Guild fictional PAP teaching report',
        src: '/sample-pap-titration-report.html', format: 'html' },
    ],
    questions: [
      {
        id: 'pap-q1',
        prompt: 'In a hypothetical bilevel setting with IPAP 16 cm H₂O and EPAP 10 cm H₂O, what is the pressure support?',
        choices: ['26 cm H₂O', '6 cm H₂O', '10 cm H₂O', '16 cm H₂O'],
        correctIndex: 1,
        explanation: 'Pressure support = IPAP − EPAP = 16 − 10 = 6 cm H₂O. This hypothetical calculation is separate from the displayed sample report.',
        evidenceNote: 'Hypothetical standalone calculation. Do not interpret it as a setting shown in the report.',
      },
    ],
    coachPrompts: [
      { title: 'Verify pressure support', advice: 'For bilevel settings, pressure support equals IPAP minus EPAP. Write the units, check the arithmetic, and distinguish recorded settings from prescribed decisions.' },
      { title: 'Review titration context', advice: 'Separate leak, sleep stage, body position, residual events, patient tolerance, oxygenation, and orders when reviewing a titration record.' },
    ],
  },
];

export const PRACTICE_TASKS: readonly { code: string; label: string }[] = [
  { code: 'D1A', label: 'Clinical history & evaluation' },
  { code: 'D1B', label: 'Patient education' },
  { code: 'D1C', label: 'Therapeutic support' },
  { code: 'D2A', label: 'Equipment & study preparation' },
  { code: 'D2B', label: 'Study performance' },
  { code: 'D2C', label: 'Troubleshooting & response' },
  { code: 'D3A', label: 'Adult scoring' },
  { code: 'D3B', label: 'Pediatric scoring' },
  { code: 'D3C', label: 'Reporting & verification' },
  { code: 'D4A', label: 'PAP interventions' },
  { code: 'D4B', label: 'Alternative therapies' },
  { code: 'D4C', label: 'Oxygen therapy' },
];

export const COMMANDS: readonly CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Your learner overview',
    category: 'Navigation', keywords: 'home progress', action: { type: 'href', href: '/index.html' } },
  { id: 'practice', label: 'Practice Center', description: 'Build a focused question session',
    category: 'Navigation', keywords: 'questions domains', action: { type: 'href', href: '/practice.html' } },
  { id: 'case-index', label: 'Case Review Notebook', description: 'Browse original teaching cases',
    category: 'Navigation', keywords: 'reports cases artifacts notebook', action: { type: 'case', caseId: '' } },
  { id: 'coach', label: 'Coach Bob', description: 'Open contextual case-review guidance',
    category: 'Navigation', keywords: 'mentor help chat tips', action: { type: 'coach' } },
  { id: 'reports', label: 'Progress Reports', description: 'Review your existing study results',
    category: 'Navigation', keywords: 'progress history scores', action: { type: 'href', href: '/reports.html' } },
  ...DEMO_CASES.map(c => ({
    id: c.id, label: c.title, description: c.category + ' · ' + c.domain,
    category: 'Case studies' as const, keywords: c.title + ' ' + c.domain + ' ' + c.category,
    action: { type: 'case' as const, caseId: c.id },
  })),
  ...PRACTICE_TASKS.map(task => ({
    id: 'practice-' + task.code,
    label: 'Practice ' + task.code + ' · ' + task.label,
    description: 'Open this task directly in the existing Practice Center',
    category: 'Practice tasks' as const,
    keywords: task.label + ' ' + task.code + ' RPSGT',
    action: { type: 'href' as const, href: '/practice.html?task=' + task.code + '&start=1' },
  })),
];
