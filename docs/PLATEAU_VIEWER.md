# PLATEAU LOD1 表示確認

プロジェクトのルートで `node tools/preview-server.cjs` を実行し、表示されたURLの `/plateau-test.html` を開く。既定は http://127.0.0.1:4317/plateau-test.html 。ポートが使用中ならサーバーが次の空きポートを選ぶ。npmが利用できる環境では `npm run preview` も同じ。

左ドラッグで回転、ホイールでズーム、右ドラッグで平行移動。ページ再読み込みで秋葉原駅付近の初期視点に戻る。

## 構成

- `plateau-test.html`：独立した確認ページとバージョン固定のimport map。
- `src/plateau-test.js`：Three.js、OrbitControls、照明、3D Tiles読み込み。
- Three.js 0.180.0（既存ページと同じバージョン）と3d-tiles-renderer 0.4.28をjsDelivrから読み込む。DracoデコーダーもThree.js 0.180.0の配布物を使用する。ネット接続が必要。npm依存・ビルド手順の追加なし。

## データの読み込み

TilesRendererがローカルの `assets/plateau/tileset.json` を取得し、content.uriを相対解決して `assets/plateau/data/data0.b3dm` を取得する。B3DMLoaderがコンテナーを解析し、内部glTFをGLTFLoaderとDRACOLoaderで展開する。

このデータはglTF拡張 `CESIUM_RTC` にECEF基準点を持つため、GLTFLoaderのプラグインでシーンの位置へ適用する。glTFの軸変換はB3DMLoaderに任せ、タイル群全体をWGS84地球座標から秋葉原駅付近（北緯35.6984度・東経139.7731度・楕円体高36m）を原点とする東・上・南のメートル座標へ変換する。原本の座標や形状は書き換えない。

既存ゲームのエントリーポイント・素材・tileset.json・b3dmは変更しない。地図、ゲーム連携、追加PLATEAUデータの取得は行わない。

## 動作確認

2026-09-21：ローカルサーバーとアプリ内ブラウザで建物群の描画（42,808三角形）、初期視点、ドラッグ回転、ホイールズームを確認。`node --check src/plateau-test.js` 成功。
