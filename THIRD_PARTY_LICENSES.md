# Third-party notices

## Noto CJK fonts

Local subsets are derived from Noto Sans/Serif CJK SC, TC, HK and JP Regular at upstream revision `f8d157532fbfaeda587e826d4cd5b21a49186f7c`:
[notofonts/noto-cjk](https://github.com/notofonts/noto-cjk/tree/f8d157532fbfaeda587e826d4cd5b21a49186f7c).
Font files are modified only by Unicode subsetting and WOFF2 compression. Source URLs and SHA-256 checksums are recorded in `public/fonts/manifest.json`. Their SIL Open Font License 1.1 and copyright notices are included in `public/fonts/Sans-LICENSE.txt` and `public/fonts/Serif-LICENSE.txt`.

## Unicode Unihan

Character records and reverse-reading indexes are derived from [Unicode 17.0.0 Unihan.zip](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip), SHA-256 `f7a48b2b545acfaa77b2d607ae28747404ce02baefee16396c5d2d7a8ef34b5e`.
Field semantics: [UAX #38, version 17.0.0](https://www.unicode.org/reports/tr38/tr38-39.html).
The Unicode License and copyright notice are included in `public/data/unihan/LICENSE.txt`.

## OpenCC / opencc-js

Regional conversion uses `opencc-js` 1.4.1 and its bundled OpenCC data. It is distributed under MIT AND Apache-2.0 terms. Its bundled dictionary notices are retained by the package: `node_modules/opencc-js/THIRD_PARTY_LICENSES.md`, `LICENSE`, and `LICENSES/Apache-2.0.txt`.

## WanaKana

Kana/romaji transliteration uses WanaKana 5.3.1 under the MIT License. Transliteration does not add new readings; the readings remain those recorded by Unihan.

## Application dependencies

React, React DOM, React Router and other dependencies retain their upstream licenses. See the lockfile for exact installed versions and `npm ls` for the dependency tree.
