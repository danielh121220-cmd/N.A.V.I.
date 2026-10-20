const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'reporte.html'), { waitUntil: 'networkidle' });
  await p.pdf({
    path: path.join(__dirname, '..', 'REPORTE_TECNICO_NAVI.pdf'),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#8A90A0;padding:0 20mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial,sans-serif"><span>N.A.V.I · Reporte técnico</span><span class="pageNumber"></span></div>',
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
  });
  await b.close();
  console.log('PDF listo');
})();
