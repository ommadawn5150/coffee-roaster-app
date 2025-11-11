import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { RoastData, RoastComparisonSeries } from '../types';

interface Props {
  data: RoastData[];
  comparisonSessions: RoastComparisonSeries[];
  emptyStateMessage?: string;
}

const formatTimeLabel = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
const formatTemperature = (value: number) => `${value.toFixed(0)}°`;
const formatRor = (value: number) => `${value.toFixed(1)}`;

const smoothRorSeries = (series: RoastData[], window = 7): RoastData[] => {
  if (series.length === 0) return [];
  const halfWindow = Math.floor(window / 2);
  return series.map((point, index, array) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(array.length - 1, index + halfWindow);
    const slice = array.slice(start, end + 1);
    const avgRor = slice.reduce((sum, item) => sum + item.ror, 0) / slice.length;
    return { ...point, ror: avgRor };
  });
};

const RoastChart: React.FC<Props> = ({ data, comparisonSessions, emptyStateMessage }) => {
  const smoothedPrimaryData = useMemo(() => smoothRorSeries(data), [data]);
  const smoothedComparisonSessions = useMemo(
    () =>
      comparisonSessions.map((session) => ({
        ...session,
        data: smoothRorSeries(session.data),
      })),
    [comparisonSessions],
  );

  const baseData = useMemo(() => {
    if (smoothedPrimaryData.length > 0) return smoothedPrimaryData;
    if (smoothedComparisonSessions.length > 0) return smoothedComparisonSessions[0].data;
    return [];
  }, [smoothedPrimaryData, smoothedComparisonSessions]);

  const hasAnyData = baseData.length > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        {hasAnyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={baseData} margin={{ top: 20, right: 24, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#cbd5f5" />
              <XAxis
                dataKey="time"
                type="number"
                domain={[0, 1500]}
                allowDataOverflow
                tickFormatter={formatTimeLabel}
                label={{ value: 'Time (mm:ss)', position: 'insideBottom', offset: -6 }}
                stroke="#94a3b8"
              />
              <YAxis
                yAxisId="temp"
                domain={[70, 220]}
                tickFormatter={formatTemperature}
                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                stroke="#0ea5e9"
              />
              <YAxis
                yAxisId="ror"
                orientation="right"
                domain={[-10, 40]}
                allowDataOverflow
                tickFormatter={formatRor}
                label={{ value: 'RoR (°C/min)', angle: 90, position: 'insideRight' }}
                stroke="#10b981"
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'Temperature' ? `${value.toFixed(1)}°C` : `${value.toFixed(1)} RoR`,
                ]}
                labelFormatter={(label) => formatTimeLabel(Number(label))}
                contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <ReferenceLine yAxisId="ror" y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Line
                type="monotone"
                yAxisId="temp"
                data={smoothedPrimaryData}
                dataKey="temp"
                name="Temperature"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                yAxisId="ror"
                data={smoothedPrimaryData}
                dataKey="ror"
                name="RoR"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
              {smoothedComparisonSessions.map((session) => (
                <React.Fragment key={session.id}>
                  <Line
                    type="monotone"
                    yAxisId="temp"
                    data={session.data}
                    dataKey="temp"
                    name={`${session.name} Temp`}
                    stroke={session.color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    opacity={0.7}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    yAxisId="ror"
                    data={session.data}
                    dataKey="ror"
                    name={`${session.name} RoR`}
                    stroke={session.color}
                    strokeWidth={2}
                    strokeDasharray="3 6"
                    dot={false}
                    opacity={0.5}
                    isAnimationActive={false}
                  />
                </React.Fragment>
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 text-sm text-slate-500 text-center px-4">
            {emptyStateMessage ?? '温度データを受信するとグラフが表示されます。'}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoastChart;
