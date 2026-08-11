/**
 * 責務：fea-rs が生成した最小 sfnt（GSUB/GPOS/GDEF のみ実用）と、ワークベンチ
 * フォント（グリフアウトライン・メトリクス等一式）を合成し、ブラウザで
 * `FontFace` として読み込める完全な OpenType バイナリ（sfnt）を組み立てる。
 * 動作：sfnt のテーブルディレクトリを自前でパース・再構築する。
 * 追加ライブラリには依存しない（ArrayBuffer / DataView のみ）。
 * 実装状態：完全実装
 */

/**
 * fea-rs の出力から採用するテーブルタグ。
 * fea-rs はコンパイル結果に GSUB/GPOS/GDEF 以外（maxp, name, STAT, BASE 等）
 * も付随して積んでくることがあるが、それらは常にベースフォント側を正とし無視する。
 */
const FEA_SOURCED_TABLES = ["GSUB", "GPOS", "GDEF"];

/**
 * post テーブル format 1.0 / 2.0 で使う Standard Macintosh Ordering（258 グリフ名）。
 * fontTools（`fontTools.ttLib.tables._p_o_s_t.standardGlyphOrder`）の値をそのまま転記。
 *
 * post format 2.0 であっても、標準名と一致するグリフは新規に名前を積まず
 * 0-257 の index で標準表を参照する（容量効率のため）。したがってこの表は
 * format 2.0 の解析にも必須（実測: ワークベンチフォントの 111 グリフ中 99 個が
 * この標準 index 経由で参照されている）。
 */
const STANDARD_MAC_GLYPH_ORDER: readonly string[] = [
  ".notdef", ".null", "nonmarkingreturn", "space", "exclam", "quotedbl",
  "numbersign", "dollar", "percent", "ampersand", "quotesingle", "parenleft",
  "parenright", "asterisk", "plus", "comma", "hyphen", "period",
  "slash", "zero", "one", "two", "three", "four",
  "five", "six", "seven", "eight", "nine", "colon",
  "semicolon", "less", "equal", "greater", "question", "at",
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
  "M", "N", "O", "P", "Q", "R",
  "S", "T", "U", "V", "W", "X",
  "Y", "Z", "bracketleft", "backslash", "bracketright", "asciicircum",
  "underscore", "grave", "a", "b", "c", "d",
  "e", "f", "g", "h", "i", "j",
  "k", "l", "m", "n", "o", "p",
  "q", "r", "s", "t", "u", "v",
  "w", "x", "y", "z", "braceleft", "bar",
  "braceright", "asciitilde", "Adieresis", "Aring", "Ccedilla", "Eacute",
  "Ntilde", "Odieresis", "Udieresis", "aacute", "agrave", "acircumflex",
  "adieresis", "atilde", "aring", "ccedilla", "eacute", "egrave",
  "ecircumflex", "edieresis", "iacute", "igrave", "icircumflex", "idieresis",
  "ntilde", "oacute", "ograve", "ocircumflex", "odieresis", "otilde",
  "uacute", "ugrave", "ucircumflex", "udieresis", "dagger", "degree",
  "cent", "sterling", "section", "bullet", "paragraph", "germandbls",
  "registered", "copyright", "trademark", "acute", "dieresis", "notequal",
  "AE", "Oslash", "infinity", "plusminus", "lessequal", "greaterequal",
  "yen", "mu", "partialdiff", "summation", "product", "pi",
  "integral", "ordfeminine", "ordmasculine", "Omega", "ae", "oslash",
  "questiondown", "exclamdown", "logicalnot", "radical", "florin", "approxequal",
  "Delta", "guillemotleft", "guillemotright", "ellipsis", "nonbreakingspace", "Agrave",
  "Atilde", "Otilde", "OE", "oe", "endash", "emdash",
  "quotedblleft", "quotedblright", "quoteleft", "quoteright", "divide", "lozenge",
  "ydieresis", "Ydieresis", "fraction", "currency", "guilsinglleft", "guilsinglright",
  "fi", "fl", "daggerdbl", "periodcentered", "quotesinglbase", "quotedblbase",
  "perthousand", "Acircumflex", "Ecircumflex", "Aacute", "Edieresis", "Egrave",
  "Iacute", "Icircumflex", "Idieresis", "Igrave", "Oacute", "Ocircumflex",
  "apple", "Ograve", "Uacute", "Ucircumflex", "Ugrave", "dotlessi",
  "circumflex", "tilde", "macron", "breve", "dotaccent", "ring",
  "cedilla", "hungarumlaut", "ogonek", "caron", "Lslash", "lslash",
  "Scaron", "scaron", "Zcaron", "zcaron", "brokenbar", "Eth",
  "eth", "Yacute", "yacute", "Thorn", "thorn", "minus",
  "multiply", "onesuperior", "twosuperior", "threesuperior", "onehalf", "onequarter",
  "threequarters", "franc", "Gbreve", "gbreve", "Idotaccent", "Scedilla",
  "scedilla", "Cacute", "cacute", "Ccaron", "ccaron", "dcroat",
];

/** sfnt テーブルディレクトリの 1 レコードから 4 文字のタグを読む */
function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

/**
 * sfnt バイナリのテーブルディレクトリを解析し、タグ → テーブル実体（コピー）の
 * Map を返す。返り値の Uint8Array は元の buffer から独立した新規コピー。
 */
function parseSfntTables(buffer: ArrayBuffer): Map<string, Uint8Array> {
  const view = new DataView(buffer);
  const numTables = view.getUint16(4);
  const tables = new Map<string, Uint8Array>();
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    const tag = readTag(view, record);
    const offset = view.getUint32(record + 8);
    const length = view.getUint32(record + 12);
    tables.set(tag, new Uint8Array(buffer, offset, length).slice());
  }
  return tables;
}

/**
 * フォントバイナリの post テーブル（format 2.0 のみ対応）から、グリフ ID 順の
 * グリフ名一覧を取り出す。
 *
 * fea-rs の `compile_fea_js` に渡す glyph_order は、この配列を改行区切りで
 * 結合したもの。ベースフォントの実際のグリフ ID 順序と必ず一致させること
 * （順序がずれるとコンパイル結果のグリフ ID 対応が壊れる）。
 *
 * @returns 新規配列（グリフ ID の昇順）
 * @throws post テーブルが無い、または format が 2.0 以外の場合。
 *   format 1.0 / 2.5 / 3.0 は意図的に未対応（3.0 はそもそも名前を持たず、
 *   1.0 は標準名のみで新規名を持てない。ワークベンチフォント生成時に
 *   `pyftsubset --glyph-names` を指定していれば常に 2.0 になる）
 */
export function getGlyphOrder(fontBuffer: ArrayBuffer): string[] {
  const tables = parseSfntTables(fontBuffer);
  const post = tables.get("post");
  if (!post) {
    throw new Error("post テーブルが無く、グリフ名を取得できない");
  }
  const view = new DataView(post.buffer, post.byteOffset, post.byteLength);
  const version = view.getUint32(0);
  if (version !== 0x00020000) {
    throw new Error(
      `post format 2.0 以外は未対応（実際: 0x${version.toString(16)}）。` +
        "ワークベンチフォントは pyftsubset --glyph-names 付きでサブセットし、format 2.0 を維持すること。",
    );
  }

  const numberOfGlyphs = view.getUint16(32);
  const indices: number[] = new Array(numberOfGlyphs);
  for (let i = 0; i < numberOfGlyphs; i++) {
    indices[i] = view.getUint16(34 + i * 2);
  }

  // インデックス配列の直後に続く Pascal 文字列列（新規グリフ名）を先頭から順に読む
  const extraNames: string[] = [];
  let cursor = 34 + numberOfGlyphs * 2;
  while (cursor < post.byteLength) {
    const length = view.getUint8(cursor);
    cursor += 1;
    let name = "";
    for (let i = 0; i < length; i++) {
      name += String.fromCharCode(view.getUint8(cursor + i));
    }
    cursor += length;
    extraNames.push(name);
  }

  return indices.map((index) =>
    index < 258 ? STANDARD_MAC_GLYPH_ORDER[index] : extraNames[index - 258],
  );
}

/** 4 バイト境界に切り上げた長さ（sfnt のテーブルは 4 バイト境界にパディングされる） */
function paddedLength(length: number): number {
  return (length + 3) & ~3;
}

/**
 * OpenType 仕様のテーブルチェックサム（4 バイト単位 big-endian 語の総和、32bit
 * ラップアラウンド）。末尾がパディング境界に満たない分は 0 として扱う
 * （sfnt 上のテーブルは実際に 0 パディングされているため、この扱いで
 * ファイル全体のチェックサムとも整合する）。
 */
function calcTableChecksum(data: Uint8Array): number {
  let sum = 0;
  const padded = paddedLength(data.length);
  for (let i = 0; i < padded; i += 4) {
    const b0 = data[i] ?? 0;
    const b1 = data[i + 1] ?? 0;
    const b2 = data[i + 2] ?? 0;
    const b3 = data[i + 3] ?? 0;
    const word = ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
    sum = (sum + word) >>> 0;
  }
  return sum >>> 0;
}

/**
 * テーブル tag → 実体の Map から sfnt バイナリを新規に組み立てる。
 * ディレクトリはタグの昇順（バイト比較）で並べる（仕様上の要求）。
 *
 * `head.checkSumAdjustment` の扱いに注意：
 * 1. まず head テーブルの `checkSumAdjustment` フィールド（先頭 +8 バイト目）を
 *    0 にした状態で、ディレクトリ上の各テーブルチェックサム（head 自身のものも
 *    含む）を確定させる
 * 2. ファイル全体を書き終えた「素の」状態でファイル全体のチェックサムを取り、
 *    `0xB1B0AFBA` との差分を `checkSumAdjustment` として head テーブルの実体
 *    （テーブルデータ側）にだけ書き戻す
 * 3. ディレクトリ上の head の checksum エントリは 1 で確定させた値のまま変更
 *    しない。つまり最終ファイルの head 実体（真の checkSumAdjustment 込み）
 *    から素直にチェックサムを取ると、ディレクトリ上の値とは一致しなくなるが、
 *    これは OpenType 仕様どおりの正しい挙動（fontTools 製の実フォントで
 *    実測して確認済み。checkSumAdjustment を 0 にした状態のチェックサムと
 *    ディレクトリの値が一致する）
 *
 * @returns 新規生成された ArrayBuffer
 */
function buildSfnt(sfntVersion: number, tables: Map<string, Uint8Array>): ArrayBuffer {
  const headDataOriginal = tables.get("head");
  if (!headDataOriginal) {
    throw new Error("head テーブルが無く、checkSumAdjustment を計算できない");
  }

  // head.checkSumAdjustment を先に 0 にしたコピーへ差し替える（上記 1）
  const headData = headDataOriginal.slice();
  new DataView(headData.buffer, headData.byteOffset, headData.byteLength).setUint32(8, 0);
  const workingTables = new Map(tables);
  workingTables.set("head", headData);

  const tags = Array.from(workingTables.keys()).sort();
  const numTables = tags.length;

  // sfnt ディレクトリの二分探索補助フィールド（仕様の算出式どおり）
  let entrySelector = 0;
  while (2 ** (entrySelector + 1) <= numTables) entrySelector++;
  const searchRange = 2 ** entrySelector * 16;
  const rangeShift = numTables * 16 - searchRange;

  const headerLength = 12;
  const directoryLength = numTables * 16;
  let totalLength = headerLength + directoryLength;
  for (const tag of tags) {
    totalLength += paddedLength(workingTables.get(tag)!.length);
  }

  const outBuffer = new ArrayBuffer(totalLength);
  const outView = new DataView(outBuffer);
  const outBytes = new Uint8Array(outBuffer);

  outView.setUint32(0, sfntVersion);
  outView.setUint16(4, numTables);
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, rangeShift);

  let dataOffset = headerLength + directoryLength;
  let headFileOffset = -1;

  tags.forEach((tag, i) => {
    const data = workingTables.get(tag)!;
    const record = headerLength + i * 16;
    for (let c = 0; c < 4; c++) {
      outView.setUint8(record + c, tag.charCodeAt(c));
    }
    outView.setUint32(record + 4, calcTableChecksum(data));
    outView.setUint32(record + 8, dataOffset);
    outView.setUint32(record + 12, data.length);

    outBytes.set(data, dataOffset);
    if (tag === "head") {
      headFileOffset = dataOffset;
    }

    dataOffset += paddedLength(data.length);
  });

  // ここまでで書き終えた「checkSumAdjustment = 0」状態のファイル全体の
  // チェックサムを取り、0xB1B0AFBA との差分を head の実体にだけ書き戻す（上記 2, 3）
  const fileChecksum = calcTableChecksum(outBytes);
  const checkSumAdjustment = (0xb1b0afba - fileChecksum) >>> 0;
  outView.setUint32(headFileOffset + 8, checkSumAdjustment);

  return outBuffer;
}

/**
 * fea-rs のコンパイル結果とワークベンチフォントを合成し、完全な OpenType
 * バイナリを返す。
 *
 * - GSUB/GPOS/GDEF は `feaOutputBuffer` 側にあればそれを採用する
 * - それ以外のテーブル（glyf, loca, cmap, hmtx, head, hhea, maxp, post, OS/2,
 *   name 等）はすべて `baseFontBuffer` 側を使う
 * - `feaOutputBuffer` にしか無いテーブル（fea-rs が付随して積む maxp, name,
 *   STAT, BASE 等）は無視する
 * - `FEA_SOURCED_TABLES` のうちどちらのフォントにも無いタグは、最終的な
 *   sfnt にも含まれない（例: .fea に位置調整規則が無ければ GPOS は省略される）
 *
 * @param baseFontBuffer ワークベンチフォント（raw TTF）の ArrayBuffer
 * @param feaOutputBuffer fea-rs のコンパイル成功時のバイナリ
 * @returns 新規生成された完全な sfnt バイナリ（新規 ArrayBuffer、入力は変更しない）
 */
export function assembleFont(
  baseFontBuffer: ArrayBuffer,
  feaOutputBuffer: ArrayBuffer,
): ArrayBuffer {
  const baseTables = parseSfntTables(baseFontBuffer);
  const feaTables = parseSfntTables(feaOutputBuffer);
  const sfntVersion = new DataView(baseFontBuffer).getUint32(0);

  const merged = new Map<string, Uint8Array>();
  for (const [tag, data] of baseTables) {
    if (FEA_SOURCED_TABLES.includes(tag)) continue;
    merged.set(tag, data);
  }
  for (const tag of FEA_SOURCED_TABLES) {
    const data = feaTables.get(tag);
    if (data) {
      merged.set(tag, data);
    }
  }

  return buildSfnt(sfntVersion, merged);
}
