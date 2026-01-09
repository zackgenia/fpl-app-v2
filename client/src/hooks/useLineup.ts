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

// Squad limits: 2 GK, 5 DEF, 5 MID, 3 FWD = 15 players
const SQUAD_LIMITS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

// Calculate bench positions based on formation
// Bench = Squad limits - Starting XI requirements
const createBenchForFormation = (formation: Formation): LineupSlot[] => {
  const formationCounts = FORMATION_COUNTS[formation];
  // Starting XI uses 1 GK, so bench gets 1 GK
  // Outfield bench positions = squad limit - formation requirement
  const benchDEF = SQUAD_LIMITS.DEF - formationCounts.DEF; // 5 - formation DEFs
  const benchMID = SQUAD_LIMITS.MID - formationCounts.MID; // 5 - formation MIDs
  const benchFWD = SQUAD_LIMITS.FWD - formationCounts.FWD; // 3 - formation FWDs

  const slots: LineupSlot[] = [
    { id: 'BENCH-GK', position: 'GK', playerId: null, role: 'BENCH' as const },
  ];

  // Add bench slots for each position based on what formation omits
  for (let i = 0; i < benchDEF; i++) {
    slots.push({ id: `BENCH-DEF-${i + 1}`, position: 'DEF', playerId: null, role: 'BENCH' as const });
  }
  for (let i = 0; i < benchMID; i++) {
    slots.push({ id: `BENCH-MID-${i + 1}`, position: 'MID', playerId: null, role: 'BENCH' as const });
  }
  for (let i = 0; i < benchFWD; i++) {
    slots.push({ id: `BENCH-FWD-${i + 1}`, position: 'FWD', playerId: null, role: 'BENCH' as const });
  }

  return slots;
};

// Legacy function for backwards compatibility during migration
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
  bench: createBenchForFormation(formation),
});

const sanitizeState = (state: LineupState | null): LineupState => {
  if (!state) return defaultState();
  const validFormation = FORMATIONS.includes(state.formation) ? state.formation : '3-4-3';
  const expectedCount = 1 + Object.values(FORMATION_COUNTS[validFormation]).reduce((sum, value) => sum + value, 0);
  const startingXI = state.startingXI?.length === expectedCount ? state.startingXI : createStartingXI(validFormation);

  // Create new position-specific bench for the formation
  const newBench = createBenchForFormation(validFormation);

  // Migrate player IDs from old bench format if present
  if (state.bench?.length) {
    const oldPlayerIds = state.bench
      .map(s => s.playerId)
      .filter((id): id is number => id !== null);

    // Fill new bench slots with old player IDs (will be validated later by squad sync)
    let playerIndex = 0;
    for (let i = 0; i < newBench.length && playerIndex < oldPlayerIds.length; i++) {
      if (!newBench[i].playerId) {
        newBench[i] = { ...newBench[i], playerId: oldPlayerIds[playerIndex] };
        playerIndex++;
      }
    }
  }

  return {
    formation: validFormation,
    startingXI: startingXI.map(slot => ({ ...slot, role: 'XI' as const })),
    bench: newBench,
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
        // Gather all players from starting XI with their positions
        const startingPlayers = prev.startingXI
          .map(slot => (slot.playerId ? { playerId: slot.playerId, position: slot.position } : null))
          .filter(Boolean) as { playerId: number; position: Position }[];
        // Gather all players from bench with their positions
        const benchPlayers = prev.bench
          .map(slot => {
            if (!slot.playerId) return null;
            const player = squadMap.get(slot.playerId);
            return player ? { playerId: slot.playerId, position: player.position } : null;
          })
          .filter(Boolean) as { playerId: number; position: Position }[];

        const allPlayers = [...startingPlayers, ...benchPlayers];
        const used = new Set<number>();

        // Fill starting XI - match by position
        const nextStarting = nextSlots.map(slot => {
          const candidate = allPlayers.find(
            p => p.position === slot.position && !used.has(p.playerId) && squadMap.has(p.playerId),
          );
          if (candidate) {
            used.add(candidate.playerId);
            return { ...slot, playerId: candidate.playerId };
          }
          return slot;
        });

        // Create new position-specific bench for the formation
        const newBench = createBenchForFormation(formation);

        // Fill bench slots - match by position
        const filledBench = newBench.map(slot => {
          const candidate = allPlayers.find(
            p => p.position === slot.position && !used.has(p.playerId) && squadMap.has(p.playerId),
          );
          if (candidate) {
            used.add(candidate.playerId);
            return { ...slot, playerId: candidate.playerId };
          }
          return slot;
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
      // Enforce position matching for both XI and bench slots
      if (slot.position && slot.position !== player.position) {
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
      // First try starting XI slot matching position
      const startingSlot = lineup.startingXI.find(s => s.position === player.position && !s.playerId);
      if (startingSlot) {
        return assignPlayerToSlot(startingSlot.id, player);
      }
      // Then try bench slot matching position
      const benchSlot = lineup.bench.find(s => s.position === player.position && !s.playerId);
      if (benchSlot) {
        return assignPlayerToSlot(benchSlot.id, player);
      }
      return { success: false, error: 'No available slot for this player' };
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
