'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export interface MedicineItem {
  _id: string;
  name: string;
  batchNumber?: string;
  batch?: string;
  currentStock?: number;
  stock?: number;
  reorderLevel?: number;
  minLevel?: number;
}

interface LowStockAlertsProps {
  lowStock: MedicineItem[];
}

export default function LowStockAlerts({ lowStock }: LowStockAlertsProps) {
  return (
    <div className="bg-card rounded-2xl border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" /> Low Stock Alerts
        </h3>
        <Link href="/pharmacy/medicines" className="text-xs text-primary hover:underline">
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {lowStock.map((item, i) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/10"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-card-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">Batch: {item.batchNumber || item.batch || '—'}</p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-bold text-destructive">{item.currentStock ?? item.stock ?? 0}</p>
              <p className="text-xs text-muted-foreground">Min: {item.reorderLevel ?? item.minLevel ?? 0}</p>
            </div>
          </motion.div>
        ))}
        {lowStock.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">All items well-stocked</p>
        )}
      </div>
    </div>
  );
}
