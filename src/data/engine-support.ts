/**
 * 責務：Feature タグごとのシェーピングエンジン/ブラウザ対応状況データ（MDN の browser-compat-data 相当）
 * 動作：EngineCompat.astro がタグをキーに引いて静的テーブルを描画する。
 *       データ未登録のタグで EngineCompat が呼ばれた場合はビルドを失敗させる（コンポーネント側の責務）。
 *       出典 URL で実際に確認できた事実のみ yes/no/partial とし、確認できなかったものは unknown にする。
 */

/** 対応状況の4段階。unknown は「未実装」ではなく「出典で確認できていない」ことを表す */
export type SupportLevel = "yes" | "no" | "partial" | "unknown";

/** 1セル分の対応状況。source は実際に確認した出典 URL */
export interface SupportCell {
  level: SupportLevel;
  note?: string;
  /** 出典 URL */
  source?: string;
}

/** 1 Feature タグ分の対応状況（シェーピングエンジン3種 + ブラウザ3種で固定） */
export interface FeatureSupport {
  shapers: {
    harfbuzz: SupportCell;
    coretext: SupportCell;
    directwrite: SupportCell;
  };
  cssControl: {
    chrome: SupportCell;
    firefox: SupportCell;
    safari: SupportCell;
  };
}

/**
 * Feature タグ → 対応状況。Phase 1 では liga のみ登録する
 * （他タグは Phase 3 の横展開時に追加）。
 */
export const engineSupport: Record<string, FeatureSupport> = {
  liga: {
    shapers: {
      // HarfBuzz は水平テキストで calt, clig, curs, dist, kern, liga, rclt を
      // デフォルトで適用する（Indic/Khmer 等のスクリプト固有シェーピングモデルでは無効化される場合がある）
      harfbuzz: {
        level: "yes",
        note: "水平テキストでは calt, clig, curs, dist, kern, liga, rclt と共にデフォルトで適用される。Indic / Khmer 等スクリプト固有のシェーピングモデルでは無効化される",
        source: "https://harfbuzz.github.io/shaping-opentype-features.html",
      },
      // CoreText / AAT・OpenType のデフォルト feature 適用について、
      // 明示的に述べた Apple 公式一次資料が見つからなかったため unknown とする
      coretext: { level: "unknown" },
      // DirectWrite（IDWriteTypography 等）のデフォルト feature 適用について、
      // 明示的に述べた Microsoft 公式一次資料が見つからなかったため unknown とする。
      // WPF/UWP の Typography.StandardLigatures はデフォルト true と明記されているが、
      // これは上位フレームワークの話であり DirectWrite 自体の挙動を直接示す記述ではないため採用しない
      directwrite: { level: "unknown" },
    },
    cssControl: {
      // font-variant-ligatures (common-ligatures) は Chrome 34+、
      // font-feature-settings は Chrome 48+ でサポート（MDN browser-compat-data で確認）
      chrome: {
        level: "yes",
        note: "font-variant-ligatures: common-ligatures は Chrome 34+、font-feature-settings は Chrome 48+",
        source: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures",
      },
      // font-variant-ligatures / font-feature-settings ともに Firefox 34+ でサポート
      firefox: {
        level: "yes",
        note: "font-variant-ligatures / font-feature-settings ともに Firefox 34+",
        source: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures",
      },
      // font-variant-ligatures / font-feature-settings ともに Safari 9.1+ でサポート
      safari: {
        level: "yes",
        note: "font-variant-ligatures / font-feature-settings ともに Safari 9.1+",
        source: "https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-ligatures",
      },
    },
  },
};
