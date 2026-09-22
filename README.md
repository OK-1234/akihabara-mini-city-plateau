# 秋葉原ミニシティ：街の骨格 試作3号「縮尺校正」

起動：`node tools/preview-server.cjs` または `npm run preview`。表示されたローカルURLを開く。空きポートを選択し既存サーバーは停止しない。Three.jsの初回読込にネット接続が必要。

## 寸法（ゲーム単位、最終値ではない）

| 項目 | 試作3号 |
| --- | --- |
| タヌキ | スケール0.45、幅約0.878、高さ約1.451（試作2号を維持） |
| 道路全幅 | 4.6 |
| 歩道 | 両側各0.85 |
| 車道 | 合計2.9、1車線1.45 |
| 仮普通車 | 長さ3.4 × 幅1.3 × 高さ1.6 |
| 仮一般ビル | 幅4 × 奥行4 × 高さ6、3階、階高2 |
| 入口 | 幅1.1 × 高さ1.85 |
| 仮電車1両 | 長さ7.5 × 幅2.2 × 高さ3.4 |
| 高架 | 縦横幅4、上面2.6、下面2.35（維持） |
| 広場18行目の奥行 | 4から6.5へ、2.5増加 |
| 砂浜の奥行 | 3から6へ、3増加 |

仮オブジェクトの寸法は `src/map/calibration.js` のCAR・BUILDING・TRAINに集約。実寸や最終縮尺を確定するものではない。一般ビルは広場右のK:L区画、普通車はその南の道路、電車は東側横高架に各1つだけ配置。

道路に両側の明るい歩道、中央破線、対向方向の路面矢印を配置。元の中央高架下の海岸アプローチを舗装で明確にし、左上C8にも接続。Excelの配置関係を維持し、道路・広場・砂浜の寸法のみ拡張。F18噴水予約地に物は置かない。

タヌキ・歩行処理・カメラのコードは試作2号から変更なし。通常3.0、ダッシュ4.8、250ms同方向ダブルタップ、キーを押し継いだ方向転換中のダッシュ維持。↑右上、↓左下、←左上、→右下。カメラ表示高9、位置追従、角度維持。海面は北へ80・左右各80の延長を維持。説明パネルはhidden属性で通常非表示。

## 確認と制約

`/tools/verify.html` は既存操作の回帰、実GLBの速度・縮尺、高架幅、1車線への車の収まり、仮オブジェクト各1つ、広場と砂浜の奥行、海岸アクセス2か所を検証する。

今回の仮オブジェクトは比較表示のみで、衝突判定・走行処理はない。内部を通過でき、建物の背後ではタヌキが隠れる場合がある。カメラを引く処理や新たな透過システムは追加していない。

試作2号を `/prototypes/prototype-2/index.html` に保存（素材URLのみ比較版用に調整）。試作1号も保持。tests/とGLB原本は変更していない。GitHub操作なし。

## 試作3号ベース・車と電車の縮尺比較

`/comparison.html` が比較専用ページ。通常の `/` は試作3号のまま。

`src/map/comparison.js` で元の車・電車メッシュを複製し、A=1.0、B=0.8、C=0.65の一様スケールを適用。道路・高架・建物・カメラ・操作・タヌキ原本は未変更。車は広場南側道路の同じ車線に左からA/B/C、電車は横高架の西側から駅を経て東側へA/B/Cの順に配置。ラベルは各車両付近の小さな表示のみ。

寸法（長さ×幅×高さ、ゲーム単位。車体の基準値）：
- 車A: 3.4×1.3×1.6 / B: 2.72×1.04×1.28 / C: 2.21×0.845×1.04
- 電車A: 7.5×2.2×3.4 / B: 6×1.76×2.72 / C: 4.875×1.43×2.21

`/tools/verify-comparison.html` で形状・色・倍率・接地・車線/高架内への収まり・間隔を検証。固定カメラの表示範囲は維持しているため、特に電車は歩いて順に比較する。既存同様、仮オブジェクトに衝突判定はなく、背後ではタヌキが隠れることがある。

## Kenney普通車1台の実素材置換テスト

確認ページ：`/sedan-test.html`。試作3号の仮普通車だけをsedan.glbの1台に置換し、建物・電車・街・タヌキ・操作・カメラは維持。

実ファイルは `assets/assets/vehicles/sedan.glb` にあったため、元を保持し指定の `assets/vehicles/sedan.glb` へ同一内容をコピーした。元寸法（長さ×幅×高さ）は2.55×1.50×1.30。車Cの寸法に合わせ、長さ0.866667・幅0.563333・高さ0.800000の各軸スケールを適用。元の縦横比を保つ一様スケールではない。配置後は2.21×0.845×1.04。配置は広場右の一般ビル前、南側道路の元仮普通車の位置。

`/tools/verify-sedan.html` で計測値、各寸法、接地、1台だけの置換、建物と電車の維持を確認可能。

読み込み上の制約：GLBが参照する外部画像 `Textures/colormap.png` はプロジェクト内に存在せず、現在は白色表示。元の色は未再現。GLB原本は変更していない。

## 使用技術・データ・素材

本プロジェクトでは、以下のライブラリ、オープンデータ、3D素材および制作ツールを使用しています。

### Three.js

Webブラウザ上での3D描画に **Three.js 0.180.0** を使用しています。

また、Three.jsの以下のアドオンを使用しています。

- OrbitControls
- GLTFLoader
- DRACOLoader

Three.jsおよび上記アドオンは、jsDelivr CDN経由で読み込んでいます。

- License: MIT License
- Copyright © three.js authors
- 公式サイト: [https://threejs.org/](https://threejs.org/)
- License: [https://threejs.org/license/](https://threejs.org/license/)

### 3DTilesRendererJS

Project PLATEAUの3D TilesデータをThree.js上で読み込み・表示するため、**3d-tiles-renderer 0.4.28（3DTilesRendererJS）** を使用しています。

- 提供: NASA-AMMOS / 3DTilesRendererJS
- License: Apache License 2.0
- Copyright © 2020 California Institute of Technology
- GitHub: [https://github.com/NASA-AMMOS/3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS)

### Project PLATEAU

本作品では、国土交通省 **Project PLATEAU** の3D都市モデルを使用しています。

使用データ:

- 3D都市モデル（Project PLATEAU）東京都千代田区（2025年度）
- 形式: 3D Tiles, MVT（v5）
- 配布元: G空間情報センター

本作品では、上記3D都市モデルから秋葉原駅周辺のデータを抽出・加工して使用しています。

PLATEAU Site Policyおよび公共データ利用規約（第1.0版）に基づき利用しています。

- Project PLATEAU: [https://www.mlit.go.jp/plateau/](https://www.mlit.go.jp/plateau/)
- Site Policy: [https://www.mlit.go.jp/plateau/site-policy/](https://www.mlit.go.jp/plateau/site-policy/)

### Kenney

ゲーム内の鉄道・車両モデルの一部に、KenneyがCC0で公開している3D素材を使用しています。

#### Train Kit

使用素材:

- `track-detailed.glb`

- `train-electric-square-a.glb`

- License: Creative Commons CC0

- 配布元: [https://kenney.nl/assets/train-kit](https://kenney.nl/assets/train-kit)

#### Car Kit

使用素材:

- `sedan.glb`

- `suv.glb`

- `taxi.glb`

- `police.glb`

- License: Creative Commons CC0

- 配布元: [https://kenney.nl/assets/car-kit](https://kenney.nl/assets/car-kit)

### Blender / オリジナル3Dモデル

プレイヤーキャラクターのタヌキは、**Blender 5.2.1** を使用して制作したオリジナル3Dモデルです。

ゲームでは以下のモデルを使用しています。

- `tanuki_bevel2_smooth_head_body.glb`

外部から取得したタヌキモデルではなく、本プロジェクト用に制作したモデルです。

- Blender: [https://www.blender.org/](https://www.blender.org/)

## 第三者ライセンス

本プロジェクトで使用している第三者のライブラリ、データおよび素材のライセンス・利用条件ならびに著作権表示については、[THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) を参照してください。

## License

本プロジェクトに含まれる第三者のライブラリ、データおよび素材には、それぞれの提供元が定めるライセンスおよび利用条件が適用されます。

詳細は [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) を参照してください。

それらを除く、本プロジェクト独自のソースコードおよびオリジナルコンテンツについては、オープンソースライセンスを付与していません。

