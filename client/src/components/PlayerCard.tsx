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
      <div className="card p-3 cursor-pointer hover:border-fpl-forest/30" onClick={onClick}>
        <div className="flex items-center gap-3">
          <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{player.webName}</p>
            <div className="flex items-center gap-1">
              <TeamBadge badge={player.teamBadge} name={player.teamShortName} size="sm" />
              <span className="text-xs text-slate-500">{player.teamShortName}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-fpl-forest">{player.predictedPointsN.toFixed(1)}</p>
            <p className="text-xs text-slate-500">£{(player.cost / 10).toFixed(1)}m</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 cursor-pointer card-hover animate-slide-up" onClick={onClick}>
      <div className="flex items-start gap-3">
        {rank && (
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{rank}</div>
        )}
        <PlayerPhoto photoCode={player.photoCode} name={player.webName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-800 truncate">{player.webName}</p>
            <FormTrend trend={player.formTrend} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TeamBadge badge={player.teamBadge} name={player.teamShortName} size="sm" />
            <span className="text-sm text-slate-500">{player.teamShortName}</span>
            <span className="text-xs px-1.5 py-0.5 bg-fpl-forest/10 rounded text-fpl-forest font-medium">{player.position}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-fpl-forest">{player.predictedPointsN.toFixed(1)}</p>
          <p className="text-xs text-slate-500">predicted pts</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4 text-center">
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-lg font-bold text-slate-800">£{(player.cost / 10).toFixed(1)}m</p>
          <p className="text-xs text-slate-500">Price</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-lg font-bold text-slate-800">{player.form}</p>
          <p className="text-xs text-slate-500">Form</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-lg font-bold text-slate-800">{player.minutesPct}%</p>
          <p className="text-xs text-slate-500">Minutes</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <p className="text-lg font-bold text-slate-800">{player.valueScore}</p>
          <p className="text-xs text-slate-500">Pts/£m</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-slate-500 mb-2">Next 5 fixtures</p>
        <FixtureStrip fixtures={player.nextFixtures} />
      </div>

      <div className="mt-4">
        <ConfidenceBar confidence={player.confidence} showTooltip />
        <ConfidenceFactors factors={player.confidenceFactors} />
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        {player.penaltiesTaker && <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">⚽ Penalties</span>}
        {player.setpieceTaker && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">🎯 Set pieces</span>}
        {player.teamMomentum > 65 && <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">🔥 Team form</span>}
      </div>
    </div>
  );
}
