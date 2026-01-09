import type { TransferRecommendation } from '../types';
import { PlayerPhoto, TeamBadge, ConfidenceBar, FixtureStrip, TransferReasons, FormTrend } from './ui';

interface TransferCardProps {
  transfer: TransferRecommendation;
  rank: number;
  squadBaseline?: { totalPredictedPoints: number };
  onPlayerClick?: (id: number) => void;
  expanded?: boolean;
}

export function TransferCard({ transfer, rank, squadBaseline, onPlayerClick, expanded = false }: TransferCardProps) {
  const { playerOut, playerIn, netGain, costChange, budgetAfter, reasons, newSquadTotal } = transfer;
  const improvement = squadBaseline ? ((netGain / squadBaseline.totalPredictedPoints) * 100).toFixed(1) : null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {rank === 1 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-medium">TOP</span>
          )}
          <span className="text-sm font-medium text-slate-500">#{rank}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold tabular-nums ${netGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netGain >= 0 ? '+' : ''}{netGain.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500">xPts</span>
        </div>
      </div>

      {/* Players comparison */}
      <div className="flex items-stretch gap-3">
        {/* Player Out */}
        <button
          type="button"
          className="flex-1 p-3 rounded bg-red-500/10 border border-red-500/20 cursor-pointer hover:border-red-500/40 transition-colors text-left"
          onClick={() => onPlayerClick?.(playerOut.playerId)}
        >
          <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-2">OUT</div>
          <div className="flex items-center gap-2">
            <PlayerPhoto photoCode={playerOut.photoCode} name={playerOut.webName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium text-slate-200 text-sm truncate">{playerOut.webName}</p>
                <FormTrend trend={playerOut.formTrend} />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <TeamBadge badge={playerOut.teamBadge} name={playerOut.teamShortName} size="sm" />
                <span className="text-[10px] text-slate-500">{playerOut.teamShortName}</span>
                <span className="text-[10px] px-1 py-0.5 bg-slate-700 rounded text-slate-400">{playerOut.position}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
            <div className="bg-slate-800/50 rounded p-1">
              <p className="text-slate-500 uppercase">Price</p>
              <p className="font-semibold text-slate-300 tabular-nums">{(playerOut.cost / 10).toFixed(1)}m</p>
            </div>
            <div className="bg-slate-800/50 rounded p-1">
              <p className="text-slate-500 uppercase">xPts</p>
              <p className="font-semibold text-slate-300 tabular-nums">{playerOut.predictedPointsN.toFixed(1)}</p>
            </div>
            <div className="bg-slate-800/50 rounded p-1">
              <p className="text-slate-500 uppercase">Min%</p>
              <p className="font-semibold text-slate-300 tabular-nums">{playerOut.minutesPct}%</p>
            </div>
          </div>
          <div className="mt-2">
            <FixtureStrip fixtures={playerOut.nextFixtures} />
          </div>
        </button>

        {/* Arrow */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 text-sm">
            →
          </div>
        </div>

        {/* Player In */}
        <button
          type="button"
          className="flex-1 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 transition-colors text-left"
          onClick={() => onPlayerClick?.(playerIn.playerId)}
        >
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-2">IN</div>
          <div className="flex items-center gap-2">
            <PlayerPhoto photoCode={playerIn.photoCode} name={playerIn.webName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-medium text-slate-200 text-sm truncate">{playerIn.webName}</p>
                <FormTrend trend={playerIn.formTrend} />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <TeamBadge badge={playerIn.teamBadge} name={playerIn.teamShortName} size="sm" />
                <span className="text-[10px] text-slate-500">{playerIn.teamShortName}</span>
                <span className="text-[10px] px-1 py-0.5 bg-slate-700 rounded text-slate-400">{playerIn.position}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
            <div className="bg-slate-800/50 rounded p-1">
              <p className="text-slate-500 uppercase">Price</p>
              <p className="font-semibold text-emerald-400 tabular-nums">{(playerIn.cost / 10).toFixed(1)}m</p>
            </div>
            <div className="bg-slate-800/50 rounded p-1">
              <p className="text-slate-500 uppercase">xPts</p>
              <p className="font-semibold text-emerald-400 tabular-nums">{playerIn.predictedPointsN.toFixed(1)}</p>
            </div>
            <div className="bg-slate-800/50 rounded p-1">
              <p className="text-slate-500 uppercase">Min%</p>
              <p className="font-semibold text-emerald-400 tabular-nums">{playerIn.minutesPct}%</p>
            </div>
          </div>
          <div className="mt-2">
            <FixtureStrip fixtures={playerIn.nextFixtures} />
          </div>
        </button>
      </div>

      {/* Why this transfer? */}
      {reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Why this transfer</p>
          <TransferReasons reasons={reasons} />
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500">Cost: </span>
            <span className={`font-medium tabular-nums ${costChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {costChange >= 0 ? '+' : ''}{(costChange / 10).toFixed(1)}m
            </span>
          </div>
          <div>
            <span className="text-slate-500">Bank: </span>
            <span className="font-medium text-slate-300 tabular-nums">{(budgetAfter / 10).toFixed(1)}m</span>
          </div>
        </div>
        {improvement && (
          <div className="text-[10px] text-emerald-400 font-medium">
            +{improvement}% improvement
          </div>
        )}
      </div>

      {/* Confidence comparison */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 mb-1">Out confidence</p>
          <ConfidenceBar confidence={playerOut.confidence} showLabel={false} />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 mb-1">In confidence</p>
          <ConfidenceBar confidence={playerIn.confidence} showLabel={false} />
        </div>
      </div>
    </div>
  );
}
