'use client';

import React from 'react';

export function CalendarLegend() {
  return (
    <div className="flex items-center justify-center gap-3 pt-2.5 border-t border-border/60 text-[11px] font-medium text-text-muted select-none">
      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
        Chi tiêu:
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-heat-low border border-heat-low-text/20" />
        <span>&lt;100k</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-heat-medium border border-heat-medium-text/20" />
        <span>100-500k</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-heat-high border border-heat-high-text/20" />
        <span>&gt;500k</span>
      </span>
    </div>
  );
}
