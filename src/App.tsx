import React, { useState, useEffect, useRef } from 'react';
import RoastChart from './components/RoastChart';
import Toolbar from './components/Toolbar';
import type { RoastData } from './types';
import { downloadCSV, downloadHTML } from './utils/export';
import { io } from 'socket.io-client';
import type { EChartsInstance } from 'echarts-for-react';

// Socket.IOクライアントのインスタンス化
const socket = io('http://localhost:3001');

function App() {
  // --- State定義 ---

  // リアルタイムデータ
  const [currentTemp, setCurrentTemp] = useState<number>(0);
  const [currentRor, setCurrentRor] = useState<number>(0);
  
  // 焙煎時間関連
  const [elapsedRoastTime, setElapsedRoastTime] = useState<number>(0);

  // 焙煎ロジック関連
  const [isRoasting, setIsRoasting] = useState<boolean>(false);
  const [roastHistory, setRoastHistory] = useState<RoastData[]>([]);
  const [timeOffset, setTimeOffset] = useState<number>(0);

  // ポート選択関連
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [portStatus, setPortStatus] = useState({ status: 'disconnected' });

  // --- Ref定義 ---
  const roastStartTime = useRef<number | null>(null);
  const chartRef = useRef<EChartsInstance>(null);

  // --- useEffectフック ---

  // サーバーからのイベントを監視するEffect
  useEffect(() => {
    // 起動時に利用可能なポートのリストをサーバーに要求
    socket.emit('getPorts');

    // サーバーから送られてきたポートリストをstateに保存
    socket.on('portsList', (ports) => {
      setAvailablePorts(ports);
    });

    // サーバーからの接続状態の更新を監視
    socket.on('portStatus', (status) => {
      setPortStatus(status);
    });
    
    // サーバーからの温度データの更新を監視
    socket.on('temperatureUpdate', (temp: number) => {
      setCurrentTemp(temp);
    });

    // コンポーネントのクリーンアップ時にリスナーを解除
    return () => {
      socket.off('portsList');
      socket.off('portStatus');
      socket.off('temperatureUpdate');
    };
  }, []);
  

  // 焙煎中のデータ記録とRoR計算を行うEffect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRoasting) {
      interval = setInterval(() => {
        const elapsedTime = (Date.now() - (roastStartTime.current ?? 0)) / 1000;
        setElapsedRoastTime(elapsedTime);
        const thirtySecondsAgo = roastHistory.find(
          (data) => elapsedTime - data.time <= 30 && elapsedTime - data.time > 29
        );
        const ror = thirtySecondsAgo && thirtySecondsAgo.temp
          ? (currentTemp - thirtySecondsAgo.temp) * 2
          : 0;
        
        setCurrentRor(ror);
        setRoastHistory((prev) => [
          ...prev,
          { time: elapsedTime, temp: currentTemp, ror: ror },
        ]);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRoasting, currentTemp, roastHistory]);

  // --- イベントハンドラ ---

  const handleStartRoasting = () => {
    setRoastHistory([]);
    setTimeOffset(0);
    setElapsedRoastTime(0); // ▼▼▼ スタート時にタイマーをリセット ▼▼▼
    roastStartTime.current = Date.now();
    setIsRoasting(true);
  };

  const handleStopRoasting = () => {
    setIsRoasting(false);

    if (roastHistory.length > 0) {
      downloadCSV(roastHistory);

      const chartInstance = chartRef.current?.getEchartsInstance();
      const chartImage = chartInstance?.getDataURL({
        type: 'png', pixelRatio: 2, backgroundColor: '#fff'
      });
      
      if (chartImage) {
        downloadHTML(chartImage, roastHistory);
      }
      
      setRoastHistory([]);
    }
  };
  
  const handleTimeOffsetChange = (newOffset: number) => {
    setTimeOffset(newOffset);
  };
  
  const handlePortSelect = (path: string) => {
    setSelectedPort(path);
  };

  const handleConnect = () => {
    if (selectedPort) {
      socket.emit('connectPort', selectedPort);
    }
  };

  const handleDisconnect = () => {
    socket.emit('disconnectPort');
  };
  
  // --- データ整形 ---

  const getChartData = (): RoastData[] => {
    return roastHistory.map(d => ({
      ...d,
      time: d.time - timeOffset,
    }));
  };

  // --- レンダリング ---

  return (
    <div className="bg-slate-200 min-h-screen p-4 flex justify-center items-center">
      <div className="w-full max-w-6xl h-[90vh] bg-slate-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <Toolbar
          currentTemp={currentTemp}
          currentRor={currentRor}
          elapsedRoastTime={elapsedRoastTime} 
          isRoasting={isRoasting}
          onStart={handleStartRoasting}
          onStop={handleStopRoasting}
          ports={availablePorts}
          portStatus={portStatus}
          selectedPort={selectedPort}
          onPortSelect={handlePortSelect}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <main className="flex-1 p-4 min-h-0">
          <RoastChart
            ref={chartRef}
            data={getChartData()}
            onTimeOffsetChange={handleTimeOffsetChange}
            timeOffset={timeOffset}
          />
        </main>
      </div>
    </div>
  );
}

export default App;