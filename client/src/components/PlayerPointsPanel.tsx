import { useState } from 'react';
import { TeamBadge } from './ui';

interface LivePlayer {
  id: number;
  webName: string;
  teamId: number;
  livePoints: number;
  minutes: number;
  goals: number;
  assists: number;
  bonus: number;
  bps: number;
}

interface Team {
  id: number;
  name: string;
  shortName: string;
  badge: string;
}

interface PlayerPointsPanelProps {
  players: LivePlayer[];
  teams: Map<number, Team>;
  onPlayerClick?: (id: number) => void;
  defaultExpanded?: boolean;
}

export function PlayerPointsPanel({
  players,
  teams,
  onPlayerClick,
  defaultExpanded = false,
}: PlayerPointsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const sortedPlayers = [...players].sort((a, b) => b.livePoints - a.livePoints);
  const topPlayers = sortedPlayers.slice(0, 50); // Show top 50

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-medium text-slate-200 text-sm">Player Points</span>
          <span className="text-xs text-slate-500">({players.length} players)</span>
        </div>
        <span className="text-xs text-slate-400">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="border-t border-slate-700">
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
                  <th className="text-left px-3 py-2 font-medium">Player</th>
                  <th className="text-right px-3 py-2 font-medium">Pts</th>
                  <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Min</th>
                  <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">G</th>
                  <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">A</th>
                  <th className="text-right px-3 py-2 font-medium">BPS</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((player, idx) => {
                  const team = teams.get(player.teamId);
                  return (
                    <tr
                      key={player.id}
                      className={`border-b border-slate-800 hover:bg-slate-700/50 transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => onPlayerClick?.(player.id)}
                          className="flex items-center gap-2 text-left hover:text-emerald-400 transition-colors"
                        >
                          <TeamBadge badge={team?.badge ?? ''} name={team?.name ?? ''} size="sm" />
                          <span className="text-slate-200 font-medium text-xs truncate max-w-[120px]">
                            {player.webName}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-emerald-400 text-xs">
                        {player.livePoints}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-400 text-xs hidden sm:table-cell">
                        {player.minutes}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-xs hidden sm:table-cell">
                        {player.goals > 0 ? (
                          <span className="text-emerald-400">{player.goals}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-xs hidden sm:table-cell">
                        {player.assists > 0 ? (
                          <span className="text-emerald-400">{player.assists}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-500 text-xs">
                        {player.bps}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
