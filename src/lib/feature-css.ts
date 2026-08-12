/**
 * 責務：Feature タグの ON/OFF 状態から CSS `font-feature-settings` の値を組み立てる。
 *       また `.fea` ソースから `feature` ブロックのタグを抽出する。
 * 動作：FeatureDemo（と将来の FeatureTester）、RuleEditor が共有するロジック。
 *       タグ固有の特例が必要になった場合もここに集約する。
 */

/**
 * Feature タグの ON/OFF 状態を CSS `font-feature-settings` の値文字列に変換する。
 *
 * @param settings タグ名 → ON/OFF の Record。キー順序がそのまま出力順になる
 * @returns `"liga" 1, "kern" 0` のような値文字列。空オブジェクトの場合は `normal`
 */
export function buildFontFeatureSettings(
  settings: Record<string, boolean>,
): string {
  const tags = Object.keys(settings);
  if (tags.length === 0) {
    return "normal";
  }
  return tags
    .map((tag) => `"${tag}" ${settings[tag] ? 1 : 0}`)
    .join(", ");
}

/**
 * `feature <tag> { ... } <tag>;` ブロックの開始行にマッチする正規表現。行頭の空白は許す。
 * モジュールスコープの共有インスタンス（`g` フラグ付き）なので、呼び出し間で
 * `lastIndex` の状態が残りうる。`matchAll` は呼び出しのたびに正規表現を複製して
 * 走査する（ECMAScript 仕様）ため `lastIndex` を汚染しない。この性質に依存しているため、
 * このパターンは `matchAll` からのみ使用すること。`exec` / `test` を直接呼ぶと
 * `lastIndex` 汚染で別呼び出しの結果が化けるため使わない
 */
const FEATURE_BLOCK_PATTERN = /^[ \t]*feature\s+([A-Za-z0-9]{4})\b/gm;

/**
 * `.fea` ソースに書かれた `feature <tag> { ... } <tag>;` ブロックのタグをすべて抽出する。
 *
 * RuleEditor（Playground）はブラウザの既定 ON/OFF に関わらず「書いた規則の効果を見る」
 * ことが目的のため、ソースに現れたタグは（`frac` のように既定 OFF のものも含めて）
 * すべて有効化の対象として扱う。
 *
 * @param feaSource `.fea` ソース全文
 * @returns 出現順・重複除去したタグの配列。1つも無ければ空配列
 */
export function extractFeatureTags(feaSource: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const match of feaSource.matchAll(FEATURE_BLOCK_PATTERN)) {
    const tag = match[1];
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}
