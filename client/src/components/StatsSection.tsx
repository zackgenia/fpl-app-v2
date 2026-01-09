import type { ReactNode } from 'react';

export function StatsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] uppercase tracking-wide font-medium text-slate-500">{title}</h4>
      {children}
    </div>
  );
}
