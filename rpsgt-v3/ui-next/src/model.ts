export type ArtifactType =
  | 'hypnogram'
  | 'psg_report'
  | 'hsat_report'
  | 'actigraphy'
  | 'histogram'
  | 'cpap_log';

export interface CaseArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  /** Same-origin educational asset. Do not load PHI or third-party URLs. */
  src: string;
  format: 'image' | 'html' | 'pdf';
}

export interface CaseQuestion {
  id: string;
  prompt: string;
  choices: readonly string[];
  correctIndex: number;
  explanation: string;
  /** Demonstration concept questions are not presented as clinical findings. */
  evidenceNote: string;
}

export interface CaseData {
  id: string;
  title: string;
  category: string;
  domain: string;
  descriptor: string;
  isFictional: true;
  artifacts: readonly CaseArtifact[];
  questions: readonly CaseQuestion[];
  coachPrompts: readonly { title: string; advice: string }[];
}

export type CommandAction =
  | { type: 'href'; href: string }
  | { type: 'case'; caseId: string }
  | { type: 'coach' };

export interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  category: 'Navigation' | 'Case studies' | 'Practice tasks';
  action: CommandAction;
}

export interface CoachMessage {
  id: string;
  sender: 'coach' | 'learner';
  text: string;
}

export type CoachAdapter = (request: {
  caseId: string;
  questionId: string | null;
  artifactType: ArtifactType;
  message: string;
}) => Promise<string>;
