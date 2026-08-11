/**
 * 責務：Feature ページのデモ・Playground が使う同梱サンプルフォントのメタデータ
 * 動作：FeatureDemo 等が `font-family` 名や GSUB/GPOS タグ一覧をここから取得する。
 *       実フォントの実測に基づく静的データであり、フォントを差し替えた場合はここを更新する。
 */

/** 実測済みの GSUB/GPOS Feature タグ一覧を持つ同梱フォント1件のメタデータ */
export interface SampleFont {
  /** CSS `font-family` 名（`src/styles/fonts.css` の @font-face と一致させる） */
  family: string;
  /** 公開 URL パス（`public/` 配下。@font-face の src や fetch() で使う安定パス） */
  path: string;
  /** 実測済みの GSUB Feature タグ一覧（アルファベット順） */
  gsubTags: string[];
  /** 実測済みの GPOS Feature タグ一覧（アルファベット順） */
  gposTags: string[];
}

/**
 * Vollkorn（Variable, wght 400-900）
 *
 * 出典: github.com/google/fonts の `ofl/vollkorn/Vollkorn[wght].ttf`
 * Version 5.001（可変軸 wght 400-900）
 * ライセンス: SIL Open Font License 1.1（`public/fonts/vollkorn-OFL.txt` に全文同梱）
 * Reserved Font Name なし（OFL.txt 冒頭: "Copyright 2017 The Vollkorn Project Authors"）
 *
 * GSUB/GPOS タグ一覧は fontTools 4.63.0 でバイナリを直接解析して実測した
 * （2026-08-11-phase1-liga-plan.md「現状」節参照）。
 */
export const vollkorn: SampleFont = {
  family: "Vollkorn",
  path: "/fonts/vollkorn-var.woff2",
  // GSUB (36)
  gsubTags: [
    "aalt",
    "c2sc",
    "calt",
    "case",
    "ccmp",
    "dlig",
    "dnom",
    "frac",
    "hist",
    "hlig",
    "liga",
    "lnum",
    "locl",
    "mgrk",
    "numr",
    "onum",
    "ordn",
    "pnum",
    "rlig",
    "rvrn",
    "salt",
    "smcp",
    "ss01",
    "ss02",
    "ss03",
    "ss04",
    "ss05",
    "ss11",
    "ss13",
    "ss14",
    "ss17",
    "subs",
    "sups",
    "titl",
    "tnum",
    "zero",
  ],
  // GPOS (4)
  gposTags: ["cpsp", "kern", "mark", "mkmk"],
};

/** Phase 1 で同梱するサンプルフォント一覧（現状は Vollkorn のみ） */
export const sampleFonts: SampleFont[] = [vollkorn];
