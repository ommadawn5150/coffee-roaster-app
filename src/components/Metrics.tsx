import React from 'react';

// ▼▼▼ Propsの型定義にelapsedRoastTimeを追加 ▼▼▼
interface Props {
  temp: number;
  ror: number;
  elapsedRoastTime: number; // 追加
}

const Metrics: React.FC<Props> = ({ temp, ror, elapsedRoastTime }) => {
  
  // 秒数を MM:SS 形式にフォーマットするヘルパー関数
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="grid w-full gap-3 sm:grid-cols-3 sm:gap-4">
      {/* 経過時間（タイマー） */}
      <div className="text-center">
        <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">ROAST TIME</p>
        <p className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight mt-1 font-mono tabular-nums min-w-[5ch]">
          {formatTime(elapsedRoastTime)}
        </p>
      </div>

      {/* 現在温度 */}
      <div className="text-center">
        <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">CURRENT TEMP</p>
        <p className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight mt-1 font-mono tabular-nums min-w-[6ch]">
          {temp.toFixed(1)}
          <span className="ml-1 text-xs sm:text-sm font-medium text-slate-500">°C</span>
        </p>
      </div>
      
      {/* RoR */}
      <div className="text-center">
        <p className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wide">RoR</p>
        <p className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight mt-1 font-mono tabular-nums min-w-[6ch]">
          {ror.toFixed(1)}
          <span className="ml-1 text-xs sm:text-sm font-medium text-slate-500">°C/min</span>
        </p>
      </div>
    </div>
  );
};

export default Metrics;
