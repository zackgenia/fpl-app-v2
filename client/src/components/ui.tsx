import type { PlayerPrediction, ConfidenceFactor, TransferReason } from '../types';

// Loading with progress states
export function Loading({ message = 'Loading...', steps }: { message?: string; steps?: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="w-10 h-10 border-4 border-fpl-forest/30 border-t-fpl-forest rounded-full animate-spin mb-4" />
      <p className="text-slate-600 font-medium">{message}</p>
      {steps && (
        <div className="mt-4 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="progress-step active">
              <span className="w-4 h-4 rounded-full bg-fpl-forest/20 animate-pulse" />
              <span>{step}</span>
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
    <div className="card p-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 skeleton rounded" />
          <div className="h-3 w-16 skeleton rounded" />
        </div>
        <div className="h-8 w-16 skeleton rounded" />
      </div>
    </div>
  );
}

export function SkeletonTransfer() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-20 skeleton rounded" />
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="space-y-2">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-3 w-16 skeleton rounded" />
            </div>
          </div>
        </div>
        <div className="w-8 h-8 skeleton rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-20 skeleton rounded" />
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="space-y-2">
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-3 w-16 skeleton rounded" />
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
    <div className={`rounded-xl p-6 text-center ${isBusy ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
      <div className="text-4xl mb-3">{isBusy ? '⏳' : '⚠️'}</div>
      <p className={`font-medium mb-2 ${isBusy ? 'text-amber-800' : 'text-red-800'}`}>
        {isBusy ? 'FPL servers are busy' : 'Something went wrong'}
      </p>
      <p className={`text-sm mb-4 ${isBusy ? 'text-amber-600' : 'text-red-600'}`}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className={`px-4 py-2 rounded-lg font-medium ${isBusy ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'} text-white`}>
          Try Again
        </button>
      )}
    </div>
  );
}

// Confidence bar
export function ConfidenceBar({ confidence, showLabel = true, showTooltip = false }: { confidence: number; showLabel?: boolean; showTooltip?: boolean }) {
  const level = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';
  const label = confidence >= 80 ? 'High confidence' : confidence >= 60 ? 'Medium' : 'Higher risk';
  const description = confidence >= 80
    ? 'Strong data quality: consistent minutes, stable form, favorable fixtures'
    : confidence >= 60
    ? 'Moderate certainty: some variability in minutes or form'
    : 'Higher uncertainty: rotation risk, injury concerns, or tough fixtures';

  return (
    <div className="space-y-1 group relative">
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className={`font-medium ${level === 'high' ? 'text-emerald-600' : level === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
            {label}
          </span>
          <span className="text-slate-500">{confidence}%</span>
        </div>
      )}
      <div className="confidence-bar">
        <div className={`confidence-fill confidence-${level}`} style={{ width: `${confidence}%` }} />
      </div>
      {showTooltip && (
        <p className="text-[10px] text-slate-400 mt-1">{description}</p>
      )}
    </div>
  );
}

// Confidence factors list
export function ConfidenceFactors({ factors }: { factors: ConfidenceFactor[] }) {
  if (factors.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {factors.map((f, i) => (
        <span key={i} className={`text-xs px-2 py-1 rounded-full reason-${f.type}`}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

// FDR chip
export function FdrChip({ difficulty, opponent, isHome, size = 'sm' }: { difficulty: number; opponent: string; isHome: boolean; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  
  return (
    <div className={`fdr-${difficulty} ${sizeClass} rounded font-bold flex flex-col items-center justify-center leading-tight`} title={`${opponent} (${isHome ? 'H' : 'A'}) - FDR ${difficulty}`}>
      <span>{opponent}</span>
      <span className="opacity-70 text-[10px]">{isHome ? 'H' : 'A'}</span>
    </div>
  );
}

// Fixture strip (5 fixtures)
export function FixtureStrip({ fixtures }: { fixtures: { opponent: string; isHome: boolean; difficulty: number }[] }) {
  return (
    <div className="fixture-strip">
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
    <div className="space-y-1.5">
      {reasons.slice(0, 4).map((r, i) => (
        <div key={i} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg reason-${r.type === 'positive' ? 'positive' : r.type === 'warning' ? 'warning' : 'info'}`}>
          <span>{r.icon}</span>
          <span>{r.text}</span>
        </div>
      ))}
    </div>
  );
}

// Player photo
export function PlayerPhoto({ photoCode, name, size = 'md' }: { photoCode: number; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  
  return (
    <img
      src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoCode}.png`}
      alt={name}
      className={`${sizeClass} rounded-full object-cover object-top bg-slate-100 border-2 border-white shadow-sm`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = 'https://resources.premierleague.com/premierleague/photos/players/110x140/Photo-Missing.png';
      }}
    />
  );
}

// Team badge
export function TeamBadge({ badge, name, size = 'md' }: { badge: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  
  if (!badge) return <div className={`${sizeClass} rounded-full bg-slate-200`} />;
  
  return (
    <img src={badge} alt={name} className={`${sizeClass} object-contain`} />
  );
}

// Form trend icon
export function FormTrend({ trend }: { trend: 'rising' | 'stable' | 'falling' }) {
  if (trend === 'rising') return <span className="text-emerald-500" title="Form improving">📈</span>;
  if (trend === 'falling') return <span className="text-red-500" title="Form declining">📉</span>;
  return <span className="text-slate-400" title="Form stable">➡️</span>;
}

// Baseline card
export function BaselineCard({ totalPoints, averageConfidence }: { totalPoints: number; averageConfidence: number }) {
  return (
    <div className="card p-4 bg-slate-50 border-dashed">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg">🎯</div>
        <div>
          <p className="text-sm text-slate-500">If you make no transfer</p>
          <p className="font-bold text-slate-800">{totalPoints.toFixed(1)} predicted points</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">Avg confidence</p>
          <p className="font-semibold text-slate-700">{averageConfidence}%</p>
        </div>
      </div>
    </div>
  );
}
