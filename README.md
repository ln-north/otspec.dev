# otspec.dev

**OpenType 仕様のための MDN** — Microsoft の [OpenType Specification](https://learn.microsoft.com/en-us/typography/opentype/spec/) を、わかりやすくインタラクティブに解説するリファレンスサイト。

https://otspec.dev

> [!IMPORTANT]
> **🚧 構築中です。まだコントリビューションを受け付けていません。**
>
> サイトの構造もページの形も固まっておらず、中身のあるページは現時点で 1 枚だけです。コラボレーター以外による Pull Request と Issue の作成は現在ブロックしています。理由は [CONTRIBUTING.md](CONTRIBUTING.md) に書いています。
>
> **🚧 Under construction. Not accepting contributions yet.**
>
> Pull requests and issues from outside collaborators are currently disabled. See [CONTRIBUTING.md](CONTRIBUTING.md) for why.

## なぜ作るのか

OpenType の公式仕様書は実装者向けに書かれており、フォント開発者や Web 開発者が読むには障壁が高い。MDN が HTML/CSS/JS の仕様書を「開発者が実際に使えるリファレンス」に変換しているように、otspec.dev は OpenType 仕様に対して同じことを行う。

- バイナリ構造定義 → 概念と動作の説明
- Hex データ例 → インタラクティブな Playground
- テーブル間の暗黙の依存 → 明示的な関係図とリンク
- 実装者向け仕様 → .fea 構文と CSS の実践的なコード例

## 特徴

- **Feature Tag リファレンス**: 各 Feature の動作説明、.fea での実装、CSS での使い方を1ページに集約
- **テーブルリファレンス**: 全 OpenType テーブルの解説（動作が先、バイナリ定義は折りたたみ）
- **Playground**: Feature テスター、Lookup ビジュアライザ、グリフインスペクタ等のインタラクティブツール
- **学習パス**: Getting Started からテーブル詳細まで段階的にナビゲート

## ステータス

設計・計画フェーズ。詳細は [ROADMAP.md](ROADMAP.md) を参照。

## 技術スタック

- [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/)（ドキュメントフレームワーク）
- React（Playground コンポーネント、Islands Architecture）
- [fontations](https://github.com/googlefonts/fontations)（Rust → WASM、フォントパース・グリフ描画）/ [harfbuzzjs](https://github.com/harfbuzz/harfbuzzjs)（テキストシェーピング）
- GitHub Pages + Cloudflare DNS

## ドキュメント

[docs/](docs/) に設計・戦略ドキュメントがある。詳しくは [docs/README.md](docs/README.md) を参照。

## ライセンス

MIT
