import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Step { label: string; description?: string }
interface StepIndicatorProps { steps: Step[]; currentStep: number }

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => (
  <div className="flex items-start">
    {steps.map((step, i) => {
      const done   = i < currentStep;
      const active = i === currentStep;

      return (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex w-full items-center">
            {/* Left connector */}
            {i > 0 && (
              <div
                className="h-0.5 flex-1 transition-colors duration-300"
                style={{ background: i <= currentStep ? '#5346A8' : '#E5E7EB' }}
              />
            )}

            {/* Dot */}
            <div
              className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={
                done
                  ? { background: '#5346A8', color: '#fff' }
                  : active
                  ? { background: '#fff', color: '#5346A8', border: '2px solid #5346A8', boxShadow: '0 0 0 4px rgba(83,70,168,0.15)' }
                  : { background: '#fff', color: '#9CA3AF', border: '2px solid #E5E7EB' }
              }
            >
              {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
            </div>

            {/* Right connector */}
            {i < steps.length - 1 && (
              <div
                className="h-0.5 flex-1 transition-colors duration-300"
                style={{ background: done ? '#5346A8' : '#E5E7EB' }}
              />
            )}
          </div>

          {/* Label */}
          <span
            className={cn(
              'mt-2 text-[10px] font-bold tracking-wide text-center transition-colors duration-200',
              active ? '' : done ? 'text-gray-600' : 'text-gray-400',
            )}
            style={active ? { color: '#5346A8' } : undefined}
          >
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
);
