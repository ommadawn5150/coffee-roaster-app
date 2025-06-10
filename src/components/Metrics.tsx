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
    // ▼▼▼ gapを調整して3つの要素を均等に配置 ▼▼▼
    <div className="flex items-center gap-12">
      {/* 経過時間（タイマー） */}
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">Roast Time</p>
        <p className="text-2xl font-semibold text-slate-800 tracking-tight mt-1">
          {formatTime(elapsedRoastTime)}
        </p>
      </div>

      {/* 温度 */}
      <div className="flex items-baseline gap-2 text-center">
        <p className="text-2xl font-semibold text-slate-800 tracking-tight">
          {temp.toFixed(1)}
        </p>
        <p className="text-sm font-medium text-slate-500">°C</p>
      </div>
      
      {/* RoR */}
      <div className="flex items-baseline gap-2 text-center">
         <p className="text-2xl font-semibold text-slate-800 tracking-tight">
          {ror.toFixed(1)}
        </p>
        <p className="text-sm font-medium text-slate-500">RoR</p>
      </div>
    </div>
  );
};

export default Metrics;