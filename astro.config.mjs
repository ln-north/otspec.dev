import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://otspec.dev",
  integrations: [
    starlight({
      customCss: ["./src/styles/custom.css"],
      title: "otspec.dev",
      description:
        "OpenType 仕様のための MDN — わかりやすくインタラクティブな OpenType リファレンス",
      pagefind: true,
      components: {
        Header: "./src/components/Header.astro",
        ThemeSelect: "./src/components/EmptyThemeSelect.astro",
      },
      sidebar: [
        {
          label: "Tables",
          translations: { ja: "テーブル" },
          autogenerate: { directory: "reference/tables" },
        },
        {
          label: "Glossary",
          translations: { ja: "用語集" },
          autogenerate: { directory: "glossary" },
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
