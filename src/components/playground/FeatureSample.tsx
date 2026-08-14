/**
 * 責務：フィーチャータグページ（OpenType 柱）向けの Playground コンポーネント。
 * 「規則の書き方」ではなく「フィーチャーの効果（結果）」を主役に見せるレイアウトで、
 * 適用前・適用後のプレビューを大きく横並びに表示し、`.fea` ソースや Preview text の
 * 入力・コンパイル状態は `<details>` に折りたたんで補助情報として置く。
 * 動作：コンパイル・フォント合成・FontFace 登録の一周は `useFeaPreview` フックに委ね、
 * このコンポーネントは入力の受け取りと DOM への反映のみを担う。sandbox としての
 * 不変条件（I1〜I3）は `useFeaPreview.ts` 側の責務。
 * コンパイルエラー時は `<details>` が閉じていても気づけるよう、`<details>` の外にも
 * 常時エラー表示を出す（成功・ロード中は `<details>` の中の status 表示のみ）。
 *
 * 実装状態：完全実装
 */
import { useState } from "react";
import { useFeaPreview } from "./useFeaPreview";

export interface FeatureSampleProps {
  /** 初期 .fea ソース */
  initialFea: string;
  /** プレビューの初期テキスト */
  initialPreviewText?: string;
  /** ラベルに出すフィーチャータグ（例: "liga"） */
  featureTag: string;
  /** ワークベンチフォント（raw TTF）の公開パス */
  fontPath?: string;
  /** コンパイル結果を登録する CSS font-family 名。サイト共通の "Vollkorn"
   *  （`src/styles/fonts.css`）とは別名にし、他コンポーネントの @font-face と衝突しないようにする */
  fontFamily?: string;
  /** 入力停止からコンパイルを開始するまでのデバウンス時間 (ms) */
  debounceMs?: number;
  /** プレビュー領域の書字方向。アラビア文字等の右横書きの例で使う */
  previewDir?: "ltr" | "rtl";
  /** プレビュー領域の lang 属性 */
  previewLang?: string;
}

/** Playground 本体。結果（適用前/適用後）を主役に見せ、ソースは折りたたみで補助する */
export default function FeatureSample({
  initialFea,
  initialPreviewText = "difficult waffle",
  featureTag,
  fontPath = "/fonts/vollkorn-workbench.ttf",
  fontFamily = "Playground Preview",
  debounceMs = 400,
  previewDir,
  previewLang,
}: FeatureSampleProps) {
  const [feaSource, setFeaSource] = useState(initialFea);
  const [previewText, setPreviewText] = useState(initialPreviewText);

  const { beforeFontFamily, afterFontFamily, featureSettings, status, uid } = useFeaPreview({
    feaSource,
    fontPath,
    fontFamily,
    debounceMs,
  });

  return (
    <div className="not-content my-4">
      <div className="grid gap-4 md:grid-cols-2" dir={previewDir} lang={previewLang}>
        <div>
          <span className="mb-1 block text-xs font-medium text-[var(--sl-color-gray-3)]">
            Without {featureTag}
          </span>
          <div
            className="min-h-24 w-full rounded border border-[var(--sl-color-gray-5)] p-3 text-3xl leading-normal text-[var(--sl-color-white)]"
            style={{ fontFamily: `"${beforeFontFamily}", serif`, fontFeatureSettings: "normal" }}
            data-testid="feature-sample-preview-before"
          >
            {previewText}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-[var(--sl-color-gray-3)]">
            With {featureTag}
          </span>
          <div
            className="min-h-24 w-full rounded border border-[var(--sl-color-gray-5)] p-3 text-3xl leading-normal text-[var(--sl-color-white)]"
            style={{ fontFamily: `"${afterFontFamily}", serif`, fontFeatureSettings: featureSettings }}
            data-testid="feature-sample-preview"
          >
            {previewText}
          </div>
        </div>
      </div>

      {status.kind === "error" && (
        <p className="mt-2 text-sm text-[var(--sl-color-red)]" data-testid="feature-sample-status-banner">
          .fea source has a compile error. See details below.
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium">.fea source</summary>

        <div className="mt-2">
          <label htmlFor={`${uid}-preview-text`} className="mb-1 block text-sm font-medium">
            Preview text
          </label>
          <input
            id={`${uid}-preview-text`}
            type="text"
            className="mb-2 w-full rounded border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-2 font-mono text-sm text-[var(--sl-color-white)] focus:outline focus:outline-[var(--sl-color-accent)]"
            value={previewText}
            onChange={(event) => setPreviewText(event.target.value)}
            spellCheck={false}
            aria-label="Preview text"
          />

          <textarea
            id={`${uid}-fea`}
            className="h-64 w-full resize-y rounded border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-3 font-mono text-sm text-[var(--sl-color-white)] focus:outline focus:outline-[var(--sl-color-accent)]"
            value={feaSource}
            onChange={(event) => setFeaSource(event.target.value)}
            spellCheck={false}
            aria-label=".fea source"
          />

          <div className="mt-2 text-sm">
            {status.kind === "loading" && (
              <span className="text-[var(--sl-color-gray-3)]" data-testid="feature-sample-status">
                Compiling…
              </span>
            )}
            {status.kind === "success" && (
              <span className="text-[var(--sl-color-green)]" data-testid="feature-sample-status">
                Compiled
              </span>
            )}
            {status.kind === "error" && (
              <pre
                className="mt-1 max-h-48 overflow-auto rounded border border-[var(--sl-color-red)] bg-[var(--sl-color-bg)] p-2 font-mono text-xs whitespace-pre text-[var(--sl-color-red)]"
                data-testid="feature-sample-status"
              >
                {status.message}
              </pre>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
