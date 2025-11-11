import React, { useState } from 'react';
import Metrics from './Metrics';
import Controls from './Controls';

// Toolbarが受け取るProps（プロパティ）の型定義
interface Props {
  // 計測値
  currentTemp: number;
  currentRor: number;
  
  // 焙煎状態
  isRoasting: boolean;
  onStart: () => void;
  onStop: () => void;
  elapsedRoastTime: number; // 追加
  beanName: string;
  beanWeight: string;
  beanNameSuggestions: string[];
  onBeanNameChange: (name: string) => void;
  onBeanWeightChange: (weight: string) => void;
}

const Toolbar: React.FC<Props> = (props) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'controls'>('metrics');

  const renderMetricsCard = (
    <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-3 sm:p-4">
      <Metrics
        temp={props.currentTemp}
        ror={props.currentRor}
        elapsedRoastTime={props.elapsedRoastTime}
      />
    </div>
  );

  const renderControlsCard = (
    <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-4">
      <Controls
        isRoasting={props.isRoasting}
        onStart={props.onStart}
        onStop={props.onStop}
        beanName={props.beanName}
        beanNameSuggestions={props.beanNameSuggestions}
        onBeanNameChange={props.onBeanNameChange}
        beanWeight={props.beanWeight}
        onBeanWeightChange={props.onBeanWeightChange}
      />
    </div>
  );

  return (
    <header className="w-full bg-slate-100/80 backdrop-blur-lg border-b border-slate-900/10 shrink-0">
      <div className="w-full mx-auto px-4 sm:px-6 py-3 space-y-4">
        {/* モバイル: タブ切り替え */}
        <div className="sm:hidden">
          <div className="flex rounded-full border border-slate-200 bg-white/70 p-1">
            {[
              { id: 'metrics', label: 'Status' },
              { id: 'controls', label: 'Actions' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'metrics' | 'controls')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded-full transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {activeTab === 'metrics' ? renderMetricsCard : renderControlsCard}
          </div>
        </div>

        {/* デスクトップ: 横並び表示 */}
        <div className="hidden sm:flex sm:items-stretch gap-4">
          <div className="flex-[1.1]">
            {renderMetricsCard}
          </div>
          <div className="flex-[0.9] min-w-[320px]">
            {renderControlsCard}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
