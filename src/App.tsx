import { useGameLoop } from './hooks/useGameLoop';
import { useAutoSave } from './hooks/useAutoSave';
import { useGameStore } from './store/useGameStore';
import { StatCard } from './components/StatCard';
import {
  MainClickerButton,
  PendingRequestsCounter,
  IncomingClickerPanel,
  CycleCountdown,
  CycleNotification,
} from './features/clicker';

function App() {
  useGameLoop();
  useAutoSave();

  const relations         = useGameStore((s) => s.relations);
  const totalEarned       = useGameStore((s) => s.totalRelationsEarned);
  const acceptanceRate    = useGameStore((s) => s.acceptanceRate);
  const cycleDuration     = useGameStore((s) => s.cycleDuration);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F2EF', fontFamily: '"Source Sans Pro", system-ui, -apple-system, sans-serif' }}>

      {/* HEADER */}
      <header
        className="bg-white px-6 py-3 flex items-center justify-between"
        style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.2)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: '#0A66C2' }}
          >
            in
          </div>
          <span className="font-bold text-base" style={{ color: '#000000E6' }}>GrindIn</span>
        </div>

        <div className="flex items-center gap-6">
          <StatCard label="Relations" value={relations.toLocaleString('fr-FR')} className="min-w-[120px]" />
          <StatCard label="Total gagné" value={totalEarned.toLocaleString('fr-FR')} className="min-w-[120px]" />
          <StatCard label="Acceptation" value={`${acceptanceRate}%`} className="min-w-[100px]" />
          <StatCard label="Cycle" value={`${cycleDuration}s`} className="min-w-[80px]" />
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-[1fr_360px] gap-6">

        {/* ZONE GAUCHE — Clickers */}
        <section className="flex flex-col gap-4">
          <CycleNotification />

          <div
            className="bg-white rounded-lg p-6 flex flex-col gap-6"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.2)' }}
          >
            <h2 className="text-base font-bold" style={{ color: '#000000E6' }}>
              Clicker Principal
            </h2>
            <MainClickerButton />
            <PendingRequestsCounter />
            <CycleCountdown />
          </div>

          <div
            className="bg-white rounded-lg p-6"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.2)' }}
          >
            <h2 className="text-base font-bold mb-4" style={{ color: '#000000E6' }}>
              Demandes Reçues
            </h2>
            <IncomingClickerPanel />
          </div>
        </section>

        {/* ZONE DROITE — Upgrades (à venir) */}
        <aside className="flex flex-col gap-4">
          <div
            className="bg-white rounded-lg p-6"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.2)' }}
          >
            <h2 className="text-base font-bold mb-2" style={{ color: '#000000E6' }}>
              Améliorations
            </h2>
            <p className="text-sm" style={{ color: '#00000099' }}>
              Formations, posts, CV… bientôt disponibles.
            </p>
          </div>
        </aside>

      </main>
    </div>
  );
}

export default App;
