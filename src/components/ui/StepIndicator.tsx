import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Step { label: string; description?: string }

interface StepIndicatorProps { steps: Step[]; currentStep: number }

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => (
  <div className="flex items-center gap-0">
    {steps.map((step, i) => {
      const done = i < currentStep;
      const active = i === currentStep;
      return (
        <div key={i} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
              done && 'bg-primary-600 text-white',
              active && 'border-2 border-primary-600 text-primary-600',
              !done && !active && 'border-2 border-gray-200 text-gray-400',
            )}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium', active ? 'text-primary-600' : done ? 'text-gray-700' : 'text-gray-400')}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('mb-5 h-0.5 flex-1 transition-colors', done ? 'bg-primary-600' : 'bg-gray-200')} />
          )}
        </div>
      );
    })}
  </div>
);
