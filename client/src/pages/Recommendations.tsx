import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecommendations } from '../api';
import { TransferCard, PlayerCard, Loading, SkeletonTransfer, ErrorMessage, BaselineCard } from '../components';
import type { RecommendationResponse, SquadPlayer, Position, Strategy } from '../types';

interface Props {
  squad: SquadPlayer[];
  bank: number;
  isSquadComplete: boolean;
  horizon: number;
  onPlayerClick?: (id: number) => void;
}

const STRATEGIES: { key: Strategy; label: string; icon: string; desc: string }[] = [
  { key: 'maxPoints', label: 'Max Points', icon: '📈', desc: 'Best predicted returns' },
  { key: 'value', label: 'Best Value', icon: '💰', desc: 'Points per million' },
  { key: 'safety', label: 'Low Risk', icon: '🛡️', desc: 'Reliable picks' },
  { key: 'differential', label: 'Differential', icon: '🎯', desc: 'Low ownership' },
];

const LOADING_STEPS = ['Fetching player data...', 'Analyzing fixtures...', 'Calculating predictions...', 'Ranking transfers...'];

type ViewMode = 'transfers' | 'GK' | 'DEF' | 'MID' | 'FWD';

export function Recommendations({ squad, bank, isSquadComplete, horizon, onPlayerClick }: Props) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy>('maxPoints');
  const [includeInjured, setIncludeInjured] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('transfers');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const fetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (squad.length === 0) return;
    const fetchId = ++fetchRef.current;
    setLoading(true);
    setError(null);
    setLoadingStep(0);

    // Simulate progress
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 600);

    try {
      const result = await getRecommendations(squad, bank, horizon, includeInjured, strategy);
      if (fetchId === fetchRef.current) setData(result);
    } catch (err) {
      if (fetchId === fetchRef.current) setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      clearInterval(stepInterval);
      if (fetchId === fetchRef.current) setLoading(false);
    }
  }, [squad, bank, horizon, includeInjured, strategy]);

  useEffect(() => {
    if (isSquadComplete) fetchData();
  }, [isSquadComplete, fetchData]);

  if (!isSquadComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-4xl">📋</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Complete Your Squad</h2>
        <p className="text-slate-500 text-center max-w-md mb-4">Add all 15 players to get personalized transfer recommendations.</p>
        <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
          <span className="font-medium text-slate-700">{squad.length}/15 players</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Transfer Recommendations</h2>
            <p className="text-slate-500">
              {data ? `Predictions for next ${data.horizon} gameweeks` : 'Finding the best moves for your team'}
            </p>
          </div>
          <button onClick={fetchData} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? 'Analyzing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Strategy selector */}
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-600 mb-3">What's your priority?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STRATEGIES.map(s => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  strategy === s.key ? 'border-fpl-forest bg-fpl-forest/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                <p className="font-semibold text-slate-800 mt-1">{s.label}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-4 text-sm text-fpl-forest font-medium flex items-center gap-1"
        >
          {showAdvanced ? '▼' : '▶'} Advanced options
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInjured}
                onChange={e => setIncludeInjured(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-fpl-forest focus:ring-fpl-forest"
              />
              <span className="text-sm text-slate-600">Include injured/doubtful players</span>
            </label>
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto">
        {([
          { key: 'transfers', label: 'Best Transfers', icon: '🎯' },
          { key: 'GK', label: 'Top GKs', icon: '🧤' },
          { key: 'DEF', label: 'Top DEFs', icon: '🛡️' },
          { key: 'MID', label: 'Top MIDs', icon: '⚡' },
          { key: 'FWD', label: 'Top FWDs', icon: '⚽' },
        ] as { key: ViewMode; label: string; icon: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setViewMode(t.key)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              viewMode === t.key ? 'bg-fpl-forest text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <Loading message={LOADING_STEPS[loadingStep]} steps={LOADING_STEPS.slice(0, loadingStep + 1)} />
          <div className="space-y-4">
            <SkeletonTransfer />
            <SkeletonTransfer />
          </div>
        </div>
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchData} />
      ) : data ? (
        viewMode === 'transfers' ? (
          <TransferView data={data} onPlayerClick={onPlayerClick} />
        ) : (
          <PositionView
            position={viewMode as Position}
            targets={data.topTargetsByPosition.find(p => p.position === viewMode)?.targets ?? []}
            onPlayerClick={onPlayerClick}
          />
        )
      ) : null}
    </div>
  );
}

function TransferView({ data, onPlayerClick }: { data: RecommendationResponse; onPlayerClick?: (id: number) => void }) {
  const { bestTransfer, topTransfers, squadBaseline } = data;
  const [showAll, setShowAll] = useState(false);

  if (topTransfers.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Squad Optimized!</h3>
        <p className="text-slate-500">No beneficial transfers found based on your strategy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Baseline */}
      <BaselineCard totalPoints={squadBaseline.totalPredictedPoints} averageConfidence={squadBaseline.averageConfidence} />

      {/* Best transfer */}
      {bestTransfer && (
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="text-fpl-forest">⭐</span> Recommended Transfer
          </p>
          <TransferCard transfer={bestTransfer} rank={1} squadBaseline={squadBaseline} onPlayerClick={onPlayerClick} />
        </div>
      )}

      {/* Alternatives - show 3 by default */}
      {topTransfers.length > 1 && (
        <div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Alternative Options</p>
          <div className="space-y-4">
            {topTransfers.slice(1, showAll ? 10 : 4).map((t, i) => (
              <TransferCard key={`${t.playerOut.playerId}-${t.playerIn.playerId}`} transfer={t} rank={i + 2} squadBaseline={squadBaseline} onPlayerClick={onPlayerClick} />
            ))}
          </div>
          {topTransfers.length > 4 && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full mt-4 py-3 text-fpl-forest font-medium rounded-xl border border-fpl-forest/20 hover:bg-fpl-forest/5 transition-colors">
              Show {topTransfers.length - 4} more options
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PositionView({ position, targets, onPlayerClick }: { position: Position; targets: any[]; onPlayerClick?: (id: number) => void }) {
  const names: Record<Position, string> = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' };
  
  if (targets.length === 0) {
    return <div className="card p-12 text-center text-slate-500">No {names[position].toLowerCase()} found.</div>;
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Top {names[position]}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {targets.map((p, i) => (
          <PlayerCard key={p.playerId} player={p} rank={i + 1} onClick={() => onPlayerClick?.(p.playerId)} />
        ))}
      </div>
    </div>
  );
}
