'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function AdminBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      aria-label="Breadcrumb"
      dir="rtl"
      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-4 flex-wrap"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronLeft size={12} className="text-slate-400 shrink-0" />}
            {isLast || !item.href ? (
              <span className={isLast ? 'text-slate-900 font-black' : ''}>{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-slate-900 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </motion.nav>
  );
}
