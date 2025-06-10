# Coffee Roaster: リアルタイム焙煎モニタリング・Webアプリケーション

Arduinoに接続された温度センサーと連携し、コーヒー豆の焙煎プロセスをリアルタイムでモニタリング、記録、分析するためのWebアプリケーションです。

## アーキテクチャ

ローカルで実行されるNode.jsサーバーがArduinoとのシリアル通信を中継し、WebSocketを介してブラウザ上のUIにリアルタイムでデータを送信します。

`[Arduino] <--> [Node.js サーバー] <--> [ブラウザ上のUI (React)]`

## 主な機能

  * 現在の温度とRoR (Rate of Rise - 30秒ごとの温度上昇率) のリアルタイム表示
  * 焙煎プロファイルのグラフ化（温度・RoR）
  * macOS風のUI
  * シリアルポートの自動検出とUIからの選択機能
  * グラフ上のマーカーによる焙煎開始点(0分)の動的調整機能
  * 焙煎データの保存機能 (CSV形式、及びグラフ画像を含むHTML形式)
  * 焙煎開始からの経過時間タイマー表示

## 使用技術

  * **フロントエンド**: React, Vite, TypeScript
  * **バックエンド**: Node.js, Express, Socket.IO
  * **シリアル通信**: `node-serialport`
  * **UI**: Tailwind CSS, Heroicons
  * **グラフ**: ECharts for React

## ハードウェア要件

  * Arduino互換ボード (Arduino Uno, Nanoなど)
  * K型熱電対
  * **MAX31855搭載 熱電対アンプモジュール**
  * Arduinoには、シリアル通信で`"t\n"`という文字列を受信した際に、温度を返送するスケッチを書き込む必要があります。

#### Arduinoライブラリ

スケッチを動作させるには、Arduino IDEのライブラリマネージャーから `Adafruit MAX31855 Library` を検索してインストールしてください。

#### Arduinoスケッチ例

```cpp
#include <Adafruit_MAX31855.h>

// ArduinoとMAX31855を接続しているピン番号を指定
const int MAXDO   = 4;  // SO (Serial Out)
const int MAXCS   = 5;  // CS (Chip Select)
const int MAXCLK  = 6;  // SCK (Serial Clock)

// MAX31855のインスタンスを作成
Adafruit_MAX31855 thermocouple(MAXCLK, MAXCS, MAXDO);

void setup() {
  Serial.begin(9600);
  delay(500);
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "t") {
      double tempC = thermocouple.readCelsius();

      // 温度が有効な数値か、断線していないかを確認
      if (isnan(tempC)) {
        uint8_t fault = thermocouple.readFault();
        if (fault) {
          if (fault & MAX31855_FAULT_OPEN) Serial.println("Fault: Thermocouple is open (disconnected).");
          else if (fault & MAX31855_FAULT_SHORT_GND) Serial.println("Fault: Thermocouple is shorted to GND.");
          else if (fault & MAX31855_FAULT_SHORT_VCC) Serial.println("Fault: Thermocouple is shorted to VCC.");
          else Serial.println("Fault: Unknown fault.");
        } else {
           Serial.println("Error: Failed to read temperature.");
        }
      } else {
        // 正常な場合は温度を送信
        Serial.println(tempC);
      }
    }
  }
}
```

## セットアップ

1.  **リポジトリのクローン**

    ```bash
    git clone [リポジトリのURL]
    cd coffee-roaster-app
    ```

2.  **依存関係のインストール**

    ```bash
    npm install
    ```

## 使用方法

### 開発環境での実行

以下のコマンドを実行すると、フロントエンドの開発サーバー（ポート: 5173）と、バックエンドのNode.jsサーバー（ポート: 3001）が同時に起動します。

```bash
npm run dev
```

その後、Webブラウザで `http://localhost:5173` を開いてアプリケーションにアクセスしてください。