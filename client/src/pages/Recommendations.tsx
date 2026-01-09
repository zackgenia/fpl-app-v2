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
        <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Complete Your Squad</h2>
        <p className="text-slate-500 text-center text-sm max-w-md mb-4">Add all 15 players to get personalized transfer recommendations.</p>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded px-3 py-1.5">
          <span className="text-sm font-medium text-slate-300 tabular-nums">{squad.length}/15 players</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Transfer Recommendations</h2>
            <p className="text-xs text-slate-500">
              {data ? `Predictions for next ${data.horizon} gameweeks` : 'Finding the best moves for your team'}
            </p>
          </div>
          <button onClick={fetchData} disabled={loading} className="px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-colors disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>

        {/* Strategy selector */}
        <div className="mt-4">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Strategy</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {STRATEGIES.map(s => (
              <button
                key={s.key}
                onClick={() => setStrategy(s.key)}
                className={`p-2 rounded border transition-all text-left ${
                  strategy === s.key ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                }`}
              >
                <p className={`font-medium text-sm ${strategy === s.key ? 'text-emerald-400' : 'text-slate-200'}`}>{s.label}</p>
                <p className="text-[10px] text-slate-500">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mt-3 text-xs text-emerald-400 font-medium flex items-center gap-1"
        >
          {showAdvanced ? '▼' : '▶'} Advanced options
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInjured}
                onChange={e => setIncludeInjured(e.target.checked)}
                className="w-3 h-3 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
              />
              <span className="text-xs text-slate-400">Include injured/doubtful players</span>
            </label>
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="flex border-b border-slate-700">
        {([
          { key: 'transfers', label: 'Transfers' },
          { key: 'GK', label: 'GKs' },
          { key: 'DEF', label: 'DEFs' },
          { key: 'MID', label: 'MIDs' },
          { key: 'FWD', label: 'FWDs' },
        ] as { key: ViewMode; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setViewMode(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              viewMode === t.key ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            {viewMode === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
            )}
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
      <div className="bg-slate-800 border border-slate-700 rounded p-8 text-center">
        <div className="w-12 h-12 bg-emerald-500/10 rounded flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-sm font-medium text-slate-200 mb-1">Squad Optimized</h3>
        <p className="text-xs text-slate-500">No beneficial transfers found based on your strategy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Baseline */}
      <BaselineCard totalPoints={squadBaseline.totalPredictedPoints} averageConfidence={squadBaseline.averageConfidence} />

      {/* Best transfer */}
      {bestTransfer && (
        <div>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Recommended Transfer</p>
          <TransferCard transfer={bestTransfer} rank={1} squadBaseline={squadBaseline} onPlayerClick={onPlayerClick} />
        </div>
      )}

      {/* Alternatives - show 3 by default */}
      {topTransfers.length > 1 && (
        <div>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Alternative Options</p>
          <div className="space-y-3">
            {topTransfers.slice(1, showAll ? 10 : 4).map((t, i) => (
              <TransferCard key={`${t.playerOut.playerId}-${t.playerIn.playerId}`} transfer={t} rank={i + 2} squadBaseline={squadBaseline} onPlayerClick={onPlayerClick} />
            ))}
          </div>
          {topTransfers.length > 4 && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full mt-3 py-2 text-xs text-emerald-400 font-medium rounded border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
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
    return <div className="bg-slate-800 border border-slate-700 rounded p-8 text-center text-slate-500 text-sm">No {names[position].toLowerCase()} found.</div>;
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-3">Top {names[position]}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {targets.map((p, i) => (
          <PlayerCard key={p.playerId} player={p} rank={i + 1} onClick={() => onPlayerClick?.(p.playerId)} />
        ))}
      </div>
    </div>
  );
}
