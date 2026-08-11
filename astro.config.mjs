import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Shiki に .fea 文法はバンドルされていないため、自作の TextMate 文法を読み込んで登録する
// （`with { type: "json" }` の import attributes ではなく readFileSync を使うのは、
// 　バンドラ・Node バージョンに依存せず確実に動かすため）
const feaGrammar = JSON.parse(
  readFileSync(
    new URL("./src/grammars/fea.tmLanguage.json", import.meta.url),
    "utf-8",
  ),
);

export default defineConfig({
  site: "https://otspec.dev",
  integrations: [
    starlight({
      customCss: ["./src/styles/custom.css", "./src/styles/fonts.css"],
      title: "otspec.dev",
      description:
        "OpenType 仕様のための MDN — わかりやすくインタラクティブな OpenType リファレンス",
      pagefind: true,
      components: {
        Header: "./src/components/Header.astro",
        ThemeSelect: "./src/components/EmptyThemeSelect.astro",
      },
      expressiveCode: {
        shiki: {
          langs: [feaGrammar],
        },
      },
      sidebar: [
        {
          // Feature File 柱（構文の索引）。現時点で中身があるのは GSUB Rules のみ。
          // 他グループ（Syntax basics / GPOS Rules / Values / Structure / Special
          // features / Table blocks）はページが増えたときに同じ形で追加する。
          label: "Feature File",
          items: [
            { label: "Overview", link: "/fea/" },
            {
              label: "GSUB Rules",
              items: [{ autogenerate: { directory: "fea/gsub" } }],
            },
          ],
        },
        {
          // OpenType 柱（意味の索引）。テーブル索引はランディングに統合済み。
          label: "OpenType",
          items: [{ autogenerate: { directory: "opentype" } }],
        },
        {
          label: "Glossary",
          translations: { ja: "用語集" },
          items: [{ autogenerate: { directory: "glossary" } }],
        },
      ],
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        ja: { label: "日本語", lang: "ja" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ln-north/otspec.dev",
        },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
