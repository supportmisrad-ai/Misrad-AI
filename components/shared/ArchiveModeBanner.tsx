'use client';

import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ArchiveModeBannerProps {
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

export function ArchiveModeBanner({ message, action }: ArchiveModeBannerProps) {
  return (
    <div className="bg-red-600 text-white py-3 px-4 shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
          <p className="text-sm font-bold leading-tight">
            {message}
          </p>
        </div>
        
        {action && (
          <Link href={action.href}>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white text-red-600 hover:bg-red-50 font-black border-none shadow-sm h-9 px-5 rounded-full"
            >
              {action.label}
              <ArrowRight className="mr-2 w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
