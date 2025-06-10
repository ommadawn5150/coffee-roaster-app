import React, { useRef, useEffect, useCallback, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsInstance } from 'echarts-for-react';
import type { RoastData } from '../types';

interface Props {
  data: RoastData[];
  timeOffset: number;
  onTimeOffsetChange: (newOffset: number) => void;
}

const RoastChart = forwardRef<EChartsInstance, Props>((props, ref) => {
  const { data, timeOffset, onTimeOffsetChange } = props;
  const option = {
    graphic: {
      elements: [
        {
          type: 'group',
          x: 0,
          draggable: 'horizontal',
          cursor: 'ew-resize',
          zlevel: 100,
          elements: [
            {
              type: 'rect',
              left: -10,
              top: 0,
              bottom: 0,
              shape: { width: 20 },
              style: { fill: 'rgba(0,0,0,0)' }
            },
            {
              type: 'line',
              top: '15%',
              bottom: '10%',
              shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
              style: { stroke: 'rgba(239, 68, 68, 0.8)', lineWidth: 2 }
            },
            {
              type: 'rect',
              top: '10%',
              left: -12,
              shape: { width: 24, height: 24 },
              style: { fill: 'rgba(239, 68, 68, 1)', shadowBlur: 5, shadowColor: 'rgba(0,0,0,0.3)' },
              textContent: {
                style: { text: '0', fill: '#fff', font: 'bold 12px sans-serif' }
              },
              textConfig: {
                position: 'inside'
              }
            }
          ]
        }
      ]
    },
    // ... その他のoption設定は変更なし ...
    grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true },
    legend: { data: ['Temperature', 'RoR'], textStyle: { color: '#64748b' }, top: '5px' },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#e2e8f0', borderWidth: 1, textStyle: { color: '#334155' } },
    xAxis: { type: 'value', name: 'Time (min)', nameLocation: 'middle', nameGap: 30, min: 0, max: 1200, axisLabel: { formatter: (value: number) => (value / 60).toFixed(0), color: '#64748b' }, axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { show: false } },
    yAxis: [
      { type: 'value', name: 'Temperature (°C)', min: 70, max: 220, position: 'left', axisLabel: { color: '#64748b' }, axisLine: { show: true, lineStyle: { color: '#0ea5e9' } }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
      { type: 'value', name: 'RoR (°C/min)', min: -9, max: 21, position: 'right', axisLabel: { color: '#64748b' }, axisLine: { show: true, lineStyle: { color: '#10b981' } }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Temperature', type: 'line', smooth: true, yAxisIndex: 0, data: data.map(d => [d.time, d.temp]), showSymbol: false, lineStyle: { color: '#0ea5e9', width: 3 } },
      { name: 'RoR', type: 'line', smooth: true, yAxisIndex: 1, data: data.map(d => [d.time, d.ror]), showSymbol: false, lineStyle: { color: '#10b981', width: 3 } },
    ],
  };

  const onChartEvents = {
    'graphicdragged': (params: any) => {
      if (ref && 'current' in ref && ref.current) {
        const chart = ref.current.getEchartsInstance();
        const pixelX = params.el.x;
        const [newTimePoint] = chart.convertFromPixel({ seriesIndex: 0 }, [pixelX, 0]);
        const newOffset = timeOffset + newTimePoint;
        const latestTime = data.length > 0 ? data[data.length - 1].time + timeOffset : 0;
        const clampedOffset = Math.max(0, Math.min(newOffset, latestTime));
        onTimeOffsetChange(clampedOffset);
      }
    }
  };

  // ResizeObserverはコンポーネント内でのみ完結させたいため、ここではrefを直接使わない
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeChart = useCallback(() => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.getEchartsInstance().resize();
    }
  }, [ref]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(resizeChart);
    observer.observe(container);
    return () => observer.disconnect();
  }, [resizeChart]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ReactECharts
        ref={ref}
        option={option}
        style={{ height: '100%', width: '100%' }}
        onEvents={onChartEvents}
        notMerge={false}
      />
    </div>
  );
});

export default RoastChart;