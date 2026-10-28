"""Fails if index.html points to css/js files whose ?v=…-hash no longer matches their content.
Run: python3 tests/check_assets.py   (fix with: python3 tools/set_version.py X.Y.Z)"""
import hashlib, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_text(encoding='utf-8')
bad = []
for path, h in re.findall(r'(?:href|src)="((?:css|js)/[^"?]+)\?v=[\d.]+-([0-9a-f]{8})"', html):
    if hashlib.sha256((ROOT / path).read_bytes()).hexdigest()[:8] != h: bad.append(path)
links = re.findall(r'(?:href|src)="(?:css|js)/', html)
if bad or not links:
    print('OUT OF DATE:', bad or 'no versioned links found', '\nRun: python3 tools/set_version.py <version>'); sys.exit(1)
print(f'ok: {len(links)} css/js links match their content')
