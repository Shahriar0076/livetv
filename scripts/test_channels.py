#!/usr/bin/env python3
"""
Test all IPTV channel streams and report which are working / not working.

Usage:
    python scripts/test_channels.py [--timeout 10] [--workers 20]

Prerequisites:
    pip install requests
"""

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from pathlib import Path
from urllib.parse import urlparse

import requests

# ---------------------------------------------------------------------------
# Parse channel data directly from the JS source
# ---------------------------------------------------------------------------

JS_FILE = Path(__file__).resolve().parent.parent / "src" / "lib" / "multipleChannelData.js"

SOURCE_META = {
    "CODE_CLOUD_BD": {"sourceName": "CodeCloudBD",  "sourceSlug": "codecloudbd",  "isAdult": False},
    "MRGIFY_TV":     {"sourceName": "Mrgify-TV",    "sourceSlug": "mrgify-tv",    "isAdult": False},
    "PRIATES_TV":    {"sourceName": "Pirates IPTV",  "sourceSlug": "pirates-iptv", "isAdult": False},
    "AKASH_TV":      {"sourceName": "Akash TV",      "sourceSlug": "akash-tv",     "isAdult": False},
    "DEKHO_PRIME":   {"sourceName": "DekhoPrime",    "sourceSlug": "dekhoprime",   "isAdult": False},
    "ADULT_IPTV":    {"sourceName": "Adult IPTV",     "sourceSlug": "adult-ip-tv",  "isAdult": True},
}

CATEGORY_MAP = {
    "sports": "Sports", "news": "News", "movies": "Movies", "music": "Music",
    "cartoon": "Cartoon", "kids": "Kids", "documentary": "Documentary",
    "religion": "Religion", "bangla": "Bangla", "entertainment": "Entertainment",
    "xxx": "XXX",
}

def normalize_category(raw: str) -> str:
    if not raw:
        return "General"
    key = raw.strip().lower()
    if key in CATEGORY_MAP:
        return CATEGORY_MAP[key]
    if "sports" in key:    return "Sports"
    if "news" in key:      return "News"
    if "movie" in key:     return "Movies"
    if "music" in key:     return "Music"
    if "cartoon" in key:   return "Cartoon"
    if "religion" in key or "islamic" in key: return "Religion"
    if "bangla" in key:    return "Bangla"
    if "documentary" in key or "info" in key: return "Documentary"
    return raw.strip().title()


def slugify(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9 -]", "", text)
    text = re.sub(r"[\s]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def extract_json_blocks(js_text: str) -> dict[str, list[dict]]:
    """Extract each const object and parse its data array as JSON."""
    result = {}
    pattern = re.compile(
        r"const\s+(\w+)\s*=\s*\{", re.MULTILINE
    )
    # Find all source objects
    starts = [(m.group(1), m.start()) for m in pattern.finditer(js_text)]

    for i, (name, start) in enumerate(starts):
        if name not in SOURCE_META:
            continue
        # Find the data array for this source
        # Look for "data": [ or data: [
        data_match = re.search(r'"?data"?\s*:\s*\[', js_text[start:])
        if not data_match:
            continue
        arr_start = start + data_match.start()
        # Find matching closing bracket
        depth = 0
        in_string = False
        escape = False
        arr_end = -1
        idx = js_text.index("[", arr_start)
        for j in range(idx, len(js_text)):
            ch = js_text[j]
            if escape:
                escape = False
                continue
            if ch == "\\" and in_string:
                escape = True
                continue
            if ch == '"' and not escape:
                in_string = not in_string
            if not in_string:
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        arr_end = j + 1
                        break

        if arr_end == -1:
            continue

        data_str = js_text[idx:arr_end]
        # The JSON inside the JS is valid JSON (keys are double-quoted)
        try:
            data = json.loads(data_str)
            result[name] = data
        except json.JSONDecodeError:
            # Try fixing trailing commas
            cleaned = re.sub(r",\s*([}\]])", r"\1", data_str)
            try:
                data = json.loads(cleaned)
                result[name] = data
            except json.JSONDecodeError as e:
                print(f"  [WARN] Failed to parse data for {name}: {e}")

    return result


def load_channels() -> list[dict]:
    if not JS_FILE.exists():
        print(f"[ERROR] {JS_FILE} not found.")
        sys.exit(1)

    js_text = JS_FILE.read_text(encoding="utf-8")
    raw_sources = extract_json_blocks(js_text)
    print(f"Parsed {len(raw_sources)} sources from {JS_FILE.name}")

    seen_urls = set()
    seen_ids = set()
    channels = []

    for source_name, meta in SOURCE_META.items():
        data = raw_sources.get(source_name, [])
        print(f"  {meta['sourceName']}: {len(data)} channels")
        for item in data:
            url = item.get("url", "").strip()
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)

            name = item.get("tvgName") or item.get("title") or "Unknown"
            category = normalize_category(item.get("groupTitle", ""))
            raw_id = item.get("tvgId") or item.get("title", "channel")
            base_slug = slugify(raw_id)
            ch_id = f"{meta['sourceSlug']}-{base_slug}"
            counter = 1
            while ch_id in seen_ids:
                ch_id = f"{meta['sourceSlug']}-{base_slug}-{counter}"
                counter += 1
            seen_ids.add(ch_id)

            channels.append({
                "id": ch_id,
                "name": name,
                "category": category,
                "logo": item.get("tvgLogo") or None,
                "url": url.replace("&amp;", "&"),
                "isAdult": meta["isAdult"],
                "sourceSlug": meta["sourceSlug"],
                "sourceName": meta["sourceName"],
            })

    print(f"\nTotal unique channels: {len(channels)}\n")
    return channels


# ---------------------------------------------------------------------------
# Test a single channel
# ---------------------------------------------------------------------------

@dataclass
class TestResult:
    id: str
    name: str
    category: str
    source: str
    url: str
    status: str = "error"       # working | error | timeout
    http_code: int | None = None
    content_type: str = ""
    error: str = ""
    is_hls: bool = False
    has_variants: bool = False

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
    "Connection": "keep-alive",
}

import io as _io
sys.stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding="cp1252", errors="replace")


def test_channel(ch: dict, timeout: int, session: requests.Session) -> TestResult:
    url = ch["url"]
    r = TestResult(
        id=ch["id"], name=ch["name"], category=ch["category"],
        source=ch["sourceName"], url=url,
    )

    try:
        resp = session.get(url, timeout=timeout, allow_redirects=True, stream=True)
        r.http_code = resp.status_code
        ct = resp.headers.get("Content-Type", "")
        r.content_type = ct

        if resp.status_code >= 400:
            r.status = "error"
            r.error = f"HTTP {resp.status_code}"
            resp.close()
            return r

        # Read a small chunk to validate the stream
        body = b""
        for chunk in resp.iter_content(chunk_size=4096):
            body += chunk
            if len(body) >= 8192:
                break
        resp.close()

        text = body.decode("utf-8", errors="replace")
        ct_lower = ct.lower()

        if ("mpegurl" in ct_lower or "m3u8" in ct_lower or "#EXTM3U" in text[:512]
                or text[:512].strip().startswith("#EXT")):
            r.is_hls = True
            r.has_variants = "#EXT-X-STREAM-INF" in text[:4096]
            r.status = "working"
        elif len(body) > 100:
            r.status = "working"
        else:
            r.status = "error"
            r.error = "Empty or unreadable response"

    except requests.exceptions.Timeout:
        r.status = "timeout"
        r.error = f"Timeout ({timeout}s)"
    except requests.exceptions.ConnectionError as e:
        r.status = "error"
        r.error = f"Connection failed: {str(e)[:100]}"
    except Exception as e:
        r.status = "error"
        r.error = str(e)[:150]

    return r


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Test IPTV channel streams")
    parser.add_argument("--timeout", type=int, default=15, help="HTTP timeout (seconds)")
    parser.add_argument("--workers", type=int, default=20, help="Concurrent threads")
    args = parser.parse_args()

    channels = load_channels()
    print(f"Testing {len(channels)} channels ({args.workers} workers, {args.timeout}s timeout)...\n")

    session = requests.Session()
    session.headers.update(HEADERS)

    results: list[TestResult] = []
    counts = {"working": 0, "error": 0, "timeout": 0}
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(test_channel, ch, args.timeout, session): ch for ch in channels}
        total = len(futures)
        for i, future in enumerate(as_completed(futures), 1):
            r = future.result()
            results.append(r)
            counts[r.status] = counts.get(r.status, 0) + 1

            icon = {"working": "[OK]", "error": "[FAIL]", "timeout": "[TIMEOUT]"}.get(r.status, "[??]")
            tag = f"  [{r.status.upper()}]" if r.status != "working" else ""
            suffix = f" — {r.error}" if r.error else ""
            print(f"  [{i:>{len(str(total))}}/{total}] {icon} {r.name:<35} {r.category:<12} ({r.source}){tag}{suffix}")

    elapsed = time.time() - start

    # ── Summary ──────────────────────────────────────────────────────────
    w, f, t = counts["working"], counts["error"], counts["timeout"]
    print("\n" + "=" * 70)
    print(f"  RESULTS:  {w} working / {f} failed / {t} timeout  (out of {len(channels)})")
    print(f"  TIME:     {elapsed:.1f}s")
    print("=" * 70)

    # ── Working channels ─────────────────────────────────────────────────
    working_list = sorted([r for r in results if r.status == "working"], key=lambda r: r.name)
    if working_list:
        print(f"\n=== WORKING ({len(working_list)}) ===")
        print("-" * 70)
        for r in working_list:
            v = " [master]" if r.has_variants else ""
            print(f"  {r.name:<40} {r.category:<14} ({r.source}){v}")

    # ── Failed channels ──────────────────────────────────────────────────
    failed_list = sorted([r for r in results if r.status != "working"], key=lambda r: r.name)
    if failed_list:
        print(f"\n=== NOT WORKING ({len(failed_list)}) ===")
        print("-" * 70)
        for r in failed_list:
            print(f"  {r.name:<40} {r.category:<14} ({r.source})  [{r.status}] {r.error}")

    # ── By category ──────────────────────────────────────────────────────
    cats: dict[str, dict] = {}
    for r in results:
        c = r.category
        cats.setdefault(c, {"w": 0, "t": 0})
        cats[c]["t"] += 1
        if r.status == "working":
            cats[c]["w"] += 1

    print("\nBY CATEGORY:")
    print("-" * 55)
    for cat in sorted(cats):
        w2, t2 = cats[cat]["w"], cats[cat]["t"]
        pct = w2 / t2 * 100 if t2 else 0
        bar = "#" * int(pct / 5) + "-" * (20 - int(pct / 5))
        print(f"  {cat:<15} {w2:>4}/{t2:<4}  {bar} {pct:.0f}%")

    # ── By source ────────────────────────────────────────────────────────
    srcs: dict[str, dict] = {}
    for r in results:
        s = r.source
        srcs.setdefault(s, {"w": 0, "t": 0})
        srcs[s]["t"] += 1
        if r.status == "working":
            srcs[s]["w"] += 1

    print("\nBY SOURCE:")
    print("-" * 50)
    for s in sorted(srcs):
        w2, t2 = srcs[s]["w"], srcs[s]["t"]
        pct = w2 / t2 * 100 if t2 else 0
        print(f"  {s:<25} {w2:>4}/{t2:<4} ({pct:.0f}%)")

    # ── Save JSON report ─────────────────────────────────────────────────
    report_path = Path(__file__).resolve().parent / "channel_results.json"
    report = {
        "summary": {
            "total": len(channels), "working": w, "failed": f,
            "timeout": t, "elapsed_seconds": round(elapsed, 1),
        },
        "channels": [asdict(r) for r in sorted(results, key=lambda r: r.name)],
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nDetailed report saved to {report_path.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
