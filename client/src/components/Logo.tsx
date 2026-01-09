interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 48, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-2">
      {/* Icon - Data visualization inspired */}
      <div className="relative" style={{ width: icon, height: icon }}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background circle */}
          <circle cx="24" cy="24" r="22" fill="#0f172a" stroke="#10B981" strokeWidth="2" />

          {/* Bar chart representation */}
          <rect x="12" y="28" width="6" height="12" rx="1" fill="#10B981" />
          <rect x="21" y="20" width="6" height="20" rx="1" fill="#10B981" opacity="0.8" />
          <rect x="30" y="14" width="6" height="26" rx="1" fill="#10B981" opacity="0.6" />

          {/* Trend line */}
          <path
            d="M14 30 L24 22 L33 16"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Data points */}
          <circle cx="14" cy="30" r="2.5" fill="#10B981" />
          <circle cx="24" cy="22" r="2.5" fill="#10B981" />
          <circle cx="33" cy="16" r="2.5" fill="#10B981" />
        </svg>
      </div>

      {showText && (
        <span className={`font-bold ${text}`}>
          <span className="text-slate-100">FPL</span>
          <span className="text-emerald-400">Analytics</span>
        </span>
      )}
    </div>
  );
}
