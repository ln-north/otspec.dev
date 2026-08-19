#!/usr/bin/env python3
"""
責務：和文の組文字デモ用ワークベンチフォントを BIZ UDGothic から生成する。
動作：
  1. Google Fonts が配布する BIZUDGothic-Regular.ttf（SIL Open Font License 1.1）を
     ダウンロードする。公式配布元:
     https://github.com/google/fonts/tree/main/ofl/bizudgothic
  2. 組文字デモに必要なグリフだけを残してサブセットする。入力側は ASCII・
     ひらがな・カタカナ・組文字を構成する漢字、出力側は ㍿ ゟ ヿ 〼 ℡ など
     合成済みの組文字。GSUB/GPOS/GDEF は Playground 側で fea-rs の出力に
     差し替えるため破棄する。
  3. post テーブルのグリフ名（--glyph-names）を保持する。元フォントは post 3.0
     でグリフ名を持たないが、fontTools が cmap から uniXXXX 形式の名前を
     合成するため、サブセット後は post 2.0 でその名前が書き出される。
     `.fea` はこの名前で書く。
  4. 出力は raw TTF（WOFF2 にしない。ブラウザ側で sfnt テーブルを直接操作するため）。

実装状態：完全実装。`python3 scripts/build-workbench-font-ja.py` 一発で
public/fonts/bizudgothic-workbench.ttf を再生成できる。

依存：fontTools
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

from fontTools.subset import Options, Subsetter, parse_unicodes
from fontTools.ttLib import TTFont

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = (
    "https://github.com/google/fonts/raw/main/ofl/bizudgothic/BIZUDGothic-Regular.ttf"
)
OUTPUT_TTF = REPO_ROOT / "public" / "fonts" / "bizudgothic-workbench.ttf"

# 組文字の出力側。cmap から辿れるので unicode 指定で足りるが、意図を明示するために列挙する
COMPOSITES = "㍿ゟヿ〼℡№㎏㎝㎡"

# 組文字を構成する漢字。ひらがな・カタカナ・ASCII はブロック指定で入る
KANJI = "株式会社"

# ASCII 印字可能範囲・ひらがな・カタカナ・全角英数
UNICODE_RANGES = "U+0020-007E,U+3040-30FF,U+FF01-FF5E"


def download_source(dest: Path) -> None:
    """公式配布元から BIZUDGothic-Regular.ttf を取得する。既にあれば何もしない。"""
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(SOURCE_URL) as response, dest.open("wb") as out:
        out.write(response.read())


def subset_to_workbench(font: TTFont) -> None:
    """組文字デモに必要なグリフだけを残し、GSUB/GPOS/GDEF を破棄するサブセットを in-place で行う。"""
    options = Options()
    options.glyph_names = True  # post 2.0 のグリフ名を保持（.fea 記述に必須）
    options.layout_features = []  # GSUB/GPOS の feature を一切残さない
    options.drop_tables += ["GSUB", "GPOS", "GDEF"]  # 明示的に破棄（Playground 側で差し替える）
    options.notdef_outline = True  # .notdef に本物の輪郭を残す（表示上の事故防止）
    options.recalc_bounds = True
    options.recalc_timestamp = False

    subsetter = Subsetter(options=options)
    subsetter.populate(
        unicodes=parse_unicodes(UNICODE_RANGES),
        text=COMPOSITES + KANJI,
    )
    subsetter.subset(font)

    # 元フォントの post は 3.0（グリフ名を持たない）。Playground はグリフ名で
    # `.fea` を書くため、fontTools が cmap から合成した uniXXXX 名を
    # post 2.0 として書き出させる
    post = font["post"]
    post.formatType = 2.0
    post.extraNames = []
    post.mapping = {}
    post.glyphOrder = font.getGlyphOrder()


def main() -> int:
    source = REPO_ROOT / "build" / "BIZUDGothic-Regular.ttf"
    try:
        download_source(source)
    except Exception as err:  # noqa: BLE001 — 取得失敗の理由をそのまま見せる
        print(f"元フォントの取得に失敗した: {err}", file=sys.stderr)
        print(f"手動で {SOURCE_URL} を {source} に置いてから再実行する", file=sys.stderr)
        return 1

    font = TTFont(str(source))
    subset_to_workbench(font)

    OUTPUT_TTF.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(OUTPUT_TTF))

    final = TTFont(str(OUTPUT_TTF))
    cmap = final.getBestCmap()
    print(f"出力: {OUTPUT_TTF} ({OUTPUT_TTF.stat().st_size} bytes)")
    print(f"tables: {sorted(final.keys())}")
    print(f"numGlyphs: {final['maxp'].numGlyphs}")
    print(f"post format: {final['post'].formatType}")

    missing = [c for c in COMPOSITES + KANJI if ord(c) not in cmap]
    if missing:
        print(f"警告: 期待した文字が欠落している: {missing}", file=sys.stderr)
        return 1

    print("組文字のグリフ名: " + " ".join(f"{c}={cmap[ord(c)]}" for c in COMPOSITES))
    print("漢字のグリフ名: " + " ".join(f"{c}={cmap[ord(c)]}" for c in KANJI))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
