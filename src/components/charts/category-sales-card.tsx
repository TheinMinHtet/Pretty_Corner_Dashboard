"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart2,
  ListOrdered,
  ShoppingBag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCompactMMK, formatMMK } from "@/lib/utils";
import { CategoryRevenueItem, DateRange, DATE_RANGE_LABELS } from "@/modules/analytics/metrics";

interface CategorySalesCardProps {
  salesData: CategoryRevenueItem[];
  totalRevenue: number;
  dateRange: DateRange;
  className?: string;
}

interface CustomTickProps {
  x?: number;
  y?: number;
  payload?: {
    value: string;
  };
}

function CustomCategoryTick({ x = 0, y = 0, payload }: CustomTickProps) {
  if (!payload) return null;
  const name = payload.value;
  // Gracefully truncate if excessively long while keeping full name available
  const displayName = name.length > 17 ? `${name.slice(0, 15)}…` : name;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{name}</title>
      <text
        x={-8}
        y={4}
        textAnchor="end"
        fill="#33272C"
        fontSize={12}
        fontWeight={500}
        className="font-sans select-none"
      >
        {displayName}
      </text>
    </g>
  );
}

export function CategorySalesCard({
  salesData,
  totalRevenue,
  dateRange,
  className,
}: CategorySalesCardProps) {
  const [viewMode, setViewMode] = useState<"chart" | "leaderboard">("chart");

  // Guaranteed all categories are present; sorted descending by revenue
  const totalSalesFromCategories = useMemo(
    () => salesData.reduce((sum, item) => sum + item.revenue, 0),
    [salesData]
  );

  const activeCategoriesCount = useMemo(
    () => salesData.filter((item) => item.revenue > 0).length,
    [salesData]
  );

  const topCategory = salesData.length > 0 && salesData[0].revenue > 0 ? salesData[0] : null;

  // Dynamic height calculation so every category label has generous vertical space (interval={0})
  const chartHeight = useMemo(() => {
    const rowHeight = 44;
    return Math.max(260, salesData.length * rowHeight);
  }, [salesData.length]);

  return (
    <Card
      className={`rounded-[32px] border border-[#F0E1E6] bg-white shadow-xs transition-all duration-200 flex flex-col h-full ${
        className ?? ""
      }`}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <CardTitle className="font-serif text-lg font-bold text-[#33272C]">
            Sales by Category
          </CardTitle>
          <CardDescription className="text-xs text-[#806B73] mt-0.5">
            Revenue distribution across all catalog segments for {DATE_RANGE_LABELS[dateRange]}
          </CardDescription>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center bg-[#FAF4F6] p-1 rounded-full border border-[#F0E1E6] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("chart")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
              viewMode === "chart"
                ? "bg-white text-[#B73D67] shadow-xs"
                : "text-[#806B73] hover:text-[#33272C]"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Bars</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("leaderboard")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
              viewMode === "leaderboard"
                ? "bg-white text-[#B73D67] shadow-xs"
                : "text-[#806B73] hover:text-[#33272C]"
            }`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span>Ranked</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-1">
        {salesData.length === 0 ? (
          <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center text-center p-6">
            <div className="h-12 w-12 rounded-2xl bg-[#FCEEF2] flex items-center justify-center mb-3">
              <ShoppingBag className="h-6 w-6 text-[#D96B91]" />
            </div>
            <p className="text-sm font-semibold text-[#33272C]">No categories found</p>
            <p className="text-xs text-[#806B73] max-w-xs mt-1">
              Configure product categories in the Categories manager to start tracking sales.
            </p>
          </div>
        ) : viewMode === "chart" ? (
          <div className="w-full flex-1" style={{ minHeight: `${chartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#F5EBF0"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    formatCompactMMK(Number(v)).replace(" MMK", "")
                  }
                  tick={{ fill: "#806B73", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  width={135}
                  tick={<CustomCategoryTick />}
                />
                <Tooltip
                  cursor={{ fill: "rgba(247, 242, 244, 0.45)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0].payload as CategoryRevenueItem;
                    return (
                      <div className="rounded-2xl border border-[#F0E1E6] bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="flex items-center gap-2 font-bold text-[#33272C] pb-1 border-b border-[#F5EBF0]">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-[#806B73] pt-0.5">
                          <span>Revenue:</span>
                          <span className="font-bold text-[#33272C]">
                            {formatMMK(item.revenue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[#806B73]">
                          <span>Share of Sales:</span>
                          <span className="font-semibold text-[#B73D67]">
                            {item.percentage ?? 0}%
                          </span>
                        </div>
                        {item.orderCount !== undefined && (
                          <div className="flex justify-between items-center text-[#806B73]">
                            <span>Units Sold:</span>
                            <span className="font-semibold text-[#33272C]">
                              {item.orderCount}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="revenue"
                  radius={[0, 8, 8, 0]}
                  barSize={18}
                  background={{ fill: "#FAF4F6" }}
                >
                  {salesData.map((entry, index) => (
                    <Cell
                      key={`cat-cell-${entry.name}-${index}`}
                      fill={entry.revenue > 0 ? entry.color : "#EADEE3"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Leaderboard / Ranked List View */
          <div className="space-y-2.5 py-1">
            {salesData.map((item, idx) => {
              const maxRev = salesData[0]?.revenue || 1;
              const barRatio = maxRev > 0 ? Math.round((item.revenue / maxRev) * 100) : 0;

              return (
                <div
                  key={`ranked-${item.name}-${idx}`}
                  className="p-3 rounded-2xl bg-[#FDFBFB] hover:bg-[#FAF4F6] border border-[#F0E1E6]/75 transition-colors duration-150 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-white border border-[#F0E1E6] flex items-center justify-center font-bold text-[10px] text-[#806B73]">
                        #{idx + 1}
                      </span>
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-[#33272C]">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.orderCount !== undefined && (
                        <span className="text-[11px] text-[#806B73]">
                          {item.orderCount} {item.orderCount === 1 ? "unit" : "units"}
                        </span>
                      )}
                      <span className="font-bold text-[#33272C]">
                        {formatMMK(item.revenue)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCEEF2] text-[#B73D67] border border-[#F1D3DF]">
                        {item.percentage ?? 0}%
                      </span>
                    </div>
                  </div>

                  {/* Relative Performance Rail */}
                  <div className="w-full h-1.5 bg-[#F0E1E6]/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${barRatio}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-auto pt-3 border-t border-[#F5EBF0] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#806B73] tracking-wider block">
              Top Category
            </span>
            <span className="font-bold text-[#33272C] truncate block mt-0.5">
              {topCategory ? `${topCategory.name} (${topCategory.percentage}%)` : "None"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#806B73] tracking-wider block">
              Catalog Coverage
            </span>
            <span className="font-bold text-[#33272C] block mt-0.5">
              {salesData.length > 0
                ? `${Math.round((activeCategoriesCount / salesData.length) * 100)}% active`
                : "0%"}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-[#806B73] tracking-wider block">
              Tracked Revenue
            </span>
            <span className="font-bold text-[#B73D67] block mt-0.5">
              {formatMMK(totalSalesFromCategories || totalRevenue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
