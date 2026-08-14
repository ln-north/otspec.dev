/**
 * 責務：ブラウザ上で `.fea` を編集し、その場でコンパイル → フォント合成 →
 * 実際のテキスト描画に反映するまでの一周を、コードエディタが主役のレイアウトで
 * 表示する Playground コンポーネント（Feature File 柱・Lookup Type ページ用）。
 * 規則を適用する前と後を並べて表示し、「規則が何をしたのか」を見た目で判断できるようにする。
 * 動作：`.fea` 編集用テキストエリアとプレビュー用テキストエリアを持つ React island。
 * コンパイル・フォント合成・FontFace 登録の一周は `useFeaPreview` フックに委ね、
 * このコンポーネントは入力の受け取りと DOM への反映のみを担う。sandbox としての
 * 不変条件（I1〜I3）は `useFeaPreview.ts` 側の責務。
 *
 * 実装状態：完全実装
 */
import { useState } from "react";
import { useFeaPreview } from "./useFeaPreview";

export interface RuleEditorProps {
  /** 初期 .fea ソース */
  initialFea: string;
  /** プレビューの初期テキスト */
  initialPreviewText?: string;
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

/** Playground 本体。編集 → コンパイル → 合成 → プレビュー適用の一周を担う */
export default function RuleEditor({
  initialFea,
  initialPreviewText = "difficult waffle",
  fontPath = "/fonts/vollkorn-workbench.ttf",
  fontFamily = "Playground Preview",
  debounceMs = 400,
  previewDir,
  previewLang,
}: RuleEditorProps) {
  const [feaSource, setFeaSource] = useState(initialFea);
  const [previewText, setPreviewText] = useState(initialPreviewText);

  const { beforeFontFamily, afterFontFamily, featureSettings, status, uid } = useFeaPreview({
    feaSource,
    fontPath,
    fontFamily,
    debounceMs,
  });

  return (
    <div className="not-content my-4 grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor={`${uid}-fea`} className="mb-1 block text-sm font-medium">
          .fea source
        </label>
        <textarea
          id={`${uid}-fea`}
          className="h-64 w-full resize-y rounded border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-3 font-mono text-sm text-[var(--sl-color-white)] focus:outline focus:outline-[var(--sl-color-accent)]"
          value={feaSource}
          onChange={(event) => setFeaSource(event.target.value)}
          spellCheck={false}
          aria-label=".fea source"
        />
      </div>

      <div dir={previewDir} lang={previewLang}>
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
        <span className="mb-1 block text-xs font-medium text-[var(--sl-color-gray-3)]">
          Without rules
        </span>
        <div
          className="mb-3 min-h-24 w-full rounded border border-[var(--sl-color-gray-5)] p-3 text-3xl leading-normal text-[var(--sl-color-white)]"
          style={{ fontFamily: `"${beforeFontFamily}", serif`, fontFeatureSettings: "normal" }}
          data-testid="rule-editor-preview-before"
        >
          {previewText}
        </div>

        <span className="mb-1 block text-xs font-medium text-[var(--sl-color-gray-3)]">
          With rules
        </span>
        <div
          className="min-h-24 w-full rounded border border-[var(--sl-color-gray-5)] p-3 text-3xl leading-normal text-[var(--sl-color-white)]"
          style={{ fontFamily: `"${afterFontFamily}", serif`, fontFeatureSettings: featureSettings }}
          data-testid="rule-editor-preview"
        >
          {previewText}
        </div>

        <div className="mt-2 text-sm">
          {status.kind === "loading" && (
            <span className="text-[var(--sl-color-gray-3)]" data-testid="rule-editor-status">
              Compiling…
            </span>
          )}
          {status.kind === "success" && (
            <span className="text-[var(--sl-color-green)]" data-testid="rule-editor-status">
              Compiled
            </span>
          )}
          {status.kind === "error" && (
            <pre
              className="mt-1 max-h-48 overflow-auto rounded border border-[var(--sl-color-red)] bg-[var(--sl-color-bg)] p-2 font-mono text-xs whitespace-pre text-[var(--sl-color-red)]"
              data-testid="rule-editor-status"
            >
              {status.message}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
