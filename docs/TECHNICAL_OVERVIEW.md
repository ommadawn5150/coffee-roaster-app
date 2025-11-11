# Coffee Roaster App 技術概要

## 概要
- 目的: Raspberry Pi と Arduino を組み合わせた焙煎プロファイル監視・記録ツール。
- 構成: Node.js/Express + Socket.IO バックエンドと、Vite + React 19 + TypeScript フロントエンド。
- 特徴: リアルタイム温度・RoR 可視化、セッションの自動保存、履歴比較、CSV/HTML エクスポート、モバイル最適 UI。

## システム構成
- **バックエンド** (`server/server.js`)
  - Express + Socket.IO サーバーを port 3001 で待ち受け。
  - `serialport` と `ReadlineParser` を利用し Arduino からの温度データを 1 秒間隔で取得。
  - `findDefaultPort()` で `/dev/ttyUSB*` や `/dev/ttyACM*` をスキャンし、自動で Arduino を検出。
  - `isConnecting` フラグで多重接続を防ぎ、`latestTemperature` を保持して新規クライアントに即座に配信。
- **フロントエンド** (`src/`)
  - Vite (port 5173) と React で SPA を構築。Tailwind CSS でレスポンシブ・モバイル対応。
  - Socket.IO クライアントでリアルタイム温度を購読し、Recharts で 25 分固定のラインチャートを描画。
  - `html-to-image` でチャート DOM を PNG 化し、HTML レポートに埋め込む。
- **通信フロー**
  - Arduino → シリアル (9600bps) → Node.js → Socket.IO → React。
  - `temperatureUpdate` イベントで全クライアントにブロードキャスト。

## 主要機能
- **リアルタイム監視**
  - 温度と RoR (Rate of Rise) を 1 秒間隔で更新。
  - 30 秒前の温度との差分×2 で RoR を算出。
  - 移動平均 (ウィンドウ 5) でノイズを平滑化。
- **履歴セッション管理**
  - 焙煎停止時に `RoastSession` としてローカルに保存 (localStorage)。
  - セッションは名前・開始時刻・合計時間・データ配列を保持。
  - `HistoryPanel` で一覧表示、比較対象として選択、削除、一括リセット。
- **履歴比較ビュー**
  - 選択した複数セッションを Recharts の追加ラインとして重ね描画。
  - グローバルな時間オフセットをスライダーで調整し、履歴との整合を取る。
  - チャートの時間軸は 0〜1500 秒 (25 分) に固定。
- **エクスポート**
  - CSV: 温度・RoR データを記録。
  - HTML: チャート画像と統計サマリを含むレポートを生成 (`html-to-image` → `downloadHTML`)。
- **モバイル UI**
  - `Toolbar` にタブ表示 (Status/Actions)。スマホでは切り替え、デスクトップでは横並び。
  - 数値表示は固定幅・等幅フォントで揺れを抑制。
  - グラフエリアは縦方向に 55vh 確保し、潰れを防止。

## 主要コンポーネント
- `src/App.tsx`
  - 状態管理の中心。Socket.IO 接続、平滑化、履歴保存、エクスポートを司る。
  - `smoothData` で任意データセットに移動平均を適用。
  - `comparisonSessions` で選択セッションを色分けし、チャート用データを生成。
- `src/components/RoastChart.tsx`
  - Recharts ラッパー。現在の焙煎と履歴を重ね、スライダーで時間オフセットを操作。
  - X 軸を `mm:ss` 表示に変換し、RoR=0 の基準線を描画。
- `src/components/HistoryPanel.tsx`
  - セッションのチェックボックス一覧。最大 48 行をスクロールで表示。
  - `onToggle` で比較対象を切り替え、`onDelete`/`onClear` でストレージを更新。
- `src/server/server.js`
  - Arduino とのシリアル接続制御、Socket.IO イベント管理 (`connectPort`, `disconnectPort`, `temperatureUpdate`, `portStatus`)。
  - 接続失敗時は `portStatus` に `error` を emit。

## 状態とデータモデル
- **ランタイム状態 (React)**
  - `currentTemp`, `currentRor`: 最新値表示用。
  - `rawHistory`: 生データ (秒単位)。
  - `smoothedHistory`: 平滑化後データ (Recharts 表示用)。
  - `savedSessions`: `RoastSession[]` を localStorage に保存。
  - `selectedSessionIds`: 比較対象のセッション ID 配列。
  - `timeOffset`: 現在と履歴の時間合わせ。
- **データモデル**
  - `RoastData { time, temp, ror }`
  - `RoastSession { id, name, createdAt, totalTime, data: RoastData[] }`
  - `RoastComparisonSeries { id, name, color, data }`

## Socket.IO イベント一覧
- `temperatureUpdate: number`  
  現在温度を送信。NaN はフィルタ済み。
- `portStatus: { status: 'connecting' | 'connected' | 'disconnected' | 'error'; path?: string; message?: string }`
  シリアルポートの状態とエラー情報。
- `connectPort(requestedPath?: string)`  
  クライアント → サーバー。指定がなければ `findDefaultPort()` を使用。
- `disconnectPort()`  
  クライアント → サーバー。開いているポートをクローズ。

## シリアル通信の詳細
- ボーレート: 9600。
- コマンド: ポートオープン後、1 秒ごとに `serialPort.write('t\n')`。
- エラー処理: `serialPort.on('error')` でエラーメッセージを `portStatus` 経由で通知し、リソースを解放。
- クリーンアップ: `close` イベントで interval を停止し、`serialPort = null` に戻す。

## 開発・動作手順
- **セットアップ**
  - `npm install`
  - `.env` (任意): `ALLOWED_ORIGINS` で許可オリジンをカンマ区切り指定。
  - Arduino を `/dev/ttyUSB*` または `/dev/ttyACM*` へ接続。
- **開発サーバー起動**
  - `npm run dev` でフロント (Vite) とバックエンド (Node) を同時起動。
  - LAN からアクセスする場合は既定で `--host 0.0.0.0` に設定済み (`dev:frontend`)。
- **アクセス**
  - フロントエンド: `http://<Raspberry Pi IP>:5173`
  - Socket.IO/バックエンド: `http://<Raspberry Pi IP>:3001`
- **ビルド**
  - `npm run build` で Vite ビルドと TypeScript 型チェック。
- **エクスポート**
  - Stop 時に自動で CSV と HTML レポートをダウンロード (オプション制御可)。

## ファイル構成 (主要部)
- `src/App.tsx`: ルートコンポーネント、状態管理、履歴保存。
- `src/components/Toolbar.tsx`: モバイルタブ UI、Start/Stop ボタン。
- `src/components/Controls.tsx`: 焙煎コントロール + ダウンロード設定トグル。
- `src/components/Metrics.tsx`: Roast Time/温度/RoR 表示。
- `src/components/RoastChart.tsx`: Recharts グラフ。
- `src/components/HistoryPanel.tsx`: 履歴セッション UI。
- `src/utils/export.ts`: CSV/HTML エクスポート。
- `server/server.js`: Express + Socket.IO + SerialPort ハンドラー。

## 今後の拡張アイデア
- バックエンドに永続ストア (SQLite/SQLite+Prisma 等) を導入し、履歴をブラウザ以外にも保存。
- ユーザーが任意のラベルやノートをセッションへ追加できるフォームを実装。
- RoR の平滑化ロジックを Higuchi/指数移動平均など可変式に変更。
- 温度センサーのキャリブレーションやアラート閾値を UI から設定可能にする。
- E2E テスト (Playwright 等) でマルチデバイス接続の検証を自動化。

---
このドキュメントは `docs/TECHNICAL_OVERVIEW.md` として生成されました。最新の実装差分は `src/App.tsx`、`src/components/RoastChart.tsx`、`server/server.js` を参照してください。
