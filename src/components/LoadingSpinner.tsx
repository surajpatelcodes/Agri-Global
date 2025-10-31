import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({ 
  className, 
  text = "Loading...", 
  size = "md" 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
};

export const LoadingSkeleton = ({ 
  rows = 5, 
  className 
}: { 
  rows?: number; 
  className?: string;
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3 bg-card p-6 rounded-lg border">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>
      ))}
    </div>
  );
};
