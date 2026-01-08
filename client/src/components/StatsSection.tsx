import type { ReactNode } from 'react';

export function StatsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">{title}</h4>
      {children}
    </div>
  );
}
