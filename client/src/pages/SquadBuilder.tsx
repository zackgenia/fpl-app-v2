import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Loading, ErrorMessage, PlayerPhoto, TeamBadge } from '../components';
import type { Player, Team, Position, SquadPlayer } from '../types';
import { POSITION_MAP } from '../types';
import { useLineup } from '../hooks';
import type { LineupSlot } from '../hooks/useLineup';

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
const ROW_MAX_WIDTHS: Record<number, string> = {
  1: 'max-w-[220px]',
  2: 'max-w-[420px]',
  3: 'max-w-[600px]',
  4: 'max-w-[760px]',
  5: 'max-w-[980px]',
};

type DragSource = 'squad' | 'slot';

interface PlayerDragData {
  type: 'player';
  playerId: number;
  source: DragSource;
  slotId?: string;
}

interface SlotDropData {
  type: 'slot';
  slotId: string;
}

interface UnassignedDropData {
  type: 'unassigned';
}

type DragData = PlayerDragData;
type DropData = SlotDropData | UnassignedDropData;

interface SlotCardProps {
  slot: LineupSlot;
  player: SquadPlayer | null;
  team?: Team;
  isSelected: boolean;
  onSelect: () => void;
  onClear: () => void;
  onInspect: (player: SquadPlayer) => void;
  variant: 'pitch' | 'bench';
  compactView: boolean;
  activeDrag: DragData | null;
  canDropToSlot: (slot: SlotCardProps['slot'], drag: DragData) => boolean;
}

function SlotCard({
  slot,
  player,
  team,
  isSelected,
  onSelect,
  onClear,
  onInspect,
  variant,
  compactView,
  activeDrag,
  canDropToSlot,
}: SlotCardProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: slot.id,
    data: { type: 'slot', slotId: slot.id } satisfies DropData,
  });
  const { setNodeRef: setDragRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `slot-${slot.id}`,
    disabled: !player,
    data: player
      ? ({ type: 'player', playerId: player.id, source: 'slot', slotId: slot.id } satisfies DragData)
      : undefined,
  });
  const isValidDrop = activeDrag ? canDropToSlot(slot, activeDrag) : false;
  const isInvalidDrop = Boolean(activeDrag && isOver && !isValidDrop);
  const highlightClass = isOver
    ? isValidDrop
      ? variant === 'pitch'
        ? 'ring-2 ring-emerald-200 bg-white/15'
        : 'ring-2 ring-emerald-400 border-emerald-300'
      : 'ring-2 ring-red-300'
    : '';
  const containerClasses =
    variant === 'pitch'
      ? `rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm transition-all w-full max-w-[170px] ${highlightClass}`
      : `rounded-xl border border-slate-200 bg-white transition-all ${highlightClass}`;
  const paddingClass = compactView ? 'px-3 py-2' : 'px-3 py-3';
  const minHeightClass = compactView ? 'min-h-[66px]' : 'min-h-[84px]';
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setDropRef} className={`${containerClasses} ${isSelected ? (variant === 'pitch' ? 'ring-2 ring-white' : 'ring-2 ring-fpl-forest') : ''}`}>
      <button
        type="button"
        ref={player ? setDragRef : undefined}
        style={dragStyle}
        {...(player ? attributes : {})}
        {...(player ? listeners : {})}
        onClick={() => (player ? onInspect(player) : onSelect())}
        className={`w-full text-left ${paddingClass} ${minHeightClass} ${player ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-60' : ''}`}
      >
        {player ? (
          <div className="flex items-center gap-3">
            {player.photoCode && <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />}
            <div>
              <p className={`font-semibold ${variant === 'pitch' ? 'text-white' : 'text-slate-800'}`}>{player.webName}</p>
              <p className={`text-xs ${variant === 'pitch' ? 'text-white/80' : 'text-slate-500'}`}>{team?.shortName} • £{(player.cost / 10).toFixed(1)}m</p>
            </div>
          </div>
        ) : (
          <div className={`text-center ${variant === 'pitch' ? 'text-white/80' : 'text-slate-500'}`}>
            <p className="text-sm font-semibold">{variant === 'pitch' ? `Empty ${slot.position}` : 'Bench Slot'}</p>
            <p className="text-xs">{variant === 'pitch' ? 'Select slot & assign' : 'Click to select'}</p>
          </div>
        )}
      </button>
      {player && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onClear();
          }}
          className={`w-full text-xs text-center ${variant === 'pitch' ? 'text-white/80 border-white/20 hover:bg-white/10' : 'text-slate-500 border-slate-100 hover:bg-slate-50'} py-1 border-t`}
        >
          Remove
        </button>
      )}
    </div>
  );
}

interface SquadCardProps {
  player: SquadPlayer;
  team?: Team;
  assignment: string | null;
  onAssign: () => void;
  onRemove: () => void;
}

function SquadCard({ player, team, assignment, onAssign, onRemove }: SquadCardProps) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `squad-${player.id}`,
    data: { type: 'player', playerId: player.id, source: 'squad' } satisfies DragData,
  });
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 group hover:border-slate-300 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-60' : ''}`}
      onClick={onAssign}
    >
      {player.photoCode && <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{player.webName}</span>
          {assignment && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${assignment === 'Starting XI' ? 'bg-fpl-forest/10 text-fpl-forest' : 'bg-slate-200 text-slate-700'}`}>
              {assignment}
            </span>
          )}
        </div>
        <span className="text-sm text-slate-500">{team?.shortName} • £{(player.cost / 10).toFixed(1)}m</span>
      </div>
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove from squad"
      >
        ✕
      </button>
    </div>
  );
}

interface UnassignedDropZoneProps {
  activeDrag: DragData | null;
}

function UnassignedDropZone({ activeDrag }: UnassignedDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-zone',
    data: { type: 'unassigned' } satisfies DropData,
  });
  const highlightClass = activeDrag?.source === 'slot'
    ? isOver
      ? 'border-red-300 bg-red-50 text-red-700'
      : 'border-slate-200 text-slate-500'
    : 'border-slate-200 text-slate-400';

  return (
    <div ref={setNodeRef} className={`mt-3 rounded-lg border border-dashed px-3 py-2 text-xs text-center transition-all ${highlightClass}`}>
      Drag here to unassign a lineup player
    </div>
  );
}

export function SquadBuilder({ players, teams, squad, loading, error, onRetry, onPlayerClick }: Props) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [lineupError, setLineupError] = useState<string | null>(null);
  const [compactView, setCompactView] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [queuedAssignments, setQueuedAssignments] = useState<Array<{ slotId: string; playerId: number }>>([]);

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const squadPlayerMap = useMemo(() => new Map(squad.squad.map(p => [p.id, p])), [squad.squad]);
  const { lineup, changeFormation, autoAssignPlayer, assignPlayerToSlot, clearSlot } = useLineup(squad.squad);
  const startingXI = lineup?.startingXI ?? [];
  const allSlots = useMemo(() => [...(lineup?.startingXI ?? []), ...(lineup?.bench ?? [])], [lineup]);
  const slotMap = useMemo(() => new Map(allSlots.map(slot => [slot.id, slot])), [allSlots]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const showLineupError = useCallback((message: string) => {
    setLineupError(message);
    window.setTimeout(() => setLineupError(null), 3000);
  }, []);

  useEffect(() => {
    if (queuedAssignments.length === 0) return;
    setQueuedAssignments([]);
    queuedAssignments.forEach(({ slotId, playerId }) => {
      const player = squadPlayerMap.get(playerId);
      if (!player) return;
      const result = assignPlayerToSlot(slotId, player);
      if (!result.success) {
        showLineupError(result.error || 'Cannot assign player');
      }
    });
  }, [assignPlayerToSlot, queuedAssignments, showLineupError, squadPlayerMap]);

  const isPlayerCompatible = useCallback((slot: LineupSlot, player: SquadPlayer) => (
    slot.role !== 'XI' || slot.position === player.position
  ), []);

  const canDropToSlot = useCallback((slot: LineupSlot, drag: DragData) => {
    const player = squadPlayerMap.get(drag.playerId);
    if (!player) return false;
    if (drag.source === 'slot' && drag.slotId === slot.id) return false;
    if (!isPlayerCompatible(slot, player)) return false;
    if (!slot.playerId) return true;
    if (drag.source !== 'slot' || !drag.slotId) return false;
    const sourceSlot = slotMap.get(drag.slotId);
    const targetPlayer = slot.playerId ? squadPlayerMap.get(slot.playerId) : null;
    if (!sourceSlot || !targetPlayer) return false;
    return isPlayerCompatible(sourceSlot, targetPlayer);
  }, [isPlayerCompatible, slotMap, squadPlayerMap]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (data?.type === 'player') {
      setActiveDrag(data);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const dragData = event.active.data.current as DragData | undefined;
    const overData = event.over?.data.current as DropData | undefined;
    setActiveDrag(null);
    if (!dragData || dragData.type !== 'player' || !overData) return;
    const player = squadPlayerMap.get(dragData.playerId);
    if (!player) return;

    if (overData.type === 'unassigned') {
      if (dragData.source === 'slot' && dragData.slotId) {
        clearSlot(dragData.slotId);
      }
      return;
    }

    if (overData.type !== 'slot') return;
    const targetSlot = slotMap.get(overData.slotId);
    if (!targetSlot) return;
    if (dragData.source === 'slot' && dragData.slotId === targetSlot.id) return;

    if (!canDropToSlot(targetSlot, dragData)) {
      if (targetSlot.role === 'XI' && targetSlot.position !== player.position) {
        showLineupError(`This slot needs a ${targetSlot.position}`);
      } else if (targetSlot.playerId && dragData.source === 'slot') {
        showLineupError('Players cannot swap into those positions');
      } else {
        showLineupError('Slot already has a player');
      }
      return;
    }

    if (targetSlot.playerId) {
      const sourceSlot = dragData.source === 'slot' && dragData.slotId ? slotMap.get(dragData.slotId) : null;
      const targetPlayer = targetSlot.playerId ? squadPlayerMap.get(targetSlot.playerId) : null;
      if (!sourceSlot || !targetPlayer) {
        showLineupError('Slot already has a player');
        return;
      }
      clearSlot(sourceSlot.id);
      clearSlot(targetSlot.id);
      setQueuedAssignments([
        { slotId: targetSlot.id, playerId: player.id },
        { slotId: sourceSlot.id, playerId: targetPlayer.id },
      ]);
      setSelectedSlotId(null);
      return;
    }

    if (dragData.source === 'squad') {
      const result = assignPlayerToSlot(targetSlot.id, player);
      if (!result.success) {
        showLineupError(result.error || 'Cannot assign player');
        return;
      }
      setSelectedSlotId(null);
      setLineupError(null);
      return;
    }

    if (dragData.source === 'slot' && dragData.slotId) {
      clearSlot(dragData.slotId);
      setQueuedAssignments([{ slotId: targetSlot.id, playerId: player.id }]);
      setSelectedSlotId(null);
      setLineupError(null);
    }
  }, [assignPlayerToSlot, canDropToSlot, clearSlot, showLineupError, slotMap, squadPlayerMap]);

  useEffect(() => {
    if (!selectedPlayer) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPlayer(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPlayer]);

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
      showLineupError(result.error || 'Cannot assign player');
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

  const activePlayer = activeDrag ? squadPlayerMap.get(activeDrag.playerId) ?? null : null;
  const selectedPlayerInfo = selectedPlayer ? playerMap.get(selectedPlayer.id) ?? null : null;

  const LineupRow = ({ label, slots }: { label: Position; slots: typeof startingXI }) => {
    const rowMaxWidth = ROW_MAX_WIDTHS[slots.length] ?? ROW_MAX_WIDTHS[5];
    const rowGapClass = compactView ? 'gap-2' : 'gap-3';
    return (
      <div className="flex flex-col items-center gap-2 mb-4 last:mb-0">
        <p className="text-xs uppercase tracking-wide text-white/80">{label}</p>
        <div
          className={`grid w-full ${rowMaxWidth} mx-auto ${rowGapClass} justify-items-center`}
          style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}
        >
          {slots.map(slot => {
            const player = lineupSlotContent(slot.id);
            const team = player ? teamMap.get(player.teamId) : undefined;
            const isSelected = selectedSlotId === slot.id;
            return (
              <SlotCard
                key={slot.id}
                slot={slot}
                player={player}
                team={team}
                isSelected={isSelected}
                onSelect={() => setSelectedSlotId(slot.id)}
                onClear={() => clearSlot(slot.id)}
                onInspect={setSelectedPlayer}
                variant="pitch"
                compactView={compactView}
                activeDrag={activeDrag}
                canDropToSlot={canDropToSlot}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    checked={compactView}
                    onChange={e => setCompactView(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-fpl-forest focus:ring-fpl-forest/30"
                  />
                  Compact view
                </label>
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
                    <option value="3-5-2">3-5-2</option>
                    <option value="4-3-3">4-3-3</option>
                    <option value="4-4-2">4-4-2</option>
                    <option value="4-5-1">4-5-1</option>
                    <option value="5-3-2">5-3-2</option>
                    <option value="5-4-1">5-4-1</option>
                  </select>
                </div>
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
                <LineupRow key={line} label={line} slots={groupedStarting[line]} />
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
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      player={player}
                      team={team}
                      isSelected={isSelected}
                      onSelect={() => setSelectedSlotId(slot.id)}
                      onClear={() => clearSlot(slot.id)}
                      onInspect={setSelectedPlayer}
                      variant="bench"
                      compactView={compactView}
                      activeDrag={activeDrag}
                      canDropToSlot={canDropToSlot}
                    />
                  );
                })}
              </div>
              <UnassignedDropZone activeDrag={activeDrag} />
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
                            <SquadCard
                              key={p.id}
                              player={p}
                              team={team}
                              assignment={assignment}
                              onAssign={() => handleAssignToLineup(p)}
                              onRemove={() => squad.removePlayer(p.id)}
                            />
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

      <DragOverlay>
        {activePlayer ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-lg px-3 py-2">
            <div className="flex items-center gap-3">
              {activePlayer.photoCode && <PlayerPhoto photoCode={activePlayer.photoCode} name={activePlayer.webName} size="sm" />}
              <div>
                <p className="font-semibold text-slate-800">{activePlayer.webName}</p>
                <p className="text-xs text-slate-500">£{(activePlayer.cost / 10).toFixed(1)}m</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm text-slate-500">Player details</p>
                <h4 className="text-xl font-bold text-slate-800">{selectedPlayer.webName}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close player panel"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                {selectedPlayer.photoCode && <PlayerPhoto photoCode={selectedPlayer.photoCode} name={selectedPlayer.webName} size="md" />}
                <div>
                  <p className="text-sm text-slate-500">{teamMap.get(selectedPlayer.teamId)?.name}</p>
                  <p className="font-semibold text-slate-800">{selectedPlayer.position} • £{(selectedPlayer.cost / 10).toFixed(1)}m</p>
                  <p className="text-sm text-slate-500">Season points: {selectedPlayerInfo?.totalPoints ?? '—'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">Last 5 GWs</p>
                <p className="text-xs text-slate-500 mt-1">Coming soon</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">Upcoming fixtures</p>
                <p className="text-xs text-slate-500 mt-1">Coming soon</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">Minutes trend</p>
                <p className="text-xs text-slate-500 mt-1">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
