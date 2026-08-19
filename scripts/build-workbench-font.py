#!/usr/bin/env python3
"""
責務：Playground（RuleEditor）の土台となる「ワークベンチフォント」を Vollkorn から生成する。
動作：
  1. リポジトリ同梱の public/fonts/vollkorn-var.woff2（可変フォント）を読み込み、
     wght=400 に固定した静的フォントへインスタンス化する。
  2. 合字デモに必要なグリフ（f, i, l と合字 fi/fl/f_f/f_f_i/f_f_l）+
     基本ラテン文字・数字・スペース・基本記号（ASCII U+0020-007E）だけを残して
     サブセットする。GSUB/GPOS/GDEF は Playground 側で fea-rs の出力に
     差し替えるため、ここでは破棄する。
  3. post テーブルのグリフ名（--glyph-names）は必ず保持する。名前が失われると
     ブラウザ側で .fea を書けなくなるため。
  4. 出力は raw TTF（WOFF2 にしない。ブラウザ側で sfnt テーブルを直接
     操作するため）。

実装状態：完全実装。再現可能な手順として `python3 scripts/build-workbench-font.py`
一発で public/fonts/vollkorn-workbench.ttf を再生成できる。

依存：fontTools（brotli 込み。WOFF2 の展開に必要）
"""

from __future__ import annotations

import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_WOFF2 = REPO_ROOT / "public" / "fonts" / "vollkorn-var.woff2"
OUTPUT_TTF = REPO_ROOT / "public" / "fonts" / "vollkorn-workbench.ttf"

# 合字デモで実際に使う合字グリフ名（Vollkorn の実測グリフ名。f_i や ff ではない）。
# c_t / s_t / T_h は Vollkorn が dlig に持つ合字で、dlig のデモに使う
LIGATURE_GLYPHS = ["fi", "fl", "f_f", "f_f_i", "f_f_l", "c_t", "s_t", "T_h"]

# 基本ラテン文字・数字・スペース・基本記号。ASCII 印字可能範囲をそのまま使う
# （f, i, l はここに含まれる。合字は cmap 経由で辿れないため上の LIGATURE_GLYPHS で明示する）
BASIC_LATIN_UNICODES = "U+0020-007E"


def load_static_instance() -> TTFont:
    """vollkorn-var.woff2 を読み込み、wght=400 に固定した静的 TTFont を返す。

    TTFont は WOFF2 を自動判別して展開する（brotli 依存）。
    flavor を None に戻すことで、以降の保存が raw TTF（sfnt）になる。
    """
    font = TTFont(str(SOURCE_WOFF2))
    font.flavor = None  # WOFF2 圧縮を解除し、生の sfnt として扱う

    if "fvar" not in font:
        raise RuntimeError("入力フォントに fvar が無い。可変フォントではない可能性がある")

    # 全軸を wght=400 に固定 → 静的フォント化（fvar/gvar/avar/HVAR 等は
    # instantiateVariableFont が自動的に除去する）
    instantiateVariableFont(font, {"wght": 400.0}, inplace=True)

    if "fvar" in font:
        raise RuntimeError("wght=400 固定後も fvar が残っている。全軸固定に失敗している")

    return font


def subset_to_workbench(font: TTFont) -> None:
    """合字デモ + 基本ラテン一式だけを残し、GSUB/GPOS/GDEF を破棄するサブセットを in-place で行う。"""
    options = Options()
    options.glyph_names = True  # post 2.0 のグリフ名を保持（.fea 記述に必須）
    options.layout_features = []  # GSUB/GPOS の feature を一切残さない
    options.drop_tables += ["GSUB", "GPOS", "GDEF"]  # 明示的に破棄（Playground 側で差し替える）
    options.notdef_outline = True  # .notdef に本物の輪郭を残す（表示上の事故防止）
    options.recalc_bounds = True
    options.recalc_timestamp = False

    from fontTools.subset import parse_unicodes

    unicodes = parse_unicodes(BASIC_LATIN_UNICODES)
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=unicodes, glyphs=LIGATURE_GLYPHS, text="")
    subsetter.subset(font)


def main() -> int:
    if not SOURCE_WOFF2.exists():
        print(f"入力フォントが見つからない: {SOURCE_WOFF2}", file=sys.stderr)
        return 1

    font = load_static_instance()
    subset_to_workbench(font)

    OUTPUT_TTF.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(OUTPUT_TTF))

    final = TTFont(str(OUTPUT_TTF))
    glyph_order = final.getGlyphOrder()
    print(f"出力: {OUTPUT_TTF} ({OUTPUT_TTF.stat().st_size} bytes)")
    print(f"tables: {sorted(final.keys())}")
    print(f"numGlyphs: {final['maxp'].numGlyphs}")
    print(f"post format: {final['post'].formatType}")
    print(f"glyph order: {glyph_order}")

    missing = [g for g in [".notdef", "space"] + LIGATURE_GLYPHS if g not in glyph_order]
    if missing:
        print(f"警告: 期待したグリフが欠落している: {missing}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
