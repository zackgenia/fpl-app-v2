interface GameweekSelectorProps {
  currentGw: number;
  selectedGw: number;
  onSelect: (gw: number) => void;
  totalGameweeks?: number;
  gwStatus?: 'LIVE' | 'UPCOMING' | 'FINISHED';
}

export function GameweekSelector({
  currentGw,
  selectedGw,
  onSelect,
  totalGameweeks = 38,
  gwStatus,
}: GameweekSelectorProps) {
  // Show 5 gameweeks centered around selected
  const range = 2;
  const start = Math.max(1, Math.min(selectedGw - range, totalGameweeks - 4));
  const end = Math.min(totalGameweeks, start + 4);
  const visibleGws = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center gap-2">
      {/* Previous button */}
      <button
        type="button"
        onClick={() => onSelect(Math.max(1, selectedGw - 1))}
        disabled={selectedGw <= 1}
        className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous gameweek"
      >
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Gameweek buttons */}
      <div className="flex items-center gap-1">
        {start > 1 && (
          <>
            <button
              type="button"
              onClick={() => onSelect(1)}
              className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              1
            </button>
            <span className="text-slate-600 text-xs">...</span>
          </>
        )}

        {visibleGws.map(gw => {
          const isSelected = gw === selectedGw;
          const isCurrent = gw === currentGw;

          return (
            <button
              key={gw}
              type="button"
              onClick={() => onSelect(gw)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors relative ${
                isSelected
                  ? 'bg-emerald-600 text-white'
                  : isCurrent
                  ? 'bg-slate-700 text-emerald-400 ring-1 ring-emerald-500/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {gw}
              {isCurrent && gwStatus === 'LIVE' && !isSelected && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}

        {end < totalGameweeks && (
          <>
            <span className="text-slate-600 text-xs">...</span>
            <button
              type="button"
              onClick={() => onSelect(totalGameweeks)}
              className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              {totalGameweeks}
            </button>
          </>
        )}
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={() => onSelect(Math.min(totalGameweeks, selectedGw + 1))}
        disabled={selectedGw >= totalGameweeks}
        className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next gameweek"
      >
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
