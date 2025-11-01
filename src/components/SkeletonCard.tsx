import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function SkeletonCard({ variant = 'default', className }: SkeletonCardProps) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {variant === 'detailed' && (
          <>
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </>
        )}
        {variant !== 'compact' && (
          <div className="flex items-center justify-between pt-4">
            <div className="h-3 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-20" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SkeletonGrid({ count = 6, variant = 'default' }: { count?: number; variant?: 'default' | 'compact' | 'detailed' }) {
  return (
    <div className="responsive-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
