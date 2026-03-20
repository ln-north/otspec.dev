# サイト構築の設計

## 1. コンセプト

### 「OpenType の MDN」とは何か

MDN Web Docs は、WHATWG/W3C/ECMA の仕様書を「開発者が使えるリファレンス」に変換している。otspec.dev は同じことを OpenType 仕様に対して行う。

**MDN が仕様書に対して行っている変換:**

- 形式的定義 → 動作説明（「何であるか」→「何をするか」）
- アルゴリズム → コード例（抽象的手順 → 具体的コード）
- 適合性要件 → 実践的ガイダンス（「MUST」→「〜すると良い」）
- 単一の定義 → 段階的な例示（基本 → 応用 → アンチパターン）
- 仕様のみ → 仕様 + 現実（ブラウザ互換性、アクセシビリティ）
- テキスト → インタラクション（Try it、ライブデモ）

**otspec.dev が OpenType 仕様に対して行う変換:**

- バイナリ構造定義 → 概念と動作の説明
- Hex データ例 → インタラクティブな Playground
- テーブル間の暗黙の依存 → 明示的な関係図とリンク
- 循環的な相互参照 → 段階的な学習パス
- 実装者向け仕様 → フォント開発者・Web 開発者向けガイド

### 対象ユーザー

1. **フォント開発者・デザイナー**: OpenType Feature を実装する人
2. **Web 開発者**: `font-feature-settings` や Variable Fonts を使う人
3. **テキストエンジン開発者**: HarfBuzz 等のシェーピングエンジンを理解したい人
4. **学習者**: フォント技術を学びたい人

## 2. フレームワーク選定: Astro + Starlight

### 比較結果

4つのフレームワーク（Astro Starlight / Next.js / Docusaurus / VitePress）を比較し、**Astro Starlight** を選定した。

### 選定理由

**Islands Architecture が Playground に最適**
- ドキュメントページは静的 HTML で高速配信
- Playground 部分だけを選択的にハイドレーション（`client:visible`）
- フォントパーサー（opentype.js）やシェーパー（harfbuzzjs WASM）は重いが、必要なときだけロード

**Cloudflare / GitHub との親和性**
- 2026年1月に Cloudflare が Astro 社を買収（MIT ライセンス・OSS は維持）
- GitHub Pages への静的デプロイも問題なくサポート
- otspec.dev のドメインは Cloudflare DNS で管理し、GitHub Pages を指す構成

**フレームワーク非依存**
- Playground を React/Svelte/Vue どれでも書ける
- 現時点では React を選択（エコシステムの大きさ、Crowbar の実績）

**ドキュメントサイトとしての完成度**
- Pagefind 検索がゼロコンフィグで動作
- i18n が組み込み（40言語以上の UI ラベル）
- Content Collections による型安全なコンテンツ管理

### 不採用理由

- **Next.js**: ドキュメントサイトにはオーバースペック。JS バンドルが大きい。検索・i18n が手動セットアップ
- **Docusaurus**: React 専用。Infima への依存。2025年以降 Starlight への移行トレンドが顕著
- **VitePress**: Vue 専用。MDX 非対応。バージョニング非対応

## 3. サイト構成

### URL 構造

```
otspec.dev/                          # トップページ
otspec.dev/ja/                       # 日本語トップ
otspec.dev/guides/                   # ガイド（学習パス）
otspec.dev/reference/                # リファレンス（テーブル仕様）
otspec.dev/reference/tables/{tag}/   # 個別テーブル（gsub, gpos, cmap 等）
otspec.dev/reference/features/{tag}/ # Feature Tag（liga, kern, smcp 等）
otspec.dev/concepts/                 # コンセプト（概念解説）
otspec.dev/playground/               # Playground 一覧
otspec.dev/playground/{tool}/        # 個別 Playground
otspec.dev/glossary/                 # 用語集
```

### ナビゲーション構造

**サイドバー:**
- ガイド（Getting Started → 基本構造 → レイアウト → 応用）
- コンセプト（OpenType Layout、バリアブルフォント、カラーフォント）
- リファレンス
  - テーブル（カテゴリ別にグループ化）
  - Feature Tags（カテゴリ別）
- Playground
- 用語集

**パンくずリスト:**
- 例: `Reference > Tables > GSUB > Lookup Type 4: Ligature`

**ページ内目次:**
- 各ページの H2 見出しをサイドに表示（Starlight 標準機能）

**関連ページリンク:**
- 各ページ末尾に "See also" セクション
- テーブル間の依存関係に基づく関連リンク
- 例: GSUB ページから → GDEF, chapter2 共通テーブル, Feature Tags

## 4. ページタイプと構成テンプレート

全ページタイプに共通する設計原則:
- **動作・意味が先、バイナリ定義は後**: 「何をするか」→「どう書くか」→「仕様上どうなっているか」の順
- **.fea 構文は中核コンテンツ**: フォント開発者の実装手段として、仕様とコードの橋渡し
- **バイナリ詳細は折りたたみ**: テーブル構造・ビットフィールドは `<details>` で隠す。テキストエンジン開発者向け

### Type 1: Feature Tag ページ（例: liga）

Feature Tag ページから構築を開始する。最もユーザーの検索ニーズが高く、1ページで自己完結する。

```
1. タイトル + 一行説明（「liga — Standard Ligatures」）
2. 概要（この Feature は何をするか、平易な説明）
3. Try it（Feature ON/OFF トグル + リアルタイムプレビュー）
4. 動作の詳細
   - いつ適用されるか、デフォルト ON/OFF
   - スクリプト/言語ごとの違い
5. .fea での実装
   - Feature File 構文のコード例
   - 実際のフォントでの書き方
6. CSS での使い方
   - font-feature-settings のコード例
   - font-variant-* の対応プロパティ
7. 使用する Lookup Type（→ テーブルリファレンスへのリンク）
8. エンジン/ツール対応状況
   - HarfBuzz / CoreText / DirectWrite
   - ブラウザ: Chrome, Safari, Firefox
9. ▸ 仕様上の詳細（折りたたみ: バイナリ構造、フィールド定義）
10. 仕様リンク（Microsoft 公式仕様へ）
11. See also（関連 Feature、関連テーブル）
```

### Type 2: テーブルリファレンスページ（例: GSUB）

```
1. タイトル + 一行説明
2. 概要（このテーブルは何をするか、いつ使うか）
3. Try it（Playground 埋め込み — Lookup ビジュアライザ等）
4. テーブル構造の概念説明（図解付き）
   - 処理フロー図（Script → Language → Feature → Lookup）
5. Lookup Types（個別サブページまたはタブ）
   各 Type ごとに:
   - 動作の説明（何をするか、いつ使うか）
   - .fea での書き方
   - ミニ Playground
   - 関連する Feature Tags
   - ▸ バイナリ構造（折りたたみ）
6. 実装ノート（HarfBuzz での挙動、エンジン間の違い）
7. ▸ テーブルヘッダ・共通構造の詳細（折りたたみ）
8. 仕様リンク
9. See also
```

### Type 3: コンセプトページ（例: OpenType Layout の仕組み）

```
1. タイトル
2. 導入（なぜこの概念が重要か）
3. 解説（SVG ベースの図解付き）
4. インタラクティブデモ（Playground 埋め込み）
5. 具体例（実際のフォントでの適用例）
6. 関連するテーブル/Feature へのリンク
7. さらに学ぶ（関連ガイド）
```

### Type 4: ガイドページ（チュートリアル形式）

```
前のページ ←                    → 次のページ
1. タイトル
2. 線形のナラティブ（学習パスの一部）
3. 図解・コード例・Playground を交えた段階的解説
4. まとめ / 次のステップ
前のページ ←                    → 次のページ
```

### Type 5: Playground ページ（独立ツール）

```
1. タイトル + 説明
2. フォント入力（アップロード / サンプル選択）
3. インタラクティブツール本体（フル幅）
4. 関連するリファレンスページへのリンク
```

## 5. デプロイとインフラ

### デプロイ構成

- **本番**: main ブランチ → GitHub Pages → otspec.dev
- **ホスティング**: GitHub Pages（静的サイト）
- **DNS**: Cloudflare（otspec.dev のドメイン管理）

### デプロイ方法: GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

### ドメイン接続

- Cloudflare DNS で `otspec.dev` の CNAME を `{org}.github.io` に向ける
- GitHub リポジトリの Settings → Pages → Custom domain に `otspec.dev` を設定
- SSL は GitHub Pages 側が Let's Encrypt で自動発行

## 6. オープンソースとコントリビューション

### リポジトリ構成

- コンテンツ（MDX）とプラットフォーム（Astro + Playground コンポーネント）を同一リポジトリで管理
- MDN と異なり、規模が小さいためモノレポで十分

### コントリビューション設計

- **コンテンツ追加**: `src/content/docs/` の MDX ファイルを編集するだけ
- **Content Collections スキーマ**: フロントマターを Zod で型検証し、不正なメタデータをビルド時に検出
- **テンプレート**: 新しいテーブル/Feature ページのテンプレート MDX を用意
- **CONTRIBUTING.md**: MDX の書き方、Playground コンポーネントの埋め込み方を解説
## 7. MDN との構成比較

### MDN の構成

- **mdn/content**: コンテンツ本体（Markdown + KumaScript マクロ）
- **mdn/yari**: プラットフォーム・ビルドシステム（TypeScript + EJS）
- **mdn/browser-compat-data**: ブラウザ互換性データ（JSON）
- **mdn/translated-content**: 翻訳コンテンツ

### otspec.dev の対応

- コンテンツ + プラットフォームを単一リポジトリで管理（規模が小さいため）
- KumaScript マクロの代わりに MDX コンポーネントを使用
- ブラウザ互換性の代わりに「エンジン/ツール対応状況」を検討
  - HarfBuzz, CoreText, DirectWrite, FreeType 等のサポート状況
- i18n は Starlight の組み込み機能を使用
