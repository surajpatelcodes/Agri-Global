import { forwardRef, InputHTMLAttributes } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  helperText?: string;
  as?: 'input' | 'textarea';
  rows?: number;
}

/**
 * Reusable form field component with validation states
 */
export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  ({ label, error, touched, helperText, as = 'input', className, rows, ...props }, ref) => {
    const hasError = touched && error;
    const Component = as === 'textarea' ? Textarea : Input;

    return (
      <div className="space-y-2">
        <Label 
          htmlFor={props.id || props.name} 
          className={cn(
            "text-sm font-semibold",
            hasError ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        
        <Component
          ref={ref as any}
          className={cn(
            "transition-all duration-200",
            hasError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${props.name}-error` : helperText ? `${props.name}-helper` : undefined
          }
          rows={as === 'textarea' ? rows : undefined}
          {...props}
        />
        
        {hasError && (
          <p id={`${props.name}-error`} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        
        {!hasError && helperText && (
          <p id={`${props.name}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
