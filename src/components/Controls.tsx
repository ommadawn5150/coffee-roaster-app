import React from 'react';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';

interface Props {
  isRoasting: boolean;
  onStart: () => void;
  onStop: () => void;
  beanName: string;
  beanNameSuggestions: string[];
  onBeanNameChange: (name: string) => void;
  beanWeight: string;
  onBeanWeightChange: (weight: string) => void;
}

const Controls: React.FC<Props> = ({
  isRoasting,
  onStart,
  onStop,
  beanName,
  beanNameSuggestions,
  onBeanNameChange,
  beanWeight,
  onBeanWeightChange,
}) => {
  const baseClasses = "flex items-center justify-center gap-2 w-full sm:w-36 text-sm font-semibold py-2 px-4 rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transform active:scale-95";

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Bean Name
          <input
            type="text"
            value={beanName}
            onChange={(event) => onBeanNameChange(event.target.value)}
            placeholder="例: Ethiopia Guji"
            list="bean-name-suggestions"
            className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm font-normal text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          {beanNameSuggestions.length > 0 && (
            <datalist id="bean-name-suggestions">
              {beanNameSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Bean Weight (g)
          <input
            type="number"
            min="0"
            step="10"
            inputMode="decimal"
            value={beanWeight}
            onChange={(event) => onBeanWeightChange(event.target.value)}
            placeholder="例: 250"
            className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm font-normal text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </label>
        <div className="flex w-full flex-1 sm:w-auto sm:flex-none">
          {!isRoasting ? (
            <button
              onClick={onStart}
              className={`${baseClasses} bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:ring-blue-600`}
            >
              <PlayIcon className="w-4 h-4" />
              Start Roast
            </button>
          ) : (
            <button
              onClick={onStop}
              className={`${baseClasses} bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-600`}
            >
              <StopIcon className="w-4 h-4" />
              Stop Roast
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
