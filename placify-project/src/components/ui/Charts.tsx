import React, { useState } from 'react';

interface BarDatum {
  label: string;
  value: number;
  sublabel?: string;
}

export function SimpleBarChart({
  data,
  unit = '',
  barColor = '#176B5B',
  emptyText = 'No records available yet.',
}: {
  data: BarDatum[];
  unit?: string;
  barColor?: string;
  emptyText?: string;
}) {
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-[#5A6B69] border border-dashed border-[#E3E7E4] rounded-xl">
        {emptyText}
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-medium text-[#142B2A] truncate" title={item.label}>
                {item.label}
              </span>
              <span className="font-mono tabular-nums text-[#5A6B69] shrink-0">
                {item.value}
                {unit}
                {item.sublabel ? ` · ${item.sublabel}` : ''}
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#F5F3EC] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DualBarDatum {
  label: string;
  total: number;
  placed: number;
  rate: number;
}

export function DeptPlacementChart({
  data,
  emptyText = 'No department placement data yet.',
}: {
  data: DualBarDatum[];
  emptyText?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-[#5A6B69] border border-dashed border-[#E3E7E4] rounded-xl">
        {emptyText}
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-xs text-[#5A6B69]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#E3E7E4]" />
          Total Students
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#176B5B]" />
          Placed Students
        </span>
      </div>

      <div className="grid grid-cols-6 gap-3 items-end h-44 pt-4">
        {data.map((d) => {
          const totalH = Math.max(8, Math.round((d.total / maxVal) * 124));
          const placedH = d.placed > 0 ? Math.max(6, Math.round((d.placed / maxVal) * 124)) : 0;
          const isHovered = hovered === d.label;

          return (
            <div
              key={d.label}
              onMouseEnter={() => setHovered(d.label)}
              onMouseLeave={() => setHovered(null)}
              className="flex flex-col items-center justify-end h-full relative"
            >
              {isHovered && (
                <div className="absolute -top-2 z-10 px-2 py-1 rounded bg-[#142B2A] text-white text-[11px] font-mono tabular-nums whitespace-nowrap shadow">
                  {d.placed}/{d.total} ({d.rate}%)
                </div>
              )}
              <div className="flex items-end gap-1 h-32">
                <div
                  className="w-3.5 sm:w-4 rounded-t bg-[#E3E7E4] transition-all"
                  style={{ height: `${totalH}px` }}
                  title={`${d.label} Total: ${d.total}`}
                />
                <div
                  className="w-3.5 sm:w-4 rounded-t bg-[#176B5B] transition-all"
                  style={{ height: `${placedH}px` }}
                  title={`${d.label} Placed: ${d.placed}`}
                />
              </div>
              <span className="mt-2 text-xs font-medium text-[#142B2A]">{d.label}</span>
              <span className="text-[11px] font-mono tabular-nums text-[#5A6B69]">{d.rate}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  centerLabel,
  emptyText = 'No distribution records available.',
}: {
  data: DonutDatum[];
  centerLabel?: string;
  emptyText?: string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-[#5A6B69] border border-dashed border-[#E3E7E4] rounded-xl">
        {emptyText}
      </div>
    );
  }

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#F5F3EC" strokeWidth="18" />
          {data.map((slice) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={slice.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold font-mono tabular-nums text-[#142B2A]">{total}</span>
          {centerLabel && <span className="text-[11px] text-[#5A6B69]">{centerLabel}</span>}
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {data.map((item) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.label} className="flex items-center justify-between text-xs py-1 border-b border-[#F5F3EC] last:border-0">
              <span className="flex items-center gap-2 text-[#142B2A] font-medium">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-mono tabular-nums text-[#5A6B69]">
                {item.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TrendPoint {
  label: string;
  value: number;
  sublabel?: string;
}

export function TrendLineChart({
  data,
  unit = ' LPA',
  emptyText = 'Insufficient historical data for trend line.',
}: {
  data: TrendPoint[];
  unit?: string;
  emptyText?: string;
}) {
  if (!data.length) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-[#5A6B69] border border-dashed border-[#E3E7E4] rounded-xl">
        {emptyText}
      </div>
    );
  }

  const width = 420;
  const height = 160;
  const padX = 28;
  const padY = 20;
  const maxVal = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const minVal = 0;

  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? width / 2
        : padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y =
      height - padY - ((d.value - minVal) / (maxVal - minVal || 1)) * (height - padY * 2);
    return { ...d, x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((t) => {
          const y = height - padY - t * (height - padY * 2);
          return <line key={t} x1={padX} y1={y} x2={width - padX} y2={y} stroke="#E3E7E4" strokeDasharray="3 3" />;
        })}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="#176B5B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />
        )}
        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="5" fill="#D8A85B" stroke="#142B2A" strokeWidth="1.5" />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="fill-[#142B2A] text-[10px] font-mono"
            >
              {p.value}
            </text>
            <text
              x={p.x}
              y={height - 2}
              textAnchor="middle"
              className="fill-[#5A6B69] text-[10px]"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-[#5A6B69]">
        {data.map((d) => (
          <span key={d.label} className="font-mono tabular-nums">
            {d.label}: <strong className="text-[#142B2A]">{d.value}{unit}</strong>
            {d.sublabel ? ` (${d.sublabel})` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
