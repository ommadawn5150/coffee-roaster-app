import React from 'react';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';

interface Props {
  isRoasting: boolean;
  onStart: () => void;
  onStop: () => void;
}

const Controls: React.FC<Props> = ({ isRoasting, onStart, onStop }) => {
  const baseClasses = "flex items-center justify-center gap-2 w-36 text-sm font-semibold py-2 px-4 rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 transform active:scale-95";

  return (
    <>
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
    </>
  );
};

export default Controls;