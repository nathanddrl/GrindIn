// features/mindset/ui/MindsetPanel.tsx
// Panneau formations LinkedIn — achat, progression, complétion.

import { useMemo } from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { FORMATIONS, JOBS } from '../../../core/constants';
import {
  selectFormationAvailable,
  selectFormationProgress,
} from '../../../store/slices/mindsetSlice';
import { ProgressBar } from '../../../components/ProgressBar';
import type { FormationId, JobId, MindsetState } from '../../../core/types';

// Ordre d'affichage des formations
const FORMATION_ORDER: FormationId[] = [
  'growth_mindset_101',
  'personal_branding_basics',
  'the_art_of_networking',
  'hustle_culture_masterclass',
  'think_and_grow_rich_summary',
  'linkedin_optimization_pro',
  'become_a_thought_leader',
  'manifestation_et_business',
];

function formatSeconds(totalSeconds: number): string {
  const s = Math.ceil(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

interface FormationRowProps {
  id: FormationId;
  mindset: MindsetState;
  cvJobs: readonly JobId[];
  relations: number;
  now: number;
  onBuy: (id: FormationId) => void;
}

function FormationRow({ id, mindset, cvJobs, relations, now, onBuy }: FormationRowProps) {
  const def = FORMATIONS[id];

  const isCompleted  = mindset.completedFormations.includes(id);
  const activeEntry  = mindset.activeFormations.find((af) => af.formationId === id && !af.completed);
  const isInProgress = !!activeEntry;
  const isAvailable  = selectFormationAvailable(mindset, id, cvJobs);
  const canAfford    = relations >= def.cost;
  const progress     = selectFormationProgress(mindset, id, now);
  const remainingSec = activeEntry ? Math.max(0, (activeEntry.endsAt - now) / 1000) : 0;

  if (isCompleted) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-[var(--linkedin-border)] bg-[var(--linkedin-page)] px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-[var(--linkedin-text)]">{def.label}</p>
          <p className="text-xs text-[var(--linkedin-success)]">Terminé · +{def.clicksBonus} dem./clic</p>
        </div>
        <span className="text-xs font-bold text-[var(--linkedin-success)]">✓</span>
      </div>
    );
  }

  if (isInProgress && progress !== null) {
    return (
      <div className="rounded-lg border border-[var(--linkedin-border)] bg-white px-3 py-2">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--linkedin-text)]">{def.label}</p>
          <span className="text-xs text-[var(--linkedin-muted)]">{formatSeconds(remainingSec)}</span>
        </div>
        <ProgressBar value={progress} max={1} />
        <p className="mt-1 text-xs text-[var(--linkedin-muted)]">+{def.clicksBonus} dem./clic à la fin</p>
      </div>
    );
  }

  const isLocked = !isAvailable;

  return (
    <div className={`rounded-lg border border-[var(--linkedin-border)] bg-white px-3 py-2${isLocked ? ' opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--linkedin-text)]">{def.label}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--linkedin-muted)]">{def.description}</p>
          <p className="mt-1 text-xs text-[var(--linkedin-muted)]">
            +{def.clicksBonus} dem./clic · {formatSeconds(def.durationSeconds)}
          </p>
          {isLocked && def.requiredFormationId && !mindset.completedFormations.includes(def.requiredFormationId) && (
            <p className="mt-0.5 text-xs text-[var(--linkedin-danger)]">
              Requiert la formation : {FORMATIONS[def.requiredFormationId].label}
            </p>
          )}
          {isLocked && def.requiredJobId && !cvJobs.includes(def.requiredJobId) && (
            <p className="mt-0.5 text-xs text-[var(--linkedin-danger)]">
              Requiert le job : {JOBS[def.requiredJobId].label}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isLocked || !canAfford}
          onClick={() => onBuy(id)}
          className="shrink-0 rounded-full border border-[var(--linkedin-primary)] px-3 py-1 text-xs font-semibold text-[var(--linkedin-primary)] transition-colors hover:bg-[var(--linkedin-primary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {def.cost.toLocaleString('fr-FR')} rel.
        </button>
      </div>
    </div>
  );
}

export function MindsetPanel() {
  const completedFormations = useGameStore((s) => s.completedFormations);
  const activeFormations    = useGameStore((s) => s.activeFormations);
  const totalClicksBonus    = useGameStore((s) => s.totalClicksBonus);
  const relations        = useGameStore((s) => s.relations);
  const clicksPerRequest = useGameStore((s) => s.clicksPerRequest);
  const now              = useGameStore((s) => s.lastTickAt || s.lastCycleAt || 0);
  const buyFormation     = useGameStore((s) => s.buyFormation);
  const mindset          = useMemo<MindsetState>(() => ({
    completedFormations,
    activeFormations,
    totalClicksBonus,
  }), [completedFormations, activeFormations, totalClicksBonus]);
  // cvJobs sera fourni par le brandingSlice quand il sera implémenté
  const cvJobs: readonly JobId[] = [];

  return (
    <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--linkedin-text)]">Mindset</h2>
        <span className="text-xs text-[var(--linkedin-muted)]">
          {clicksPerRequest} dem./clic
          {mindset.totalClicksBonus > 0 && (
            <span className="ml-1 text-[var(--linkedin-success)]">(+{mindset.totalClicksBonus})</span>
          )}
        </span>
      </div>
      <div className="space-y-2">
        {FORMATION_ORDER.map((id) => (
          <FormationRow
            key={id}
            id={id}
            mindset={mindset}
            cvJobs={cvJobs}
            relations={relations}
            now={now}
            onBuy={buyFormation}
          />
        ))}
      </div>
    </article>
  );
}
