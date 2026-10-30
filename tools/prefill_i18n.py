#!/usr/bin/env python3
"""Write the Arabic texts into index.html (run by set_version.py; no need to run it by hand).

The page fills every [data-t] element from js/i18n.js when it starts. Writing the Arabic text into the HTML as well means
the first screen is drawn complete, without waiting for the scripts, and nothing moves when they run (faster first paint,
no layout shift). Only plain-text elements and placeholders are filled; js/i18n.js stays the single source of the texts."""
import html, json, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent

def texts():
    js = ("const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);"
          "vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';this.I18N=I18N',c);process.stdout.write(JSON.stringify(c.I18N))")
    return json.loads(subprocess.check_output(["node", "-e", js, str(ROOT / "js/i18n.js")]))

def prefill():
    I = texts()
    idx = ROOT / "index.html"
    s = idx.read_text(encoding="utf-8")
    n = 0
    def text(m):
        nonlocal n
        k = m.group(3)
        if k not in I: return m.group(0)
        n += 1
        return m.group(1) + html.escape(I[k][0], quote=False) + m.group(5)
    # <tag … data-t="key" …>plain text</tag>   (elements that contain other elements are left alone)
    s = re.sub(r'(<(\w+)\b[^<>]*\sdata-t="([\w-]+)"[^<>]*>)([^<]*)(</\2>)', text, s)
    def ph(m):
        tag, k = m.group(0), m.group(1)
        if k not in I: return tag
        v = html.escape(I[k][0], quote=True)
        return re.sub(r'\splaceholder="[^"]*"', f' placeholder="{v}"', tag) if ' placeholder="' in tag else tag.replace(f'data-ph="{k}"', f'data-ph="{k}" placeholder="{v}"')
    s = re.sub(r'<input\b[^<>]*\sdata-ph="([\w-]+)"[^<>]*>', ph, s)
    idx.write_text(s, encoding="utf-8")
    return n

if __name__ == "__main__":
    print(f"prefilled {prefill()} texts in index.html")
