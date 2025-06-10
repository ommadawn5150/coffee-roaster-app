import React from 'react';
import Metrics from './Metrics';
import Controls from './Controls';
import PortSelector from './PortSelector'; // ポート選択UIコンポーネントをインポート

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
  // ポート選択関連
  ports: any[];
  portStatus: any;
  selectedPort: string;
  onPortSelect: (path: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Toolbar: React.FC<Props> = (props) => {
  return (
    <header className="w-full bg-slate-100/80 backdrop-blur-lg border-b border-slate-900/10 shrink-0">
      <div className="w-full mx-auto px-6 py-3">
        <div className="flex justify-between items-center">

          {/* 左側セクション：ウィンドウ操作ボタン & ポートセレクター */}
          <div className="flex items-center gap-4">
            {/* ウィンドウ操作ボタン風の装飾 */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            </div>
            {/* ポート選択UI */}
            <PortSelector
              ports={props.ports}
              portStatus={props.portStatus}
              selectedPort={props.selectedPort}
              onPortSelect={props.onPortSelect}
              onConnect={props.onConnect}
              onDisconnect={props.onDisconnect}
            />
          </div>

          {/* 中央セクション：計測値表示 */}
          <div className="flex-1 flex justify-center">
            <Metrics    temp={props.currentTemp} 
                        ror={props.currentRor}
                        elapsedRoastTime={props.elapsedRoastTime} 
             />
          </div>

          {/* 右側セクション：焙煎コントロールボタン */}
          <div className="w-48 flex justify-end">
            <Controls
              isRoasting={props.isRoasting}
              onStart={props.onStart}
              onStop={props.onStop}
            />
          </div>
          
        </div>
      </div>
    </header>
  );
};

export default Toolbar;