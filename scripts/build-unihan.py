"""Regenerate checked-in character records from a pinned Unicode snapshot."""
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile

VERSION = "17.0.0"
URL = f"https://www.unicode.org/Public/{VERSION}/ucd/Unihan.zip"
SHA256 = "f7a48b2b545acfaa77b2d607ae28747404ce02baefee16396c5d2d7a8ef34b5e"
ROOT = Path(__file__).resolve().parents[1]
FIELDS = {"kMandarin", "kHanyuPinyin", "kJapaneseOn", "kJapaneseKun", "kSimplifiedVariant", "kTraditionalVariant", "kTotalStrokes"}

def main():
    payload = urllib.request.urlopen(URL, timeout=60).read()
    if hashlib.sha256(payload).hexdigest() != SHA256:
        raise ValueError("Unicode archive checksum mismatch")
    records = {}
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for name in archive.namelist():
            if not name.endswith(".txt"):
                continue
            for line in archive.read(name).decode("utf-8").splitlines():
                if not line or line.startswith("#"):
                    continue
                cp, field, value = line.split("\t", 2)
                if field in FIELDS:
                    records.setdefault(cp[2:], {})[field] = value
    directory = ROOT / "public" / "data" / "unihan"
    directory.mkdir(parents=True, exist_ok=True)
    shards = {}
    for cp, record in sorted(records.items(), key=lambda x: int(x[0], 16)):
        shard = f"{int(cp, 16) >> 12:x}"
        shards.setdefault(shard, {})[cp] = record
    for shard, entries in shards.items():
        (directory / f"{shard}.json").write_text(json.dumps({"version": VERSION, "entries": entries}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (directory / "manifest.json").write_text(json.dumps({"version": VERSION, "source": URL, "sha256": SHA256, "records": len(records), "shards": sorted(shards)}, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(records)} Unihan records in {len(shards)} shards")

if __name__ == "__main__":
    main()
