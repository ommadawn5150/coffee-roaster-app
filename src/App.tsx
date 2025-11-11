import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import RoastChart from './components/RoastChart';
import Toolbar from './components/Toolbar';
import HistoryPanel from './components/HistoryPanel';
import type { RoastData, RoastSession, RoastComparisonSeries } from './types';
import { downloadCSV, downloadHTML } from './utils/export';
import { io } from 'socket.io-client';
import { toPng } from 'html-to-image';

// Socket.IOクライアントのインスタンス化
const socketUrl = import.meta.env.VITE_SOCKET_URL
  ?? `${window.location.protocol}//${window.location.hostname}:3001`;
const socket = io(socketUrl);
const colorPalette = ['#6366f1', '#f97316', '#14b8a6', '#f43f5e', '#a855f7', '#22d3ee'];
const HISTORY_PANEL_DEFAULT_HEIGHT = 240;
const HISTORY_PANEL_MIN_HEIGHT = 160;
const HISTORY_PANEL_MAX_HEIGHT = 480;
const clampHistoryPanelHeight = (value: number) =>
  Math.min(HISTORY_PANEL_MAX_HEIGHT, Math.max(HISTORY_PANEL_MIN_HEIGHT, value));

function App() {
  // --- State定義 ---

  // リアルタイムデータ
  const [currentTemp, setCurrentTemp] = useState<number>(0);
  const [currentRor, setCurrentRor] = useState<number>(0);
  const currentTempRef = useRef<number>(0);
  
  // 焙煎時間関連
  const [elapsedRoastTime, setElapsedRoastTime] = useState<number>(0);

  // 焙煎ロジック関連
  const [isRoasting, setIsRoasting] = useState<boolean>(false);
  const [rawHistory, setRawHistory] = useState<RoastData[]>([]);
  const [savedSessions, setSavedSessions] = useState<RoastSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isHistoryEditing, setIsHistoryEditing] = useState<boolean>(false);
  const [sessionsMarkedForDeletion, setSessionsMarkedForDeletion] = useState<string[]>([]);
  const [beanName, setBeanName] = useState<string>('');
  const [beanWeight, setBeanWeight] = useState<string>('');
  const [downloadPreviewSessionId, setDownloadPreviewSessionId] = useState<string | null>(null);
  const [historyPanelHeight, setHistoryPanelHeight] = useState<number>(HISTORY_PANEL_DEFAULT_HEIGHT);
  const downloadSelectionRef = useRef<{ value: string | null; hasValue: boolean }>({
    value: null,
    hasValue: false,
  });
  const smoothingWindow = 5;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const roastStartTime = useRef<number | null>(null);

  const smoothData = useCallback((dataset: RoastData[]): RoastData[] => {
    if (dataset.length === 0) return [];
    const halfWindow = Math.floor(smoothingWindow / 2);
    return dataset.map((entry, index, array) => {
      const start = Math.max(0, index - halfWindow);
      const end = Math.min(array.length - 1, index + halfWindow);
      const slice = array.slice(start, end + 1);
      const avgTemp = slice.reduce((sum, item) => sum + item.temp, 0) / slice.length;
      const avgRor = slice.reduce((sum, item) => sum + item.ror, 0) / slice.length;
      return { ...entry, temp: avgTemp, ror: avgRor };
    });
  }, [smoothingWindow]);

  const smoothedHistory = useMemo<RoastData[]>(() => smoothData(rawHistory), [rawHistory, smoothData]);

  const persistSessions = useCallback(
    async (sessionsToPersist: RoastSession[]) => {
      try {
        await fetch(`${socketUrl}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: sessionsToPersist }),
        });
      } catch (err) {
        console.error('Failed to persist sessions:', err);
      }
    },
    [socketUrl],
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadSessions = async () => {
      try {
        const response = await fetch(`${socketUrl}/sessions`, { signal: controller.signal });
        if (!response.ok) {
          console.error('Failed to fetch sessions:', response.statusText);
          return;
        }
        const payload = await response.json();
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.sessions)
            ? payload.sessions
            : [];
        setSavedSessions(list);
        if (list.length > 0) {
          setSelectedSessionId((prev) => {
            if (prev && list.some((session) => session.id === prev)) {
              return prev;
            }
            return list[0].id;
          });
        } else {
          setSelectedSessionId(null);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load sessions:', err);
        }
      }
    };
    loadSessions();
    return () => controller.abort();
  }, [socketUrl]);

  useEffect(() => {
    setSelectedSessionId((prev) => {
      if (prev && savedSessions.some((session) => session.id === prev)) {
        return prev;
      }
      return savedSessions[0]?.id ?? null;
    });
    setSessionsMarkedForDeletion((prev) =>
      prev.filter((id) => savedSessions.some((session) => session.id === id)),
    );
  }, [savedSessions]);


  // --- useEffectフック ---

  // サーバーとの通信セットアップ
  useEffect(() => {
    const handleTemperature = (temp: number) => {
      currentTempRef.current = temp;
      setCurrentTemp(temp);
    };

    const ensurePortConnection = () => {
      socket.emit('connectPort');
    };

    if (socket.connected) {
      ensurePortConnection();
    }

    socket.on('temperatureUpdate', handleTemperature);
    socket.on('connect', ensurePortConnection);

    return () => {
      socket.off('temperatureUpdate', handleTemperature);
      socket.off('connect', ensurePortConnection);
    };
  }, []);
  

  // 焙煎中のデータ記録とRoR計算を行うEffect
  useEffect(() => {
    if (!isRoasting) {
      return;
    }
    let animationFrameId: number;
    const tick = () => {
      if (roastStartTime.current != null) {
        const elapsed = (Date.now() - roastStartTime.current) / 1000;
        setElapsedRoastTime(elapsed);
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRoasting]);

  useEffect(() => {
    if (!isRoasting) {
      return;
    }
    const interval = setInterval(() => {
      if (roastStartTime.current == null) return;
      const elapsedTime = (Date.now() - roastStartTime.current) / 1000;
      const temp = currentTempRef.current;
      setRawHistory((prev) => {
        const target = [...prev].reverse().find(
          (data) => elapsedTime - data.time <= 30 && elapsedTime - data.time > 29
        );
        const ror = target && target.temp ? (temp - target.temp) * 2 : 0;
        setCurrentRor(ror);
        return [...prev, { time: elapsedTime, temp, ror }];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRoasting]);

  useEffect(() => {
    if (isRoasting && isHistoryEditing) {
      setIsHistoryEditing(false);
      setSessionsMarkedForDeletion([]);
    }
  }, [isRoasting, isHistoryEditing]);

  // --- イベントハンドラ ---

  const handleStartRoasting = () => {
    setRawHistory([]);
    setElapsedRoastTime(0); // ▼▼▼ スタート時にタイマーをリセット ▼▼▼
    roastStartTime.current = Date.now();
    setIsRoasting(true);
    setCurrentRor(0);
  };

  const createSessionId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `roast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleStopRoasting = () => {
    setIsRoasting(false);
    setCurrentRor(0);
    roastStartTime.current = null;

    if (rawHistory.length === 0) {
      setRawHistory([]);
      return;
    }

    const sessionData = rawHistory.map((entry) => ({ ...entry }));
    const totalTime = sessionData[sessionData.length - 1]?.time ?? 0;
    const now = new Date();
    const beanLabel = beanName.trim() || 'Roast';
    const timeLabel = now.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parsedWeight = Number(beanWeight);
    const normalizedBeanWeight = Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined;

    const session: RoastSession = {
      id: createSessionId(),
      name: `${beanLabel} ${timeLabel}`,
      beanName: beanLabel,
      beanWeight: normalizedBeanWeight,
      createdAt: now.toISOString(),
      totalTime,
      data: sessionData,
    };

    const updatedSessions = [session, ...savedSessions.filter((existing) => existing.id !== session.id)];
    setSavedSessions(updatedSessions);
    void persistSessions(updatedSessions);
    setSelectedSessionId(session.id);
    setIsHistoryEditing(false);
    setSessionsMarkedForDeletion([]);
    setBeanName('');
    setBeanWeight('');

    setRawHistory([]);
  };

  const handleSelectSession = (id: string) => {
    if (isHistoryEditing) return;
    setSelectedSessionId((prev) => (prev === id ? prev : id));
  };

  const handleToggleHistoryEditing = () => {
    if (isRoasting) return;
    setIsHistoryEditing((prev) => !prev);
    setSessionsMarkedForDeletion([]);
  };

  const handleToggleSessionDeletion = (id: string) => {
    setSessionsMarkedForDeletion((prev) =>
      prev.includes(id) ? prev.filter((sessionId) => sessionId !== id) : [...prev, id],
    );
  };

  const handleDeleteSelectedSessions = () => {
    if (sessionsMarkedForDeletion.length === 0) return;
    const idsToDelete = sessionsMarkedForDeletion;
    const updatedSessions = savedSessions.filter((session) => !idsToDelete.includes(session.id));
    setSavedSessions(updatedSessions);
    void persistSessions(updatedSessions);
    setSelectedSessionId((prev) => {
      if (prev && !idsToDelete.includes(prev)) {
        return prev;
      }
      return updatedSessions[0]?.id ?? null;
    });
    setSessionsMarkedForDeletion([]);
    setIsHistoryEditing(false);
  };

  const handleClearSessions = () => {
    setSavedSessions([]);
    void persistSessions([]);
    setSelectedSessionId(null);
    setSessionsMarkedForDeletion([]);
    setIsHistoryEditing(false);
  };

  type SessionDetailsDraft = {
    beanName: string;
    beanWeight: string;
    roastedWeight: string;
  };

  const parseWeightInput = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric) || numeric < 0) return undefined;
    return numeric;
  };

  const handleSaveSessionDetails = (id: string, draft: SessionDetailsDraft) => {
    setSavedSessions((prev) => {
      const nextSessions = prev.map((session) => {
        if (session.id !== id) {
          return session;
        }
        const normalizedBeanName = draft.beanName.trim();
        const beanWeightValue = parseWeightInput(draft.beanWeight);
        const roastedWeightValue = parseWeightInput(draft.roastedWeight);
        return {
          ...session,
          beanName: normalizedBeanName.length > 0 ? normalizedBeanName : undefined,
          beanWeight: beanWeightValue,
          roastedWeight: roastedWeightValue,
        };
      });
      void persistSessions(nextSessions);
      return nextSessions;
    });
  };

  const handleHistoryResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = historyPanelHeight;
    const { pointerId } = event;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const delta = startY - moveEvent.clientY;
      setHistoryPanelHeight(clampHistoryPanelHeight(startHeight + delta));
    };

    const stopResizing = (stopEvent: PointerEvent) => {
      if (stopEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);
  };

  const waitForNextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const handleDownloadSession = async (id: string) => {
    const session = savedSessions.find((s) => s.id === id);
    if (!session) return;

    downloadCSV(session.data);

    downloadSelectionRef.current.value = selectedSessionId;
    downloadSelectionRef.current.hasValue = true;
    setDownloadPreviewSessionId(id);
    setSelectedSessionId(id);
    await waitForNextFrame();
    await waitForNextFrame();

    let chartImage = '';
    if (chartContainerRef.current) {
      try {
        chartImage = await toPng(chartContainerRef.current, {
          cacheBust: true,
          backgroundColor: '#ffffff',
        });
      } catch (err) {
        console.error('Failed to capture chart:', err);
      }
    }

    downloadHTML(chartImage, session.data);
    setDownloadPreviewSessionId(null);
    if (downloadSelectionRef.current.hasValue) {
      setSelectedSessionId(downloadSelectionRef.current.value);
      downloadSelectionRef.current.value = null;
      downloadSelectionRef.current.hasValue = false;
    }
  };
  
  // --- データ整形 ---

  const chartData = useMemo<RoastData[]>(() => {
    return smoothedHistory.filter((d) => d.time >= 0 && d.time <= 1500);
  }, [smoothedHistory]);

  const selectedHistorySeries = useMemo<RoastComparisonSeries | null>(() => {
    if (!selectedSessionId) return null;
    const session = savedSessions.find((s) => s.id === selectedSessionId);
    if (!session) return null;
    const aligned = smoothData(session.data).filter((d) => d.time >= 0 && d.time <= 1500);
    return {
      id: session.id,
      name: session.name,
      color: colorPalette[0],
      data: aligned,
    };
  }, [selectedSessionId, savedSessions, smoothData]);

  const historyChartData = useMemo<RoastData[] | null>(() => {
    if (downloadPreviewSessionId || !selectedHistorySeries) return null;
    return selectedHistorySeries.data;
  }, [downloadPreviewSessionId, selectedHistorySeries]);

  const previewData = useMemo<RoastData[] | null>(() => {
    if (!downloadPreviewSessionId) return null;
    const session = savedSessions.find((s) => s.id === downloadPreviewSessionId);
    if (!session) return null;
    return smoothData(session.data).filter((d) => d.time >= 0 && d.time <= 1500);
  }, [downloadPreviewSessionId, savedSessions, smoothData]);

  const historyChartLabel = selectedHistorySeries?.name ?? '';
  const beanNameSuggestions = useMemo(() => {
    const names = savedSessions
      .map((session) => session.beanName?.trim())
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [savedSessions]);

  // --- レンダリング ---

  return (
    <div className="bg-slate-200 min-h-screen p-2 sm:p-4 flex flex-col">
      <div className="w-full max-w-none mx-auto bg-slate-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden flex-1 min-h-0">
        <Toolbar
          currentTemp={currentTemp}
          currentRor={currentRor}
          elapsedRoastTime={elapsedRoastTime} 
          isRoasting={isRoasting}
          onStart={handleStartRoasting}
          onStop={handleStopRoasting}
          beanName={beanName}
          beanWeight={beanWeight}
          beanNameSuggestions={beanNameSuggestions}
          onBeanNameChange={setBeanName}
          onBeanWeightChange={setBeanWeight}
        />
        <main className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div
                ref={chartContainerRef}
                className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-2"
              >
                <div className="flex h-[50vh] flex-col">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>Roast Chart</span>
                  </div>
                  <div className="mt-2 flex-1">
                    <RoastChart
                      data={downloadPreviewSessionId && previewData ? previewData : chartData}
                      comparisonSessions={[]}
                    />
                  </div>
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-2">
                <div className="flex h-[50vh] flex-col">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>History Chart</span>
                    {historyChartLabel && (
                      <span className="text-slate-600 normal-case">{historyChartLabel}</span>
                    )}
                  </div>
                  <div className="mt-2 flex-1">
                    <RoastChart
                      data={historyChartData ?? []}
                      comparisonSessions={[]}
                      emptyStateMessage="Roast Historyからセッションを選択すると表示されます。"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-none select-none px-6">
              <div
                role="separator"
                aria-orientation="horizontal"
                aria-label="Roast history resize handle"
                onPointerDown={handleHistoryResizeStart}
                className="flex cursor-row-resize items-center justify-center py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              >
                <span className="inline-flex h-1.5 w-16 rounded-full bg-slate-300" />
              </div>
            </div>
          </div>
          <div className="flex-none" style={{ height: historyPanelHeight }}>
            <HistoryPanel
              sessions={savedSessions}
              selectedId={selectedSessionId}
              height={historyPanelHeight}
              deleteSelection={sessionsMarkedForDeletion}
              isEditing={isHistoryEditing}
              isRoasting={isRoasting}
              onSelect={handleSelectSession}
              onToggleEditing={handleToggleHistoryEditing}
              onToggleDeleteSelection={handleToggleSessionDeletion}
              onDeleteSelected={handleDeleteSelectedSessions}
              onClear={handleClearSessions}
              onDownload={handleDownloadSession}
              onSaveSessionDetails={handleSaveSessionDetails}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
