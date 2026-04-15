import { useMemo } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { useAutoSave } from './hooks/useAutoSave';
import { useGameStore } from './store/useGameStore';
import { ProgressBar } from './components/ProgressBar';
import { Tooltip } from './components/Tooltip';
import { getRandomHumorPostMessage, getRandomNewsItems } from './features/branding/logic/humorPost';
import {
  MainClickerButton,
  PendingRequestsCounter,
  IncomingClickerPanel,
  CycleCountdown,
  CycleNotification,
} from './features/clicker';
import { MindsetPanel } from './features/mindset';

const PRESTIGE_GOAL_PLACEHOLDER = 5_000;

const DISCIPLE_SUGGESTIONS: ReadonlyArray<{ name: string; role: string }> = [
  { name: 'Nadia Networker', role: 'Future evangeliste de ton reseau' },
  { name: 'Theo Funnel', role: 'Optimise les recrutements repetitifs' },
  { name: 'Mina KPI', role: 'Transforme tout en dashboard' },
];

const SACRIFICES_PLACEHOLDERS: ReadonlyArray<string> = [
  'Dormir moins (vitesse +15%)',
  'Week-ends supprimes (cycle -2s)',
  'Authenticite reduite (acceptation +8%)',
];

function App() {
  useGameLoop();
  useAutoSave();

  const relations = useGameStore((s) => s.relations);
  const totalEarned = useGameStore((s) => s.totalRelationsEarned);
  const acceptanceRate = useGameStore((s) => s.acceptanceRate);
  const cycleDuration = useGameStore((s) => s.cycleDuration);
  const isBanned = useGameStore((s) => s.isBanned);
  const banRemainingSeconds = useGameStore((s) => s.banRemainingSeconds);
  const humorPostMessage = useMemo(() => getRandomHumorPostMessage(), []);
  const newsItems = useMemo(() => getRandomNewsItems(), []);

  const prestigeProgress = Math.min(relations, PRESTIGE_GOAL_PLACEHOLDER);
  const prestigeLabel = `${prestigeProgress.toLocaleString('fr-FR')} / ${PRESTIGE_GOAL_PLACEHOLDER.toLocaleString('fr-FR')}`;

  return (
    <div className="min-h-screen bg-[var(--linkedin-page)] text-[var(--linkedin-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--linkedin-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 py-2 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--linkedin-primary)] text-sm font-bold text-white">
              in
            </div>
            <span className="text-base font-bold text-[var(--linkedin-text)]">GrindIn</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {['Accueil', 'Reseau', 'Emplois', 'Notifications'].map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-md border border-transparent px-3 py-2 text-sm text-[var(--linkedin-muted)] transition-colors hover:border-[var(--linkedin-border)] hover:bg-[var(--linkedin-page)] hover:text-[var(--linkedin-text)]"
              >
                {item}
              </button>
            ))}
          </nav>

          <article className="min-w-[220px] rounded-lg border border-[var(--linkedin-border)] bg-white px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-[var(--linkedin-muted)]">Carte de profil</p>
            <h2 className="mt-2 text-sm font-bold text-[var(--linkedin-text)]">Stagiaire Ambitieux</h2>
            <p className="mt-1 text-xs text-[var(--linkedin-muted)]">Vues profil: +3.5% relation passive</p>
            <div className="mt-2 flex items-center justify-between rounded-md bg-[var(--linkedin-page)] px-2 py-1 text-xs text-[var(--linkedin-text)]">
              <span className="flex items-center gap-1">
                Relations totales
                <Tooltip text="Cumul de toutes les relations obtenues dans la partie, y compris celles dépensées ou perdues ensuite." />
              </span>
              <strong>{totalEarned.toLocaleString('fr-FR')}</strong>
            </div>
          </article>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:px-6">
        <section className="order-2 flex flex-col gap-4 lg:order-1">
          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <div className="mb-3 flex items-center gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--linkedin-muted)]">Relations actuelles</p>
              <Tooltip text="Nombre de relations actives en ce moment. C'est la stat principale de progression." />
            </div>
            <p className="text-4xl font-black leading-none tracking-tight text-[var(--linkedin-primary)] sm:text-5xl">
              {relations.toLocaleString('fr-FR')}
            </p>
            <ProgressBar value={prestigeProgress} max={PRESTIGE_GOAL_PLACEHOLDER} className="mb-1" />
            <div className="text-right text-[11px] text-[var(--linkedin-muted)]">{prestigeLabel}</div>
            <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-[var(--linkedin-muted)]">
              <span>Acceptation {acceptanceRate}%</span>
              <span>Cycle {cycleDuration}s</span>
            </div>
          </article>

          <MindsetPanel />
        </section>

        <section className="order-1 flex flex-col gap-4 lg:order-2">
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <CycleNotification />
          </div>

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <p className="text-sm text-[var(--linkedin-muted)]">Commencez un post inspirant</p>
            <div className="mt-3 rounded-lg border border-[var(--linkedin-border)] bg-[var(--linkedin-page)] px-3 py-4 text-sm text-[var(--linkedin-muted)]">
              {`"${humorPostMessage}"`}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#EAF4FF] px-2 py-1 text-[var(--linkedin-primary)]">Branding +12% (placeholder)</span>
              <span className="rounded-full bg-[#FFF6E8] px-2 py-1 text-[var(--linkedin-muted)]">Decay actif (placeholder)</span>
            </div>
          </article>

          {isBanned && (
            <article className="rounded-xl border border-[var(--linkedin-danger)] bg-[#FDECEC] p-4 text-[var(--linkedin-danger)] shadow-[var(--linkedin-shadow)]">
              <h2 className="text-base font-bold">Votre compte a été restreint</h2>
              <p className="mt-1 text-sm">
                Suspension en cours: {banRemainingSeconds.toFixed(0)}s avant retour dans le flux.
              </p>
            </article>
          )}

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="mb-3 text-base font-bold text-[var(--linkedin-text)]">Réseautage</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)] ring-1 ring-[var(--linkedin-primary)]/10">
                <div className="mb-3 flex items-center justify-end gap-2">
                  <span className="rounded-full bg-[#EAF4FF] px-2 py-1 text-xs font-semibold text-[var(--linkedin-primary)]">Prioritaire</span>
                  <Tooltip text="Le bouton central du jeu. Il envoie les demandes de connexion pour agrandir ton réseau." position="bottom" />
                </div>
                <MainClickerButton />
              </div>

              <div className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--linkedin-text)]">Clicker secondaire</p>
                  <Tooltip text="Les demandes reçues arrivent ici. Tu peux les valider pour gagner du réseau rapidement." position="bottom" />
                </div>
                <IncomingClickerPanel />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PendingRequestsCounter />

              <div className="rounded-lg border border-[var(--linkedin-border)] bg-white p-3">
                <CycleCountdown />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-[var(--linkedin-border)] bg-[var(--linkedin-page)] p-3 text-sm text-[var(--linkedin-muted)]">
              IA autoclicker: inactif (squelette). Quand active, les cartes defilent et s'acceptent en auto.
            </div>
          </article>
        </section>

        <aside className="order-3 flex flex-col gap-4">
          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="text-base font-bold text-[var(--linkedin-text)]">LinkedIn News</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--linkedin-text)]">
              {newsItems.map((item) => (
                <li key={item} className="rounded-md bg-[var(--linkedin-page)] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="text-base font-bold text-[var(--linkedin-text)]">Suggestions de Disciples</h2>
            <div className="mt-3 space-y-3">
              {DISCIPLE_SUGGESTIONS.map((suggestion) => (
                <div key={suggestion.name} className="rounded-md border border-[var(--linkedin-border)] p-3">
                  <p className="text-sm font-semibold text-[var(--linkedin-text)]">{suggestion.name}</p>
                  <p className="mt-1 text-xs text-[var(--linkedin-muted)]">{suggestion.role}</p>
                  <button
                    type="button"
                    disabled
                    className="mt-2 rounded-full border border-[var(--linkedin-primary)] px-3 py-1 text-xs font-semibold text-[var(--linkedin-primary)] opacity-60"
                  >
                    Recruter (bientot)
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="text-base font-bold text-[var(--linkedin-text)]">Accélérez votre carrière</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--linkedin-text)]">
              {SACRIFICES_PLACEHOLDERS.map((sacrifice) => (
                <li key={sacrifice} className="rounded-md bg-[var(--linkedin-page)] px-3 py-2">
                  {sacrifice}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--linkedin-muted)]">Widget sacrifices pret pour brancher SacrificesSlice.</p>
          </article>
        </aside>
      </main>
    </div>
  );
}

export default App;
