# otspec.dev

## プロジェクト概要

**OpenType 仕様のための MDN** — Microsoft の OpenType Specification を、開発者・フォントデザイナーにとってわかりやすく、インタラクティブに学べるリファレンスサイト。

MDN が HTML/CSS/JS の仕様書（WHATWG/W3C/ECMA）を「開発者向けリファレンス」に変換しているのと同じアプローチで、OpenType 仕様を再構成する。

- サイト: https://otspec.dev
- 原典仕様: https://learn.microsoft.com/en-us/typography/opentype/spec/
- ライセンス: MIT（予定）

## 技術スタック

- フレームワーク: **Astro + Starlight**
- Playground UI: **React**（Islands Architecture で選択的ハイドレーション）
- フォントパース: **opentype.js**
- テキストシェーピング: **harfbuzzjs**（WASM）
- バリアブルフォント: **samsa-core**
- スタイリング: **Tailwind CSS v4**
- 検索: **Pagefind**（Starlight 組み込み）
- ホスティング: **GitHub Pages**（ドメインは Cloudflare DNS で管理）
- CI/CD: **GitHub Actions**
- コンテンツ形式: **MDX**（Content Collections）
- i18n: Starlight 組み込み（日本語 + 英語）

## ディレクトリ構成（予定）

```
otspec.dev/
├── src/
│   ├── content/docs/         # コンテンツ（MDX）
│   │   ├── en/               # 英語版
│   │   └── ja/               # 日本語版
│   ├── components/
│   │   ├── playground/       # Playground コンポーネント（React）
│   │   └── ui/               # 共通 UI コンポーネント
│   ├── lib/                  # フォントライブラリのラッパー
│   └── assets/fonts/         # デモ用サンプルフォント
├── public/fonts/             # 静的配信フォント
├── docs/                     # プロジェクトドキュメント（設計・戦略）
├── astro.config.mjs
├── content.config.ts         # Content Collections スキーマ
└── package.json
```

## ドキュメント

- [README.md](README.md) — プロジェクト概要
- [ROADMAP.md](ROADMAP.md) — フェーズ別ロードマップ
- [docs/](docs/) — 設計・戦略ドキュメント（[docs/README.md](docs/README.md) で索引）

## 開発ルール

- CLAUDE.md（グローバル）のルールに従う
- コンテンツは日英両方で作成する方針だが、まず日本語から開始
- Playground コンポーネントは React で実装し、`client:visible` で遅延ハイドレーション
- サンプルフォントは OFL（SIL Open Font License）のものを使用
