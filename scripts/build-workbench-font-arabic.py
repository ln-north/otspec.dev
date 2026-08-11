#!/usr/bin/env python3
"""
責務：Playground のアラビア文字（lam-alef 合字）実演で使う「アラビア文字
    ワークベンチフォント」を Noto Naskh Arabic から生成する
    （scripts/build-workbench-font.py の Arabic 版）。
動作：
  1. --source で指定した Noto Naskh Arabic Regular の生フォント（TTF）を読み込む。
     公式配布元: https://github.com/notofonts/arabic
     検証に使用したリリース: NotoNaskhArabic-v2.021
     https://github.com/notofonts/arabic/releases/download/NotoNaskhArabic-v2.021/NotoNaskhArabic-v2.021.zip
     展開後 NotoNaskhArabic/full/ttf/NotoNaskhArabic-Regular.ttf を指定する。
     ライセンス（OFL、Reserved Font Name 無し）は同梱の OFL.txt を参照。
  2. lam・alef の基本グリフ、位置別字形（.init/.medi/.fina）、合字
     （uniFEFB = LAM WITH ALEF ISOLATED FORM, uniFEFC = LAM WITH ALEF FINAL FORM）
     + UI 表示用の基本ラテン文字・数字・スペース・基本記号（ASCII U+0020-007E）
     だけを残してサブセットする。GSUB/GPOS/GDEF は Playground 側で fea-rs の
     出力に差し替えるため、ここでは破棄する。
  3. post テーブルのグリフ名（--glyph-names）は必ず保持する。名前が失われると
     ブラウザ側で .fea を書けなくなるため。
  4. cmap から U+FEFB / U+FEFC（lam-alef 合字の表示形）のエントリを除去する
     （グリフ自体は削除しない。GSUB 経由でのみ到達できるようにする）。
     Noto Naskh Arabic は表示形もそのまま cmap に載せているため、素の
     サブセットだとブラウザが Unicode 正規化（互換分解、NFKC 相当）で
     「lam + alef」を自動的に U+FEFB のグリフへ差し替えてしまい、
     Playground で `.fea` に rlig 規則を書いても書かなくても描画が同一になる
     （規則の効果が全く見えないデモになってしまう）。
     この加工はフォントを不自然にするものではなく、むしろ一般的な構成に
     近づけるもの：実際に配布されている多くのフォントは表示形を cmap に
     載せず、GSUB（rlig 等）経由でのみ到達させている。
  5. 出力は raw TTF（WOFF2 にしない。ブラウザ側で sfnt テーブルを直接
     操作するため）。

実装状態：完全実装。
    `python3 scripts/build-workbench-font-arabic.py --source <NotoNaskhArabic-Regular.ttf へのパス>`
    で public/fonts/noto-naskh-arabic-workbench.ttf を生成できる。

依存：fontTools（入力は無圧縮 TTF のため brotli は不要）

注意：build-workbench-font.py と異なり、フルサイズの入力フォント自体は
    リポジトリに同梱しない（--source は必須引数）。再現する場合は上記 URL から
    取得すること。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from fontTools.subset import Options, Subsetter, parse_unicodes
from fontTools.ttLib import TTFont

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_TTF = REPO_ROOT / "public" / "fonts" / "noto-naskh-arabic-workbench.ttf"

# lam・alef の基本グリフ + 位置別字形 + 合字
# （実測: Noto Naskh Arabic v2.021 の post テーブルに実在するグリフ名。
#  fontTools で cmap/glyph order を確認済み）
ARABIC_GLYPHS = [
    "uni0644",  # LAM（既定/孤立形）
    "uni0644.init",  # LAM 語頭形
    "uni0644.medi",  # LAM 語中形
    "uni0644.fina",  # LAM 語末形
    "uni0627",  # ALEF（既定/孤立形）
    "uni0627.fina",  # ALEF 語末形（ALEF は語頭・語中形を持たない＝右結合のみ）
    "uniFEFB",  # ARABIC LIGATURE LAM WITH ALEF ISOLATED FORM (U+FEFB)
    "uniFEFC",  # ARABIC LIGATURE LAM WITH ALEF FINAL FORM (U+FEFC)
]

# UI 表示用の基本ラテン文字・数字・スペース・基本記号
BASIC_LATIN_UNICODES = "U+0020-007E"

# cmap から除去する lam-alef 合字の表示形（Presentation Form）の code point。
# グリフ自体（uniFEFB/uniFEFC）は残し、GSUB（rlig）経由でのみ到達できるようにする。
PRESENTATION_FORM_CODEPOINTS = [
    0xFEFB,  # ARABIC LIGATURE LAM WITH ALEF ISOLATED FORM
    0xFEFC,  # ARABIC LIGATURE LAM WITH ALEF FINAL FORM
]


def load_font(source: Path) -> TTFont:
    """入力 TTF を読み込む。可変フォントは未対応（静的インスタンスを要求する）。"""
    font = TTFont(str(source))
    if "fvar" in font:
        raise RuntimeError(
            "入力フォントに fvar がある。可変フォントは未対応。"
            "NotoNaskhArabic/full/ttf/NotoNaskhArabic-Regular.ttf のような"
            "静的インスタンスを指定すること"
        )
    return font


def subset_to_workbench(font: TTFont) -> None:
    """アラビア文字デモ + 基本ラテン一式だけを残し、GSUB/GPOS/GDEF を破棄するサブセットを in-place で行う。"""
    options = Options()
    options.glyph_names = True  # post 2.0 のグリフ名を保持（.fea 記述に必須）
    options.layout_features = []  # GSUB/GPOS の feature を一切残さない
    options.drop_tables += ["GSUB", "GPOS", "GDEF"]  # 明示的に破棄（Playground 側で差し替える）
    options.notdef_outline = True  # .notdef に本物の輪郭を残す（表示上の事故防止）
    options.recalc_bounds = True
    options.recalc_timestamp = False

    unicodes = parse_unicodes(BASIC_LATIN_UNICODES)
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=unicodes, glyphs=ARABIC_GLYPHS, text="")
    subsetter.subset(font)


def remove_presentation_form_cmap_entries(font: TTFont) -> None:
    """cmap から lam-alef 合字の表示形（U+FEFB/U+FEFC）のエントリを除去する。

    グリフ（uniFEFB/uniFEFC）自体は削除しない。cmap から見えなくするだけで、
    以後は GSUB（rlig 等）のグリフ置換経由でのみ到達できるようになる。

    多くの実フォントは表示形を cmap に載せず GSUB 経由でのみ到達させる
    構成を取っており、この加工はフォントを不自然にするのではなく、
    むしろその一般的な構成に近づけるものである。cmap に残したままだと、
    ブラウザが Unicode の互換分解（NFKC 相当）で「lam + alef」の並びを
    自動的に U+FEFB のグリフへ差し替えてしまい、`.fea` に rlig 規則を
    書いても書かなくても描画が同一になってしまう（Playground のデモとして
    規則の効果が全く見えなくなる）。
    """
    cmap_table = font["cmap"]
    for subtable in cmap_table.tables:
        for codepoint in PRESENTATION_FORM_CODEPOINTS:
            subtable.cmap.pop(codepoint, None)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        required=True,
        type=Path,
        help=(
            "Noto Naskh Arabic Regular の生フォント（TTF）へのパス。"
            "公式配布元: https://github.com/notofonts/arabic"
            "（release NotoNaskhArabic-v2.021 の full/ttf/NotoNaskhArabic-Regular.ttf）"
        ),
    )
    args = parser.parse_args()

    if not args.source.exists():
        print(f"入力フォントが見つからない: {args.source}", file=sys.stderr)
        return 1

    font = load_font(args.source)
    subset_to_workbench(font)
    remove_presentation_form_cmap_entries(font)

    OUTPUT_TTF.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(OUTPUT_TTF))

    final = TTFont(str(OUTPUT_TTF))
    glyph_order = final.getGlyphOrder()
    print(f"出力: {OUTPUT_TTF} ({OUTPUT_TTF.stat().st_size} bytes)")
    print(f"tables: {sorted(final.keys())}")
    print(f"numGlyphs: {final['maxp'].numGlyphs}")
    print(f"post format: {final['post'].formatType}")
    print(f"glyph order: {glyph_order}")

    missing = [g for g in [".notdef", "space"] + ARABIC_GLYPHS if g not in glyph_order]
    if missing:
        print(f"警告: 期待したグリフが欠落している: {missing}", file=sys.stderr)
        return 1

    # cmap から表示形が確実に除去され、かつグリフ自体は残っていることを検証する
    best_cmap = final.getBestCmap()
    leaked = [cp for cp in PRESENTATION_FORM_CODEPOINTS if cp in best_cmap]
    if leaked:
        print(
            f"警告: cmap に表示形の code point が残っている: {[hex(cp) for cp in leaked]}",
            file=sys.stderr,
        )
        return 1
    print(
        "cmap 確認: "
        + ", ".join(f"{hex(cp)} -> (削除済み)" for cp in PRESENTATION_FORM_CODEPOINTS)
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
