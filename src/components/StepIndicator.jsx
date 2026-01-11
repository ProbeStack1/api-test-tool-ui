import React from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between px-8 py-6 border-b border-dark-700/50 bg-dark-800/40">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2 flex-1">
                {/* Step Circle */}
                <div className="relative">
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      isCompleted && "bg-primary text-white border-2 border-primary",
                      isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                      isUpcoming && "bg-dark-700/50 text-gray-500 border-2 border-dark-600"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      stepNumber
                    )}
                  </div>
                </div>
                {/* Step Label */}
                <div className="text-center">
                  <div
                    className={clsx(
                      "text-xs font-semibold",
                      isCurrent && "text-primary",
                      isCompleted && "text-gray-300",
                      isUpcoming && "text-gray-500"
                    )}
                  >
                    {step.label}
                  </div>
                </div>
              </div>
            </div>
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  "h-0.5 flex-1 mx-4 -mt-5 transition-all",
                  isCompleted ? "bg-primary" : "bg-dark-700/50"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

