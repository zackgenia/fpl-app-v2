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
        ? 'ring-2 ring-emerald-400/50 bg-white/15'
        : 'ring-2 ring-emerald-500/50 border-emerald-500/30'
      : 'ring-2 ring-red-500/50'
    : '';
  const containerClasses =
    variant === 'pitch'
      ? `rounded border border-white/30 bg-white/10 backdrop-blur-sm transition-all w-full max-w-[170px] ${highlightClass}`
      : `rounded border border-slate-700 bg-slate-800 transition-all ${highlightClass}`;
  const paddingClass = compactView ? 'px-2 py-1.5' : 'px-3 py-2';
  const minHeightClass = compactView ? 'min-h-[60px]' : 'min-h-[76px]';
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setDropRef} className={`${containerClasses} ${isSelected ? (variant === 'pitch' ? 'ring-2 ring-white' : 'ring-2 ring-emerald-500/50') : ''}`}>
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
          <div className="flex items-center gap-2">
            {player.photoCode && <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />}
            <div className="min-w-0">
              <p className={`font-medium text-sm truncate ${variant === 'pitch' ? 'text-white' : 'text-slate-200'}`}>{player.webName}</p>
              <p className={`text-[10px] ${variant === 'pitch' ? 'text-white/70' : 'text-slate-500'}`}>{team?.shortName} • {(player.cost / 10).toFixed(1)}m</p>
            </div>
          </div>
        ) : (
          <div className={`text-center ${variant === 'pitch' ? 'text-white/70' : 'text-slate-500'}`}>
            <p className="text-xs font-medium">{variant === 'pitch' ? `Empty ${slot.position}` : `Bench ${slot.position}`}</p>
            <p className="text-[10px]">{variant === 'pitch' ? 'Select & assign' : `Needs ${slot.position}`}</p>
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
          className={`w-full text-[10px] text-center ${variant === 'pitch' ? 'text-white/70 border-white/20 hover:bg-white/10' : 'text-slate-500 border-slate-700 hover:bg-slate-700/50'} py-1 border-t`}
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
  onInspect?: (player: SquadPlayer) => void;
}

function SquadCard({ player, team, assignment, onAssign, onRemove, onInspect }: SquadCardProps) {
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
      className={`flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 rounded border border-slate-700 group hover:border-slate-600 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-60' : ''}`}
      onClick={onAssign}
    >
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onInspect?.(player);
        }}
        className="flex items-center gap-2 text-left"
      >
        {player.photoCode && <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-slate-200">{player.webName}</span>
            {assignment && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${assignment === 'Starting XI' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'}`}>
                {assignment === 'Starting XI' ? 'XI' : 'BCH'}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">{team?.shortName} • {(player.cost / 10).toFixed(1)}m</span>
        </div>
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-auto text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
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
      ? 'border-red-500/50 bg-red-500/10 text-red-400'
      : 'border-slate-600 text-slate-500'
    : 'border-slate-700 text-slate-500';

  return (
    <div ref={setNodeRef} className={`mt-3 rounded border border-dashed px-3 py-2 text-[10px] text-center transition-all ${highlightClass}`}>
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
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [queuedAssignments, setQueuedAssignments] = useState<Array<{ slotId: string; playerId: number }>>([]);

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
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
    // All slots (both XI and bench) now have position requirements
    !slot.position || slot.position === player.position
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

  if (loading) return <Loading message="Loading FPL data..." />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  const handleAdd = (player: Player) => {
    const result = squad.addPlayer(player);
    if (!result.success) {
      setAddError(result.error || 'Cannot add player');
      setTimeout(() => setAddError(null), 3000);
      return;
    }
    // Auto-assign to lineup after adding to squad
    const squadPlayer: SquadPlayer = {
      id: player.id,
      webName: player.webName,
      position: POSITION_MAP[player.position] as Position,
      teamId: player.teamId,
      cost: player.cost,
      photoCode: player.photoCode,
    };
    const assignResult = autoAssignPlayer(squadPlayer);
    if (!assignResult.success && assignResult.error !== 'Player already assigned') {
      // Player added to squad but couldn't auto-assign - that's okay, user can assign manually
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
                onInspect={onPlayerClick ? player => onPlayerClick(player.id) : (_player) => {}}
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
      <div className="bg-slate-800 border border-slate-700 rounded p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Squad Builder</h2>
            <p className="text-xs text-slate-500">Build your 15-player squad to get transfer recommendations</p>
          </div>
          <button onClick={squad.clearSquad} className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors">Clear Squad</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Squad Size</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-slate-100 tabular-nums">{squad.squad.length}</span>
              <span className="text-sm text-slate-500 mb-0.5">/15</span>
            </div>
            <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(squad.squad.length / 15) * 100}%` }} />
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Team Value</p>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">{(squad.squadValue / 10).toFixed(1)}m</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-emerald-400/70">In The Bank</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">{(squad.bank / 10).toFixed(1)}m</span>
              <div className="flex flex-col ml-auto">
                <button onClick={() => squad.adjustBank(1)} className="w-6 h-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-t text-emerald-400 text-[10px]">▲</button>
                <button onClick={() => squad.adjustBank(-1)} className="w-6 h-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-b text-emerald-400 text-[10px]">▼</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Total Budget</p>
            <p className={`text-2xl font-bold tabular-nums ${squad.squadValue + squad.bank > 1000 ? 'text-emerald-400' : 'text-slate-100'}`}>
              {((squad.squadValue + squad.bank) / 10).toFixed(1)}m
            </p>
          </div>
        </div>

        {/* Position slots */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => {
            const count = squad.positionCounts[pos];
            const limit = LIMITS[pos];
            const full = count === limit;
            return (
              <div key={pos} className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all ${full ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800/50 text-slate-400 border-slate-700'}`}>
                <span className="text-xs font-medium">{pos}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: limit }).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < count ? (full ? 'bg-emerald-400' : 'bg-emerald-500') : 'bg-slate-600'}`} />
                  ))}
                </div>
                <span className="text-[10px] tabular-nums">{count}/{limit}</span>
              </div>
            );
          })}
        </div>
      </div>

      {addError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 flex items-center gap-2 text-sm">
          <span>!</span> {addError}
        </div>
      )}

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Search */}
        <div className="bg-slate-800 border border-slate-700 rounded p-4">
          <h3 className="font-medium text-slate-200 mb-3 text-sm">Search Players</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Search players or teams..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded text-slate-200">
              <option value="all">All</option>
              <option value="GK">GK</option>
              <option value="DEF">DEF</option>
              <option value="MID">MID</option>
              <option value="FWD">FWD</option>
            </select>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1">
            {filtered.map(player => {
              const team = teamMap.get(player.teamId);
              const { allowed, reason } = squad.canAddPlayer(player);
              return (
                <button
                  key={player.id}
                  type="button"
                  className={`flex w-full items-center justify-between p-2 rounded border cursor-pointer transition-all text-left ${
                    allowed ? 'bg-slate-800/50 border-slate-700 hover:border-emerald-500/40' : 'bg-slate-900/50 border-slate-800 opacity-50'
                  }`}
                  onClick={() => allowed && handleAdd(player)}
                  title={reason}
                >
                  <div className="flex items-center gap-2">
                    <PlayerPhoto photoCode={player.photoCode} name={player.webName} size="sm" />
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{POSITION_MAP[player.position]}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-200 truncate">{player.webName}</p>
                      <div className="flex items-center gap-1">
                        {team?.badge && <TeamBadge badge={team.badge} name={team.shortName} size="sm" />}
                        <span className="text-[10px] text-slate-500">{team?.shortName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm text-slate-200 tabular-nums">{(player.cost / 10).toFixed(1)}m</p>
                    <p className="text-[10px] text-slate-500 tabular-nums">{player.totalPoints} pts</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Lineup */}
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-medium text-slate-200 text-sm">Lineup Builder</h3>
                <p className="text-[10px] text-slate-500">Select a slot then click a player, or click a player to auto-assign.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[10px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={compactView}
                    onChange={e => setCompactView(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
                  />
                  Compact
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">Formation</span>
                  <select
                    value={lineup.formation}
                    onChange={e => {
                      setSelectedSlotId(null);
                      setLineupError(null);
                      changeFormation(e.target.value as typeof lineup.formation);
                    }}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
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
              <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-2 rounded text-xs flex items-center gap-2">
                <span>!</span>
                <span>{lineupError}</span>
              </div>
            )}

            <div className="mt-4 rounded bg-gradient-to-b from-fpl-forest to-fpl-pine px-3 py-4 text-white">
              {(['GK', 'DEF', 'MID', 'FWD'] as const).map(line => (
                <LineupRow key={line} label={line} slots={groupedStarting[line]} />
              ))}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-300">Bench ({lineup.bench.length})</p>
                <p className="text-[10px] text-slate-500">Position-specific slots</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
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
                      onInspect={onPlayerClick ? player => onPlayerClick(player.id) : (_player) => {}}
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
          <div className="bg-slate-800 border border-slate-700 rounded p-4">
            <h3 className="font-medium text-slate-200 mb-3 text-sm">Your Squad</h3>
            {squad.squad.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-700 rounded flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <p className="text-slate-400 text-sm mb-1">No players yet</p>
                <p className="text-[10px] text-slate-500">Search and click players to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => {
                  const posPlayers = squad.squad.filter(p => p.position === pos);
                  if (posPlayers.length === 0) return null;
                  return (
                    <div key={pos}>
                      <p className="text-[10px] font-medium text-slate-500 uppercase mb-1.5">{pos}s ({posPlayers.length})</p>
                      <div className="flex flex-wrap gap-1.5">
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
                              onInspect={onPlayerClick ? player => onPlayerClick(player.id) : undefined}
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
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-emerald-400">Squad Complete</h3>
              <p className="text-xs text-emerald-400/70">Head to Transfers to find your best moves</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-200">Keep Building</h3>
              <p className="text-xs text-slate-500">Add {15 - squad.squad.length} more player{15 - squad.squad.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}
      </div>

      <DragOverlay>
        {activePlayer ? (
          <div className="rounded border border-slate-600 bg-slate-800 shadow-lg px-3 py-2">
            <div className="flex items-center gap-2">
              {activePlayer.photoCode && <PlayerPhoto photoCode={activePlayer.photoCode} name={activePlayer.webName} size="sm" />}
              <div>
                <p className="font-medium text-sm text-slate-200">{activePlayer.webName}</p>
                <p className="text-[10px] text-slate-500">{(activePlayer.cost / 10).toFixed(1)}m</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>

    </DndContext>
  );
}
