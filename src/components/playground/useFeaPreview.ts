/**
 * 責務：`.fea` ソースを受け取り、その場でコンパイル → フォント合成 → FontFace 登録まで
 * 行い、「適用前」「適用後」の 2 つの描画に使える font-family 名と font-feature-settings、
 * コンパイル状態を返す Playground の中核ロジック。RuleEditor（Feature File 柱）と
 * FeatureSample（OpenType 柱）が共有する。
 * 動作：入力停止後にデバウンスして「fea-wasm でコンパイル → ワークベンチフォントと
 * 合成 → FontFace 登録」のパイプラインを回し、結果を「適用後」の font-family に
 * 適用する。「適用前」は、コンパイル・合成を一切行わずワークベンチフォント
 * （GSUB/GPOS/GDEF 破棄済み）をそのまま FontFace として登録するだけで、.fea
 * コンパイルの成否とは独立して常に利用可能になる。シェーピングは行わない
 * （harfbuzzjs は使わない）。実際のレンダリングは呼び出し側が font-family を
 * 適用したテキスト要素をブラウザに任せて描画する。
 * WASM モジュールとベースフォントは初回コンパイル時に遅延ロードし、
 * 以降のコンパイルでは使い回す。
 *
 * sandbox としての不変条件（同一ページに何個並べても互いに干渉しないための規律）：
 * - I1: 自分が `document.fonts.add` する FontFace の family 名は uid（`useId()` 由来）を
 *   含み、ページ内で一意にする
 * - I2: `document.fonts.delete` は自分が保持するオブジェクト参照に対してのみ行う
 *   （名前指定の削除はしない）
 * - I3: unmount 後は `document.fonts.add` も setState もしない
 *
 * Playground の目的は「書いた規則の効果を見る」ことなので、`.fea` ソースに
 * `feature <tag> { ... } <tag>;` として書かれたタグは、ブラウザの既定 ON/OFF
 * （`frac` のように既定 OFF のものも含む）によらずすべて有効化する。
 * コンパイルに成功するたびその時点のソースからタグを抽出して
 * `font-feature-settings` に適用し直す（コンパイル失敗時は直前の成功時点の
 * 設定を維持し、失敗した編集内容から誤って抽出しない）。この自動有効化は
 * 「適用後」の font-family にのみ適用し、「適用前」は常に `normal`（既定 ON のみ）にする。
 *
 * 実装状態：完全実装
 */
import { useEffect, useId, useRef, useState } from "react";
import { compileFea } from "@/lib/fea-compiler";
import { assembleFont, getGlyphOrder } from "@/lib/font-assembler";
import { buildFontFeatureSettings, extractFeatureTags } from "@/lib/feature-css";

export interface UseFeaPreviewOptions {
  /** `.fea` ソース全文。呼び出し側（コンポーネント）が state として持つ */
  feaSource: string;
  /** ワークベンチフォント（raw TTF）の公開パス */
  fontPath: string;
  /** コンパイル結果を登録する CSS font-family 名。サイト共通の "Vollkorn"
   *  （`src/styles/fonts.css`）とは別名にし、他コンポーネントの @font-face と衝突しないようにする */
  fontFamily: string;
  /** 入力停止からコンパイルを開始するまでのデバウンス時間 (ms) */
  debounceMs: number;
}

export type CompileStatus =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export interface FeaPreview {
  /** 「適用前」の描画に使う font-family。規則を持たないワークベンチフォントそのまま */
  beforeFontFamily: string;
  /** 「適用後」の描画に使う font-family。コンパイル結果を合成したフォント */
  afterFontFamily: string;
  /** 「適用後」に適用する font-feature-settings の値 */
  featureSettings: string;
  status: CompileStatus;
  /** label の htmlFor 等に使う、インスタンスごとに一意な id 断片 */
  uid: string;
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
 * `fontPath` からファイル名部分（拡張子を除く）を取り出し、font-family 名に
 * 付与するスラッグにする。一意性の担保はインスタンス単位の uid（`useId()` 由来）が
 * 行うため、このスラッグ自体は一意性に寄与しない。`document.fonts` を開いたときに
 * どの fontPath 由来の FontFace かを人間が判別できるようにするための可読性のみが目的。
 */
function slugFromFontPath(path: string): string {
  const fileName = path.split("/").pop() ?? path;
  return fileName.replace(/\.[^./]+$/, "");
}

/**
 * `.fea` 編集 → コンパイル → 合成 → プレビュー適用の一周を担うフック。
 * RuleEditor と FeatureSample が共通のパイプラインとして呼び出す。
 *
 * @param options コンパイル対象の `.fea` ソースとフォント設定
 * @returns 「適用前」「適用後」それぞれの描画に使う font-family、font-feature-settings、
 *   コンパイル状態、インスタンス一意な uid
 */
export function useFeaPreview({
  feaSource,
  fontPath,
  fontFamily,
  debounceMs,
}: UseFeaPreviewOptions): FeaPreview {
  const [status, setStatus] = useState<CompileStatus>({ kind: "loading" });
  // 直近でコンパイルに成功した .fea ソースから抽出した font-feature-settings。
  // 初期表示（初回コンパイル完了前）は初回の feaSource から計算しておく
  const [featureSettings, setFeatureSettings] = useState(() =>
    computeFeatureSettings(feaSource),
  );

  // React の useId() は Astro island 間・同一 island 内の複数インスタンス間で一意であり、
  // SSR とハイドレーションでも値が一致する（`@astrojs/react` が island ごとに
  // identifierPrefix を採番して React に渡すため）。id の区切り文字はバージョンで
  // 変遷してきた（`:r0:` → `«r0»` → `_r0_`）ため、英数字・アンダースコア・ハイフン
  // 以外を除去して uid とする。区切りは全 id で一様なので除去しても一意性は保たれる
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, "");

  // font-family 名はインスタンス単位（uid）で一意にする（I1）。同名で登録すると、
  // 同じ文字を含むフォント同士（例: ラテン合字用と分数用の 2 インスタンス）が
  // 互いを覆う。slug は一意性には寄与せず、document.fonts を開いたときに
  // どの fontPath 由来か判別できるようにするための可読性のためだけに残す
  const afterFontFamily = `${fontFamily} ${slugFromFontPath(fontPath)} ${uid}`;
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

  // 「適用前」の描画: ワークベンチフォントは生成時に GSUB/GPOS/GDEF を
  // 破棄済みなので、コンパイル・合成を一切行わずそのまま FontFace として
  // 登録すれば「規則が何も無い状態」の描画になる。.fea のコンパイルとは
  // 独立して動くため、コンパイルエラー中もこの font-family は表示され続ける
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

  // アンマウント時に登録した FontFace を片付ける。cleanup の先頭で generation を
  // 進めることで、in-flight のコンパイル継続（上記の世代照合）が unmount 後に
  // document.fonts.add / setState を行わないようにする（I3）
  useEffect(() => {
    return () => {
      generation.current++;
      if (activeFontFace.current) {
        document.fonts.delete(activeFontFace.current);
      }
      if (beforeFontFace.current) {
        document.fonts.delete(beforeFontFace.current);
      }
    };
  }, []);

  return { beforeFontFamily, afterFontFamily, featureSettings, status, uid };
}
