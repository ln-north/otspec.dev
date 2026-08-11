/**
 * 責務：Feature タグの ON/OFF を切り替えながら Vollkorn でプレビューする Try it デモ
 * 動作：Feature タグページ内で唯一の React island（`client:visible` でハイドレーション）。
 *       トグル・編集可能テキスト・現在適用中の font-feature-settings 値の表示を持つ。
 *       base に指定したタグは常に ON として一緒に適用される（対になる Feature の比較用）。
 * 実装状態：完全実装
 */
import { useMemo, useState } from "react";
import { buildFontFeatureSettings } from "@/lib/feature-css";
import { vollkorn } from "@/data/sample-fonts";

export interface FeatureDemoProps {
  /** 対象の Feature タグ（例: "liga"） */
  tag: string;
  /** プレビューに表示する初期テキスト。ユーザーが編集できる */
  text?: string;
  /** 常時 ON にしておく他の Feature タグ。対になる Feature の比較に使う */
  base?: string[];
  /** トグルの初期状態。既定は true */
  defaultOn?: boolean;
}

/** Try it デモ本体。対象タグの ON/OFF に応じて Vollkorn プレビューを再描画する */
export default function FeatureDemo({
  tag,
  text: initialText = "The quick brown fox jumps over the lazy dog.",
  base = [],
  defaultOn = true,
}: FeatureDemoProps) {
  const [on, setOn] = useState(defaultOn);
  const [text, setText] = useState(initialText);

  // base のタグを先に、対象タグを後に並べる。順序はそのまま生成 CSS の表示順になる
  const fontFeatureSettings = useMemo(() => {
    const settings: Record<string, boolean> = {};
    for (const baseTag of base) {
      settings[baseTag] = true;
    }
    settings[tag] = on;
    return buildFontFeatureSettings(settings);
  }, [tag, base, on]);

  return (
    <div className="not-content my-4 rounded-lg border border-[var(--sl-color-gray-5)] p-4">
      <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => setOn(event.target.checked)}
        />
        <code>{tag}</code>
        <span className="text-[var(--sl-color-gray-3)]">
          {on ? "ON" : "OFF"}
        </span>
      </label>
      <textarea
        className="w-full resize-none rounded border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-3 text-3xl leading-normal text-[var(--sl-color-white)] focus:outline focus:outline-[var(--sl-color-accent)]"
        style={{
          fontFamily: `"${vollkorn.family}", serif`,
          fontFeatureSettings,
        }}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        spellCheck={false}
        aria-label="Preview text"
      />
      <p className="mt-2 text-sm text-[var(--sl-color-gray-3)]">
        <code>font-feature-settings: {fontFeatureSettings};</code>
      </p>
    </div>
  );
}
