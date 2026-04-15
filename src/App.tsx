import { useGameLoop } from './hooks/useGameLoop';
import { useAutoSave } from './hooks/useAutoSave';
import { useGameStore } from './store/useGameStore';
import { ProgressBar } from './components/ProgressBar';
import {
  MainClickerButton,
  PendingRequestsCounter,
  IncomingClickerPanel,
  CycleCountdown,
  CycleNotification,
} from './features/clicker';

const PRESTIGE_GOAL_PLACEHOLDER = 5_000;

const NEWS_ITEMS: ReadonlyArray<string> = [
  'Le teletravail est mort: +10% de vitesse de recrutement.',
  'Nouvelle tendance: poster sans lire augmente la visibilite.',
  'Le personal branding remplace les competences: +5% acceptation.',
];

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

  const prestigeProgress = Math.min(relations, PRESTIGE_GOAL_PLACEHOLDER);

  const relationLabel = `${relations.toLocaleString('fr-FR')} relations`;
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

          <div className="min-w-[220px] rounded-lg border border-[var(--linkedin-border)] bg-white px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--linkedin-muted)]">
              <span>{relationLabel}</span>
              <span>Prestige</span>
            </div>
            <ProgressBar value={prestigeProgress} max={PRESTIGE_GOAL_PLACEHOLDER} className="mb-1" />
            <div className="text-right text-[11px] text-[var(--linkedin-muted)]">{prestigeLabel}</div>
            <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-[var(--linkedin-muted)]">
              <span>Acceptation {acceptanceRate}%</span>
              <span>Cycle {cycleDuration}s</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1240px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:px-6">
        <section className="order-2 flex flex-col gap-4 lg:order-1">
          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <p className="text-xs uppercase tracking-wide text-[var(--linkedin-muted)]">Carte de profil</p>
            <h2 className="mt-2 text-lg font-bold text-[var(--linkedin-text)]">Stagiaire Ambitieux</h2>
            <p className="mt-1 text-sm text-[var(--linkedin-muted)]">Vues de votre profil: +3.5% relation passive</p>
            <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--linkedin-page)] px-3 py-2 text-sm text-[var(--linkedin-text)]">
              <span>Total gagne</span>
              <strong>{totalEarned.toLocaleString('fr-FR')}</strong>
            </div>
          </article>

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="text-base font-bold text-[var(--linkedin-text)]">Mindset</h2>
            <p className="mt-1 text-sm text-[var(--linkedin-muted)]">Formations en cours (squelette):</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--linkedin-text)]">
              <li className="rounded-md bg-[var(--linkedin-page)] px-3 py-2">Storytelling B2B Niveau 1</li>
              <li className="rounded-md bg-[var(--linkedin-page)] px-3 py-2">Leadership performatif</li>
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="mb-3 text-base font-bold text-[var(--linkedin-text)]">Action primaire</h2>
            <MainClickerButton />
          </article>
        </section>

        <section className="order-1 flex flex-col gap-4 lg:order-2">
          <div className="fixed bottom-4 left-4 z-50">
            <CycleNotification />
          </div>

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <p className="text-sm text-[var(--linkedin-muted)]">Commencez un post inspirant</p>
            <div className="mt-3 rounded-lg border border-[var(--linkedin-border)] bg-[var(--linkedin-page)] px-3 py-4 text-sm text-[var(--linkedin-muted)]">
              "Aujourd'hui, j'ai appris que la resilience se mesure en KPI."
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[#EAF4FF] px-2 py-1 text-[var(--linkedin-primary)]">Branding +12% (placeholder)</span>
              <span className="rounded-full bg-[#FFF6E8] px-2 py-1 text-[var(--linkedin-muted)]">Decay actif (placeholder)</span>
            </div>
          </article>

          {isBanned && (
            <article className="rounded-xl border border-[var(--linkedin-danger)] bg-[#FDECEC] p-4 text-[var(--linkedin-danger)] shadow-[var(--linkedin-shadow)]">
              <h2 className="text-base font-bold">Votre compte a ete restreint</h2>
              <p className="mt-1 text-sm">
                Suspension en cours: {banRemainingSeconds.toFixed(0)}s avant retour dans le flux.
              </p>
            </article>
          )}

          <article className="rounded-xl border border-[var(--linkedin-border)] bg-white p-4 shadow-[var(--linkedin-shadow)]">
            <h2 className="mb-3 text-base font-bold text-[var(--linkedin-text)]">Le Grind</h2>
            <IncomingClickerPanel />

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
              {NEWS_ITEMS.map((item) => (
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
            <h2 className="text-base font-bold text-[var(--linkedin-text)]">Accellerez votre carriere</h2>
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
