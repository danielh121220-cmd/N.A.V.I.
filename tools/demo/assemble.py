import re, base64, pathlib
D = pathlib.Path(__file__).resolve().parent
P = D.parent.parent / 'backend' / 'public'
css = (P/'style.css').read_text()
m = re.search(r"@media \(prefers-color-scheme: dark\) \{\n  :root \{\n(.*?)\n  \}\n\}", css, re.S)
tokens = m.group(1)
css = css[:m.start()] + "@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {\n" + tokens + "\n  }\n}\n:root[data-theme=\"dark\"] {\n" + tokens + "\n}" + css[m.end():]
css = re.sub(r'url\("fonts/([A-Za-z-]+)\.woff2"\)', lambda m: 'url("data:font/woff2;base64,' + base64.b64encode((P/'fonts'/(m.group(1) + '.woff2')).read_bytes()).decode() + '")', css)
css += "\n" + (D/'demo.css').read_text()
app = (P/'app.js').read_text()
def rep(a, b):
    global app
    assert a in app, a[:70]
    app = app.replace(a, b)
rep("const faceUrl = (id, v) => `/api/faces/${id}?t=${encodeURIComponent(S.token)}&v=${encodeURIComponent(v)}`;", "const faceUrl = (id, v) => window.NaviDemo.file(`faces/${id}.jpg`, v);")
rep("const snapUrl = id => `/api/snapshots/${id}?t=${encodeURIComponent(S.token)}`;", "const snapUrl = id => window.NaviDemo.snap(id);")
rep("if ('serviceWorker' in navigator && window.isSecureContext) {", "if (false) {")
rep('<p class="foot" id="authFoot">Tus datos se quedan en el servidor de tu colegio.</p>', '<p class="foot" id="authFoot">Datos de ejemplo guardados solo en este dispositivo.</p>')
rep("'Todos los datos de esta versión son de ejemplo.'", "'Datos de ejemplo guardados solo en este dispositivo.'")
rep('<div class="group" style="margin-top:26px"><button class="cell center danger" data-act="logout">Cerrar sesión</button></div>',
    '<div class="group-title">Versión de prueba</div><div class="group"><button class="cell has-icon" data-act="demoReset">${ico(\'refresh\', \'orange\')}<div class="grow"><div class="t">Empezar de cero</div><div class="s">Borra los datos guardados en este navegador</div></div></button></div><div class="group" style="margin-top:26px"><button class="cell center danger" data-act="logout">Cerrar sesión</button></div>')
rep("  handlers.logout = el =>", "  handlers.demoReset = el => confirmTap(el.querySelector('.t'), 'Toca otra vez para borrar todo', () => window.NaviDemo.reset());\n  handlers.logout = el =>")
html = (P/'index.html').read_text()
body = html.split('<body>')[1].split('</body>')[0]
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
def js(name, code):
    code = code.replace('</script', '<\\/script').replace('<!--', '<\\!--')
    return f'<script>\n{code}\n</script>\n'
wasm = base64.b64encode((D/'node_modules/sql.js/dist/sql-wasm.wasm').read_bytes()).decode()
icon = base64.b64encode((P/'icons/icon.svg').read_bytes()).decode()
out = []
out.append('<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>N.A.V.I</title>\n')
out.append('<meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">\n')
out.append(f'<link rel="icon" href="data:image/svg+xml;base64,{icon}">\n')
out.append('<style>\n' + css + '\n</style>\n</head>\n<body>\n')
out.append(body.strip() + '\n')
out.append(js('sfx', (P/'sfx.js').read_text()))
out.append(js('bots', (P/'bots.js').read_text()))
out.append(js('mascots', (P/'mascots.js').read_text()))
out.append(js('intro', (P/'intro.js').read_text()))
out.append(js('qr', (P/'vendor/qrcode.js').read_text()))
out.append(f'<script>window.__NAVI_WASM__="{wasm}";</script>\n')
out.append(js('backend', (D/'dist/backend.js').read_text()))
out.append(js('app', app))
out.append('</body>\n</html>\n')
page = ''.join(out)
(D/'dist/navi.html').write_text(page)
(D/'dist/test.html').write_text(page)
print(len(page)//1024, 'KB')
