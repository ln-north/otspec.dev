# otspec.dev 技術調査レポート

調査日: 2026-03-20

---

## 1. 静的サイトジェネレーター/フレームワーク比較

### 1.1 総合比較

#### Astro (Starlight)

- MDXサポート: ファーストクラス対応。`@astrojs/mdx` 統合により `.mdx` ファイルで JSX コンポーネントを埋め込み可能
- インタラクティブコンポーネント: **Islands Architecture** により、React/Svelte/Vue/Solid/Preact 等あらゆるフレームワークのコンポーネントを選択的にハイドレーション（`client:load`, `client:visible` 等のディレクティブ）
- パフォーマンス: デフォルトで JavaScript ゼロ出力。1000ページのドキュメントサイトで約18秒ビルド（Next.js Nextra比で約3倍速）。Lighthouse 100点、JS バンドル 0-5KB
- 検索: **Pagefind** が組み込み（設定不要、ゼロコンフィグ）。Algolia DocSearch もプラグインで対応（`@astrojs/starlight-docsearch`）
- 多言語対応（i18n）: 組み込みで40言語以上のUIラベルを提供。ルーティング、フォールバックコンテンツ、RTL対応が標準装備。`locales` 設定でディレクトリベースの多言語構造を自動生成
- カスタムコンポーネント: Astro, React, Vue, Svelte, Solid, Preact のコンポーネントを MDX 内で自由に使用可能。UI フレームワークの制約がない
- デプロイ: Cloudflare Pages/Workers（公式ファーストクラス対応）、Vercel、Netlify、Deno Deploy 等
- コミュニティ: 急成長中。**2026年1月に Cloudflare が Astro 社を買収**（MIT ライセンス・オープンソースは維持）。Docusaurus からの移行事例が多数

#### Next.js

- MDXサポート: `next-mdx-remote` または `@next/mdx` で対応可能だが手動セットアップが必要。Content Collections のような型安全なコンテンツ管理は標準では無い
- パフォーマンス: React ベースのため JS バンドルが大きい。SSR/ISR/API Routes 等フルスタック機能が強み。ドキュメントサイトにはオーバースペック
- 検索: 組み込み検索なし。Algolia 等を自前で統合する必要あり
- 多言語対応: `next-intl` 等のライブラリで対応可能だが設定が複雑
- カスタムコンポーネント: React のみ
- デプロイ: Vercel が最適化済み。Cloudflare への静的デプロイも可能だが SSR 機能は制限される
- コミュニティ: 最大規模。ただしドキュメント用途では Astro に流れる傾向

#### Docusaurus

- MDXサポート: ファーストクラスの MDX 対応。バージョニング機能あり
- パフォーマンス: React ベースのため JS バンドルは大きめ。ビルド時間も Astro より遅い
- 検索: 組み込み検索あり。Algolia DocSearch 公式対応
- 多言語対応: i18n 対応は充実（ディレクトリ構造、翻訳ファイル管理）
- カスタムコンポーネント: React のみ
- デプロイ: 静的出力のためどこでもデプロイ可能
- コミュニティ: Meta（Facebook）が開発。Redux, Ionic, Supabase 等が採用。ただし **2025年以降 Starlight への移行トレンドが顕著**
- スタイリング: Infima に依存しており、Tailwind 等の統合が困難

#### VitePress

- MDXサポート: MDX 非対応。Markdown + Vue コンポーネントの埋め込み
- パフォーマンス: Vite ベースで HMR が高速。ビルドも軽量
- 検索: 組み込み検索あり
- 多言語対応: i18n 対応あり
- カスタムコンポーネント: **Vue のみ**
- デプロイ: 静的出力のためどこでもデプロイ可能
- コミュニティ: Vue エコシステム内では強い。Vue 以外のフレームワークとの組み合わせは不可
- バージョニング: 非対応

### 1.2 推奨: Astro (Starlight)

**otspec.dev には Astro (Starlight) を強く推奨する。** 理由は以下の通り:

1. **Playground との親和性が最高**: Islands Architecture により、ドキュメントページは静的 HTML として高速に配信しつつ、Playground 部分だけを選択的にハイドレーションできる。フォントパーサー（opentype.js）やシェーパー（harfbuzzjs）を使うインタラクティブコンポーネントを、ページ全体の JS 負荷を最小限に抑えながら埋め込める
2. **フレームワーク非依存**: React でも Svelte でも Vue でも、Playground コンポーネントを最適なフレームワークで書ける
3. **Cloudflare との関係**: Cloudflare が Astro 社を買収しており、Cloudflare Pages/Workers へのデプロイが「ゴールデンパス」になる。otspec.dev のドメインが Cloudflare 管理である点と完全に一致
4. **i18n が組み込み**: 日英の多言語対応が最小コストで実現できる
5. **Pagefind 検索**: 設定不要でフルテキスト検索が動く。ドキュメントサイトに最適
6. **コンテンツ管理**: Content Collections による型安全な Markdown/MDX 管理。Zod スキーマでフロントマターを検証でき、コントリビューターのミスを防げる

---

## 2. Playground の技術的実現方法

### 2a. フォントパーサー/レンダラー ライブラリ比較

#### opentype.js

- 言語: 純粋 JavaScript（WASM 不要）
- 機能: フォントの読み込み・書き込み、グリフパス（ベジェ曲線）の抽出、Canvas/SVG へのレンダリング、カーニング（GPOS / kern テーブル）、リガチャ、コンポジットグリフ、WOFF/OTF/TTF 対応、COLR/CPAL カラーフォント、アラビア文字レンダリング、TrueType ヒンティング
- 制限: テキストシェーピングは基本的なもののみ。複雑なスクリプト（アラビア語、デーバナーガリー等）のシェーピングは HarfBuzz に劣る
- 性能: シェーピングベンチマークで harfbuzzjs の約40%の速度（70,815 Hz vs 176,392 Hz）
- 適用場面: **フォントテーブルの読み取り・解析、グリフの描画、メトリクスの取得に最適**。otspec.dev の Playground ではテーブルエクスプローラ、グリフインスペクタ等に最適
- npm: `opentype.js`
- 公式サイト: https://opentype.js.org/

#### harfbuzzjs

- 言語: C++ → WebAssembly（薄い JavaScript ラッパー）
- 機能: テキストシェーピング（Unicode テキスト → グリフ ID + 位置のリスト）、OpenType / AAT / SIL Graphite 対応
- 制限: `HB_TINY` でビルドされているため一部機能が無効（グリフ名取得等）。カスタムビルドで有効化可能
- 性能: 176,392 Hz（opentype.js の約2.5倍）
- 適用場面: **テキストシェーピングの正確な再現**。Figma, Prezi, Photopea 等のプロダクションで使用実績あり。otspec.dev では Lookup ビジュアライザ、シェーピングデバッグ等に必須
- npm: `harfbuzzjs`
- GitHub: https://github.com/harfbuzz/harfbuzzjs

#### rustybuzz-wasm

- 言語: Rust → WebAssembly（HarfBuzz の Rust ポート）
- 性能: 218,840 Hz（harfbuzzjs の約1.2倍、opentype.js の約3倍）
- 制限: harfbuzzjs より機能カバレッジが狭い可能性がある。エコシステムが小さい
- npm: `rustybuzz-wasm`

#### fonttools (Python)

- フォント操作の Python ライブラリのデファクトスタンダード
- ブラウザ直接利用は不可。サーバーサイドやビルド時処理向け
- **WASM 化の可能性**: Pyodide（Python in WASM）経由で理論上ブラウザで動作可能だが、バンドルサイズが巨大（数十MB）になるため非実用的
- otspec.dev では**ビルド時のフォント処理**（サンプルフォントの前処理等）に使う可能性あり

#### samsa-core

- ES6 JavaScript、依存関係ゼロ
- バリアブルフォント（Variable Font）の解析・インスタンス生成・SVG 変換に特化
- 静的 TTF のエクスポート機能
- Axis-Praxis プロジェクトから派生
- otspec.dev では**バリアブルフォント関連の Playground** に使用可能
- GitHub: https://github.com/Lorp/samsa

#### fontkit

- JavaScript フォントパーサー
- Wakamai Fondue が使用
- opentype.js より低速（ベンチマーク: 29,840 Hz）だが、Unicode カバレッジや機能が豊富

### 2a. 推奨構成

**opentype.js + harfbuzzjs の組み合わせ**を推奨:

- **opentype.js**: フォントテーブルの読み取り・解析、グリフのパス抽出・描画、メトリクス取得
- **harfbuzzjs**: テキストシェーピングの正確な再現、GSUB/GPOS の適用結果の取得
- **samsa-core**: バリアブルフォント固有の機能（軸操作、インスタンス生成）

この組み合わせは実際に **Crowbar**（テキストシェーピングデバッガ）が採用している構成と同じであり、実績がある。

---

### 2b. Playground のアイデア（詳細版）

#### カテゴリ A: テーブル・構造の可視化

**A1. フォントテーブルエクスプローラ**
- フォントファイルをドラッグ＆ドロップでアップロード
- sfnt ヘッダ → テーブルディレクトリ → 各テーブルの階層構造をツリービューで表示
- 各テーブル（head, name, cmap, GSUB, GPOS, GDEF, OS/2, hhea, hmtx 等）の中身を人間が読める形式で表示
- バイナリオフセットとデータ構造の対応関係をハイライト表示
- 仕様ページへのリンク付き：テーブルの各フィールドをクリックすると otspec.dev の該当仕様ページにジャンプ
- 技術: opentype.js の `font.toTables()` + カスタム UI

**A2. フォントバイナリヘックスビューア**
- フォントファイルの生バイナリをヘックスダンプ形式で表示
- テーブルディレクトリの各エントリ（tag, checkSum, offset, length）をカラーコード表示
- 特定のテーブルやサブテーブルをクリックすると対応するバイナリ範囲がハイライト
- 「仕様のこのフィールドはバイナリのここに対応する」を視覚的に示す教育ツール
- 技術: FileReader API + カスタムバイナリパーサー

**A3. cmap テーブルビジュアライザ**
- Unicode コードポイント → グリフ ID のマッピングをインタラクティブに表示
- Format 4（BMP）、Format 12（フル Unicode）等のサブテーブル構造を可視化
- 特定の文字を入力すると、どの cmap サブテーブルがマッチするかをステップ表示
- 技術: opentype.js

#### カテゴリ B: シェーピング・レイアウトの可視化

**B1. GSUB/GPOS Lookup ステップ実行ビジュアライザ**
- テキスト入力 → シェーピングエンジンが適用する各 Lookup をステップごとに表示
- 「再生」「一時停止」「前へ」「次へ」ボタンで Lookup の適用過程をアニメーション表示
- 各ステップでグリフストリームの変化を視覚的にハイライト（どのグリフが置換/追加/削除されたか）
- GPOS の場合はグリフの位置調整をベクトル矢印で表示
- Feature ごとにグループ化して表示（ccmp → liga → kern 等）
- 参考実装: **Crowbar** (simoncozens/crowbar) がこのコンセプトの先行実装
- 技術: harfbuzzjs（シェーピング） + opentype.js（テーブル解析） + カスタム UI

**B2. リガチャ形成デモ**
- テキスト入力フィールドにリアルタイムで入力
- 入力文字列に対してリガチャ（liga, rlig, dlig）がどう適用されるかをアニメーション表示
- 例: "f" + "i" → "fi" リガチャの形成過程を、グリフが合体するアニメーションで表示
- どの Lookup Rule がマッチしたかを傍注で表示
- 技術: harfbuzzjs + Canvas/SVG アニメーション

**B3. Feature Tag テスター**
- フォントが持つすべての OpenType Feature をリスト表示（liga, kern, smcp, onum, ss01-ss20 等）
- 各 Feature の ON/OFF トグルスイッチ
- テキストプレビューがリアルタイムで更新
- CSS の `font-feature-settings` コードをリアルタイム生成
- 「この Feature がどの Lookup を呼び出すか」の内部マッピングも表示
- 技術: CSS `font-feature-settings` + harfbuzzjs + opentype.js

**B4. スクリプト別シェーピングパイプラインビジュアライザ**
- ラテン、アラビア語、デーバナーガリー、タイ語等のスクリプト別に、HarfBuzz のシェーピングパイプラインがどう異なるかを可視化
- 各スクリプトで適用される Feature の順序・種類の違いを表形式で比較
- 実際のテキストを入力して各ステージの出力を確認
- 技術: harfbuzzjs + opentype-shaping-documents

#### カテゴリ C: グリフ・アウトラインの可視化

**C1. グリフインスペクタ**
- グリフを選択すると、アウトライン（ベジェ曲線）を拡大表示
- on-curve ポイント（青）、off-curve ポイント（赤）を色分け表示
- メトリクス表示: advance width, left side bearing, right side bearing, bounding box
- ベースライン、x-height、cap height、ascender、descender ラインをオーバーレイ表示
- ヒンティング命令の可視化（TrueType の場合）
- コンポジットグリフの場合、コンポーネントの分解表示
- 技術: opentype.js + Canvas

**C2. グリフ比較ツール**
- 2つのフォントファイルをアップロードし、同じグリフ ID / Unicode の形状を重ねて表示
- 差分をハイライト（バージョン間の変更確認に便利）
- アウトラインの一致率をスコア表示
- 技術: opentype.js + Canvas

**C3. カラーフォントレンダラー**
- COLR/CPAL カラーフォントのレイヤー構造を分解表示
- 各レイヤーの色とパレットインデックスを表示
- パレット色をインタラクティブに変更してプレビュー
- COLRv0 と COLRv1（グラデーション、コンポジティング）の違いを視覚的に比較
- CSS `font-palette` / `@font-palette-values` のコード生成
- 技術: opentype.js（COLR/CPAL テーブル解析） + Canvas

**C4. SVG-in-OpenType ビューア**
- SVG テーブルを持つフォントの SVG グリフを表示
- SVG ソースコードとレンダリング結果を並べて表示
- 技術: opentype.js + SVG レンダリング

#### カテゴリ D: バリアブルフォント

**D1. バリアブルフォント軸スライダー**
- フォントのすべての variation axis（wght, wdth, ital, slnt, opsz 等）をスライダーで操作
- リアルタイムでフォント表示が変化
- 登録済み軸とカスタム軸を区別して表示
- CSS `font-variation-settings` コードをリアルタイム生成
- 名前付きインスタンス（Named Instance）のプリセットボタン
- 技術: CSS `font-variation-settings` + samsa-core

**D2. デザインスペースマップ**
- 2軸を選択して 2D マップ上で designspace を可視化
- マップ上の任意の点をクリック/ドラッグしてフォント表示を変更
- axis regions と interpolation zones のオーバーレイ表示
- 技術: samsa-core + Canvas

**D3. バリアブルフォントアニメーター**
- 軸の値を時間軸に沿ってアニメーション（ウェイトが thin → black にスムーズに変化 等）
- キーフレーム設定 UI でカスタムアニメーション作成
- CSS `@keyframes` + `font-variation-settings` のコード生成
- 技術: CSS Animation + requestAnimationFrame

**D4. avar2 / ItemVariationStore ビジュアライザ**
- avar テーブル（axis variations）のマッピング関数をグラフ表示
- 入力値（ユーザー座標）→ 出力値（正規化座標）の変換をインタラクティブに確認
- 技術: samsa-core + Canvas/Chart ライブラリ

#### カテゴリ E: テキストレイアウト・メトリクス

**E1. カーニングペアビジュアライザ**
- フォントのカーニングペア（kern テーブルまたは GPOS Pair Adjustment）を一覧表示
- 特定の文字ペアのカーニング値を検索
- グリフ間のスペーシング調整をビジュアル表示（矢印と数値）
- クラスカーニングの場合、どのクラスにどのグリフが属するかを表示
- 技術: opentype.js + Canvas

**E2. テキストメトリクスインスペクタ**
- テキストを入力すると、各グリフの advance width, side bearings, bounding box を表示
- 行全体の幅計算過程を可視化
- 複数フォント間でメトリクスを比較
- 技術: opentype.js + Canvas

**E3. マーク・アンカーポジショニングデモ**
- GPOS Mark-to-Base、Mark-to-Ligature、Mark-to-Mark ポジショニングを可視化
- アンカーポイントの位置をグリフ上に表示
- アクセント記号やダイアクリティカルマークの配置をステップ表示
- 技術: harfbuzzjs + opentype.js + Canvas

**E4. 行組版シミュレータ**
- テキストの行分割・ジャスティフィケーション過程を可視化
- word spacing, letter spacing, justification alternates の効果を確認
- 縦書き（vertical layout）対応
- 技術: harfbuzzjs + Canvas

#### カテゴリ F: 教育・学習ツール

**F1. OpenType テーブル関係図**
- フォント内の全テーブルの依存関係をインタラクティブなグラフで表示
- 例: cmap → glyf/CFF, GSUB → GDEF, GPOS → GDEF 等
- 各テーブルをクリックすると概要説明と仕様ページへのリンクを表示
- 技術: D3.js / Mermaid / カスタム SVG

**F2. Lookup Type リファレンスカード**
- GSUB の 7 つの Lookup Type（Single, Multiple, Alternate, Ligature, Context, Chaining Context, Extension）をインタラクティブに説明
- 各 Type のバイナリ構造をダイアグラムで表示
- サンプルデータで「この入力に対してこの Lookup はこう動く」を実演
- GPOS の Lookup Type も同様に網羅
- 技術: カスタム UI + opentype.js

**F3. Feature → Lookup → Rule マッピングエクスプローラ**
- Script → Language → Feature → Lookup → SubTable → Rule の階層構造をドリルダウン表示
- 「この Feature Tag は内部的にどの Lookup を参照しているか」を可視化
- フォントファイルをアップロードして実際の構造を確認
- 技術: opentype.js

**F4. CFF / glyf アウトライン形式比較ツール**
- 同じグリフを TrueType (glyf) と CFF で比較
- 二次ベジェ曲線（TrueType）vs 三次ベジェ曲線（CFF）の違いを視覚的に表示
- 制御点の数、パスの構造の違いをハイライト
- 技術: opentype.js + Canvas

**F5. OpenType Feature Code エディタ & プレビュー**
- `.fea` 形式の Feature コードを入力
- プレビューフォントに Feature を適用した結果をリアルタイム表示
- シンタックスハイライト付きエディタ（CodeMirror / Monaco）
- 技術: 将来的には fontc (WASM) との統合の可能性

#### カテゴリ G: 実用ツール

**G1. フォント CSS ジェネレーター（Wakamai Fondue 的）**
- フォントファイルをアップロードすると、最適な CSS を自動生成
- `@font-face`, `font-feature-settings`, `font-variation-settings` のコード
- サポートする Feature の一覧と使い方の説明付き
- 技術: opentype.js

**G2. フォント情報サマリー**
- name テーブルからフォント名、デザイナー、ライセンス等を抽出
- OS/2 テーブルからウェイトクラス、幅クラス、Unicode カバレッジ等を表示
- サポートする Unicode ブロック・スクリプトの一覧
- 技術: opentype.js

**G3. WOFF/WOFF2 変換デモ**
- TTF/OTF ↔ WOFF/WOFF2 の変換過程を教育的に表示
- 圧縮前後のサイズ比較
- WOFF ヘッダ構造の解説
- 技術: woff2 WASM ライブラリ

**G4. フォント diff ツール**
- 2つのフォントファイルのテーブル構造を比較
- テーブルごとの差分をハイライト表示
- バージョン管理的な用途（フォントの更新時の変更確認）
- 技術: opentype.js

---

### 2c. 既存の参考実装

#### Wakamai Fondue (wakamaifondue.com)
- 「このフォントは何ができるか」を回答するツール
- 技術スタック: Vue.js + Fontkit / Font.js
- すべてクライアントサイド処理（サーバーアップロードなし）
- OT Feature の一覧、CSS コード生成、文字カバレッジ表示
- CLI 版もあり（`wakamai-fondue-cli`）
- **otspec.dev への示唆**: Feature Tag テスターや CSS ジェネレーターのUXの参考になる

#### FontDrop! (fontdrop.info)
- フォントファイルの中身を表示するシンプルなWebアプリ
- 技術スタック: opentype.js + HTML Canvas（Adobe Blank をフォールバック）
- メタデータ、グリフ一覧、リガチャ、OT Feature を表示
- **otspec.dev への示唆**: opentype.js を使ったグリフレンダリングの実装参考

#### opentype.js 公式デモ (opentype.js.org)
- Glyph Inspector: グリフのアウトライン・制御点・メトリクスを Canvas で描画
- Font Inspector: `font.toTables()` によるテーブル構造の表示
- **otspec.dev への示唆**: グリフインスペクタの基本実装をそのまま参考にできる

#### Axis-Praxis / Samsa (axis-praxis.org)
- バリアブルフォントのテスト・可視化ツール
- Samsa: samsa-core ライブラリでバリアブルフォントを解析、デザインスペースを可視化
- ポイント座標の変化、メトリクスの変化をリアルタイム表示
- **otspec.dev への示唆**: バリアブルフォント Playground の UI・UX の参考

#### Crowbar (simoncozens/crowbar)
- テキストシェーピングデバッガ
- 技術スタック: React + harfbuzzjs + opentype.js
- GSUB/GPOS の Lookup 適用をステップごとに表示
- Feature の ON/OFF 切り替え
- **otspec.dev への示唆**: Lookup ステップ実行ビジュアライザの直接的な参考実装。otspec.dev ではこれをより洗練された UI で再実装し、仕様ページとの相互リンクを追加する

#### Font Playground (play.typedetail.com)
- バリアブルフォントで遊ぶためのツール
- 技術スタック: Vue.js + Wakamai Fondue エンジン + variableFont.js
- **otspec.dev への示唆**: バリアブルフォントスライダーの UX 参考

#### FontGoggles (fontgoggles.org)
- macOS デスクトップアプリ（Web ではない）
- テキストシェーピングとバリアブルフォントの振る舞いに焦点
- **otspec.dev への示唆**: 機能面での参考（Web 版として再実装するイメージ）

---

## 3. デプロイとインフラ

### 3.1 Cloudflare Pages へのデプロイ

#### 現状（2026年3月時点）

- Cloudflare は 2025年4月に Pages を「メンテナンスモード」に移行し、新規プロジェクトには **Cloudflare Workers** を推奨
- ただし、静的サイトのデプロイにおいて Pages は完全に機能しており、引き続き使用可能
- **Astro は Cloudflare が買収**（2026年1月）しているため、Astro + Cloudflare の組み合わせは今後も最もサポートされるパスになる

#### 推奨デプロイ方法

**方法 A: Cloudflare Git 統合（最もシンプル）**

1. Cloudflare ダッシュボード → Workers & Pages → Create application
2. GitHub リポジトリを接続
3. フレームワークプリセットで「Astro」を選択（ビルドコマンドとアウトプットディレクトリが自動設定）
4. プッシュごとに自動ビルド・デプロイ

**方法 B: GitHub Actions + Wrangler（より柔軟）**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=otspec-dev --branch=${{ github.ref_name }}
```

- メリット: PR ごとのプレビューデプロイ（`--branch` フラグ）、ビルドプロセスのカスタマイズ、テストの統合
- 必要なシークレット: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

### 3.2 otspec.dev ドメインとの接続

ドメインが既に Cloudflare で管理されているため、接続は非常にシンプル:

1. Cloudflare Pages プロジェクト作成後、Custom Domains タブで `otspec.dev` を追加
2. Cloudflare が自動的に DNS レコードを追加し、SSL 証明書をプロビジョニング
3. CNAME フラッテニングにより apex ドメイン（`otspec.dev`）でも CNAME レコードが使用可能
4. **追加の DNS 設定は不要**（同一アカウント内のため）

### 3.3 CI/CD パイプライン設計

推奨するパイプライン構成:

- **main ブランチへのプッシュ**: 本番環境（`otspec.dev`）にデプロイ
- **PR 作成時**: プレビュー環境にデプロイ（`<branch-name>.otspec-dev.pages.dev` のようなURL）
- **リンクチェック**: ドキュメント内のリンク切れを検出
- **型チェック / Lint**: Astro の型チェック + ESLint
- **ビルドテスト**: PR 時にビルドが通ることを確認

---

## 4. コンテンツの記述形式

### 4.1 MDX の活用方法

Astro Starlight では MDX を以下のように活用する:

```mdx
---
title: GSUB — Glyph Substitution Table
description: GSUB テーブルはグリフの置換ルールを定義します
---

import { Tabs, TabItem } from '@astrojs/starlight/components';
import LookupVisualizer from '../../components/LookupVisualizer';
import TableExplorer from '../../components/TableExplorer';

## 概要

GSUB テーブルは...（仕様の解説テキスト）

## インタラクティブデモ

<LookupVisualizer
  client:visible
  defaultFont="/fonts/example.woff2"
  defaultText="office"
  highlightLookupType="Ligature"
/>

## Lookup Types

<Tabs>
  <TabItem label="Single Substitution">
    ...
  </TabItem>
  <TabItem label="Ligature Substitution">
    ...
  </TabItem>
</Tabs>
```

ポイント:
- `client:visible` ディレクティブにより、Playground コンポーネントはビューポートに入ったときにのみハイドレーション（パフォーマンス最適化）
- Starlight 組み込みコンポーネント（Tabs, Card, Aside 等）と Playground コンポーネントを混在可能
- 仕様の解説テキスト（静的）と Playground（動的）が自然に共存

### 4.2 コンテンツとコードの分離戦略

推奨するディレクトリ構造:

```
otspec.dev/
├── src/
│   ├── content/
│   │   └── docs/           # コンテンツ（MDX）
│   │       ├── en/
│   │       │   ├── tables/
│   │       │   │   ├── gsub.mdx
│   │       │   │   ├── gpos.mdx
│   │       │   │   ├── cmap.mdx
│   │       │   │   └── ...
│   │       │   ├── concepts/
│   │       │   │   ├── shaping.mdx
│   │       │   │   ├── features.mdx
│   │       │   │   └── ...
│   │       │   ├── guides/
│   │       │   │   ├── getting-started.mdx
│   │       │   │   └── ...
│   │       │   └── playground/
│   │       │       ├── table-explorer.mdx
│   │       │       ├── glyph-inspector.mdx
│   │       │       └── ...
│   │       └── ja/          # 日本語版（同じ構造）
│   │           └── ...
│   ├── components/
│   │   ├── playground/      # Playground コンポーネント
│   │   │   ├── LookupVisualizer.tsx
│   │   │   ├── GlyphInspector.tsx
│   │   │   ├── TableExplorer.tsx
│   │   │   ├── FeatureTester.tsx
│   │   │   ├── VariableSlider.tsx
│   │   │   └── ...
│   │   └── ui/              # 共通 UI コンポーネント
│   │       └── ...
│   ├── lib/
│   │   ├── font-parser.ts   # opentype.js ラッパー
│   │   ├── shaper.ts        # harfbuzzjs ラッパー
│   │   └── ...
│   └── assets/
│       └── fonts/           # サンプルフォント
├── public/
│   └── fonts/               # 静的配信フォント
├── astro.config.mjs
├── content.config.ts        # Content Collections スキーマ
└── package.json
```

分離の原則:
- **`content/docs/`**: Markdown/MDX のみ。仕様の解説テキストとコンポーネントの import 文。コントリビューターはここを編集する
- **`components/playground/`**: Playground の実装コード。フォント処理ロジック・UI を含む
- **`lib/`**: フォントライブラリのラッパー。opentype.js / harfbuzzjs の API を抽象化
- **`assets/fonts/`**: デモ用のサンプルフォント（OFL ライセンスのもの）

### 4.3 コントリビューションしやすい構造

- **Content Collections スキーマ**: フロントマター（title, description, tableTag, specVersion 等）を Zod スキーマで定義。型安全で、コントリビューターが不正なメタデータを入れるとビルドエラーで検出
- **テンプレートファイル**: 新しいテーブル仕様ページを追加するためのテンプレート `.mdx` を用意
- **コンポーネントのドキュメント**: Playground コンポーネントの props・使い方を JSDoc/TypeDoc で記述
- **コントリビューションガイド**: MDX の書き方、Playground コンポーネントの埋め込み方を CONTRIBUTING.md で説明
- **Markdown でも OK**: 単純な解説ページは `.md` で書ける（Playground を埋め込む場合のみ `.mdx`）

---

## 5. 総合的な推奨技術スタック

- フレームワーク: **Astro + Starlight**
- Playground UI: **React**（エコシステムの大きさ、harfbuzzjs/opentype.js との組み合わせ実績、Crowbar が React で実装済み）
- フォントパース: **opentype.js**
- テキストシェーピング: **harfbuzzjs**
- バリアブルフォント: **samsa-core**
- スタイリング: **Tailwind CSS v4**（Starlight が対応）
- Canvas 描画: Canvas 2D API 直接使用（軽量）。複雑な図は SVG
- 検索: **Pagefind**（組み込み、ゼロコンフィグ）
- ホスティング: **Cloudflare Pages / Workers**
- CI/CD: **GitHub Actions + wrangler-action**
- ドメイン: **otspec.dev**（Cloudflare DNS、SSL 自動）
- コンテンツ形式: **MDX**（Content Collections でスキーマ定義）
- i18n: **Starlight 組み込み i18n**（日本語 + 英語）

---

## Sources

- [Starlight vs. Docusaurus for building documentation - LogRocket Blog](https://blog.logrocket.com/starlight-vs-docusaurus-building-documentation/)
- [Coding the Perfect Documentation: Vitepress vs Astro Starlight - DEV Community](https://dev.to/kevinbism/coding-the-perfect-documentation-deciding-between-vitepress-and-astro-starlight-2i11)
- [Astro in 2026: Why It's Beating Next.js for Content Sites - DEV Community](https://dev.to/polliog/astro-in-2026-why-its-beating-nextjs-for-content-sites-and-what-cloudflares-acquisition-means-6kl)
- [Astro vs Next.js: Which Framework Should You Use in 2026? - Pagepro](https://pagepro.co/blog/astro-nextjs/)
- [Starlight: Using Components](https://starlight.astro.build/components/using-components/)
- [Starlight: i18n](https://starlight.astro.build/guides/i18n/)
- [Starlight: Site Search](https://starlight.astro.build/guides/site-search/)
- [Astro MDX Integration](https://docs.astro.build/en/guides/integrations-guide/mdx/)
- [Astro Cloudflare Deployment](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Cloudflare Pages Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Wrangler GitHub Action](https://github.com/cloudflare/wrangler-action)
- [opentype.js](https://opentype.js.org/)
- [harfbuzzjs - npm](https://www.npmjs.com/package/harfbuzzjs)
- [harfbuzzjs - GitHub](https://github.com/harfbuzz/harfbuzzjs)
- [Crowbar: A text shaping debugger - GitHub](https://github.com/simoncozens/crowbar)
- [Samsa: Variable font inspector - GitHub](https://github.com/Lorp/samsa)
- [rustybuzz-wasm - npm](https://www.npmjs.com/package/rustybuzz-wasm)
- [Wakamai Fondue](https://wakamaifondue.com/)
- [FontDrop!](https://fontdrop.info/)
- [Font Playground](https://play.typedetail.com/)
- [CommonType - Annotated OpenType Specification](https://github.com/commontype-standard/commontype)
- [State of Text Rendering 2024 - Behdad Esfahbod](https://behdad.org/text2024/)
- [Fonts and Layout - Simon Cozens](https://simoncozens.github.io/fonts-and-layout/features.html)
- [Microsoft OpenType Specification](https://learn.microsoft.com/en-us/typography/opentype/spec/)
- [Algolia DocSearch + Astro Starlight](https://www.algolia.com/blog/engineering/algolia-docsearch-astro-starlight-part-2)
- [Multi-framework docs with Astro Starlight - Arcjet Blog](https://blog.arcjet.com/multi-framework-docs-with-astro-starlight/)
