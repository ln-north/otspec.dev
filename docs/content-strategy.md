# コンテンツ戦略

## 1. OpenType 仕様の課題分析

### 現状の問題

Microsoft の OpenType 仕様書（v1.9.1）には以下の構造的課題がある。

**循環的な依存関係**
- GSUB/GPOS を読むには chapter2（共通テーブルフォーマット）の知識が必要
- chapter2 を読むには GSUB/GPOS の文脈が必要
- GDEF のグリフ分類は GSUB/GPOS の Lookup Flag に影響するが、章をまたがないと理解できない

**ページの巨大さ**
- GPOS は約 16,000 語、GSUB は約 9,000 語
- 1ページに全 Lookup Type を詰め込む構成
- ページ内ナビゲーションが貧弱

**抽象度のミスマッチ**
- バイナリレベルの仕様記述（Offset16, uint16 等）
- 具体例が全て生の Hex データ
- フォント開発者が必要とする「何をどう使うか」の実用ガイドがない

**入門の完全な欠如**
- Getting Started やチュートリアルが存在しない
- 前提知識（バイナリフォーマット、Unicode、タイポグラフィ）を暗黙に要求

**Feature Tag と Lookup の断絶**
- Feature 解説ページと Lookup 定義ページが独立
- 「liga を実装するには Lookup Type 4 を使う」という対応関係が一箇所にまとまっていない

## 2. .fea（Feature File）構文を中核コンテンツに据える

### なぜ .fea が重要か

OpenType 仕様はバイナリ構造を定義しているが、フォント開発者が実際に書くのは .fea（Feature File）構文。仕様と実装の間に .fea がある。

```
仕様（バイナリ定義） ← otspec.dev が橋渡し → .fea（開発者が書くコード） → フォントバイナリ
```

ほとんどのフォント開発者は Lookup Type のバイナリ構造を直接書かない。fontmake や AFDKO が .fea ファイルからバイナリを生成する。つまり:

- **フォント開発者が知りたいこと**: 「この Feature を実装するには .fea でどう書くか」
- **Web 開発者が知りたいこと**: 「この Feature を CSS でどう使うか」
- **エンジン開発者が知りたいこと**: 「バイナリ上のテーブル構造はどうなっているか」

otspec.dev は3者すべてをカバーするが、ページの構成順序は上記の順に合わせる:

```
1. 動作・意味の説明（全員が読む）
2. .fea での書き方（フォント開発者が読む）
3. CSS での使い方（Web 開発者が読む）
4. バイナリ構造の詳細（折りたたみ — エンジン開発者が読む）
```

### 参照する .fea 仕様

- Adobe OpenType Feature File Specification
  - https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html
- otspec.dev では .fea の構文自体の解説はしない（Adobe 仕様に委ねる）
- 各 Lookup Type / Feature Tag ページに「.fea ではこう書く」の実例を併記する

### MDN ページの共通パターン（参考）

MDN の全ページタイプ（HTML 要素 / CSS プロパティ / JS API）に共通する構成要素:

1. **タイトル + 人間が読みやすい名前**（例: `<a>: The Anchor element`）
2. **導入段落**（「何をするか」から始める）
3. **Try it**（冒頭近くのインタラクティブデモ — まず触る体験）
4. **構文 / 属性 / パラメータ**（定義リスト形式でスキャンしやすく）
5. **Examples**（基本 → 応用 → アンチパターンの段階的構成）
6. **Specifications**（仕様書への正確なリンク）
7. **Browser compatibility**（自動生成の互換性テーブル）
8. **See also**（関連ページへの横断リンク）

### MDN が仕様書に「追加」しているもの

- **Try it（インタラクティブデモ）**: 即座に動作を体験できるライブエディタ
- **段階的なコード例**: 学習曲線に沿った例の提示
- **アクセシビリティガイダンス**: 実践的な WCAG 準拠ガイド（良い例 / 悪い例の対比）
- **ブラウザ互換性テーブル**: 「使えるか」の即座の判断
- **Baseline インジケーター**: 機能の安定度を一目で把握
- **Security / Privacy セクション**: 実践的な注意事項
- **Note / Warning ブロック**: 重要な注意点を視覚的に強調

### MDN が仕様書から「削除」しているもの

- IDL 定義
- アルゴリズムステップ（実装者向け詳細手順）
- 適合性要件の形式的言語（MUST/SHALL/SHOULD）
- 属性間の依存関係の形式的定義

## 3. コンテンツカテゴリ

### A. ガイド（学習パス）

段階的に OpenType を学べるチュートリアル形式。

- **Getting Started**: OpenType とは何か、このサイトの使い方
- **フォントの基本構造**: テーブルディレクトリ、必須テーブル、データ型
- **文字からグリフへ**: cmap テーブル、Unicode マッピング
- **グリフのアウトライン**: TrueType vs CFF vs SVG、制御点、ベジェ曲線
- **メトリクスとスペーシング**: advance width, side bearing, line metrics
- **OpenType Layout 入門**: Script → Language → Feature → Lookup の階層
- **グリフ置換（GSUB）入門**: リガチャ、代替字形、文脈依存置換
- **グリフ位置決め（GPOS）入門**: カーニング、マーク配置
- **バリアブルフォント入門**: 軸、名前付きインスタンス、CSS での使い方
- **カラーフォント入門**: COLR/CPAL、SVG、ビットマップの比較

### B. コンセプト（概念解説）

OpenType の重要な概念を深掘りするページ。

- **OpenType Layout の仕組み**: Script/Language/Feature/Lookup の階層構造と処理フロー
- **テキストシェーピングとは**: Unicode テキストがグリフ列になるまでの全過程
- **Coverage テーブルと Class Definition**: 共通テーブルフォーマットの概念説明
- **Lookup Flag とフィルタリング**: GDEF との連携、マークのスキップ
- **コンテキスト依存の処理**: Contextual / Chaining Contextual の統一解説
- **バリアブルフォントの内部構造**: ItemVariationStore、デルタセット、軸座標
- **Feature のデフォルトと処理順序**: required features、シェーパーの適用順序

### C. リファレンス — テーブル

OpenType の各テーブルの個別リファレンス。

**必須テーブル**
- `cmap` — 文字コードからグリフへのマッピング
- `head` — フォントヘッダ
- `hhea` — 水平メトリクスヘッダ
- `hmtx` — 水平メトリクス
- `maxp` — Maximum profile
- `name` — 名前テーブル
- `OS/2` — OS/2 メトリクス
- `post` — PostScript 情報

**アウトライン**
- `glyf` — TrueType グリフデータ
- `loca` — グリフ位置インデックス
- `CFF` / `CFF2` — Compact Font Format
- `SVG` — SVG アウトライン

**OpenType Layout（重点カテゴリ）**
- `GSUB` — グリフ置換
  - 各 Lookup Type（1-8）を**個別サブページ**に分割
- `GPOS` — グリフ位置決め
  - 各 Lookup Type（1-9）を**個別サブページ**に分割
- `GDEF` — グリフ定義
- `BASE` — ベースライン
- `JSTF` — ジャスティフィケーション
- `MATH` — 数式レイアウト

**バリアブルフォント**
- `fvar` — 軸定義
- `STAT` — スタイル属性
- `gvar` — グリフバリエーション
- `avar` — 軸マッピング
- `HVAR` / `VVAR` / `MVAR` — メトリクスバリエーション
- `cvar` — CVT バリエーション

**カラーフォント**
- `COLR` / `CPAL` — レイヤーベースカラー
- `CBDT` / `CBLC` — カラービットマップ
- `sbix` — Apple ビットマップ

**その他**
- `kern` — カーニング（レガシー）
- `DSIG` — デジタル署名
- `meta` — メタデータ

### D. リファレンス — Feature Tags

約120個の Feature Tag を**カテゴリ別**に整理。各 Feature に個別ページを作成。

**リガチャ系**
- `liga`（Standard Ligatures）, `dlig`（Discretionary Ligatures）, `hlig`（Historical Ligatures）, `clig`（Contextual Ligatures）, `rlig`（Required Ligatures）

**字形バリエーション系**
- `smcp`（Small Capitals）, `c2sc`（Capitals to Small Capitals）, `swsh`（Swash）, `salt`（Stylistic Alternates）, `ss01`-`ss20`（Stylistic Sets）, `cv01`-`cv99`（Character Variants）

**数字系**
- `lnum`（Lining Figures）, `onum`（Oldstyle Figures）, `pnum`（Proportional Figures）, `tnum`（Tabular Figures）, `frac`（Fractions）

**カーニング・スペーシング系**
- `kern`（Kerning）, `cpsp`（Capital Spacing）, `palt`（Proportional Alternates）, `halt`（Alternate Half Widths）

**マーク配置系**
- `mark`（Mark Positioning）, `mkmk`（Mark to Mark Positioning）

**スクリプト固有**
- アラビア語: `init`, `medi`, `fina`, `isol`
- インド系: `akhn`, `half`, `pref`, `pstf`, `rkrf`
- CJK: `jp78`, `jp83`, `jp90`, `jp04`, `fwid`, `hwid`, `pwid`

### E. Playground

独立したインタラクティブツール群。詳細は後述。

### F. 用語集

OpenType に特有の用語を定義。各ページから参照できるリンク形式。

例: グリフ、コードポイント、Lookup、Coverage、ClassDef、アンカーポイント、デルタセット、名前付きインスタンス、シェーピング

## 4. Playground

### 最優先（MVP に含める）

**P1. Feature Tag テスター**
- フォントが持つ全 Feature を一覧表示
- 各 Feature の ON/OFF トグル
- テキストプレビューがリアルタイム更新
- CSS `font-feature-settings` コードを自動生成
- 技術: CSS font-feature-settings + harfbuzzjs

**P2. GSUB/GPOS Lookup ステップ実行ビジュアライザ**
- テキスト入力 → シェーピングエンジンの各 Lookup をステップごとに表示
- 「再生」「一時停止」「前へ」「次へ」ボタン
- 各ステップでグリフストリームの変化をハイライト
- Feature ごとにグループ化表示
- 参考実装: Crowbar（simoncozens/crowbar）
- 技術: harfbuzzjs + opentype.js

**P3. バリアブルフォント軸スライダー**
- 全 variation axis をスライダーで操作
- リアルタイムでフォント表示が変化
- CSS `font-variation-settings` コード生成
- 名前付きインスタンスのプリセットボタン
- 技術: CSS font-variation-settings + samsa-core

**P4. グリフインスペクタ**
- グリフのアウトライン（ベジェ曲線）を拡大表示
- on-curve / off-curve ポイントを色分け
- メトリクス表示: advance width, side bearings, bounding box
- ベースライン、x-height、cap height 等のラインをオーバーレイ
- コンポジットグリフのコンポーネント分解
- 技術: opentype.js + Canvas

### 高優先（初期リリースに含める）

**P5. フォントテーブルエクスプローラ**
- フォントファイルをドラッグ＆ドロップ
- テーブルディレクトリ → 各テーブルの階層構造をツリービュー
- 各フィールドをクリックすると仕様ページにジャンプ
- 技術: opentype.js

**P6. リガチャ形成デモ**
- テキスト入力に対してリガチャの適用をアニメーション表示
- 例: "f" + "i" → "fi" のグリフが合体するアニメーション
- どの Lookup Rule がマッチしたかを表示
- 技術: harfbuzzjs + Canvas/SVG

**P7. cmap テーブルビジュアライザ**
- Unicode コードポイント → グリフ ID のマッピングをインタラクティブ表示
- 特定の文字を入力すると、どの cmap サブテーブルがマッチするかをステップ表示
- 技術: opentype.js

**P8. カーニングペアビジュアライザ**
- フォントのカーニングペアを一覧表示
- 特定の文字ペアの値を検索
- スペーシング調整をビジュアル表示（矢印と数値）
- クラスカーニングの場合のクラス所属表示
- 技術: opentype.js + Canvas

### 中優先（段階的に追加）

**P9. マーク/アンカーポジショニングデモ**
- GPOS Mark-to-Base, Mark-to-Ligature, Mark-to-Mark を可視化
- アンカーポイントの位置をグリフ上に表示
- 技術: harfbuzzjs + opentype.js + Canvas

**P10. カラーフォントレンダラー**
- COLR/CPAL のレイヤー構造を分解表示
- パレット色をインタラクティブに変更してプレビュー
- CSS `font-palette` コード生成
- 技術: opentype.js + Canvas

**P11. スクリプト別シェーピングパイプライン**
- ラテン、アラビア語、デーバナーガリー等のスクリプト別に HarfBuzz のパイプラインの違いを可視化
- 各スクリプトで適用される Feature の順序・種類を比較
- 技術: harfbuzzjs

**P12. OpenType テーブル関係図**
- フォント内の全テーブルの依存関係をインタラクティブグラフで表示
- 各テーブルをクリックすると概要と仕様ページへのリンク
- 技術: D3.js またはカスタム SVG

**P13. デザインスペースマップ**
- 2軸を選択して 2D マップ上でバリアブルフォントの designspace を可視化
- マップ上の任意の点をクリック/ドラッグ
- 技術: samsa-core + Canvas

**P14. フォントバイナリヘックスビューア**
- 生バイナリをヘックスダンプ形式で表示
- テーブルエントリをカラーコード表示
- 特定テーブル/フィールドのクリックで対応バイナリ範囲をハイライト
- 教育目的: 「仕様のこのフィールドはバイナリのここ」を視覚化

### 低優先（将来的に追加）

- **P15. グリフ比較ツール**: 2フォント間のグリフ形状比較
- **P16. バリアブルフォントアニメーター**: 軸値の時間遷移アニメーション + CSS コード生成
- **P17. avar2 ビジュアライザ**: 軸マッピング関数のグラフ表示
- **P18. Feature→Lookup マッピングエクスプローラ**: Script→Language→Feature→Lookup→Rule の階層ドリルダウン
- **P19. CFF / glyf 比較ツール**: 同一グリフの TrueType vs CFF アウトライン比較
- **P20. .fea コードエディタ & プレビュー**: Feature コードのシンタックスハイライト付きエディタ
- **P21. 行組版シミュレータ**: 行分割・ジャスティフィケーション過程の可視化
- **P22. WOFF/WOFF2 変換デモ**: 圧縮前後のサイズ比較と WOFF ヘッダ構造の解説
- **P23. フォント CSS ジェネレーター**: Wakamai Fondue 的な最適 CSS 自動生成
- **P24. フォント diff ツール**: 2フォント間のテーブル構造差分表示
- **P25. SVG-in-OpenType ビューア**: SVG テーブルのソースとレンダリング並列表示

## 5. Playground 技術構成

### ライブラリの組み合わせ

- **opentype.js**: フォントテーブルの読み取り・グリフパス抽出・Canvas/SVG 描画
- **harfbuzzjs**: テキストシェーピングの正確な再現（WASM。Figma/Prezi/Photopea で実績）
- **samsa-core**: バリアブルフォント解析・インスタンス生成（ES6 JS、依存ゼロ）

この組み合わせは Crowbar（テキストシェーピングデバッガ）と同じ構成で実績がある。

### 使い分けの原則

- フォント構造の解析・グリフ描画 → opentype.js
- テキストシェーピング（グリフ列生成） → harfbuzzjs
- バリアブルフォント固有機能 → samsa-core

## 6. わかりやすさの設計

### 「Try it」の OpenType 版

MDN の Try it はコードエディタ + ライブプレビューだが、OpenType では以下に変換する。

- **テーブルリファレンスページ**: そのテーブルの動作を示す Playground を埋め込み
  - GSUB ページ → Lookup ステップ実行ビジュアライザ
  - cmap ページ → cmap ビジュアライザ
  - fvar ページ → バリアブルフォントスライダー

- **Feature Tag ページ**: Feature ON/OFF のビフォア/アフターデモ
  - liga ページ → リガチャ形成デモ
  - kern ページ → カーニングペアビジュアライザ

### Note / Warning ブロックの活用

- **Note**: 仕様の重要なポイント、よくある誤解の訂正
- **Warning**: 互換性の問題、非推奨の機能
- **Tip**: 実践的なアドバイス、.fea での書き方
- **歴史**: 「なぜこうなっているか」の歴史的経緯（cmap の古いフォーマット等）

### ブラウザ互換性の代替: エンジン/ツール対応状況

MDN のブラウザ互換性テーブルに対応するものとして「エンジン/ツール対応状況」を検討。

- **シェーピングエンジン**: HarfBuzz, CoreText (macOS/iOS), DirectWrite (Windows), Uniscribe (Windows レガシー)
- **ブラウザ**: Chrome/Edge (HarfBuzz), Safari (CoreText), Firefox (HarfBuzz)
- **デザインツール**: Adobe (独自エンジン), Figma (harfbuzzjs)
- **フォント制作ツール**: fonttools, fontmake, AFDKO

### .fea 構文との対応

仕様書にない重要な情報として、各 Lookup Type / Feature Tag の .fea（Feature File）構文での書き方を併記。

例（GSUB Lookup Type 4: Ligature Substitution のページ）:

```
仕様での定義:
  LigatureSubstFormat1: Coverage + LigatureSet の構造

.fea での書き方:
  feature liga {
      sub f i by fi;
      sub f l by fl;
      sub f f i by ffi;
  } liga;

CSS での使い方:
  font-feature-settings: "liga" on;  /* デフォルトでON */
  font-variant-ligatures: common-ligatures;
```

### 図解の強化

仕様書の低解像度 GIF 画像の代わりに:

- **SVG ベースの図解**: ダークモード対応、高解像度、レスポンシブ
- **インタラクティブな図**: D3.js やカスタム SVG でテーブル構造を動的に表示
- **アニメーション**: シェーピング過程、リガチャ形成、マーク配置をアニメーションで説明

## 7. 既存リソース

### 参考にするリソース

- **"Fonts and Layout for Global Scripts"**（Simon Cozens 著、無料オンライン）
  - フォント設計の基礎から体系的にカバー。教育的構成の参考
  - https://simoncozens.github.io/fonts-and-layout/

- **Adobe OpenType Feature File Specification**
  - .fea 構文仕様。Lookup と .fea の対応の情報源
  - https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html

- **Inter フォントの Feature 解説**（rsms.me/inter）
  - Feature のビフォア/アフターの視覚的表示の参考

- **Crowbar**（simoncozens/crowbar）
  - Lookup ステップ実行ビジュアライザの直接的な先行実装

- **Wakamai Fondue**（wakamaifondue.com）
  - Feature テスター・CSS ジェネレーターの UX 参考

- **FontDrop!**（fontdrop.info）
  - opentype.js でのグリフレンダリング実装参考

### otspec.dev の独自価値

上記のリソースはそれぞれ部分的な情報を提供しているが、以下を統合するサイトは存在しない:

1. 仕様の体系的な解説（全テーブル、全 Feature Tag）
2. インタラクティブな Playground（仕様ページに埋め込み）
3. .fea 構文と CSS の対応付け
4. 段階的な学習パス（ガイド → コンセプト → リファレンス）
5. エンジン/ツール対応状況

ロードマップは [ROADMAP.md](../ROADMAP.md) を参照。
