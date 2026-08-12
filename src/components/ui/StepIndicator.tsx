import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Step { label: string; description?: string }
interface StepIndicatorProps { steps: Step[]; currentStep: number }

/**
 * Les couleurs étaient six hex en dur, dont `#9CA3AF` sur `#E5E7EB` pour les
 * étapes à venir : 1,4:1, illisible. Tout passe par les tokens, et l'étape
 * courante est annoncée aux lecteurs d'écran.
 */
export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => (
  <ol className="flex items-start">
    {steps.map((step, i) => {
      const done   = i < currentStep;
      const active = i === currentStep;

      return (
        <li
          key={i}
          className="flex flex-1 flex-col items-center"
          aria-current={active ? 'step' : undefined}
        >
          <div className="flex w-full items-center">
            {/* Left connector */}
            {i > 0 && (
              <div
                className={cn(
                  'h-0.5 flex-1 transition-colors duration-300',
                  i <= currentStep ? 'bg-qayed-cachet' : 'bg-qayed-ligne',
                )}
              />
            )}

            {/* Dot */}
            <div
              className={cn(
                'h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                done   && 'bg-qayed-cachet text-white',
                active && 'bg-white text-qayed-cachet border-2 border-qayed-cachet ring-4 ring-qayed-cachet/15',
                !done && !active && 'bg-white text-qayed-fiche border-2 border-qayed-ligne',
              )}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> : i + 1}
            </div>

            {/* Right connector */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 transition-colors duration-300',
                  done ? 'bg-qayed-cachet' : 'bg-qayed-ligne',
                )}
              />
            )}
          </div>

          {/* Label — 12px, plancher de l'échelle typographique (était 10px). */}
          <span
            className={cn(
              'mt-2 text-xs font-semibold tracking-tight text-center transition-colors duration-200',
              active ? 'text-qayed-cachet' : done ? 'text-qayed-gris-600' : 'text-qayed-fiche',
            )}
          >
            {step.label}
          </span>
        </li>
      );
    })}
  </ol>
);
