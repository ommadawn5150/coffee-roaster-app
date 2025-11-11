import type { RoastData } from '../types';

// downloadCSV関数は変更なし
export const downloadCSV = (data: RoastData[]) => {
  // ... (既存のコード) ...
};


// 👇 downloadHTML関数をこちらに置き換えます
/**
 * 焙煎レポートのHTMLファイルを生成してダウンロードする
 * @param chartImageDataUrl グラフのBase64画像データ
 * @param roastData 焙煎データの配列
 */
export const downloadHTML = (chartImageDataUrl: string, roastData: RoastData[]) => {
  // データのサマリーを計算
  const startTime = new Date().toLocaleString();
  const totalTime = roastData.length > 0 ? roastData[roastData.length - 1].time : 0;
  const maxTemp = Math.max(...roastData.map(d => d.temp || 0));

  // HTMLコンテンツを文字列として生成
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Roast Profile Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background-color: #f7fafc; color: #1a202c; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px T15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        h1 { font-size: 2.25rem; margin-bottom: 20px; }
        h2 { font-size: 1.5rem; margin-top: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
        .summary-item { background-color: #f7fafc; padding: 20px; border-radius: 8px; }
        .summary-item p { margin: 0; color: #718096; font-size: 0.875rem; }
        .summary-item h3 { margin: 5px 0 0; font-size: 1.875rem; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0;}
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Roast Profile Report</h1>
        <div class="summary">
          <div class="summary-item">
            <p>Roast Date</p>
            <h3>${startTime}</h3>
          </div>
          <div class="summary-item">
            <p>Total Time</p>
            <h3>${(totalTime / 60).toFixed(2)} min</h3>
          </div>
          <div class="summary-item">
            <p>Max Temperature</p>
            <h3>${maxTemp.toFixed(1)} °C</h3>
          </div>
        </div>
        <h2>Roast Graph</h2>
        ${chartImageDataUrl
          ? `<img src="${chartImageDataUrl}" alt="Roast Profile Graph">`
          : '<p style="color:#718096;">グラフ画像は取得できませんでした。</p>'}
        
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = `roast-report-${timestamp}.html`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
