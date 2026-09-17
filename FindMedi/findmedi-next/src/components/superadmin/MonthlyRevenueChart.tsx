'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyTrendItem {
  month?: string;
  _id?: string;
  earnings?: number;
  revenue?: number;
}

interface MonthlyRevenueChartProps {
  monthlyTrend?: MonthlyTrendItem[];
}

export default function MonthlyRevenueChart({ monthlyTrend }: MonthlyRevenueChartProps) {
  const maxVal = Math.max(...(monthlyTrend?.map((x) => x.earnings || x.revenue || 0) || [1]), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Monthly Revenue Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {monthlyTrend && monthlyTrend.length > 0 ? (
          <div className="space-y-3 pt-2">
            {monthlyTrend.slice(0, 5).map((m, i) => {
              const val = m.earnings || m.revenue || 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12">{m.month || m._id}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(val / maxVal) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-20 text-right">
                    ₹{val.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-44 text-sm text-muted-foreground">
            <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
            <p>No recent monthly revenue data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
