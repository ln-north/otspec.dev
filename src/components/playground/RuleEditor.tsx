/**
 * 責務：ブラウザ上で `.fea` を編集し、その場でコンパイル → フォント合成 →
 * 実際のテキスト描画に反映するまでの一周を成立させる Playground の中核コンポーネント。
 * 規則を適用する前と後を並べて表示し、「規則が何をしたのか」を見た目で判断できるようにする。
 * 動作：`.fea` 編集用テキストエリアとプレビュー用テキストエリアを持つ React island。
 * 入力停止後にデバウンスして「fea-wasm でコンパイル → ワークベンチフォントと
 * 合成 → FontFace 登録」のパイプラインを回し、結果を「適用後」の行の
 * font-family に適用する。「適用前」の行は、コンパイル・合成を一切行わず
 * ワークベンチフォント（GSUB/GPOS/GDEF 破棄済み）をそのまま FontFace として
 * 登録するだけで、.fea コンパイルの成否とは独立して常に表示される。
 * シェーピングは行わない（harfbuzzjs は使わない）。FontFace 登録後の実際の
 * レンダリングはブラウザに任せる。
 * WASM モジュールとベースフォントは初回コンパイル時に遅延ロードし、
 * 以降のコンパイルでは使い回す。
 *
 * Playground の目的は「書いた規則の効果を見る」ことなので、`.fea` ソースに
 * `feature <tag> { ... } <tag>;` として書かれたタグは、ブラウザの既定 ON/OFF
 * （`frac` のように既定 OFF のものも含む）によらずすべて有効化する。
 * コンパイルに成功するたびその時点のソースからタグを抽出して
 * `font-feature-settings` に適用し直す（コンパイル失敗時は直前の成功時点の
 * 設定を維持し、失敗した編集内容から誤って抽出しない）。この自動有効化は
 * 「適用後」の行にのみ適用し、「適用前」の行は常に `normal`（既定 ON のみ）にする。
 *
 * 実装状態：完全実装
 */
import { useEffect, useRef, useState } from "react";
import { compileFea } from "@/lib/fea-compiler";
import { assembleFont, getGlyphOrder } from "@/lib/font-assembler";
import { buildFontFeatureSettings, extractFeatureTags } from "@/lib/feature-css";

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

/**
 * `.fea` ソースに書かれた `feature` ブロックのタグをすべて有効にする
 * `font-feature-settings` の値を組み立てる。
 *
 * @param feaSource `.fea` ソース全文
 * @returns `"liga" 1, "frac" 1` のような値文字列。タグが1つも無ければ `normal`
 */
function computeFeatureSettings(feaSource: string): string {
  const settings: Record<string, boolean> = {};
  for (const tag of extractFeatureTags(feaSource)) {
    settings[tag] = true;
  }
  return buildFontFeatureSettings(settings);
}

type CompileStatus =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

/** ベースフォント（ワークベンチフォント）の ArrayBuffer とグリフ順を一度取得したら使い回すためのキャッシュ */
interface BaseFontCache {
  buffer: ArrayBuffer;
  /** 改行区切りのグリフ名一覧。fea-wasm にそのまま渡せる形式 */
  glyphOrder: string;
}

/**
 * Uint8Array の中身を新規 ArrayBuffer にコピーする。
 * wasm-bindgen が返す Uint8Array の `.buffer` は型上 `ArrayBufferLike`
 * （`ArrayBuffer | SharedArrayBuffer`）になるため、`assembleFont` が要求する
 * 厳密な `ArrayBuffer` に変換するための橋渡し。
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * `fontPath` からファイル名部分（拡張子を除く）を取り出し、font-family 名の
 * 一意化に使えるスラッグにする。「適用前」用の font-family は `fontFamily` prop
 * だけでは 1 ページに複数の RuleEditor（fontPath が異なる）が並んだ時に衝突する
 * ため、fontPath 由来のスラッグを足して一意にする。
 */
function slugFromFontPath(path: string): string {
  const fileName = path.split("/").pop() ?? path;
  return fileName.replace(/\.[^./]+$/, "");
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
  const [status, setStatus] = useState<CompileStatus>({ kind: "loading" });
  // 直近でコンパイルに成功した .fea ソースから抽出した font-feature-settings。
  // 初期表示（初回コンパイル完了前）は initialFea から計算しておく
  const [featureSettings, setFeatureSettings] = useState(() =>
    computeFeatureSettings(initialFea),
  );

  // 1 ページに複数の RuleEditor が並ぶため、font-family 名は fontPath ごとに一意にする。
  // 同名で登録すると、同じ文字を含むフォント同士（ラテン合字用と分数用）が互いを覆う
  const afterFontFamily = `${fontFamily} ${slugFromFontPath(fontPath)}`;
  // 「適用前」（規則を適用しないワークベンチフォントそのまま）を登録する font-family 名
  const beforeFontFamily = `${afterFontFamily} Raw`;

  // ベースフォントは初回のみ fetch する（コンパイルのたびに fetch し直さない）
  const baseFontCache = useRef<Promise<BaseFontCache> | null>(null);
  // document.fonts に登録済みの FontFace（適用後）。差し替え・後片付けのために保持する
  const activeFontFace = useRef<FontFace | null>(null);
  // document.fonts に登録済みの FontFace（適用前）。差し替え・後片付けのために保持する
  const beforeFontFace = useRef<FontFace | null>(null);
  // 連続入力で古いコンパイル結果が後から届いて上書きするのを防ぐための世代カウンタ
  const generation = useRef(0);

  function loadBaseFont(): Promise<BaseFontCache> {
    if (!baseFontCache.current) {
      baseFontCache.current = (async () => {
        const response = await fetch(fontPath);
        if (!response.ok) {
          throw new Error(
            `ベースフォントの取得に失敗した: ${response.status} ${response.statusText} (${fontPath})`,
          );
        }
        const buffer = await response.arrayBuffer();
        const glyphOrder = getGlyphOrder(buffer).join("\n");
        return { buffer, glyphOrder };
      })();
    }
    return baseFontCache.current;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentGeneration = ++generation.current;
      setStatus({ kind: "loading" });

      void (async () => {
        const base = await loadBaseFont();
        const feaBytes = await compileFea(feaSource, base.glyphOrder);
        const assembled = assembleFont(base.buffer, toArrayBuffer(feaBytes));

        const fontFace = new FontFace(afterFontFamily, assembled);
        await fontFace.load();

        // 古い世代の結果が遅れて届いた場合は無視する
        if (currentGeneration !== generation.current) return;

        if (activeFontFace.current) {
          document.fonts.delete(activeFontFace.current);
        }
        document.fonts.add(fontFace);
        activeFontFace.current = fontFace;

        // コンパイルに成功したソース（このクロージャが捕捉した feaSource）からのみ
        // タグを抽出する。失敗した編集内容から誤って抽出しないための境界
        setFeatureSettings(computeFeatureSettings(feaSource));
        setStatus({ kind: "success" });
      })().catch((err: unknown) => {
        if (currentGeneration !== generation.current) return;
        setStatus({ kind: "error", message: String(err) });
      });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [feaSource, fontFamily, fontPath]);

  // 「適用前」の行の描画: ワークベンチフォントは生成時に GSUB/GPOS/GDEF を
  // 破棄済みなので、コンパイル・合成を一切行わずそのまま FontFace として
  // 登録すれば「規則が何も無い状態」の描画になる。.fea のコンパイルとは
  // 独立して動くため、コンパイルエラー中もこの行は表示され続ける
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const base = await loadBaseFont();
      if (cancelled) return;

      const fontFace = new FontFace(beforeFontFamily, base.buffer);
      await fontFace.load();
      if (cancelled) return;

      if (beforeFontFace.current) {
        document.fonts.delete(beforeFontFace.current);
      }
      document.fonts.add(fontFace);
      beforeFontFace.current = fontFace;
    })().catch((err: unknown) => {
      // ワークベンチフォント自体の fetch 失敗等。コンパイルエラーとは別種の
      // 問題であり、コンパイル結果用の status 表示は流用しない
      console.error("適用前フォントの読み込みに失敗した:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [fontPath, beforeFontFamily]);

  // アンマウント時に登録した FontFace を片付ける
  useEffect(() => {
    return () => {
      if (activeFontFace.current) {
        document.fonts.delete(activeFontFace.current);
      }
      if (beforeFontFace.current) {
        document.fonts.delete(beforeFontFace.current);
      }
    };
  }, []);

  return (
    <div className="not-content my-4 grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="rule-editor-fea" className="mb-1 block text-sm font-medium">
          .fea source
        </label>
        <textarea
          id="rule-editor-fea"
          className="h-64 w-full resize-y rounded border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-3 font-mono text-sm text-[var(--sl-color-white)] focus:outline focus:outline-[var(--sl-color-accent)]"
          value={feaSource}
          onChange={(event) => setFeaSource(event.target.value)}
          spellCheck={false}
          aria-label=".fea source"
        />
      </div>

      <div dir={previewDir} lang={previewLang}>
        <label htmlFor="rule-editor-preview-text" className="mb-1 block text-sm font-medium">
          Preview text
        </label>
        <input
          id="rule-editor-preview-text"
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
