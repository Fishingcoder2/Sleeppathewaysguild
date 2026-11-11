import { FileText, Activity, BarChart3, CalendarDays, FileWarning } from 'lucide-react';
import { useState } from 'react';
import type { ArtifactType, CaseArtifact } from '../model';
import { ARTIFACT_LABELS } from '../data';

const ALL_TYPES: readonly ArtifactType[] = [
  'hypnogram', 'psg_report', 'hsat_report', 'actigraphy', 'histogram', 'cpap_log',
];

interface Props {
  artifacts: readonly CaseArtifact[];
  activeId: string;
  onSelect: (id: string) => void;
}

const typeIcon: Record<ArtifactType, typeof Activity> = {
  hypnogram: Activity,
  psg_report: FileText,
  hsat_report: FileText,
  actigraphy: CalendarDays,
  histogram: BarChart3,
  cpap_log: Activity,
};

export function ArtifactViewer({ artifacts, activeId, onSelect }: Props) {
  const artifact = artifacts.find(item => item.id === activeId) ?? artifacts[0];
  const [zoom, setZoom] = useState(false);
  if (!artifact) return (
    <section className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <FileWarning className="text-amber-600" size={34}/>
      <h2 className="font-bold">No validated artifact available</h2>
      <p className="max-w-md text-sm text-slate-600">This case does not have a teaching artifact attached. It cannot be interpreted from a placeholder.</p>
    </section>
  );
  return (
    <section aria-label="Clinical teaching artifact" className="flex h-full min-h-[460px] min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Artifact types">
        {ALL_TYPES.map(type => {
          const found = artifacts.find(item => item.type === type);
          const Icon = typeIcon[type];
          return (
            <button key={type} type="button" disabled={!found}
              aria-pressed={Boolean(found && found.id === artifact.id)}
              title={found ? 'Open ' + found.title : ARTIFACT_LABELS[type] + ' is not available for this case'}
              onClick={() => { if (found) { setZoom(false); onSelect(found.id); } }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold outline-offset-1 focus-visible:outline-2 focus-visible:outline-cyan-500 ${found?.id === artifact.id ? 'bg-cyan-800 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'} disabled:cursor-not-allowed disabled:opacity-35`}>
              <Icon aria-hidden="true" size={15}/>{ARTIFACT_LABELS[type]}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-900">{artifact.title}</h2>
          <p className="text-xs text-slate-600">{artifact.description}</p>
        </div>
        {artifact.format === 'image' && <button type="button" aria-pressed={zoom} onClick={() => setZoom(v => !v)}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-100">
          {zoom ? 'Fit image' : 'Zoom image'}
        </button>}
      </div>
      <div className="case-artifact-canvas relative min-h-[400px] flex-1 overflow-auto rounded-xl border border-slate-300 bg-white">
        {artifact.format === 'image'
          ? <img src={artifact.src} alt={artifact.description}
              className={zoom ? 'max-w-none object-contain' : 'mx-auto h-auto max-h-full max-w-full object-contain'} />
          : <iframe key={artifact.id} src={artifact.src} title={artifact.title}
              loading="lazy" sandbox="allow-same-origin"
              className="h-full min-h-[530px] w-full border-0" />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>Fictional teaching material · not a patient diagnostic record</span>
        <a href={artifact.src} target="_blank" rel="noopener noreferrer"
          className="font-semibold text-cyan-800 underline underline-offset-2">Open artifact in separate view</a>
      </div>
    </section>
  );
}
