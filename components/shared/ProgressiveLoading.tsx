'use client';

import React, { Suspense, use } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * ProgressiveLoading - Streaming Server Components with Suspense boundaries
 * 
 * This component enables progressive rendering of content as data arrives,
 * rather than waiting for all data to load before showing anything.
 * 
 * Usage:
 * <ProgressiveLoading>
 *   <AsyncComponentThatFetchesData />
 * </ProgressiveLoading>
 * 
 * Or with explicit sections:
 * <ProgressiveLoading
 *   sections={[
 *     { id: 'header', component: HeaderSection, priority: 'high' },
 *     { id: 'content', component: ContentSection, priority: 'medium' },
 *     { id: 'sidebar', component: SidebarSection, priority: 'low' },
 *   ]}
 * />
 */

interface SectionConfig {
  id: string;
  component: React.ComponentType<any>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

interface ProgressiveLoadingProps {
  children?: React.ReactNode;
  sections?: SectionConfig[];
  globalFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  staggerDelay?: number;
}

// Priority-based stagger delays
const PRIORITY_DELAYS: Record<string, number> = {
  critical: 0,
  high: 50,
  medium: 150,
  low: 300,
};

function DefaultErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200" role="alert">
      <h3 className="text-sm font-bold text-rose-900 mb-1">שגיאה בטעינת נתונים</h3>
      <p className="text-xs text-rose-700 mb-3">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-3 py-1.5 text-xs font-medium bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg transition-colors"
      >
        נסה שוב
      </button>
    </div>
  );
}

function SectionWrapper({
  section,
  staggerDelay,
}: {
  section: SectionConfig;
  staggerDelay: number;
}) {
  const delay = PRIORITY_DELAYS[section.priority] + staggerDelay;
  const Component = section.component;

  return (
    <ErrorBoundary
      fallback={
        section.fallback || (
          <div className="p-4 text-sm text-slate-500">שגיאה בטעינת {section.id}</div>
        )
      }
    >
      <Suspense fallback={section.fallback || <SectionSkeleton priority={section.priority} />}>
        <DelayedSection delay={delay}>
          <Component {...(section.props || {})} />
        </DelayedSection>
      </Suspense>
    </ErrorBoundary>
  );
}

function DelayedSection({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  // Use useTransition for non-blocking rendering
  const [isPending, startTransition] = React.useTransition();
  const [show, setShow] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        startTransition(() => {
          setShow(true);
        });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!show) {
    return <SectionSkeleton priority="medium" />;
  }

  return <>{children}</>;
}

function SectionSkeleton({ priority }: { priority: string }) {
  const opacity = priority === 'critical' ? 'opacity-100' : 
                  priority === 'high' ? 'opacity-90' : 
                  priority === 'medium' ? 'opacity-75' : 'opacity-50';
  
  return (
    <div className={`animate-pulse ${opacity}`}>
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-20 bg-slate-100 rounded" />
    </div>
  );
}

export function ProgressiveLoading({
  children,
  sections,
  globalFallback,
  errorFallback,
  staggerDelay = 0,
}: ProgressiveLoadingProps) {
  if (sections) {
    // Sort by priority
    const sortedSections = [...sections].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return (
      <ErrorBoundary fallback={errorFallback || <DefaultErrorFallback error={new Error('Unknown error')} resetErrorBoundary={() => {}} />}>
        <div className="space-y-4">
          {sortedSections.map((section, index) => (
            <SectionWrapper
              key={section.id}
              section={section}
              staggerDelay={staggerDelay + index * 50}
            />
          ))}
        </div>
      </ErrorBoundary>
    );
  }

  // Simple wrapper mode
  return (
    <ErrorBoundary fallback={errorFallback || <DefaultErrorFallback error={new Error('Unknown error')} resetErrorBoundary={() => {}} />}>
      <Suspense fallback={globalFallback || <SectionSkeleton priority="high" />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * AsyncDataWrapper - Wraps async data fetching with Suspense
 * 
 * This component accepts a promise and renders children when resolved,
 * showing a skeleton while loading.
 */
interface AsyncDataWrapperProps<T> {
  promise: Promise<T>;
  children: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function AsyncDataWrapper<T>({
  promise,
  children,
  fallback,
  errorFallback,
}: AsyncDataWrapperProps<T>) {
  return (
    <ErrorBoundary fallback={errorFallback || <DefaultErrorFallback error={new Error('Failed to load')} resetErrorBoundary={() => {}} />}>
      <Suspense fallback={fallback || <SectionSkeleton priority="high" />}>
        <AsyncDataRenderer promise={promise} children={children} />
      </Suspense>
    </ErrorBoundary>
  );
}

function AsyncDataRenderer<T>({
  promise,
  children,
}: {
  promise: Promise<T>;
  children: (data: T) => React.ReactNode;
}) {
  const data = use(promise);
  return <>{children(data)}</>;
}

/**
 * StreamingSection - A section that streams in progressively
 */
interface StreamingSectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  delay?: number;
}

export function StreamingSection({
  children,
  fallback,
  priority = 'medium',
  delay = 0,
}: StreamingSectionProps) {
  return (
    <ErrorBoundary fallback={<DefaultErrorFallback error={new Error('Section error')} resetErrorBoundary={() => {}} />}>
      <Suspense fallback={fallback || <SectionSkeleton priority={priority} />}>
        <DelayedSection delay={delay}>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </DelayedSection>
      </Suspense>
    </ErrorBoundary>
  );
}
