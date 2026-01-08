import { useEffect } from 'react';
import type { EntityRef } from '../types';
import { FixtureDetails } from './FixtureDetails';
import { PlayerDetails } from './PlayerDetails';
import { TeamDetails } from './TeamDetails';

export function DetailsDrawer({
  isOpen,
  stack,
  onClose,
  onBack,
  onPushEntity,
}: {
  isOpen: boolean;
  stack: EntityRef[];
  onClose: () => void;
  onBack: () => void;
  onPushEntity: (ref: EntityRef) => void;
}) {
  const current = stack[stack.length - 1] ?? null;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !current) return null;

  const title = current.kind === 'player' ? 'Player' : current.kind === 'team' ? 'Team' : 'Fixture';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-900/40" onClick={onClose}>
      <div
        className="h-full w-full bg-white shadow-2xl md:w-[420px] md:rounded-l-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {stack.length > 1 && (
              <button
                type="button"
                onClick={onBack}
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Go back"
              >
                ←
              </button>
            )}
            <div>
              <p className="text-xs text-slate-500">Details</p>
              <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Close details drawer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {current.kind === 'player' && (
            <PlayerDetails playerId={current.id} isActive={isOpen} onEntityClick={onPushEntity} />
          )}
          {current.kind === 'team' && (
            <TeamDetails teamId={current.id} isActive={isOpen} onEntityClick={onPushEntity} />
          )}
          {current.kind === 'fixture' && (
            <FixtureDetails fixtureId={current.id} isActive={isOpen} onEntityClick={onPushEntity} />
          )}
        </div>
      </div>
    </div>
  );
}
