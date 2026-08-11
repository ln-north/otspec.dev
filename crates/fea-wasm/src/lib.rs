//! 責務：`.fea` ソースをブラウザ上（wasm32-unknown-unknown）でコンパイルし、
//! OpenType バイナリ（GSUB/GPOS/GDEF/BASE/STAT/name/maxp を積んだ最小 sfnt）を返す。
//! 動作：fea-rs の `Compiler` にファイルシステムを介さないインメモリ
//! `SourceResolver` を差し込み、std::fs に一切触れずにコンパイルする。
//! otspec.dev の Playground（RuleEditor）から wasm-bindgen 経由で呼び出される。
//! 実装状態：完全実装（include 文には未対応。単一ファイルの .fea のみを受け付ける）

use std::path::Path;
use std::sync::Arc;

use fea_rs::{
    Compiler, GlyphMap,
    compile::{NopFeatureProvider, NopVariationInfo, Opts, parse_glyph_order},
    parse::SourceLoadError,
};
use wasm_bindgen::prelude::*;

/// 仮想的なルートパス。実ファイルシステム上には存在しない識別子として使う。
const ROOT_PATH: &str = "memory://root.fea";

/// `.fea` ソース文字列とグリフ名一覧（改行区切り、先頭は `.notdef` 必須）を受け取り、
/// コンパイル結果のバイナリ（成功時）またはエラー文字列（失敗時）を返す。
///
/// - `fea_source`: `.fea` ソース全文。単一ファイルとして扱う（include 文は未対応）
/// - `glyph_order`: 改行区切りのグリフ名一覧。呼び出し側（ベースフォント）の
///   グリフ順序と一致している必要がある（グリフ ID の対応が崩れるため）
///
/// 返り値の `Vec<u8>`（成功時）は新規生成されたバイナリで、GSUB/GPOS/GDEF/BASE/STAT/
/// name/maxp を積んだ最小 sfnt。呼び出し側でベースフォントと合成することを前提とする。
/// 失敗時のエラー文字列は行・列・キャレット付きの整形済みメッセージ
/// （`CompilerError::display_verbose()`）。
pub fn compile_fea(fea_source: &str, glyph_order: &str) -> Result<Vec<u8>, String> {
    let glyph_map: GlyphMap = parse_glyph_order(glyph_order).map_err(|e| e.to_string())?;

    // std::fs を使わないインメモリの SourceResolver。
    // fea-rs の SourceResolver トレイトには `Fn(&Path) -> Result<Arc<str>, SourceLoadError>`
    // へのブランケット実装があるため、クロージャをそのまま渡せる。
    let source = fea_source.to_owned();
    let resolver = move |path: &Path| -> Result<Arc<str>, SourceLoadError> {
        if path == Path::new(ROOT_PATH) {
            Ok(Arc::from(source.as_str()))
        } else {
            Err(SourceLoadError::new(
                path.to_path_buf(),
                "include はこのラッパーでは未対応",
            ))
        }
    };

    let compiler = Compiler::<NopFeatureProvider, NopVariationInfo>::new(ROOT_PATH, &glyph_map)
        .with_resolver(resolver)
        .with_opts(Opts::new());

    compiler
        .compile_binary()
        .map_err(|e| e.display_verbose().to_string())
}

/// wasm-bindgen 経由で JS から直接呼び出せる版。文字列・Vec<u8> のマーシャリングを
/// wasm-bindgen に任せる。呼び出しごとに panic フックを設定し直す（`set_once` なので
/// 実質初回のみ）。これにより Rust 側の panic がブラウザコンソールに意味のある
/// スタックトレースとして出力されるようになる。
#[wasm_bindgen]
pub fn compile_fea_js(fea_source: &str, glyph_order: &str) -> Result<Vec<u8>, String> {
    console_error_panic_hook::set_once();
    compile_fea(fea_source, glyph_order)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compiles_trivial_fea() {
        let glyph_order = ".notdef\nspace\nA\nB\nliga\n";
        let fea = r#"
languagesystem DFLT dflt;

feature liga {
    sub A B by liga;
} liga;
"#;
        let result = compile_fea(fea, glyph_order);
        match &result {
            Ok(bytes) => assert!(!bytes.is_empty(), "コンパイル結果が空"),
            Err(e) => panic!("コンパイル失敗: {e}"),
        }
    }

    #[test]
    fn reports_error_for_unknown_glyph() {
        let glyph_order = ".notdef\nspace\nA\nB\nliga\n";
        let fea = "feature liga {\n    sub A NOSUCHGLYPH by liga;\n} liga;\n";
        let result = compile_fea(fea, glyph_order);
        assert!(result.is_err(), "存在しないグリフ名はエラーになるべき");
    }
}
