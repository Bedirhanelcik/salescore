"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { SegmentationRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const COLORS = [
  "var(--color-brand)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
];

export function SegmentationChart({ rows }: { rows: SegmentationRow[] }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
        <PieChart>
          <Pie data={rows} dataKey="revenue" nameKey="segment" innerRadius={45} outerRadius={80} paddingAngle={2}>
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {rows.map((row, i) => (
          <div key={row.segment} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-foreground">{row.segment}</span>
            </span>
            <span className="text-muted-foreground">{row.revenue_share_pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
