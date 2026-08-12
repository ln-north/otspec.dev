# License

This repository contains three kinds of material, each under a different license.

## Prose — CC BY 4.0

The written documentation: the prose in `src/content/docs/` and the project documents in `docs/`, `README.md`, and `ROADMAP.md`.

Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). You may share and adapt it, including commercially, as long as you give appropriate credit.

## Code examples — CC0 1.0

The code blocks inside the documentation — feature file (`.fea`) snippets, CSS, and similar examples shown to the reader.

Dedicated to the public domain under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Copy them into your fonts and projects freely. No attribution required.

These examples exist to be used. Requiring attribution for a three-line substitution rule would defeat the purpose.

## Software — MIT

Everything else: `src/components/`, `src/lib/`, `src/data/`, `src/grammars/`, `crates/`, `scripts/`, `astro.config.mjs`, and the rest of the build setup.

```
MIT License

Copyright (c) 2026 ln-north

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Bundled fonts — not covered by the above

The fonts in `public/fonts/` are third-party works redistributed under the SIL Open Font License 1.1. Their license texts are included alongside them.

| Font | Source | License |
| --- | --- | --- |
| Vollkorn | [FAlthausen/Vollkorn-Typeface](https://github.com/FAlthausen/Vollkorn-Typeface) | OFL 1.1 — `public/fonts/vollkorn-OFL.txt` |
| Noto Naskh Arabic | [notofonts/arabic](https://github.com/notofonts/arabic) | OFL 1.1 — `public/fonts/noto-naskh-arabic-OFL.txt` |

The subsetted workbench fonts in `public/fonts/` are derived from these and remain under OFL 1.1. Neither original declares a Reserved Font Name.

## Source specifications

This site documents the OpenType specification and the OpenType Feature File specification. Its prose is written from those sources rather than copied from them, so it is not a derivative of their text. Where a passage or an example is quoted, the source is cited on the page.

- [OpenType Specification](https://learn.microsoft.com/en-us/typography/opentype/spec/) — Microsoft
- [OpenType Feature File Specification](https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html) — Adobe, Apache License 2.0
