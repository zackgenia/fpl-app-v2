import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBootstrap, useDetailsDrawer, useSquad } from './hooks';
import { DetailsDrawer, Logo } from './components';
import { SquadBuilder, Recommendations, FixtureTracker, Live } from './pages';
import { getLiveData } from './api';

type Page = 'squad' | 'transfers' | 'fixtures' | 'live';

interface DashboardProps {
  initialPage: Page;
}

export function Dashboard({ initialPage }: DashboardProps) {
  const [page, setPage] = useState<Page>(initialPage);
  const [horizon, setHorizon] = useState(5);
  const [liveGw, setLiveGw] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const navigate = useNavigate();

  const bootstrap = useBootstrap();
  const squad = useSquad();
  const detailsDrawer = useDetailsDrawer();

  // Sync page state with URL
  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  // Handle page changes by navigating
  const handlePageChange = (newPage: Page) => {
    setPage(newPage);
    navigate(`/${newPage}`);
  };

  // Poll for live updates
  useEffect(() => {
    if (!bootstrap.data?.currentGameweek) return;

    const fetchLive = async () => {
      try {
        const data = await getLiveData(bootstrap.data!.currentGameweek);
        setLiveGw(data.gameweek);
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {}
    };

    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, [bootstrap.data?.currentGameweek]);

  const navItems = [
    { key: 'squad', label: 'Squad' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'fixtures', label: 'Fixtures' },
    { key: 'live', label: 'Live' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header - Terminal Style */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo + Status Ticker */}
            <div className="flex items-center gap-6">
              <Link to="/">
                <Logo size="sm" />
              </Link>

              {/* Status Ticker */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400 font-mono">
                <span>GW{bootstrap.data?.currentGameweek ?? '--'}</span>
                <span className="text-slate-600">|</span>
                {lastUpdated ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400">LIVE</span>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span>{lastUpdated}</span>
                  </>
                ) : (
                  <span className="text-slate-500">Loading...</span>
                )}
              </div>
            </div>

            {/* Center: Navigation - Flat tabs with underline */}
            <nav className="flex items-center">
              {navItems.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handlePageChange(key)}
                  className={`px-4 py-4 text-sm font-medium transition-colors relative ${
                    page === key
                      ? 'text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                  {page === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
                  )}
                </button>
              ))}
            </nav>

            {/* Right: Quick Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">SQUAD</span>
                <span className="text-slate-200">{squad.squad.length}/15</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">VALUE</span>
                <span className="text-slate-200">{(squad.squadValue / 10).toFixed(1)}m</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">BANK</span>
                <span className="text-emerald-400">{(squad.bank / 10).toFixed(1)}m</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header - Compact controls */}
      <div className="bg-slate-800/50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Mobile stats */}
            <div className="flex md:hidden items-center gap-3 text-xs font-mono text-slate-400">
              <span>{squad.squad.length}/15</span>
              <span className="text-slate-600">|</span>
              <span>{(squad.squadValue / 10).toFixed(1)}m</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">{(squad.bank / 10).toFixed(1)}m</span>
            </div>

            {/* Horizon selector */}
            <div className="flex items-center gap-2 text-sm ml-auto">
              <span className="text-slate-500 text-xs uppercase tracking-wide">Horizon</span>
              <select
                value={horizon}
                onChange={e => setHorizon(parseInt(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value={3}>3 GW</option>
                <option value={5}>5 GW</option>
                <option value={8}>8 GW</option>
                <option value={10}>10 GW</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
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

      {/* Footer - Minimal */}
      <footer className="border-t border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-slate-600">
            Data from{' '}
            <a href="https://fantasy.premierleague.com/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400">
              FPL
            </a>
            {' | '}
            <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400">
              Football-Data.org
            </a>
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
