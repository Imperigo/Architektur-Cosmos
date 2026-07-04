/** Handbuch Teil 2: HTML → PDF (A4, mit Hintergrund) in den Abgabeordner. */
import { chromium } from 'playwright-core';

const html = new URL('../../docs/handbuch/HANDBUCH.html', import.meta.url).href;
const out = new URL('../../abgabe/HANDBUCH-KOSMOORBIT-V1.pdf', import.meta.url).pathname;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage();
await page.goto(html, { waitUntil: 'networkidle' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:8px;color:#8a857a;font-family:Menlo,monospace;">KosmoOrbit V1 — Handbuch · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  margin: { top: '14mm', bottom: '16mm', left: '15mm', right: '15mm' },
});
await browser.close();
console.log(`PDF: ${out}`);
