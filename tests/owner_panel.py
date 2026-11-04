"""1.16.0 owner panel: edit mode toggle, «site appearance» window with live preview, page editor formatting, three-size preview,
undo, auto-save and the change list before publishing.  Run: python3 tests/owner_panel.py  (screenshots → tests/shots/)"""
import os, sys
from playwright.sync_api import sync_playwright
exec(open('tests/owner_flow.py').read().split('with sync_playwright()')[0])
os.makedirs('tests/shots', exist_ok=True)
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra else ''))
    if not cond: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch()
    for (W, H, tag) in [(390, 844, 'phone'), (820, 1180, 'ipad'), (1366, 900, 'pc')]:
        o = b.new_context(viewport={'width': W, 'height': H}).new_page(); errs = []
        o.on('pageerror', lambda e: errs.append(str(e)))
        setup(o); o.goto('http://app.test/'); o.wait_for_timeout(600); login(o); o.evaluate("go('calc')"); o.wait_for_timeout(200)
        check(f'{tag}: no ⋮⋮ / ✎ on tiles before «تعديل وترتيب»', o.locator('#picker .pkw, #picker .epen').count() == 0)
        o.click('#o-texts'); o.wait_for_timeout(250)
        check(f'{tag}: «تعديل وترتيب» shows ⋮⋮ and ✎ on every vitamin', o.locator('#picker .pkw .epen').count() >= 9 and o.locator('#picker .pkw .drag').count() >= 9)
        o.screenshot(path=f'tests/shots/panel_edit_{tag}.png')
        o.click('#o-texts'); o.wait_for_timeout(200)
        check(f'{tag}: pressed again, the page is clean', o.locator('#picker .pkw').count() == 0)
        # site appearance: live preview, undo inside the window
        o.evaluate('editLook()'); o.wait_for_timeout(200)
        f0 = o.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fsb')")
        o.evaluate("const r=document.getElementById('lksb');r.value='1.25';r.dispatchEvent(new Event('input',{bubbles:true}))"); o.wait_for_timeout(100)
        check(f'{tag}: text size changes the page at once', o.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fsb')").strip() == '1.25' and '125%' in o.inner_text('#lksbv'), f0)
        o.evaluate("const r=document.getElementById('lkst');r.value='0.9';r.dispatchEvent(new Event('input',{bubbles:true}))")
        o.evaluate("const c=document.querySelector('[data-lkc=\"calc\"][data-i=\"0\"]');c.value='#123456';c.dispatchEvent(new Event('input',{bubbles:true}))"); o.wait_for_timeout(100)
        check(f'{tag}: tile size and section colour change at once', o.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fst')").strip() == '0.9' and o.evaluate("document.getElementById('calc').style.getPropertyValue('--pc')") == '#123456')
        o.screenshot(path=f'tests/shots/panel_look_{tag}.png')
        o.locator('#sheet-b button', has_text='تراجع').click(); o.wait_for_timeout(150)
        check(f'{tag}: «تراجع» in the window puts the look back', o.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fsb')").strip() in ('1', '') and o.evaluate("CFG.colors.calc[0]") != '#123456')
        o.evaluate("const r=document.getElementById('lksh');r.value='1.1';r.dispatchEvent(new Event('input',{bubbles:true}))")
        o.locator('#sheet-b button', has_text='تم').click(); o.wait_for_timeout(200)
        check(f'{tag}: closing keeps the change as an unsaved draft', o.evaluate("CFG.look.sh") == 1.1 and o.evaluate('dirty()'))
        # undo the last change from the owner bar
        o.click('#o-undo'); o.wait_for_timeout(200)
        check(f'{tag}: «تراجع» in the owner bar takes back the last change', o.evaluate("CFG.look.sh") == 1 and not o.evaluate('dirty()'))
        check(f'{tag}: nothing left to undo -> button disabled', o.is_disabled('#o-undo'))
        # page editor: formatting buttons and preview
        o.evaluate("void editPage('about')"); o.wait_for_timeout(200)
        o.evaluate("const t=document.getElementById('dlgf3');t.focus();t.setSelectionRange(0,0)")
        o.locator('#dlg [data-md="h"][data-for="dlgf3"]').click(); o.wait_for_timeout(100)
        check(f'{tag}: «عنوان» makes the line a heading in the preview', o.locator('#mdprev h3').count() >= 1)
        o.evaluate("const t=document.getElementById('dlgf3');t.value+='\\n\\n- أولاً\\n- ثانياً\\n\\n**مهم** جداً';t.dispatchEvent(new Event('input',{bubbles:true}))"); o.wait_for_timeout(100)
        check(f'{tag}: list and bold in the preview, no HTML from the text', o.locator('#mdprev li').count() == 2 and o.locator('#mdprev b').count() >= 1)
        o.screenshot(path=f'tests/shots/panel_page_{tag}.png')
        o.click('#dlg-a .pri'); o.wait_for_timeout(300)
        o.evaluate("CFG.pages.find(p=>p.id==='about').b.ar+='\\n\\n<script>alert(1)</script>';openPage('about')"); o.wait_for_timeout(200)
        check(f'{tag}: a page shows formatting but never runs HTML', o.locator('#sheet-b .prose script').count() == 0 and o.locator('#sheet-b .prose h3').count() >= 1)
        o.evaluate('closeSheet()')
        # auto-save is armed after a change
        check(f'{tag}: auto-save waits for a minute after the change', o.evaluate('AUTOSAVE!=null&&dirty()'))
        # three sizes
        o.evaluate("CFG.text.hc_t={ar:'عنوان المعاينة',en:'Preview title'};changed()"); o.wait_for_timeout(100)
        o.click('#o-sizes'); o.wait_for_timeout(1500)
        fr = o.frame_locator('#szf')
        check(f'{tag}: three-size window shows the draft as a visitor', o.is_visible('#szwrap') and 'عنوان المعاينة' in fr.locator('body').inner_text() and fr.locator('#obar').is_hidden())
        o.locator('[data-szk="pc"]').click(); o.wait_for_timeout(300)
        check(f'{tag}: computer size inside the window', o.evaluate("document.getElementById('szf').style.width") == '1366px')
        o.screenshot(path=f'tests/shots/panel_sizes_{tag}.png')
        o.keyboard.press('Escape'); o.wait_for_timeout(200)
        check(f'{tag}: Escape closes the three-size window', not o.is_visible('#szwrap'))
        # publish: one line per change with «show me»
        o.click('#o-publish'); o.wait_for_timeout(300)
        t = o.inner_text('#dlg')
        check(f'{tag}: publish window lists the changes', o.locator('#dlg .pblist li').count() >= 2 and 'عنوان المعاينة' in t, t[:300])
        o.screenshot(path=f'tests/shots/panel_publish_{tag}.png')
        btn = o.locator('#dlg .pblist [data-pbgo]').first
        if btn.count(): btn.click(); o.wait_for_timeout(300)
        check(f'{tag}: «اذهب إليه» closes the window', o.is_hidden('#dlg'))
        o.screenshot(path=f'tests/shots/panel_bar_{tag}.png', clip={'x': 0, 'y': 0, 'width': W, 'height': 140})
        check(f'{tag}: no page errors', not errs, str(errs))
    print(f'\n{len(fails)} FAILED: {fails}' if fails else '\nALL PASSED'); sys.exit(1 if fails else 0)
