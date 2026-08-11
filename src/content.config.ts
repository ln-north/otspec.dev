/**
 * 責務：Astro Content Collections の定義
 * 動作：Starlight の docs コレクションと i18n コレクションを設定する。
 *       docs コレクションは feature タグページ専用の frontmatter（`feature.*`）を
 *       docsSchema({ extend }) で拡張する。`optional()` のため、feature を持たない
 *       既存ページ・他ページタイプには影響しない。
 */
import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { i18nLoader } from "@astrojs/starlight/loaders";
import { i18nSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        /**
         * OpenType Feature Tag ページ（/reference/features/{tag}/）専用のメタデータ。
         * FeatureHeader / EngineCompat / SpecLink / FeatureIndex がここから自給する。
         */
        feature: z
          .object({
            /** OpenType Feature タグ（4文字の小文字英数字、例: "liga"） */
            tag: z.string().regex(/^[a-z0-9]{4}$/),
            /** Feature の正式名（例: "Standard Ligatures"） */
            name: z.string(),
            /** content-strategy.md §3-D の6分類 */
            category: z.enum([
              "ligatures",
              "letterforms",
              "numerals",
              "spacing",
              "marks",
              "script-specific",
            ]),
            /** 多くの環境でデフォルト適用される Feature かどうか */
            appliedByDefault: z.boolean(),
            /** この Feature が使う Lookup Type（GSUB/GPOS × 1-9） */
            lookups: z
              .array(
                z.object({
                  table: z.enum(["GSUB", "GPOS"]),
                  type: z.number().int().min(1).max(9),
                }),
              )
              .nonempty(),
            /** この Feature を制御する CSS プロパティと値の一覧 */
            css: z.array(
              z.object({ property: z.string(), value: z.string() }),
            ),
            /** Microsoft OpenType 仕様の該当ページ URL */
            specUrl: z.string().url(),
          })
          .optional(),
      }),
    }),
  }),
  i18n: defineCollection({
    loader: i18nLoader(),
    schema: i18nSchema(),
  }),
};
