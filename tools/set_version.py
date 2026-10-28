#!/usr/bin/env python3
"""Set the app version everywhere it appears, in one step.

Usage:  python3 tools/set_version.py 1.2.0

Updates:
  js/config.js   APP_VERSION (shown in the footer)
  index.html     ?v=… on every css/js link (so browsers fetch the new files)
  sw.js          offline-cache name and file list (so installed apps update)
Then add a section to CHANGELOG.md by hand.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
    sys.exit(__doc__)
v = sys.argv[1]

cfg = ROOT / "js/config.js"
cfg.write_text(re.sub(r"const APP_VERSION='[^']*'", f"const APP_VERSION='{v}'", cfg.read_text(encoding="utf-8")), encoding="utf-8")

idx = ROOT / "index.html"
html = re.sub(r"\?v=[\w.]+", f"?v={v}", idx.read_text(encoding="utf-8"))
idx.write_text(html, encoding="utf-8")

assets = re.findall(r'(?:href|src)="((?:css|js)/[^"]+\?v=[\w.]+)"', html)
fonts = sorted(p.name for p in (ROOT / "fonts").glob("*.woff"))
files = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"] \
        + ["./" + a for a in assets] + ["./fonts/" + f for f in fonts]
sw = ROOT / "sw.js"
s = sw.read_text(encoding="utf-8")
s = re.sub(r"const VERSION='[^']*'", f"const VERSION='vitawaw-{v}'", s)
s = re.sub(r"const FILES=\[[^\]]*\];", "const FILES=[\n  " + ",\n  ".join(f"'{f}'" for f in files) + "\n];", s)
sw.write_text(s, encoding="utf-8")
print(f"version set to {v}: js/config.js, index.html ({len(assets)} links), sw.js ({len(files)} files)")
