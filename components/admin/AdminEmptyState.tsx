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
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center mb-5">
        <Icon size={32} className="text-slate-400" />
      </div>

      <h3 className="text-lg font-black text-slate-900 text-center">{title}</h3>

      {description ? (
        <p className="text-sm font-bold text-slate-500 text-center mt-2 max-w-md">{description}</p>
      ) : null}

      <div className="flex items-center gap-3 mt-6">
        {actionLabel && actionHref ? (
          <a href={actionHref}>
            <Button>{actionLabel}</Button>
          </a>
        ) : actionLabel && onAction ? (
          <Button onClick={onAction}>{actionLabel}</Button>
        ) : null}

        {secondaryLabel && onSecondaryAction ? (
          <Button variant="outline" onClick={onSecondaryAction}>{secondaryLabel}</Button>
        ) : null}
      </div>
    </motion.div>
  );
}
