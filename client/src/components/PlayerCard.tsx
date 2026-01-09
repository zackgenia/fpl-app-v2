import type { PlayerPrediction } from '../types';
import { PlayerPhoto, TeamBadge, ConfidenceBar, ConfidenceFactors, FixtureStrip, FormTrend } from './ui';

interface PlayerCardProps {
  player: PlayerPrediction;
  rank?: number;
  onClick?: () => void;
  compact?: boolean;
}

export function PlayerCard({ player, rank, onClick, compact = false }: PlayerCardProps) {
  if (compact) {
    return (
      <div
        className="bg-slate-800 border border-slate-700 rounded p-3 cursor-pointer hover:border-emerald-500/40 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-200 text-sm truncate">{player.webName}</p>
            <div className="flex items-center gap-1">
              <TeamBadge badge={player.teamBadge} name={player.teamShortName} size="sm" />
              <span className="text-[10px] text-slate-500">{player.teamShortName}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-emerald-400 tabular-nums">{player.predictedPointsN.toFixed(1)}</p>
            <p className="text-[10px] text-slate-500">{(player.cost / 10).toFixed(1)}m</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-800 border border-slate-700 rounded p-3 cursor-pointer hover:border-emerald-500/40 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {rank && (
          <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-400">
            {rank}
          </div>
        )}
        <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-slate-200 truncate">{player.webName}</p>
            <FormTrend trend={player.formTrend} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TeamBadge badge={player.teamBadge} name={player.teamShortName} size="sm" />
            <span className="text-xs text-slate-500">{player.teamShortName}</span>
            <span className="text-[10px] px-1 py-0.5 bg-slate-700 rounded text-slate-400">{player.position}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-emerald-400 tabular-nums">{player.predictedPointsN.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500">xPts</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {[
          { label: 'Price', value: `${(player.cost / 10).toFixed(1)}m` },
          { label: 'Form', value: player.form },
          { label: 'Min%', value: `${player.minutesPct}%` },
          { label: 'Pts/m', value: player.valueScore },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-700/50 rounded p-1.5 text-center">
            <p className="text-sm font-semibold text-slate-200 tabular-nums">{stat.value}</p>
            <p className="text-[9px] text-slate-500 uppercase">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Fixtures */}
      <div className="mt-3">
        <p className="text-[10px] text-slate-500 uppercase mb-1">Next 5</p>
        <FixtureStrip fixtures={player.nextFixtures} />
      </div>

      {/* Confidence */}
      <div className="mt-3">
        <ConfidenceBar confidence={player.confidence} />
        <ConfidenceFactors factors={player.confidenceFactors} />
      </div>

      {/* Tags */}
      <div className="flex gap-1 mt-2 flex-wrap">
        {player.penaltiesTaker && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">PEN</span>
        )}
        {player.setpieceTaker && (
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">SET</span>
        )}
        {player.teamMomentum > 65 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">FORM</span>
        )}
      </div>
    </div>
  );
}
