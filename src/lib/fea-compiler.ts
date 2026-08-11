/**
 * 責務：fea-wasm（`crates/fea-wasm`）の遅延ロードと `.fea` コンパイル呼び出しをまとめる。
 * 動作：WASM モジュール（約 1.9MB）は初回呼び出し時に一度だけ動的 import・初期化し、
 * 以降の呼び出しでは同じインスタンスを使い回す（Playground に複数コンポーネントが
 * あっても二重ロードしない）。
 * 実装状態：完全実装
 *
 * 注意：import 先の `../../crates/fea-wasm/pkg/` は `wasm-pack build --target web
 * --release crates/fea-wasm` の出力（`npm run build:wasm`）。リポジトリには
 * コミットしていない生成物のため、このファイルを使う前に一度ビルドが必要。
 */

type FeaWasmModule = typeof import("../../crates/fea-wasm/pkg/fea_wasm.js");

let modulePromise: Promise<FeaWasmModule> | null = null;

/** fea-wasm モジュールを取得する。初回のみ動的 import + wasm 初期化を行う。 */
function loadModule(): Promise<FeaWasmModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const mod = await import("../../crates/fea-wasm/pkg/fea_wasm.js");
      // 既定の URL 解決（import.meta.url 起点で fea_wasm_bg.wasm を fetch）に任せる
      await mod.default();
      return mod;
    })();
  }
  return modulePromise;
}

/**
 * `.fea` ソースとグリフ名一覧（改行区切り、先頭は `.notdef`）を渡してコンパイルする。
 *
 * @param feaSource `.fea` ソース全文
 * @param glyphOrder 改行区切りのグリフ名一覧。ベースフォントの実際のグリフ順と一致させること
 * @returns 成功時はコンパイル済みバイナリ（GSUB/GPOS/GDEF 等を積んだ最小 sfnt。新規コピー）
 * @throws コンパイルエラー時、fea-rs が返す整形済みメッセージ文字列（行・列・キャレット付き）
 */
export async function compileFea(feaSource: string, glyphOrder: string): Promise<Uint8Array> {
  const mod = await loadModule();
  return mod.compile_fea_js(feaSource, glyphOrder);
}
