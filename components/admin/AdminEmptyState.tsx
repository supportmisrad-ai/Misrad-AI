'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Inbox, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AdminEmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
};

export default function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  onSecondaryAction,
}: AdminEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-6"
      dir="rtl"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 text-slate-400">
        <Icon size={28} />
      </div>

      <h3 className="text-base font-black text-slate-900 text-center tracking-tight">{title}</h3>

      {description ? (
        <p className="text-sm font-medium text-slate-500 text-center mt-1 max-w-sm">{description}</p>
      ) : null}

      <div className="flex items-center gap-3 mt-6">
        {actionLabel && actionHref ? (
          <a href={actionHref}>
            <Button className="font-bold">{actionLabel}</Button>
          </a>
        ) : actionLabel && onAction ? (
          <Button onClick={onAction} className="font-bold">{actionLabel}</Button>
        ) : null}

        {secondaryLabel && onSecondaryAction ? (
          <Button variant="outline" onClick={onSecondaryAction} className="font-bold">{secondaryLabel}</Button>
        ) : null}
      </div>
    </motion.div>
  );
}
