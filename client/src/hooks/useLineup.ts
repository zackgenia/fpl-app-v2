import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Position, SquadPlayer } from '../types';

const FORMATIONS = ['3-4-3', '3-5-2', '4-3-3', '4-4-2', '4-5-1', '5-3-2', '5-4-1'] as const;
export type Formation = (typeof FORMATIONS)[number];

export interface LineupSlot {
  id: string;
  position: Position | null;
  playerId: number | null;
  role: 'XI' | 'BENCH';
}

interface LineupState {
  formation: Formation;
  startingXI: LineupSlot[];
  bench: LineupSlot[];
}

const FORMATION_COUNTS: Record<Formation, Record<Exclude<Position, 'GK'>, number>> = {
  '3-4-3': { DEF: 3, MID: 4, FWD: 3 },
  '3-5-2': { DEF: 3, MID: 5, FWD: 2 },
  '4-3-3': { DEF: 4, MID: 3, FWD: 3 },
  '4-4-2': { DEF: 4, MID: 4, FWD: 2 },
  '4-5-1': { DEF: 4, MID: 5, FWD: 1 },
  '5-3-2': { DEF: 5, MID: 3, FWD: 2 },
  '5-4-1': { DEF: 5, MID: 4, FWD: 1 },
};

const STORAGE_KEY = 'fpl-lineup';

const createBench = (): LineupSlot[] =>
  Array.from({ length: 4 }, (_, i) => ({
    id: `BENCH-${i + 1}`,
    position: null,
    playerId: null,
    role: 'BENCH' as const,
  }));

const createStartingXI = (formation: Formation): LineupSlot[] => {
  const slots: LineupSlot[] = [{ id: 'GK-1', position: 'GK', playerId: null, role: 'XI' }];
  (['DEF', 'MID', 'FWD'] as const).forEach(pos => {
    Array.from({ length: FORMATION_COUNTS[formation][pos] }).forEach((_, i) => {
      slots.push({
        id: `${pos}-${i + 1}`,
        position: pos,
        playerId: null,
        role: 'XI',
      });
    });
  });
  return slots;
};

const defaultState = (formation: Formation = '3-4-3'): LineupState => ({
  formation,
  startingXI: createStartingXI(formation),
  bench: createBench(),
});

const sanitizeState = (state: LineupState | null): LineupState => {
  if (!state) return defaultState();
  const validFormation = FORMATIONS.includes(state.formation) ? state.formation : '3-4-3';
  const expectedCount = 1 + Object.values(FORMATION_COUNTS[validFormation]).reduce((sum, value) => sum + value, 0);
  const startingXI = state.startingXI?.length === expectedCount ? state.startingXI : createStartingXI(validFormation);
  const bench = state.bench?.length ? state.bench.slice(0, 4) : createBench();
  return {
    formation: validFormation,
    startingXI: startingXI.map(slot => ({ ...slot, role: 'XI' as const })),
    bench: createBench().map((slot, idx) => bench[idx] ? { ...slot, playerId: bench[idx].playerId ?? null } : slot),
  };
};

const findSlot = (state: LineupState, slotId: string) =>
  [...state.startingXI, ...state.bench].find(s => s.id === slotId);

export function useLineup(squadPlayers: SquadPlayer[]) {
  const [lineup, setLineup] = useState<LineupState>(() => {
    if (typeof window === 'undefined') return defaultState();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState();
    try {
      const parsed = JSON.parse(stored) as LineupState;
      return sanitizeState(parsed);
    } catch {
      return defaultState();
    }
  });

  const squadMap = useMemo(() => new Map(squadPlayers.map(p => [p.id, p])), [squadPlayers]);

  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<number>();
    lineup.startingXI.forEach(s => s.playerId && ids.add(s.playerId));
    lineup.bench.forEach(s => s.playerId && ids.add(s.playerId));
    return ids;
  }, [lineup]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lineup));
    }
  }, [lineup]);

  useEffect(() => {
    const validIds = new Set(squadPlayers.map(p => p.id));
    setLineup(prev => {
      let changed = false;
      const cleanSlots = (slots: LineupSlot[]) =>
        slots.map(slot => {
          if (slot.playerId && !validIds.has(slot.playerId)) {
            changed = true;
            return { ...slot, playerId: null };
          }
          return slot;
        });
      const nextStarting = cleanSlots(prev.startingXI);
      const nextBench = cleanSlots(prev.bench);
      return changed ? { ...prev, startingXI: nextStarting, bench: nextBench } : prev;
    });
  }, [squadPlayers]);

  const changeFormation = useCallback(
    (formation: Formation) => {
      if (formation === lineup.formation) return;
      setLineup(prev => {
        const nextSlots = createStartingXI(formation);
        const availablePlayers = prev.startingXI
          .map(slot => (slot.playerId ? { playerId: slot.playerId, position: slot.position } : null))
          .filter(Boolean) as { playerId: number; position: Position }[];
        const used = new Set<number>();
        const nextStarting = nextSlots.map(slot => {
          const candidate = availablePlayers.find(
            p => p.position === slot.position && !used.has(p.playerId) && squadMap.has(p.playerId),
          );
          if (candidate) {
            used.add(candidate.playerId);
            return { ...slot, playerId: candidate.playerId };
          }
          return slot;
        });
        const baseBench = createBench();
        const nextBench = baseBench.map((slot, index) => {
          const prevSlot = prev.bench[index];
          if (prevSlot?.playerId && squadMap.has(prevSlot.playerId) && !used.has(prevSlot.playerId)) {
            used.add(prevSlot.playerId);
            return { ...slot, playerId: prevSlot.playerId };
          }
          return slot;
        });
        const overflow = availablePlayers.filter(p => !used.has(p.playerId) && squadMap.has(p.playerId));
        let overflowIndex = 0;
        const filledBench = nextBench.map(slot => {
          if (slot.playerId) return slot;
          const candidate = overflow[overflowIndex];
          if (!candidate) return slot;
          overflowIndex += 1;
          used.add(candidate.playerId);
          return { ...slot, playerId: candidate.playerId };
        });
        return { formation, startingXI: nextStarting, bench: filledBench };
      });
    },
    [lineup.formation, squadMap],
  );

  const clearSlot = useCallback((slotId: string) => {
    setLineup(prev => {
      const slot = findSlot(prev, slotId);
      if (!slot || !slot.playerId) return prev;
      if (slot.role === 'XI') {
        return { ...prev, startingXI: prev.startingXI.map(s => (s.id === slotId ? { ...s, playerId: null } : s)) };
      }
      return { ...prev, bench: prev.bench.map(s => (s.id === slotId ? { ...s, playerId: null } : s)) };
    });
  }, []);

  const assignPlayerToSlot = useCallback(
    (slotId: string, player: SquadPlayer) => {
      const slot = findSlot(lineup, slotId);
      if (!slot) return { success: false, error: 'Slot not found' };
      if (slot.playerId) return { success: false, error: 'Slot already has a player' };
      if (assignedPlayerIds.has(player.id)) return { success: false, error: 'Player already assigned' };
      if (slot.role === 'XI' && slot.position !== player.position) {
        return { success: false, error: `This slot needs a ${slot.position}` };
      }
      setLineup(prev => {
        const updateSlot = (s: LineupSlot) => (s.id === slotId ? { ...s, playerId: player.id } : s);
        return {
          ...prev,
          startingXI: prev.startingXI.map(updateSlot),
          bench: prev.bench.map(updateSlot),
        };
      });
      return { success: true };
    },
    [assignedPlayerIds, lineup],
  );

  const autoAssignPlayer = useCallback(
    (player: SquadPlayer) => {
      if (assignedPlayerIds.has(player.id)) return { success: false, error: 'Player already assigned' };
      const targetSlot =
        lineup.startingXI.find(s => s.position === player.position && !s.playerId) ||
        lineup.bench.find(s => !s.playerId);
      if (!targetSlot) return { success: false, error: 'No available slot for this player' };
      return assignPlayerToSlot(targetSlot.id, player);
    },
    [assignPlayerToSlot, assignedPlayerIds, lineup],
  );

  return {
    lineup,
    assignedPlayerIds,
    changeFormation,
    assignPlayerToSlot,
    autoAssignPlayer,
    clearSlot,
  };
}
