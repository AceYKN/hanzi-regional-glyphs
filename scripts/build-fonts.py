"""Build immutable, local Noto CJK subsets. Requires fonttools and brotli."""
import concurrent.futures
import copy
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import time
from fontTools import subset
from fontTools.ttLib import TTFont

REVISION = "f8d157532fbfaeda587e826d4cd5b21a49186f7c"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "fonts"
CACHE = ROOT / "work" / "font-build"
SOURCE_SHA256 = {
    "cn-sans": "2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b",
    "cn-serif": "2a2eae2628df83556c54018c41e20fa532c1b862c5256ae8b3f23feb918d12ca",
    "tw-sans": "dce08bd4fd91aa8aa76ed8fea4b694c2dfb8550f67871e326843212ddbeb88b4",
    "tw-serif": "234301038e76e7c35c43113785024700c4e4fe7bdce1d1fbbc42fca7e6683798",
    "hk-sans": "97c937514d645eae90415d30ba025e08a94d5bdffdc627404864f90aa0c7d83b",
    "hk-serif": "e687d5674d83acf62d1264da5d002c5401363418abb98dca0836d38d88953708",
    "jp-sans": "68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5",
    "jp-serif": "d9854c7a8ef170b5a7932558856fd64eb8de0b007cd823fed6f9f514ad2803d3",
}
LOCALES = {"cn": ("SimplifiedChinese", "sc"), "tw": ("TraditionalChinese", "tc"), "hk": ("TraditionalChineseHK", "hk"), "jp": ("Japanese", "jp")}

def build(item):
    locale, style = item
    key = f"{locale}-{style}"
    marker = CACHE / f"{key}.json"
    if marker.exists():
        cached = json.loads(marker.read_text(encoding="utf-8"))
        if cached[1]["sha256"] == SOURCE_SHA256[key] and all((OUT / name).exists() and hashlib.sha256((OUT / name).read_bytes()).hexdigest()[:12] == name.rsplit("-", 1)[1].split(".")[0] for name in cached[1]["files"]):
            return cached
    folder, suffix = LOCALES[locale]
    kind = "Sans" if style == "sans" else "Serif"
    url = f"https://raw.githubusercontent.com/notofonts/noto-cjk/{REVISION}/{kind}/OTF/{folder}/Noto{kind}CJK{suffix}-Regular.otf"
    for attempt in range(3):
        try:
            payload = urllib.request.urlopen(url, timeout=120).read()
            if hashlib.sha256(payload).hexdigest() != SOURCE_SHA256[key]:
                raise ValueError("Source font checksum mismatch")
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)
    original = TTFont(io.BytesIO(payload), recalcTimestamp=False)
    points = sorted(cp for cp in original.getBestCmap() if cp == 0x3007 or 0x3400 <= cp <= 0x4dbf or 0x4e00 <= cp <= 0x9fff or 0xf900 <= cp <= 0xfaff or 0x20000 <= cp <= 0x323af)
    groups = {}
    for cp in points:
        groups.setdefault(cp >> 10, []).append(cp)
    rules = []
    files = []
    for group, codes in groups.items():
        font = copy.deepcopy(original)
        options = subset.Options()
        options.flavor = "woff2"
        options.recalc_timestamp = False
        options.layout_features = []
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        sub = subset.Subsetter(options=options)
        sub.populate(unicodes=codes)
        sub.subset(font)
        font.flavor = "woff2"
        buffer = io.BytesIO()
        font.save(buffer)
        data = buffer.getvalue()
        digest = hashlib.sha256(data).hexdigest()[:12]
        name = f"{locale}-{style}-{group:x}-{digest}.woff2"
        (OUT / name).write_bytes(data)
        rules.append(f'@font-face{{font-family:"Han {locale} {style}";src:url("/fonts/{name}") format("woff2");font-weight:400;font-style:normal;font-display:swap;unicode-range:U+{group << 10:X}-{((group+1) << 10)-1:X};}}')
        files.append(name)
    original.close()
    print(f"{locale} {style}: {len(points)} code points, {len(files)} subsets", flush=True)
    result = key, {"source": url, "sha256": hashlib.sha256(payload).hexdigest(), "coverage": points, "files": files}, rules
    marker.write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
    return result

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    items = [(locale, style) for locale in LOCALES for style in ("sans", "serif")]
    with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(build, items))
    manifest = {"revision": REVISION, "fonts": {key: entry for key, entry, _ in results}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")) + "\n", encoding="utf-8")
    (OUT / "fonts.css").write_text("\n".join(rule for _, _, rules in results for rule in rules) + "\n", encoding="utf-8")
    for kind in ("Sans", "Serif"):
        url = f"https://raw.githubusercontent.com/notofonts/noto-cjk/{REVISION}/{kind}/LICENSE"
        (OUT / f"{kind}-LICENSE.txt").write_bytes(urllib.request.urlopen(url, timeout=60).read())

if __name__ == "__main__":
    main()
