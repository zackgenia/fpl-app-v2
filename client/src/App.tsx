import { useState, useEffect } from 'react';
import { useBootstrap, useDetailsDrawer, useSquad } from './hooks';
import { DetailsDrawer } from './components';
import { SquadBuilder, Recommendations, FixtureTracker, Live } from './pages';
import { getLiveData } from './api';

type Page = 'squad' | 'transfers' | 'fixtures' | 'live';

function App() {
  const [page, setPage] = useState<Page>('squad');
  const [horizon, setHorizon] = useState(5);
  const [liveGw, setLiveGw] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const bootstrap = useBootstrap();
  const squad = useSquad();
  const detailsDrawer = useDetailsDrawer();

  // Poll for live updates
  useEffect(() => {
    if (!bootstrap.data?.currentGameweek) return;
    
    const fetchLive = async () => {
      try {
        const data = await getLiveData(bootstrap.data!.currentGameweek);
        setLiveGw(data.gameweek);
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
      } catch {}
    };

    fetchLive();
    const interval = setInterval(fetchLive, 60000); // Every minute
    return () => clearInterval(interval);
  }, [bootstrap.data?.currentGameweek]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-fpl-forest via-fpl-pine to-fpl-forest shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl">⚽</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">FPL Transfer <span className="text-fpl-green">Recommender</span></h1>
                <div className="flex items-center gap-3 text-white/70 text-sm">
                  <span>GW {bootstrap.data?.currentGameweek ?? '-'}</span>
                  {lastUpdated && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Live • Updated {lastUpdated}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <nav className="flex gap-1 bg-black/20 p-1 rounded-xl backdrop-blur-sm">
              {[
                { key: 'squad', label: 'Squad', icon: '👥' },
                { key: 'transfers', label: 'Transfers', icon: '🔄' },
                { key: 'fixtures', label: 'Fixtures', icon: '📅' },
                { key: 'live', label: 'Live', icon: '⚡' },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setPage(key as Page)}
                  className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                    page === key ? 'bg-white text-fpl-forest font-semibold shadow-md' : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Sub-header stats */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-slate-500">Squad:</span>
                <span className="ml-1 font-semibold text-slate-800">{squad.squad.length}/15</span>
              </div>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <span className="text-slate-500">Value:</span>
                <span className="ml-1 font-semibold text-slate-800">£{(squad.squadValue / 10).toFixed(1)}m</span>
              </div>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                <span className="text-slate-500">Bank:</span>
                <span className="ml-1 font-semibold text-fpl-forest">£{(squad.bank / 10).toFixed(1)}m</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Prediction horizon:</span>
              <select
                value={horizon}
                onChange={e => setHorizon(parseInt(e.target.value))}
                className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-fpl-forest/20"
              >
                <option value={3}>3 GWs</option>
                <option value={5}>5 GWs</option>
                <option value={8}>8 GWs</option>
                <option value={10}>10 GWs</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === 'squad' && (
          <SquadBuilder
            players={bootstrap.data?.players ?? []}
            teams={bootstrap.data?.teams ?? []}
            squad={squad}
            loading={bootstrap.loading}
            error={bootstrap.error}
            onRetry={bootstrap.refresh}
            onPlayerClick={id => detailsDrawer.openEntity({ kind: 'player', id })}
          />
        )}
        {page === 'transfers' && (
          <Recommendations
            squad={squad.squad}
            bank={squad.bank}
            isSquadComplete={squad.isSquadComplete}
            horizon={horizon}
            onPlayerClick={id => detailsDrawer.openEntity({ kind: 'player', id })}
          />
        )}
        {page === 'fixtures' && (
          <FixtureTracker onEntityClick={entity => detailsDrawer.openEntity(entity)} />
        )}
        {page === 'live' && (
          <Live onPlayerClick={id => detailsDrawer.openEntity({ kind: 'player', id })} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            Data from{' '}
            <a href="https://fantasy.premierleague.com/" target="_blank" rel="noopener noreferrer" className="text-fpl-forest hover:underline">
              Fantasy Premier League
            </a>{' '}
            • Built with ❤️ for FPL managers
          </p>
        </div>
      </footer>

      <DetailsDrawer
        isOpen={detailsDrawer.isOpen}
        stack={detailsDrawer.stack}
        onClose={detailsDrawer.close}
        onBack={detailsDrawer.back}
        onPushEntity={detailsDrawer.pushEntity}
      />
    </div>
  );
}

export default App;
