import { useState, useCallback, useMemo } from 'react';
import type { SquadPlayer, Position, Player } from '../types';
import { POSITION_MAP } from '../types';

const SQUAD_LIMITS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const STARTING_BUDGET = 1000;

export function useSquad() {
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [bank, setBank] = useState(STARTING_BUDGET);

  const squadValue = useMemo(() => squad.reduce((s, p) => s + p.cost, 0), [squad]);
  const positionCounts = useMemo(() => {
    const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    squad.forEach(p => counts[p.position]++);
    return counts;
  }, [squad]);

  const teamCounts = useMemo(() => {
    const counts = new Map<number, number>();
    squad.forEach(p => counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1));
    return counts;
  }, [squad]);

  const isSquadComplete = squad.length === 15;

  const adjustBank = useCallback((delta: number) => {
    setBank(prev => Math.max(0, prev + delta));
  }, []);

  const canAddPlayer = useCallback((player: Player): { allowed: boolean; reason?: string } => {
    if (squad.some(p => p.id === player.id)) return { allowed: false, reason: 'Already in squad' };
    if (squad.length >= 15) return { allowed: false, reason: 'Squad full' };
    const position = POSITION_MAP[player.position];
    if (positionCounts[position] >= SQUAD_LIMITS[position]) return { allowed: false, reason: `Max ${SQUAD_LIMITS[position]} ${position}s` };
    const teamCount = teamCounts.get(player.teamId) ?? 0;
    if (teamCount >= 3) return { allowed: false, reason: 'Max 3 per team' };
    if (player.cost > bank) return { allowed: false, reason: `Need £${(player.cost / 10).toFixed(1)}m` };
    return { allowed: true };
  }, [squad, positionCounts, teamCounts, bank]);

  const addPlayer = useCallback((player: Player) => {
    const { allowed, reason } = canAddPlayer(player);
    if (!allowed) return { success: false, error: reason };
    setSquad(prev => [...prev, {
      id: player.id,
      webName: player.webName,
      position: POSITION_MAP[player.position],
      cost: player.cost,
      teamId: player.teamId,
      photoCode: player.photoCode,
    }]);
    setBank(prev => prev - player.cost);
    return { success: true };
  }, [canAddPlayer]);

  const removePlayer = useCallback((playerId: number) => {
    const player = squad.find(p => p.id === playerId);
    if (player) {
      setBank(b => b + player.cost);
      setSquad(prev => prev.filter(p => p.id !== playerId));
    }
  }, [squad]);

  const clearSquad = useCallback(() => {
    const total = squad.reduce((s, p) => s + p.cost, 0);
    setBank(prev => prev + total);
    setSquad([]);
  }, [squad]);

  return {
    squad, bank, setBank, adjustBank, addPlayer, removePlayer, clearSquad,
    canAddPlayer, squadValue, positionCounts, teamCounts, isSquadComplete,
  };
}
