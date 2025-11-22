// src/app/api/mushahidgenerategstpdf/route.ts
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer, { Page } from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mushahidgst';

const vercelUrl = process.env.VERCEL_URL;
const normalizedVercelUrl = vercelUrl
  ? vercelUrl.startsWith('http')
    ? vercelUrl
    : `https://${vercelUrl}`
  : null;

const DEFAULT_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.SITE_URL ||
  normalizedVercelUrl ||
  'https://mk3.vercel.app';

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function getQrDataUri(qrAny: any): string | null {
  try {
    if (!qrAny) return null;
    const qr = typeof qrAny === 'object' && (qrAny.qrCode || qrAny.qr) ? (qrAny.qrCode ?? qrAny.qr) : qrAny;
    if (!qr) return null;
    if (typeof qr === 'string' && qr.startsWith('data:')) return qr;
    if (typeof qr === 'string' && (qr.startsWith('http://') || qr.startsWith('https://'))) return qr;
    if (typeof qr === 'string' && (qr.startsWith('/') || qr.includes('./') || qr.includes('../') || qr.includes('/mnt/'))) {
      try {
        const filePath = path.isAbsolute(qr) ? qr : path.resolve(process.cwd(), qr);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (e) { /* empty */ }
    }
    if (typeof qr === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(qr) && qr.length > 100) {
      return `data:image/png;base64,${qr.replace(/\s+/g, '')}`;
    }
    if (qr && typeof qr === 'object' && qr.buffer) {
      const b = Buffer.isBuffer(qr.buffer) ? qr.buffer : Buffer.from(qr.buffer);
      return `data:image/png;base64,${b.toString('base64')}`;
    }
    if (Buffer.isBuffer(qr)) return `data:image/png;base64,${qr.toString('base64')}`;
    if (Array.isArray(qr) && qr.length > 0 && typeof qr[0] === 'number') {
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;
    }
    return null;
  } catch (err) { console.error('getQrDataUri error:', err); return null; }
}

function loadLocalImageAsDataURI(relPath: string): string | null {
  try {
    const safeRel = relPath.replace(/^\/+/, '');
    const filePath = path.join(process.cwd(), 'public', safeRel);
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e) { console.error('loadLocalImageAsDataURI error:', e); return null; }
}

function buildVerificationUrl(invoice: any): string | null {
  const rawUrl = invoice?.verificationUrl || invoice?.verifyUrl || invoice?.qrLink;
  if (typeof rawUrl === 'string' && rawUrl.length > 4) return rawUrl;
  const invoiceNumber = invoice?.invoiceNumber;
  if (!invoiceNumber) return null;
  const issuer = (invoice?.issuer || '').toLowerCase();
  const pathname = issuer === 'mushahid' ? '/verifyqrcodefrontendmushahid' : issuer === 'mustak' ? '/verifyqrcodefrontendmustak' : '/verifyqrcodefrontendmushahid';
  const url = new URL(pathname, DEFAULT_PUBLIC_BASE_URL.startsWith('http') ? DEFAULT_PUBLIC_BASE_URL : `https://${DEFAULT_PUBLIC_BASE_URL}`);
  url.searchParams.set('invoiceNumber', invoiceNumber);
  if (invoice?.documentType) url.searchParams.set('type', invoice.documentType);
  url.searchParams.set('issuer', issuer || 'mushahid');
  return url.toString();
}

function buildPaymentLinks(invoice: any): { primary: string; deepLink?: string } | null {
  const direct = invoice?.paymentLink || invoice?.paymentUrl || invoice?.paymentPage || invoice?.phonePeLink || invoice?.gpayLink || invoice?.paytmLink;
  if (typeof direct === 'string' && direct.length > 4) return { primary: direct };
  const upiIdRaw = invoice?.upiId || invoice?.upi || '9979131416@ybl';
  const upiId = upiIdRaw.replace(/\s+/g, '');
  const payeeName = invoice?.upiName || invoice?.clientName || 'MUSTAK KHAN';
  const amount = invoice?.totalAmountAfterTax || invoice?.totalAmount;
  const upiParams = new URLSearchParams({ pa: upiId, pn: payeeName, cu: 'INR', mode: '02' });
  if (amount) upiParams.set('am', String(amount));
  const httpsLink = `https://upi.me/pay?${upiParams.toString()}`;
  const deepLink = `upi://pay?${upiParams.toString()}`;
  return { primary: httpsLink, deepLink };
}

function buildInvoiceHtml(invoice: any) {
  const qrDataUri = getQrDataUri(invoice.qrCode ?? invoice.qr);
  const phonePeQr = loadLocalImageAsDataURI('phonepe-qr.jpg');
  const verificationUrl = buildVerificationUrl(invoice);
  const paymentLinks = buildPaymentLinks(invoice);
  const itemsCount = (invoice.items || []).length;
  const densityClass = itemsCount > 34 ? 'density-ultra' : itemsCount > 24 ? 'density-compact' : 'density-regular';

  const itemsRows = (invoice.items || []).map((item: any) => `
      <tr>
        <td style="padding:7px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.no ?? ''}</td>
        <td style="padding:7px;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.description ?? ''}</td>
        <td style="padding:7px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.hsn || '-'}</td>
        <td style="padding:7px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.quantity ?? ''}</td>
        <td style="padding:7px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${(parseFloat(item.rate || 0)).toFixed(2)}</td>
        <td style="padding:7px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${(parseFloat(item.taxableAmount || 0)).toFixed(2)}</td>
        <td style="padding:7px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.gst ?? ''}%</td>
        <td style="padding:7px;text-align:right;font-size:11px;border-bottom:1px solid #e6e6e6;font-weight:600;">₹${(parseFloat(item.totalAmount || 0)).toFixed(2)}</td>
      </tr>`).join('');

  const qrImage = qrDataUri
    ? `<img alt="Invoice QR" src="${qrDataUri}" style="width:88px;height:88px;display:block;margin:0 auto;" decoding="async" />`
    : `<div style="font-size:10px;color:#6b7280;text-align:center">No QR</div>`;

  const qrHtml = verificationUrl
    ? `<a href="${verificationUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;display:block;">
        ${qrImage}
        <div style="font-size:9px;text-align:center;color:#0f172a;margin-top:2px;">Scan or tap to verify</div>
      </a>`
    : qrImage;

  const paymentHref = paymentLinks?.primary || '#';
  const phonePeHtml = phonePeQr
    ? `<a href="${paymentHref}" ${paymentLinks ? 'target="_blank" rel="noopener noreferrer"' : ''} ${paymentLinks?.deepLink ? `data-upi-link="${paymentLinks.deepLink}"` : ''} style="display:block;text-decoration:none;color:inherit;">
        <img alt="UPI Payment QR" src="${phonePeQr}" style="width:80px;height:auto;display:block;margin:0 auto;border-radius:4px;" decoding="async" />
        <div style="font-size:9px;color:#0f172a;margin-top:3px;font-weight:600;">Scan or tap to pay</div>
      </a>`
    : `<div style="font-size:10px;color:#6b7280;text-align:center">No QR</div>`;

  const termsContent = `
    <div style="line-height:1.25;">
      1.) SUBJECT TO AHMEDABAD JURISDICTION.<br/>
      2.) ANY TAXES APPLICABLE WILL BE BORNE BY THE CUSTOMER.<br/>
      3.) PLEASE PAY BY CASH / CROSSED CHEQUE / DEMAND DRAFT / UPI / NETBANKING ONLY.<br/>
      4.) PLEASE MAKE CHEQUE PAYMENTS PAYABLE TO THE APPROPRIATE BENEFICIARY AS ADVISED.
    </div>`;
  
  const amountWordsHtml = invoice.amountInWords ? `<div style="margin-top:6px;font-weight:800;font-size:11px;color:#0b1220;">Amount in Words: ${invoice.amountInWords}</div>` : '';
  const notesHtml = invoice.notes ? `<div style="margin-top:4px;"><strong>Notes:</strong> ${invoice.notes}</div>` : '';
  const certHtml = `<div style="margin-top:4px;">Certified that the particulars given above are true &amp; correct. For <strong>MUSTAK KHAN</strong>.</div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice ${invoice.invoiceNumber ?? ''}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @page { size: A4; margin: 10px; }
    html, body { height:100%; margin: 0; padding: 0; }
    * { box-sizing: border-box; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

    body {
      font-family: 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      /* Reduced base font size slightly to save vertical space */
      font-size: 12px;
      background: #fff;
    }

    /* FIXED: Constrained container to prevent right-side clipping */
    .container {
      max-width: 750px; /* Safe width for A4 */
      margin: 0 auto;
      padding: 0 5px;
      background: #fff;
    }

    .header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
      border-bottom:1px solid #eef2f7;
      padding-bottom:8px; /* Reduced */
      margin-bottom:10px;
      padding-top: 10px; /* Adds space for Top QR */
    }

    .company h1 { font-size:20px; margin:0 0 4px 0; letter-spacing:0.5px; color:#0b1220; font-weight: 800; }
    .muted { color:#475569; font-size:11px; margin-top:2px; }

    .qr-holder {
      width:90px;
      height:90px;
      border-radius:4px;
      /* border:1px solid #e6eef6; */
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff;
      padding:2px;
    }

    .title {
      text-align:center;
      font-weight:700;
      font-size:16px;
      letter-spacing:1px;
      margin: 4px 0 10px;
      padding:6px 0;
      background:#f1f5f9;
      color:#0b3d91;
      border-radius:4px;
      text-transform: uppercase;
    }

    .meta { display:flex; justify-content:space-between; gap:12px; margin-bottom:10px; border-bottom: 1px dotted #e6eef6; padding-bottom: 6px; }
    
    .section { display:flex; gap:12px; margin-bottom:10px; }
    .box { flex:1; padding:8px; border-radius:4px; background:#f8fafc; border:1px solid #eef2f9; }
    .box h4 { margin:0 0 4px 0; font-size:11.5px; color:#0b1220; text-transform: uppercase; }

    table.items { width:100%; border-collapse: collapse; margin-bottom:10px; font-size:11px; }
    table.items thead th {
      text-align:center;
      padding:8px 4px;
      background:#eef2f7; 
      font-weight:700;
      border-bottom: 2px solid #e2e8f0;
      color:#0b1220;
    }
    table.items th:nth-child(2) { text-align:left; }
    table.items td { padding:7px 4px; vertical-align:middle; color:#0f172a; border-bottom:1px solid #f1f5f9; }
    table.items td.right { text-align:right; }

    table, thead, tbody, tr, td, th { page-break-inside: avoid; }

    .bottom-split { display: flex; gap: 16px; align-items: flex-start; }
    .bottom-left { flex: 1; }
    
    .totals { width:320px; margin-left:auto; border:1px solid #eef2f7; border-radius:4px; overflow:hidden; }
    .totals .row { display:flex; justify-content:space-between; padding:8px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; background:#fff; color:#0b1220; }
    .totals .row.total { font-weight:800; background:#f1f5f9; border-bottom: none; }

    .sign-block { 
      display:flex; 
      justify-content:space-between; 
      gap:20px; 
      align-items:flex-end; 
      margin-top: 6px; 
      padding-top: 8px; 
      border-top: 1px solid #f1f5f9;
    }
    .signature-line { border-top:1.5px solid #0b1220; width:160px; padding-top:4px; font-weight:700; font-size:10.5px; text-align:center; margin-bottom: 2px;}

    .phonepe-box { width:105px; border:1px solid #eef2f7; border-radius:6px; padding:4px; text-align:center; background:#fff; }
    .phonepe-box h5 { margin:0 0 3px 0; font-size:10.5px; color:#0b1220; font-weight: 700; }

    /* DENSITY SCALING */
    .density-compact table.items td, .density-compact table.items th { padding:5px 4px; font-size:10.5px; }
    .density-compact .box { padding:6px; }
    .density-compact .totals .row { padding:6px 8px; font-size:10.5px; }
    
    .density-ultra table.items td, .density-ultra table.items th { padding:3px 2px; font-size:9.5px; }
    .density-ultra .box { padding:5px; }
    .density-ultra body, .density-ultra .container { font-size:10.5px; }
    .density-ultra .totals .row { padding:5px 6px; font-size:9.5px; }

    @media print { .container { margin:0 auto; border:none; padding:0 5px; } }
  </style>
</head>
<body class="${densityClass}">
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>MUSTAK KHAN</h1>
        <div class="muted" style="font-weight:500; color:#334155;">(An expert in ceiling design)</div>
        <div class="muted">C.207 Marjan Residency No. Alpola Conael, Road Vatva, Ahmedabad - 382440</div>
        <div style="margin-top:6px;font-size:11px;">
          <strong>Mob:</strong> 9979131416 &nbsp;&nbsp;<strong>Email:</strong> mustakbhaimrik510@gmail.com
        </div>
        <div style="margin-top:4px;font-size:11px;"><strong>GSTIN:</strong> 24BEGPK9997B4Z-W</div>
      </div>
      <div class="qr-holder" title="Invoice QR">${qrHtml}</div>
    </div>

    <div class="title">TAX INVOICE</div>

    <div class="meta">
      <div><strong>Invoice No:</strong> ${invoice.invoiceNumber ?? 'N/A'}</div>
      <div style="text-align:right"><strong>Invoice Date:</strong> ${invoice.date ?? new Date().toLocaleDateString('en-IN')}</div>
    </div>

    <div class="section">
      <div class="box">
        <h4>Company Details</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.3;">
          <strong>Name:</strong> MUSTAK KHAN<br/>
          <strong>Address:</strong> C.207 Marjan Residency No. Alpola Conael Road Vatva Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9979131416<br/>
          <strong>Email:</strong> mustakbhaimrik510@gmail.com<br/>
          <strong>GSTIN:</strong> 24BEGPK9997B4Z-W
        </div>
      </div>
      <div class="box">
        <h4>Bill To</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.3;">
          <strong>Name:</strong> ${invoice.clientName ?? 'N/A'}<br/>
          <strong>Address:</strong> ${invoice.clientAddress ?? 'N/A'}<br/>
          ${invoice.mobile ? `<strong>Mobile:</strong> ${invoice.mobile}<br/>` : ''}
          ${invoice.email ? `<strong>Email:</strong> ${invoice.email}<br/>` : ''}
          ${invoice.gstin ? `<strong>GSTIN:</strong> ${invoice.gstin}<br/>` : ''}
        </div>
      </div>
    </div>

    <table class="items" role="table" aria-label="Invoice Items">
      <thead>
        <tr>
          <th style="width:6%;">S. No.</th>
          <th style="width:44%;text-align:left;">Product Description</th>
          <th style="width:10%;">HSN</th>
          <th style="width:8%;">QTY.</th>
          <th style="width:12%;">Rate</th>
          <th style="width:12%;">Taxable Value</th>
          <th style="width:8%;">GST</th>
          <th style="width:12%;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="bottom-split">
      <div class="bottom-left">
        <div style="font-size:11px;font-weight:700;color:#0b1220;text-transform:uppercase;margin-bottom:4px;">Bank Details</div>
        <div style="font-size:10.5px;color:#374151;line-height:1.3;">
          Bank Name: SBI BANK - Shahjalam Gate<br/>
          A/C: 30231750262 &nbsp;|&nbsp; IFSC: SBIN0003046
        </div>
        ${amountWordsHtml}
        <div style="margin-top:6px;font-size:10px;color:#374151;text-transform:uppercase;">
          <strong>Terms &amp; Conditions:</strong>${termsContent}
        </div>
        <div style="font-size:10px;color:#475569;margin-top:4px;">${notesHtml}${certHtml}</div>
      </div>
      <div class="totals" role="note" aria-label="Tax Summary">
        <div class="row"><div>Total Amount Before Tax</div><div>₹${(parseFloat(invoice.totalAmountBeforeTax || 0)).toFixed(2)}</div></div>
        <div class="row"><div>CGST (9%)</div><div>₹${(parseFloat(invoice.cgst || 0)).toFixed(2)}</div></div>
        <div class="row"><div>SGST (9%)</div><div>₹${(parseFloat(invoice.sgst || 0)).toFixed(2)}</div></div>
        <div class="row"><div>IGST (18%)</div><div>₹${(parseFloat(invoice.igst || 0)).toFixed(2)}</div></div>
        <div class="row"><div>Total Tax Amount</div><div>₹${(parseFloat(invoice.totalTaxAmount || 0)).toFixed(2)}</div></div>
        <div class="row total"><div>Total Amount After Tax</div><div>₹${(parseFloat(invoice.totalAmountAfterTax || 0)).toFixed(2)}</div></div>
      </div>
    </div>

    <div class="sign-block">
      <div style="text-align:center;">
        <div style="height: 20px;"></div> <div class="signature-line">Customer Signature</div>
      </div>
      <div style="text-align:center;">
        <div style="height: 20px;"></div> <div class="signature-line">Authorised Signatory</div>
      </div>
      <div class="phonepe-box" title="Pay via PhonePe">
        <h5>Pay via PhonePe</h5>${phonePeHtml}
      </div>
    </div>
    <div style="text-align:center;margin-top:6px;font-size:9px;color:#94a3b8;">This is a computer generated invoice.</div>
  </div>
</body>
</html>`;
}

async function waitForImagesLoad(page: Page, timeoutMs = 6000) {
  await page.evaluate((timeout: number) => new Promise<void>((resolve) => {
        const imgs = Array.from(document.images || []);
        if (!imgs.length) return resolve();
        let settled = 0;
        const done = () => { settled++; if (settled >= imgs.length) resolve(); };
        imgs.forEach((img) => {
          if ((img as HTMLImageElement).complete) return done();
          const onDone = () => {
            (img as HTMLImageElement).removeEventListener('load', onDone);
            (img as HTMLImageElement).removeEventListener('error', onDone);
            done();
          };
          (img as HTMLImageElement).addEventListener('load', onDone);
          (img as HTMLImageElement).addEventListener('error', onDone);
        });
        setTimeout(() => resolve(), timeout);
      }), timeoutMs);
}

export async function GET(_req: NextRequest) {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const latest = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    if (!latest.length) return NextResponse.json({ message: 'No invoices found.' }, { status: 404 });
    const invoice = latest[0];
    const html = buildInvoiceHtml(invoice);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    // Setup standard A4 metrics
    const cssPixelsPerInch = 96;
    const a4WidthPx = 8.27 * cssPixelsPerInch; // ~794px
    const a4HeightPx = 11.69 * cssPixelsPerInch; // ~1123px
    
    const page = await browser.newPage();
    // Viewport matches A4 width roughly
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await waitForImagesLoad(page, 6000);

    const measureContentHeight = async () => page.evaluate(() => {
        const el = document.documentElement || document.body;
        return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
      });

    let contentHeightPx = await measureContentHeight();
    const verticalMarginsPx = 10 + 10; 
    const availableHeight = a4HeightPx - verticalMarginsPx;

    const extraDensityClasses = ['density-tight', 'density-micro'];
    if (contentHeightPx > availableHeight) {
      for (const density of extraDensityClasses) {
        await page.evaluate((densityClass) => { if (!document.body.classList.contains(densityClass)) document.body.classList.add(densityClass); }, density);
        await waitForImagesLoad(page, 500);
        contentHeightPx = await measureContentHeight();
        if (contentHeightPx <= availableHeight) break;
      }
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      // Back to tighter margins to fit more content
      margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
      scale: 1,
    });

    await browser.close();
    const fileName = `tax-invoice-${invoice.invoiceNumber || 'invoice'}.pdf`;
    const pdfArrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer;
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    return new NextResponse(pdfBlob, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ message: `Failed to generate PDF: ${error?.message ?? 'Unknown error'}` }, { status: 500 });
  } finally {
    await client.close().catch(() => {});
  }
}