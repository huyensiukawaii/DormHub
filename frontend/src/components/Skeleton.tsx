import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />
  );
}

// Card với nhiều dòng text bên trong
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-5', className)}>
      <Skeleton className="h-10 w-10 rounded-lg mb-3" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-7 w-28 mb-1.5" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Dòng trong list/table
export function SkeletonRow({ cols = 3 }: { cols?: number }) {
  const widths = ['w-1/3', 'w-1/4', 'w-1/5', 'w-1/6'];
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 last:border-0">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', widths[i % widths.length])} />
      ))}
    </div>
  );
}

// Skeleton cho student dashboard
export function StudentDashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <Skeleton className="h-5 w-36" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} cols={2} />
        ))}
      </div>
    </div>
  );
}
