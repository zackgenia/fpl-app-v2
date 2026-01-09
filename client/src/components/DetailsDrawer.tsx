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
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full bg-slate-900 shadow-2xl md:w-[420px] md:border-l md:border-slate-700 overflow-hidden flex flex-col animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 bg-slate-800/50">
          <div className="flex items-center gap-3">
            {stack.length > 1 && (
              <button
                type="button"
                onClick={onBack}
                className="h-7 w-7 rounded border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 flex items-center justify-center transition-colors"
                aria-label="Go back"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 flex items-center justify-center transition-colors"
            aria-label="Close details drawer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
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
