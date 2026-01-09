import type { ConfidenceFactor, TransferReason } from '../types';

// Loading with progress states
export function Loading({ message = 'Loading...', steps }: { message?: string; steps?: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm">{message}</p>
      {steps && (
        <div className="mt-4 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="progress-step active">
              <span className="w-3 h-3 rounded-full bg-emerald-400/20 animate-pulse" />
              <span className="text-sm text-slate-400">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Skeleton loaders
export function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 skeleton rounded" />
          <div className="h-2 w-16 skeleton rounded" />
        </div>
        <div className="h-6 w-14 skeleton rounded" />
      </div>
    </div>
  );
}

export function SkeletonTransfer() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 skeleton rounded" />
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded skeleton" />
            <div className="space-y-1">
              <div className="h-3 w-20 skeleton rounded" />
              <div className="h-2 w-12 skeleton rounded" />
            </div>
          </div>
        </div>
        <div className="w-6 h-6 skeleton rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 skeleton rounded" />
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded skeleton" />
            <div className="space-y-1">
              <div className="h-3 w-20 skeleton rounded" />
              <div className="h-2 w-12 skeleton rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error with retry
export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const isBusy = message.toLowerCase().includes('busy') || message.toLowerCase().includes('retry');

  return (
    <div className={`rounded p-6 text-center border ${isBusy ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
      <p className={`font-medium mb-2 ${isBusy ? 'text-amber-400' : 'text-red-400'}`}>
        {isBusy ? 'Server busy' : 'Error'}
      </p>
      <p className={`text-sm mb-4 ${isBusy ? 'text-amber-300/70' : 'text-red-300/70'}`}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`px-3 py-1.5 rounded text-sm font-medium ${isBusy ? 'bg-amber-500 hover:bg-amber-400' : 'bg-red-500 hover:bg-red-400'} text-white transition-colors`}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Confidence bar
export function ConfidenceBar({ confidence, showLabel = true, showTooltip = false }: { confidence: number; showLabel?: boolean; showTooltip?: boolean }) {
  const level = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';
  const label = confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low';

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className={`font-medium ${level === 'high' ? 'text-emerald-400' : level === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
            {label}
          </span>
          <span className="text-slate-500 tabular-nums">{confidence}%</span>
        </div>
      )}
      <div className="confidence-bar">
        <div className={`confidence-fill confidence-${level}`} style={{ width: `${confidence}%` }} />
      </div>
    </div>
  );
}

// Confidence factors list
export function ConfidenceFactors({ factors }: { factors: ConfidenceFactor[] }) {
  if (factors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {factors.map((f, i) => (
        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded reason-${f.type}`}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

// FDR chip
export function FdrChip({ difficulty, opponent, isHome, size = 'sm' }: { difficulty: number; opponent: string; isHome: boolean; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-9 h-9 text-xs' : 'w-7 h-7 text-[10px]';

  return (
    <div
      className={`fdr-${difficulty} ${sizeClass} rounded-sm font-semibold flex flex-col items-center justify-center leading-tight`}
      title={`${opponent} (${isHome ? 'H' : 'A'}) - FDR ${difficulty}`}
    >
      <span>{opponent}</span>
      <span className="opacity-70 text-[8px]">{isHome ? 'H' : 'A'}</span>
    </div>
  );
}

// Fixture strip (5 fixtures)
export function FixtureStrip({ fixtures }: { fixtures: { opponent: string; isHome: boolean; difficulty: number }[] }) {
  return (
    <div className="flex gap-0.5">
      {fixtures.slice(0, 5).map((f, i) => (
        <FdrChip key={i} difficulty={f.difficulty} opponent={f.opponent} isHome={f.isHome} />
      ))}
    </div>
  );
}

// Transfer reasons
export function TransferReasons({ reasons }: { reasons: TransferReason[] }) {
  if (reasons.length === 0) return null;

  return (
    <div className="space-y-1">
      {reasons.slice(0, 4).map((r, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 text-xs px-2 py-1 rounded reason-${r.type === 'positive' ? 'positive' : r.type === 'warning' ? 'warning' : 'info'}`}
        >
          <span className="text-sm">{r.icon}</span>
          <span>{r.text}</span>
        </div>
      ))}
    </div>
  );
}

// Player photo
export function PlayerPhoto({ photoCode, name, size = 'md' }: { photoCode: number; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-6 h-6' : 'w-10 h-10';

  return (
    <img
      src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoCode}.png`}
      alt={name}
      className={`${sizeClass} rounded object-cover object-top bg-slate-700 border border-slate-600`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png';
      }}
    />
  );
}

// Team badge
export function TeamBadge({ badge, name, size = 'md' }: { badge: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (!badge) return <div className={`${sizeClass} rounded-full bg-slate-700`} />;

  return <img src={badge} alt={name} className={`${sizeClass} object-contain`} />;
}

// Form trend icon
export function FormTrend({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  if (trend === 'rising') return <span className="text-emerald-400" title="Form improving">+</span>;
  if (trend === 'falling') return <span className="text-red-400" title="Form declining">-</span>;
  return <span className="text-slate-500" title="Form stable">=</span>;
}

// Baseline card
export function BaselineCard({ totalPoints, averageConfidence }: { totalPoints: number; averageConfidence: number }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded p-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 text-sm">0</div>
        <div>
          <p className="text-xs text-slate-500">No transfer baseline</p>
          <p className="font-semibold text-slate-200 tabular-nums">{totalPoints.toFixed(1)} pts</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-500">Confidence</p>
          <p className="font-medium text-slate-300 tabular-nums">{averageConfidence}%</p>
        </div>
      </div>
    </div>
  );
}
