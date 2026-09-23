# Third-Party Licenses and Notices

This project uses third-party software, data, and assets under their respective licenses and terms.

---

## Three.js

This project uses Three.js 0.180.0 and its official addons, including:

- OrbitControls
- GLTFLoader
- DRACOLoader

License: MIT License  
Copyright © 2010-2025 three.js authors

Official website: https://threejs.org/  
License information: https://threejs.org/license/

Version-specific license (0.180.0 / r180): https://github.com/mrdoob/three.js/blob/r180/LICENSE
The journey camera test also uses this same version of Three.js and OrbitControls
through jsDelivr; it does not introduce a separate library or license.

### MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 3DTilesRendererJS / 3d-tiles-renderer

This project uses 3d-tiles-renderer 0.4.28 (3DTilesRendererJS) to load and display Project PLATEAU 3D Tiles data with Three.js.

Project: NASA-AMMOS / 3DTilesRendererJS  
License: Apache License 2.0

Copyright © 2020 California Institute of Technology. ALL RIGHTS RESERVED.  
United States Government Sponsorship Acknowledged.

Neither the name of Caltech nor its operating division, the Jet Propulsion
Laboratory, nor the names of its contributors may be used to endorse or
promote products derived from this software without specific prior written
permission.

Repository: https://github.com/NASA-AMMOS/3DTilesRendererJS

The software is available under the Apache License, Version 2.0.

A copy of the Apache License 2.0 is available at:

https://www.apache.org/licenses/LICENSE-2.0

---

## Project PLATEAU

This project uses a 3D city model provided through Project PLATEAU.

Dataset:

- 3D都市モデル（Project PLATEAU）東京都千代田区（2025年度）
- Format: 3D Tiles, MVT（v5）
- Distribution: G空間情報センター

The Akihabara Station area was extracted and processed from the above dataset
for use in this project.

The Tokyo–Kanda–Akihabara city journey also uses the registered portions of this
dataset. Its visualization processes the source data for display, including
display colors and a building-reveal effect. Station positions are derived from
the existing city data and project origin; intermediate guide points are an
approximation authored for this project, not an official railway alignment.
This processed visualization is not an official publication of Project PLATEAU
or the Ministry of Land, Infrastructure, Transport and Tourism.

出典：3D都市モデル（Project PLATEAU）東京都千代田区（2025年度）、G空間情報センター。
本プロジェクトで範囲を抽出・加工して表示しています。案内経路は近似であり、公式の鉄道線形データではありません。

Dataset source: https://www.geospatial.jp/ckan/dataset/plateau-13101-chiyoda-ku-2025

The 3D city model is used in accordance with the Project PLATEAU Site Policy
and the Public Data License 1.0 (PDL1.0).

Project PLATEAU: https://www.mlit.go.jp/plateau/  
Site Policy: https://www.mlit.go.jp/plateau/site-policy/

---

## Kenney — Train Kit

This project uses the following assets from Kenney Train Kit:

- `track-detailed.glb`
- `train-electric-square-a.glb`

License: Creative Commons CC0

Source:

https://kenney.nl/assets/train-kit

---

## Kenney — Car Kit

This project uses the following assets from Kenney Car Kit:

- `sedan.glb`
- `suv.glb`
- `taxi.glb`
- `police.glb`

License: Creative Commons CC0

Source:

https://kenney.nl/assets/car-kit
