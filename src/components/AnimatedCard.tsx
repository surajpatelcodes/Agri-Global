import React, { memo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fade-in' | 'slide-up' | 'scale-in' | 'slide-left' | 'slide-right';
}

const AnimatedCard = memo(({ 
  children, 
  className, 
  delay = 0,
  animation = 'fade-in'
}: AnimatedCardProps) => {
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true,
  });

  const animationClasses = {
    'fade-in': 'opacity-0 translate-y-4',
    'slide-up': 'opacity-0 translate-y-8',
    'scale-in': 'opacity-0 scale-95',
    'slide-left': 'opacity-0 translate-x-8',
    'slide-right': 'opacity-0 -translate-x-8',
  };

  const visibleClasses = {
    'fade-in': 'opacity-100 translate-y-0',
    'slide-up': 'opacity-100 translate-y-0',
    'scale-in': 'opacity-100 scale-100',
    'slide-left': 'opacity-100 translate-x-0',
    'slide-right': 'opacity-100 translate-x-0',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        animationClasses[animation],
        isVisible && visibleClasses[animation],
        className
      )}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

export default AnimatedCard;
