import { useState, useMemo } from 'react';
import { Loading, ErrorMessage, PlayerPhoto, TeamBadge } from '../components';
import type { Player, Team, Position, SquadPlayer } from '../types';
import { POSITION_MAP } from '../types';
import { useLineup } from '../hooks';

interface Props {
  players: Player[];
  teams: Team[];
  squad: ReturnType<typeof import('../hooks').useSquad>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPlayerClick?: (id: number) => void;
}

const LIMITS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

export function SquadBuilder({ players, teams, squad, loading, error, onRetry, onPlayerClick }: Props) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [lineupError, setLineupError] = useState<string | null>(null);

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const squadPlayerMap = useMemo(() => new Map(squad.squad.map(p => [p.id, p])), [squad.squad]);
  const { lineup, changeFormation, autoAssignPlayer, assignPlayerToSlot, clearSlot } = useLineup(squad.squad);
  const startingXI = lineup?.startingXI ?? [];

  const groupedStarting = useMemo(
    () => ({
      GK: startingXI.filter(s => s.position === 'GK'),
      DEF: startingXI.filter(s => s.position === 'DEF'),
      MID: startingXI.filter(s => s.position === 'MID'),
      FWD: startingXI.filter(s => s.position === 'FWD'),
    }),
    [startingXI],
  );

  const filtered = useMemo(() => {
    let list = players;
    if (posFilter !== 'all') {
      const code = { GK: 1, DEF: 2, MID: 3, FWD: 4 }[posFilter];
      list = list.filter(p => p.position === code);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(p => p.webName.toLowerCase().includes(s) || teamMap.get(p.teamId)?.name.toLowerCase().includes(s));
    }
    return list.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 50);
  }, [players, search, posFilter, teamMap]);

  if (loading) return <Loading message="Loading FPL data..." />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  const handleAdd = (player: Player) => {
    const result = squad.addPlayer(player);
    if (!result.success) {
      setAddError(result.error || 'Cannot add player');
      setTimeout(() => setAddError(null), 3000);
    }
  };

  const handleAssignToLineup = (player: SquadPlayer) => {
    const result = selectedSlotId ? assignPlayerToSlot(selectedSlotId, player) : autoAssignPlayer(player);
    if (!result.success) {
      setLineupError(result.error || 'Cannot assign player');
      return;
    }
    setSelectedSlotId(null);
    setLineupError(null);
  };

  const lineupSlotContent = (slotId: string) => {
    const playerId = [...startingXI, ...(lineup?.bench ?? [])].find(s => s.id === slotId)?.playerId;
    if (!playerId) return null;
    return squadPlayerMap.get(playerId) || null;
  };

  return (
    <div className="space-y-6">
      {/* Stats header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Squad Builder</h2>
            <p className="text-slate-500">Build your 15-player squad to get transfer recommendations</p>
          </div>
          <button onClick={squad.clearSquad} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">Clear Squad</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Squad Size</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-slate-800">{squad.squad.length}</span>
              <span className="text-lg text-slate-400 mb-1">/15</span>
            </div>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-fpl-forest rounded-full transition-all" style={{ width: `${(squad.squad.length / 15) * 100}%` }} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Team Value</p>
            <p className="text-3xl font-bold text-slate-800">£{(squad.squadValue / 10).toFixed(1)}m</p>
          </div>

          <div className="bg-gradient-to-br from-fpl-forest/5 to-fpl-pine/10 rounded-xl p-4 border border-fpl-forest/20">
            <p className="text-sm text-fpl-forest/70">In The Bank</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-fpl-forest">£{(squad.bank / 10).toFixed(1)}m</span>
              <div className="flex flex-col ml-auto">
                <button onClick={() => squad.adjustBank(1)} className="w-7 h-5 bg-fpl-forest/10 hover:bg-fpl-forest/20 rounded-t text-fpl-forest text-xs">▲</button>
                <button onClick={() => squad.adjustBank(-1)} className="w-7 h-5 bg-fpl-forest/10 hover:bg-fpl-forest/20 rounded-b text-fpl-forest text-xs">▼</button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Total Budget</p>
            <p className={`text-3xl font-bold ${squad.squadValue + squad.bank > 1000 ? 'text-fpl-forest' : 'text-slate-800'}`}>
              £{((squad.squadValue + squad.bank) / 10).toFixed(1)}m
            </p>
          </div>
        </div>

        {/* Position slots */}
        <div className="flex flex-wrap gap-3 mt-6">
          {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => {
            const count = squad.positionCounts[pos];
            const limit = LIMITS[pos];
            const full = count === limit;
            return (
              <div key={pos} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${full ? 'bg-fpl-forest text-white border-fpl-forest' : 'bg-white text-slate-700 border-slate-200'}`}>
                <span className="font-semibold">{pos}</span>
                <div className="flex gap-1">
                  {Array.from({ length: limit }).map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < count ? (full ? 'bg-white' : 'bg-fpl-forest') : (full ? 'bg-white/30' : 'bg-slate-200')}`} />
                  ))}
                </div>
                <span className={`text-sm ${full ? 'text-white/80' : 'text-slate-400'}`}>{count}/{limit}</span>
              </div>
            );
          })}
        </div>
      </div>

      {addError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <span>⚠️</span> {addError}
        </div>
      )}

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Search */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-fpl-forest/10 rounded-lg flex items-center justify-center text-fpl-forest">🔍</span>
            Search Players
          </h3>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Search players or teams..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fpl-forest/20"
            />
            <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="all">All</option>
              <option value="GK">GK</option>
              <option value="DEF">DEF</option>
              <option value="MID">MID</option>
              <option value="FWD">FWD</option>
            </select>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {filtered.map(player => {
              const team = teamMap.get(player.teamId);
              const { allowed, reason } = squad.canAddPlayer(player);
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    allowed ? 'bg-white border-slate-200 hover:border-fpl-forest/30 hover:shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'
                  }`}
                  onClick={() => allowed && handleAdd(player)}
                  title={reason}
                >
                  <div className="flex items-center gap-3">
                    <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />
                    <span className="text-xs font-medium px-2 py-1 rounded bg-fpl-forest/10 text-fpl-forest">{POSITION_MAP[player.position]}</span>
                    <div>
                      <p className="font-medium text-slate-800">{player.webName}</p>
                      <div className="flex items-center gap-1">
                        {team?.badge && <TeamBadge badge={team.badge} name={team.shortName} size="sm" />}
                        <span className="text-sm text-slate-500">{team?.shortName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">£{(player.cost / 10).toFixed(1)}m</p>
                    <p className="text-sm text-slate-500">{player.totalPoints} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {/* Lineup */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">Lineup Builder</h3>
                <p className="text-sm text-slate-500">Select a slot then click a player, or click a player to auto-assign.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Formation</span>
                <select
                  value={lineup.formation}
                  onChange={e => {
                    setSelectedSlotId(null);
                    setLineupError(null);
                    changeFormation(e.target.value as typeof lineup.formation);
                  }}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="3-4-3">3-4-3</option>
                  <option value="4-4-2">4-4-2</option>
                  <option value="4-3-3">4-3-3</option>
                </select>
              </div>
            </div>

            {lineupError && (
              <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{lineupError}</span>
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-gradient-to-b from-fpl-forest to-fpl-pine px-4 py-6 text-white shadow-inner">
              {(['GK', 'DEF', 'MID', 'FWD'] as const).map(line => (
                <div key={line} className="flex flex-col items-center gap-2 mb-4 last:mb-0">
                  <p className="text-xs uppercase tracking-wide text-white/80">{line}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {groupedStarting[line].map(slot => {
                      const player = lineupSlotContent(slot.id);
                      const team = player ? teamMap.get(player.teamId) : undefined;
                      const isSelected = selectedSlotId === slot.id;
                      return (
                        <div
                          key={slot.id}
                          className={`rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm transition-all w-36 ${isSelected ? 'ring-2 ring-white' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedSlotId(slot.id)}
                            className="w-full px-3 py-3 text-left"
                          >
                            {player ? (
                              <div className="flex items-center gap-3">
                                {player.photoCode && <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />}
                                <div>
                                  <p className="font-semibold text-white">{player.webName}</p>
                                  <p className="text-xs text-white/80">{team?.shortName} • £{(player.cost / 10).toFixed(1)}m</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-white/80">
                                <p className="text-sm font-semibold">Empty {slot.position}</p>
                                <p className="text-xs">Select slot & assign</p>
                              </div>
                            )}
                          </button>
                          {player && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                clearSlot(slot.id);
                              }}
                              className="w-full text-xs text-center text-white/80 py-1 border-t border-white/20 hover:bg-white/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-800">Bench (4)</p>
                <p className="text-xs text-slate-500">Keep unassigned players here</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {lineup.bench.map(slot => {
                  const player = lineupSlotContent(slot.id);
                  const team = player ? teamMap.get(player.teamId) : undefined;
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className={`rounded-xl border border-slate-200 bg-white transition-all ${isSelected ? 'ring-2 ring-fpl-forest' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className="w-full px-3 py-3 text-left"
                      >
                        {player ? (
                          <div className="flex items-center gap-3">
                            {player.photoCode && <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />}
                            <div>
                              <p className="font-semibold text-slate-800">{player.webName}</p>
                              <p className="text-xs text-slate-500">{team?.shortName} • £{(player.cost / 10).toFixed(1)}m</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500">
                            <p className="text-sm font-semibold">Bench Slot</p>
                            <p className="text-xs">Click to select</p>
                          </div>
                        )}
                      </button>
                      {player && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            clearSlot(slot.id);
                          }}
                          className="w-full text-xs text-center text-slate-500 py-1 border-t border-slate-100 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Squad */}
          <div className="card p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-fpl-forest/10 rounded-lg flex items-center justify-center text-fpl-forest">👥</span>
              Your Squad
            </h3>
            {squad.squad.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚽</span>
                </div>
                <p className="text-slate-500 mb-2">No players yet</p>
                <p className="text-sm text-slate-400">Search and click players to add</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => {
                  const posPlayers = squad.squad.filter(p => p.position === pos);
                  if (posPlayers.length === 0) return null;
                  return (
                    <div key={pos}>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{pos}s ({posPlayers.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {posPlayers.map(p => {
                          const team = teamMap.get(p.teamId);
                          const startingSlot = lineup.startingXI.find(s => s.playerId === p.id);
                          const benchSlot = lineup.bench.find(s => s.playerId === p.id);
                          const assignment = startingSlot ? 'Starting XI' : benchSlot ? 'Bench' : null;
                          return (
                            <div
                              key={p.id}
                              className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 group hover:border-slate-300 cursor-pointer"
                              onClick={() => handleAssignToLineup(p)}
                            >
                              {p.photoCode && <PlayerPhoto photoCode={p.photoCode} name={p.webName} size="sm" />}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{p.webName}</span>
                                  {assignment && (
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${startingSlot ? 'bg-fpl-forest/10 text-fpl-forest' : 'bg-slate-200 text-slate-700'}`}>
                                      {assignment}
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm text-slate-500">{team?.shortName} • £{(p.cost / 10).toFixed(1)}m</span>
                              </div>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  squad.removePlayer(p.id);
                                }}
                                className="ml-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove from squad"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      {squad.isSquadComplete ? (
        <div className="card p-6 bg-gradient-to-r from-fpl-forest to-fpl-pine text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">✓</div>
            <div>
              <h3 className="text-lg font-bold">Squad Complete!</h3>
              <p className="text-white/80">Head to Transfers to find your best moves</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 bg-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">📋</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Keep Building</h3>
              <p className="text-slate-500">Add {15 - squad.squad.length} more player{15 - squad.squad.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
