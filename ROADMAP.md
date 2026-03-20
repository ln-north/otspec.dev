# Roadmap

otspec.dev のフェーズ別ロードマップ。各フェーズにコンテンツと実装の両方を含む。

---

## Phase 0: プロジェクト骨格

**目標**: `otspec.dev` にアクセスすると Starlight のページが表示される状態。

### 実装

- GitHub リポジトリ作成（public）、`.gitignore`, `LICENSE`（MIT）
- Astro + Starlight セットアップ
  - MDX 統合（`@astrojs/mdx`）
  - React 統合（`@astrojs/react`）
  - Tailwind CSS v4
  - i18n 設定（デフォルト: ja）
  - サイドバー構成の骨格
- Content Collections スキーマ（`content.config.ts`、Zod）
- GitHub Actions → GitHub Pages デプロイ
- Cloudflare DNS で CNAME 設定（`otspec.dev` → `{org}.github.io`）

### コンテンツ

- ランディングページ（サイトのコンセプト説明）

### 完了条件

- `otspec.dev` にランディングページが表示される
- `npm run dev` でローカル開発可能
- `main` プッシュで自動デプロイ

---

## Phase 1: 最初の Feature Tag ページ

**目標**: `liga` ページが完成し、サイトのビジョンが具体化する。

### なぜ Feature Tag から始めるか

- 検索ニーズが最も高い（「OpenType liga」「font-feature-settings」）
- 1ページで自己完結する（GSUB 全体を知らなくても `liga` 単独で価値がある）
- サイトの差別化が即座に伝わる（Try it + .fea + CSS の三点セット）
- 外部ライブラリ不要（CSS `font-feature-settings` だけで Feature デモが動く）
- テンプレートが決まれば量産可能

### 実装

- Feature Tag ページ用 MDX テンプレート
- 共通コンポーネント（React）:
  - `FeatureDemo` — Feature ON/OFF トグル + テキストプレビュー（CSS ベース、`client:visible`）
  - `FeaCodeBlock` — .fea 構文のシンタックスハイライト
  - `CssCodeBlock` — CSS コードブロック + コピーボタン
  - `EngineCompat` — エンジン/ツール対応状況
  - `SpecLink` — Microsoft 仕様へのリンク
  - `BinaryDetails` — 折りたたみ可能なバイナリ構造詳細
- サンプルフォント選定（OFL ライセンス、WOFF2）: liga, kern, smcp, onum/lnum, salt を全て持つもの
- Feature Tag テスター（独立 Playground ページ、FeatureDemo の拡張版）

### コンテンツ（5 Feature Tag ページ）

`liga` を最初に作り込みテンプレートを確立、残り4つで横展開を検証。

- **`liga`**（Standard Ligatures）← 最初のページ
  - GSUB Lookup Type 4。CSS: `font-variant-ligatures: common-ligatures`。デフォルト ON
- **`kern`**（Kerning）
  - GPOS Lookup Type 2。CSS: `font-kerning: auto`。デフォルト ON
- **`smcp`**（Small Capitals）
  - GSUB Lookup Type 1。CSS: `font-variant-caps: small-caps`。デフォルト OFF
- **`onum`/`lnum`**（Oldstyle / Lining Figures）
  - GSUB Lookup Type 1。CSS: `font-variant-numeric`。対になる Feature の例
- **`salt`**（Stylistic Alternates）
  - GSUB Lookup Type 3。CSS: `font-feature-settings: "salt" 1`。`ss01`-`ss20` との違い

この5つで GSUB Lookup Type 1, 3, 4 と GPOS Lookup Type 2 をカバー。

### 完了条件

- `otspec.dev/reference/features/liga/` に完全なページが表示される
- Try it デモが動作する（Feature ON/OFF でテキスト表示が変化）
- 5つの Feature Tag ページが同じ品質
- `otspec.dev/playground/feature-tester/` が動作する

---

## Phase 2: コンセプトとテーブルリファレンスの基盤

**目標**: Feature Tag ページからリンクされるページが存在し、サイト内回遊が成立する。

### 実装

- テーブルリファレンス用 MDX テンプレート
- Lookup Type ページ用テンプレート
- **fontations WASM 導入** — Rust → WASM（wasm-pack）でフォントパーサーを構築
- コンポーネント追加:
  - `LookupDemo` — Lookup Type の動作デモ（CSS ベース軽量版）
  - `TableStructure` — テーブル構造の図解
- グリフインスペクタ Playground（fontations WASM + Canvas）

### コンテンツ

**コンセプト（2ページ）**
- OpenType Layout の仕組み（Script → Language → Feature → Lookup の図解）
- テキストシェーピングとは（パイプライン図）

**テーブルリファレンス（4ページ）** — Phase 1 の Feature から自然にリンクされる Lookup のみ
- GSUB 概要 + Lookup Type 1（Single）← smcp, onum, lnum から
- GSUB Lookup Type 3（Alternate）← salt から
- GSUB Lookup Type 4（Ligature）← liga から
- GPOS 概要 + Lookup Type 2（Pair Adjustment）← kern から

**Feature Tag（追加 5-10ページ）**
- dlig, frac, tnum/pnum, c2sc, swsh, ss01-ss03

### 完了条件

- `liga` → 「Lookup Type 4 を使用」→ GSUB Lookup Type 4 ページ のリンクが機能
- OpenType Layout の仕組みページに図解がある
- グリフインスペクタが動作する

---

## Phase 3: テーブルリファレンス充実と高度な Playground

**目標**: GSUB/GPOS の全 Lookup Type をカバー。harfbuzzjs による高度な Playground。

### 実装

- **harfbuzzjs 導入**（WASM）— シェーピングエンジン
- `lib/shaper.ts` — harfbuzzjs ラッパー
- Playground 追加:
  - Lookup ステップ実行ビジュアライザ（参考: Crowbar）
  - リガチャ形成デモ（アニメーション）
  - カーニングペアビジュアライザ
  - cmap ビジュアライザ

### コンテンツ

**テーブルリファレンス**
- GSUB 残りの Lookup Types（Type 2, 5, 6, 7, 8）
- GPOS 残りの Lookup Types（Type 1, 3, 4, 5, 6, 7, 8, 9）
- GDEF（グリフ分類、Lookup Flag との連携）
- cmap（Format 4, 12, 14、Unicode Variation Sequences）

**コンセプト（追加 3ページ）**
- Coverage テーブルと Class Definition
- Lookup Flag とフィルタリング
- コンテキスト依存の処理

**Feature Tag（追加 15-20ページ）**
- mark, mkmk, init/medi/fina/isol, cpsp, palt, halt, fwid/hwid/pwid, calt, rclt, rlig

**ガイド**
- Getting Started

### 完了条件

- GSUB/GPOS の全 Lookup Type がカバーされている
- Lookup ビジュアライザでシェーピング過程を観察できる

---

## Phase 4: 全テーブルカバーとコミュニティ開放

**目標**: 全テーブルをカバーし、コミュニティが貢献できる状態に。

### 実装

- Playground 追加（fontations WASM のバリアブルフォント API を活用）:
  - バリアブルフォント軸スライダー
  - フォントテーブルエクスプローラ
  - カラーフォントレンダラー
  - テーブル関係図
  - その他（低優先 Playground）

### コンテンツ

**テーブルリファレンス（残り全部）**
- バリアブルフォント: fvar, STAT, gvar, avar, HVAR/VVAR/MVAR, cvar
- カラーフォント: COLR/CPAL, CBDT/CBLC, sbix, SVG
- アウトライン: glyf, loca, CFF, CFF2
- メトリクス: head, hhea, hmtx, OS/2, name, post, maxp
- その他: BASE, JSTF, MATH, kern, DSIG, meta

**コンセプト（追加）**
- バリアブルフォントの内部構造
- カラーフォント技術の比較
- Feature のデフォルトと処理順序

**ガイド（追加）**
- フォントの基本構造、文字からグリフへ、グリフのアウトライン、メトリクス、バリアブルフォント入門、カラーフォント入門

**Feature Tag** — 残り全部（全約120個カバー）

**その他**
- i18n（英語版コンテンツ）
- 用語集
- CONTRIBUTING.md、テンプレート、Issue テンプレート

---

## 技術スタック導入タイミング

```
Phase 0: Astro + Starlight, React, Tailwind CSS, GitHub Actions
Phase 1: （新規ライブラリなし — CSS font-feature-settings で実現）
Phase 2: fontations（Rust → WASM via wasm-pack）
Phase 3: harfbuzzjs（C++ → WASM）
```

fontations がフォントパース・グリフ描画・バリアブルフォントを一括カバーするため、Phase 4 で追加ライブラリは不要。Phase 1 で外部フォントライブラリを使わないことで、初期の技術的複雑さを最小に抑え、コンテンツ作成に集中する。

## ページ数の見積もり

- Phase 0: 1ページ（ランディング）
- Phase 1: 約7ページ（Feature 5 + Playground 1 + ランディング）
- Phase 2: 約15ページ（Feature 7 + コンセプト 2 + テーブル 4 + Playground 1）
- Phase 3: 約40ページ（Feature 17 + テーブル 15 + コンセプト 3 + ガイド 1 + Playground 4）
- Phase 4: 100ページ以上（残り全部）
