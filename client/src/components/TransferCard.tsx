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
    <div className="card p-5 card-hover animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {rank === 1 && <span className="text-lg">⭐</span>}
          <span className="text-sm font-medium text-slate-400">#{rank}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${netGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netGain >= 0 ? '+' : ''}{netGain.toFixed(1)}
          </span>
          <span className="text-sm text-slate-500">pts</span>
        </div>
      </div>

      {/* Players comparison */}
      <div className="flex items-stretch gap-4">
        {/* Player Out */}
        <div 
          className="flex-1 p-4 rounded-xl bg-red-50 border border-red-100 cursor-pointer hover:border-red-200 transition-colors"
          onClick={() => onPlayerClick?.(playerOut.playerId)}
        >
          <div className="text-xs font-semibold text-red-600 mb-2">OUT</div>
          <div className="flex items-center gap-3">
            <PlayerPhoto photoCode={playerOut.photoCode} name={playerOut.webName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 truncate">{playerOut.webName}</p>
                <FormTrend trend={playerOut.formTrend} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <TeamBadge badge={playerOut.teamBadge} name={playerOut.teamShortName} size="sm" />
                <span className="text-sm text-slate-500">{playerOut.teamShortName}</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">{playerOut.position}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-slate-500">Price</p>
              <p className="font-semibold text-slate-800">£{(playerOut.cost / 10).toFixed(1)}m</p>
            </div>
            <div>
              <p className="text-slate-500">Predicted</p>
              <p className="font-semibold text-slate-800">{playerOut.predictedPointsN.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-slate-500">Minutes</p>
              <p className="font-semibold text-slate-800">{playerOut.minutesPct}%</p>
            </div>
          </div>
          <div className="mt-3">
            <FixtureStrip fixtures={playerOut.nextFixtures} />
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
            →
          </div>
        </div>

        {/* Player In */}
        <div 
          className="flex-1 p-4 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer hover:border-emerald-200 transition-colors"
          onClick={() => onPlayerClick?.(playerIn.playerId)}
        >
          <div className="text-xs font-semibold text-emerald-600 mb-2">IN</div>
          <div className="flex items-center gap-3">
            <PlayerPhoto photoCode={playerIn.photoCode} name={playerIn.webName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 truncate">{playerIn.webName}</p>
                <FormTrend trend={playerIn.formTrend} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <TeamBadge badge={playerIn.teamBadge} name={playerIn.teamShortName} size="sm" />
                <span className="text-sm text-slate-500">{playerIn.teamShortName}</span>
                <span className="text-xs px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">{playerIn.position}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-slate-500">Price</p>
              <p className="font-semibold text-emerald-700">£{(playerIn.cost / 10).toFixed(1)}m</p>
            </div>
            <div>
              <p className="text-slate-500">Predicted</p>
              <p className="font-semibold text-emerald-700">{playerIn.predictedPointsN.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-slate-500">Minutes</p>
              <p className="font-semibold text-emerald-700">{playerIn.minutesPct}%</p>
            </div>
          </div>
          <div className="mt-3">
            <FixtureStrip fixtures={playerIn.nextFixtures} />
          </div>
        </div>
      </div>

      {/* Why this transfer? */}
      {reasons.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">💡 Why this transfer?</p>
          <TransferReasons reasons={reasons} />
        </div>
      )}

      {/* Footer stats */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500">Cost: </span>
            <span className={`font-medium ${costChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {costChange >= 0 ? '+' : ''}£{(costChange / 10).toFixed(1)}m
            </span>
          </div>
          <div>
            <span className="text-slate-500">Bank after: </span>
            <span className="font-medium text-slate-800">£{(budgetAfter / 10).toFixed(1)}m</span>
          </div>
        </div>
        {improvement && (
          <div className="text-xs text-emerald-600 font-medium">
            +{improvement}% squad improvement
          </div>
        )}
      </div>
      
      {/* Confidence comparison */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Current player confidence</p>
          <ConfidenceBar confidence={playerOut.confidence} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">New player confidence</p>
          <ConfidenceBar confidence={playerIn.confidence} />
        </div>
      </div>
    </div>
  );
}
