import React, { useEffect, useState } from 'react';
import type { RoastSession } from '../types';

interface Props {
  sessions: RoastSession[];
  selectedId: string | null;
  height?: number;
  deleteSelection: string[];
  isEditing: boolean;
  isRoasting: boolean;
  onSelect: (id: string) => void;
  onToggleEditing: () => void;
  onToggleDeleteSelection: (id: string) => void;
  onDeleteSelected: () => void;
  onDownload: (id: string) => void;
  onSaveSessionDetails: (id: string, details: EditDraft) => void;
}

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { hour12: false });

const initialDraft = {
  beanName: '',
  beanWeight: '',
  roastedWeight: '',
  tastingNote: '',
};
type EditDraft = typeof initialDraft;

const HistoryPanel: React.FC<Props> = ({
  sessions,
  selectedId,
  height,
  deleteSelection,
  isEditing,
  isRoasting,
  onSelect,
  onToggleEditing,
  onToggleDeleteSelection,
  onDeleteSelected,
  onDownload,
  onSaveSessionDetails,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>(initialDraft);

  useEffect(() => {
    if (editingSessionId && !sessions.some((session) => session.id === editingSessionId)) {
      setEditingSessionId(null);
      setEditDraft(initialDraft);
    }
  }, [editingSessionId, sessions]);

  const startEditing = (session: RoastSession) => {
    if (isEditing || isRoasting) return;
    setEditingSessionId(session.id);
    setEditDraft({
      beanName: session.beanName ?? '',
      beanWeight: session.beanWeight != null ? session.beanWeight.toString() : '',
      roastedWeight: session.roastedWeight != null ? session.roastedWeight.toString() : '',
      tastingNote: session.tastingNote ?? '',
    });
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditDraft(initialDraft);
  };

const handleEditFieldChange = <K extends keyof EditDraft>(field: K, value: EditDraft[K]) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEditing = (id: string) => {
    onSaveSessionDetails(id, editDraft);
    cancelEditing();
  };

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
        保存済みの焙煎データはまだありません。
      </div>
    );
  }

  const hasDeleteSelection = deleteSelection.length > 0;
  const panelOpacityClass = isRoasting ? 'opacity-60' : '';

  const sectionStyle = typeof height === 'number' ? { height } : undefined;

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-opacity lg:h-full ${panelOpacityClass}`}
      style={sectionStyle}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Roast History</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={!hasDeleteSelection}
                className={`text-xs font-semibold transition-colors ${
                  hasDeleteSelection
                    ? 'text-rose-500 hover:text-rose-600'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                選択を削除
              </button>
              <button
                type="button"
                onClick={onToggleEditing}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                完了
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onToggleEditing}
              disabled={isRoasting}
              className={`text-xs font-semibold transition-colors ${
                isRoasting
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              編集
            </button>
          )}
        </div>
      </div>
      <ul className="mt-3 space-y-3 h-[calc(100%-2rem)] overflow-y-auto pr-1">
        {sessions.map((session) => {
          const isSelected = session.id === selectedId;
          const isMarkedForDeletion = deleteSelection.includes(session.id);
          const beanLabel = session.beanName ?? 'Roast';
          const displayName = session.name ?? `${beanLabel} ${formatTimestamp(session.createdAt)}`;
          const greenWeight =
            typeof session.beanWeight === 'number' && !Number.isNaN(session.beanWeight)
              ? session.beanWeight
              : null;
          const roastedWeight =
            typeof session.roastedWeight === 'number' && !Number.isNaN(session.roastedWeight)
              ? session.roastedWeight
              : null;
          const greenWeightLabel = greenWeight != null ? `${greenWeight} g` : '未設定';
          const roastedWeightValue = roastedWeight != null ? String(roastedWeight) : '';
          const roastedWeightLabel =
            roastedWeightValue.length > 0 ? `${roastedWeightValue} g` : '未設定';
          const tastingNoteLabel = session.tastingNote ?? '未設定';
          const roastIndexLabel =
            greenWeight != null && roastedWeight != null && greenWeight > 0
              ? (greenWeight / roastedWeight).toFixed(2)
              : '—';
          const isSessionEditing = editingSessionId === session.id;
          const isDeletable = session.totalTime < 300;
          const selectionClasses = isSelected ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white/80';
          return (
            <li
              key={session.id}
              className={`rounded-xl border px-3 py-2 transition-colors ${selectionClasses}`}
            >
              <div className="flex w-full items-start gap-3">
                <div className="flex-1">
                  {isSessionEditing ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                      <div className="space-y-2 text-xs text-slate-600">
                        <label className="flex flex-col gap-1">
                          <span>Bean Name</span>
                          <input
                            type="text"
                            value={editDraft.beanName}
                            onChange={(event) => handleEditFieldChange('beanName', event.target.value)}
                            placeholder={beanLabel}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                          />
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <label className="flex flex-1 flex-col gap-1">
                            <span>Green Weight (g)</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editDraft.beanWeight}
                              onChange={(event) => handleEditFieldChange('beanWeight', event.target.value)}
                              placeholder={greenWeightLabel}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                          </label>
                          <label className="flex flex-1 flex-col gap-1">
                            <span>Roasted Weight (g)</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editDraft.roastedWeight}
                              onChange={(event) => handleEditFieldChange('roastedWeight', event.target.value)}
                              placeholder={roastedWeightLabel}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                            />
                          </label>
                        </div>
                        <label className="flex flex-col gap-1">
                          <span>Tasting Note</span>
                          <textarea
                            rows={2}
                            value={editDraft.tastingNote}
                            onChange={(event) => handleEditFieldChange('tastingNote', event.target.value)}
                            placeholder={session.tastingNote ?? '例: チョコレート、ナッツの後味'}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                          />
                        </label>
                        <span className="text-[11px] text-slate-500">
                          Roast Index:{' '}
                          {(() => {
                            const editGreenWeight = Number(editDraft.beanWeight);
                            const editRoastedWeight = Number(editDraft.roastedWeight);
                            return Number.isFinite(editGreenWeight) &&
                              editGreenWeight > 0 &&
                              Number.isFinite(editRoastedWeight)
                              ? (editRoastedWeight / editGreenWeight).toFixed(2)
                              : '—';
                          })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(session.id)}
                      disabled={isEditing}
                      aria-pressed={isSelected}
                      className={`flex w-full items-start gap-3 text-left ${
                        isEditing ? 'cursor-not-allowed opacity-60' : 'hover:text-slate-900'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700">{displayName}</p>
                        <p className="text-xs text-slate-500">
                          豆: {beanLabel} · {formatTimestamp(session.createdAt)} · {formatDuration(session.totalTime)}
                        </p>
                        <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-500">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                            <span>Green Weight: {greenWeightLabel}</span>
                            <span>Roasted Weight: {roastedWeightLabel}</span>
                            <span>Roast Index: {roastIndexLabel}</span>
                          </div>
                          <span>Tasting Note: {tastingNoteLabel}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                          Active
                        </span>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={isMarkedForDeletion}
                      onChange={() => onToggleDeleteSelection(session.id)}
                      disabled={!isDeletable}
                      title={!isDeletable ? '5分以上のデータは削除できません' : undefined}
                      className={`h-4 w-4 accent-rose-500 ${!isDeletable ? 'cursor-not-allowed opacity-40' : ''}`}
                    />
                  ) : null}
                  {isSessionEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEditing(session.id)}
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => onDownload(session.id)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Download
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(session)}
                        disabled={isEditing || isRoasting}
                        className={`text-xs font-semibold ${
                          isEditing || isRoasting
                            ? 'cursor-not-allowed text-slate-400'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        編集
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default HistoryPanel;
