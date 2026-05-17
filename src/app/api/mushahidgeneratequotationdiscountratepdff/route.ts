// src/app/api/mushahidgeneratequotationdiscountratepdff/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer, { Page } from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mushahidquotationdiscountrate';

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
  process.env.WEBSITE_DEPLOYEMENT ||
  normalizedVercelUrl ||
  'http://localhost:3000';

const client = new MongoClient(MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

/* ---------- Types ---------- */

interface DiscountQuotationItem {
  no?: string | number;
  description?: string;
  hsn?: string;
  quantity?: string | number;
  originalRate?: string | number;
  discountRate?: string | number;
}

interface DiscountQuotationDocument {
  _id?: unknown;
  invoiceNumber?: string;
  date?: string;
  clientName?: string;
  clientAddress?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  items?: DiscountQuotationItem[];
  amountInWords?: string;
  notes?: string;
  qrCode?: unknown;
  qr?: unknown;
  verificationUrl?: string;
  verifyUrl?: string;
  qrLink?: string;
  issuer?: string;
  documentType?: string;
  createdAt?: Date;
  [key: string]: unknown;
}

/* ---------- QR Helpers ---------- */

function getQrDataUri(qrAny: unknown): string | null {
  try {
    if (!qrAny) return null;

    const qr =
      typeof qrAny === 'object' &&
      qrAny !== null &&
      ('qrCode' in qrAny || 'qr' in qrAny)
        ? ((qrAny as { qrCode?: unknown; qr?: unknown }).qrCode ??
           (qrAny as { qrCode?: unknown; qr?: unknown }).qr)
        : qrAny;

    if (!qr) return null;

    if (typeof qr === 'string' && qr.startsWith('data:')) return qr;
    if (typeof qr === 'string' && (qr.startsWith('http://') || qr.startsWith('https://')))
      return qr;

    if (
      typeof qr === 'string' &&
      (qr.startsWith('/') || qr.includes('./') || qr.includes('../') || qr.includes('/mnt/'))
    ) {
      try {
        const filePath = path.isAbsolute(qr) ? qr : path.resolve(process.cwd(), qr);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      } catch { /* ignore */ }
    }

    if (typeof qr === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(qr) && qr.length > 100)
      return `data:image/png;base64,${qr.replace(/\s+/g, '')}`;

    if (qr && typeof qr === 'object' && 'buffer' in qr) {
      const bufLike = (qr as { buffer: Buffer | ArrayBuffer | Uint8Array }).buffer;
      const b = Buffer.isBuffer(bufLike) ? bufLike : Buffer.from(bufLike as ArrayBuffer);
      return `data:image/png;base64,${b.toString('base64')}`;
    }

    if (Buffer.isBuffer(qr))
      return `data:image/png;base64,${qr.toString('base64')}`;

    if (Array.isArray(qr) && qr.length > 0 && typeof qr[0] === 'number')
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;

    return null;
  } catch (err) {
    console.error('getQrDataUri error:', err);
    return null;
  }
}

/* ---------- URL Helper ---------- */

function buildVerificationUrl(doc: DiscountQuotationDocument): string | null {
  const rawUrl = doc.verificationUrl || doc.verifyUrl || doc.qrLink;
  if (typeof rawUrl === 'string' && rawUrl.length > 4) return rawUrl;

  const invoiceNumber = doc.invoiceNumber;
  if (!invoiceNumber) return null;

  const base = DEFAULT_PUBLIC_BASE_URL.startsWith('http')
    ? DEFAULT_PUBLIC_BASE_URL
    : `https://${DEFAULT_PUBLIC_BASE_URL}`;

  const url = new URL('/verifyqrcodefrontendmushahid', base);
  url.searchParams.set('invoiceNumber', invoiceNumber);
  if (doc.documentType) url.searchParams.set('type', doc.documentType);
  url.searchParams.set('issuer', 'mushahid');
  return url.toString();
}

/* ---------- Rate Cell ---------- */

/**
 * - If originalRate === discountRate → plain price, no strikethrough.
 * - If originalRate > discountRate  → strikethrough + green discount, same line.
 */
function renderRateCell(item: DiscountQuotationItem): string {
  const orig = parseFloat(String(item.originalRate ?? 0)) || 0;
  const disc = parseFloat(String(item.discountRate ?? 0)) || 0;

  if (orig === disc || orig === 0) {
    return `<td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${disc.toFixed(2)}</td>`;
  }

  return `
    <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;white-space:nowrap;">
      <span style="text-decoration:line-through;color:#9ca3af;font-size:10px;margin-right:4px;">₹${orig.toFixed(2)}</span>
      <span style="color:#16a34a;font-weight:700;">₹${disc.toFixed(2)}</span>
    </td>`;
}

/* ---------- HTML Builder ---------- */

function buildDiscountQuotationHtml(quotation: DiscountQuotationDocument): string {
  const qrDataUri = getQrDataUri(quotation.qrCode ?? quotation.qr);
  const verificationUrl = buildVerificationUrl(quotation);

  const items: DiscountQuotationItem[] = quotation.items ?? [];
  const itemsCount = items.length;
  const densityClass =
    itemsCount > 34 ? 'density-ultra' : itemsCount > 24 ? 'density-compact' : 'density-regular';

  const itemsRows = items
    .map(
      (item) => `
  <tr>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.no ?? ''}</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.description ?? ''}</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.hsn ?? ''}</td>
    <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.quantity ?? ''}</td>
    ${renderRateCell(item)}
  </tr>`,
    )
    .join('');

  const qrImage = qrDataUri
    ? `<img alt="Quotation QR" src="${qrDataUri}" style="width:88px;height:88px;display:block;margin:0 auto;" decoding="async" />`
    : `<div style="font-size:10px;color:#6b7280;text-align:center">No QR</div>`;

  const qrHtml = verificationUrl
    ? `<a href="${verificationUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;display:block;">
        ${qrImage}
        <div style="font-size:9px;text-align:center;color:#0f172a;margin-top:2px;">Scan or tap to verify</div>
      </a>`
    : qrImage;

  const notesHtml = quotation.notes
    ? `<div style="margin-top:3px;"><strong>Notes:</strong><br/>${quotation.notes}</div>`
    : '';

  const quotationDate =
    typeof quotation.date === 'string' && quotation.date
      ? quotation.date
      : new Date().toLocaleDateString('en-IN');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Quotation ${quotation.invoiceNumber ?? ''}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    @page { size: A4; margin: 5px; }
    html, body { height:100%; margin: 0; padding: 0; }
    * { box-sizing: border-box; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
    body {
      font-family: 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a; font-size: 11.5px; background: #fff;
    }
    .container { max-width: 750px; margin: 0 auto; padding: 0 5px; background: #fff; }
    .header {
      display:flex; justify-content:space-between; align-items:flex-start; gap:12px;
      border-bottom:1px solid #eef2f7; padding-bottom:6px; margin-bottom:8px; padding-top: 8px;
    }
    .company h1 { font-size:20px; margin:0 0 4px 0; letter-spacing:0.5px; color:#0b1220; font-weight:800; }
    .muted { color:#475569; font-size:11px; margin-top:2px; }
    .qr-holder { width:86px; height:86px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:#fff; padding:2px; }
    .title { text-align:center; font-weight:700; font-size:15px; letter-spacing:1px; margin:4px 0 8px; padding:5px 0; background:#f1f5f9; color:#0b3d91; border-radius:4px; text-transform:uppercase; }
    .meta { display:flex; justify-content:space-between; gap:12px; margin-bottom:8px; border-bottom:1px dotted #e6eef6; padding-bottom:6px; }
    .section { display:flex; gap:12px; margin-bottom:8px; }
    .box { flex:1; padding:8px; border-radius:4px; background:#f8fafc; border:1px solid #eef2f9; }
    .box h4 { margin:0 0 3px 0; font-size:11.5px; color:#0b1220; text-transform:uppercase; }
    table.items { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px; }
    table.items thead th { text-align:center; padding:6px 4px; background:#eef2f7; font-weight:700; border-bottom:2px solid #e2e8f0; color:#0b1220; }
    table.items th:nth-child(4), table.items th:nth-child(5) { text-align:left; }
    table.items td { padding:5px 4px; vertical-align:middle; color:#0f172a; border-bottom:1px solid #f1f5f9; }
    table, thead, tbody, tr, td, th { page-break-inside:avoid; }
    .bottom-split { display:flex; gap:16px; align-items:flex-start; }
    .bottom-left { flex:1; }
    .sign-block { display:flex; justify-content:space-between; gap:20px; align-items:flex-end; margin-top:0; padding-top:4px; border-top:1px solid #f1f5f9; }
    .signature-line { border-top:1.5px solid #0b1220; width:160px; padding-top:4px; font-weight:700; font-size:10.5px; text-align:center; margin-bottom:2px; }
    .density-compact table.items td, .density-compact table.items th { padding:4px 3px; font-size:10px; }
    .density-compact .box { padding:5px; }
    .density-ultra table.items td, .density-ultra table.items th { padding:2px 2px; font-size:9.5px; }
    .density-ultra .box { padding:4px; }
    .density-ultra body, .density-ultra .container { font-size:10px; }
    .density-ultra .sign-block { margin-top:0; padding-top:2px; }
    @media print { .container { margin:0 auto; border:none; padding:0 5px; } }
  </style>
</head>
<body class="${densityClass}">
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>MUSHAHID KHAN</h1>
        <div class="muted" style="font-weight:500;color:#334155;">(An expert in plaster of paris (POP))</div>
        <div class="muted">C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat</div>
        <div style="margin-top:4px;font-size:11px;">
          <strong>Mob:</strong> 9023199465 &nbsp;&nbsp;<strong>Email:</strong> mujamahe@gmail.com
        </div>
        <div style="margin-top:2px;font-size:11px;"><strong>GSTIN:</strong> -</div>
      </div>
      <div class="qr-holder" title="Quotation QR">${qrHtml}</div>
    </div>

    <div class="title">QUOTATION</div>

    <div class="meta">
      <div><strong>Quotation No:</strong> ${quotation.invoiceNumber ?? 'N/A'}</div>
      <div style="text-align:right"><strong>Quotation Date:</strong> ${quotationDate}</div>
    </div>

    <div class="section">
      <div class="box">
        <h4>Company Details</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
          <strong>Name:</strong> MUSHAHID KHAN<br/>
          <strong>Address:</strong> C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9023199465<br/>
          <strong>Email:</strong> mujamahe@gmail.com<br/>
          <strong>GSTIN:</strong> -
        </div>
      </div>
      <div class="box">
        <h4>Quotation To</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
          <strong>Name:</strong> ${quotation.clientName ?? 'N/A'}<br/>
          <strong>Address:</strong> ${quotation.clientAddress ?? 'N/A'}<br/>
          ${quotation.mobile ? `<strong>Mobile:</strong> ${quotation.mobile}<br/>` : ''}
          ${quotation.email ? `<strong>Email:</strong> ${quotation.email}<br/>` : ''}
          ${quotation.gstin ? `<strong>GSTIN:</strong> ${quotation.gstin}<br/>` : ''}
        </div>
      </div>
    </div>

    <table class="items" role="table" aria-label="Quotation Items">
      <thead>
        <tr>
          <th style="width:7%;">S. No.</th>
          <th style="width:58%;">Product Description</th>
          <th style="width:10%;">HSN</th>
          <th style="width:10%;">QTY.</th>
          <th style="width:15%;">Rate</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="bottom-split">
      <div class="bottom-left">
        <div style="font-size:11px;font-weight:700;color:#0b1220;text-transform:uppercase;margin-bottom:2px;">Bank Details</div>
        <div style="font-size:10.5px;color:#374151;line-height:1.25;">
          Bank Name: SBI BANK-LAMBHA<br/>
          A/C: 42005260280 &nbsp;|&nbsp; IFSC: SBIN0016026 &nbsp;|&nbsp; PAN No: GDYPM4112E
        </div>
        <div style="font-size:9.5px;color:#475569;margin-top:3px;">${notesHtml}</div>
      </div>
    </div>

    <div class="sign-block">
      <div style="text-align:center;">
        <div style="height:10px;"></div>
        <div class="signature-line">Customer Signature</div>
      </div>
      <div style="text-align:center;">
        <div style="height:10px;"></div>
        <div class="signature-line">Authorised Signatory</div>
      </div>
      <div style="width:105px;height:140px;background:#ffffff;"></div>
    </div>

  </div>
</body>
</html>`;
}

/* ---------- Puppeteer Helper ---------- */

async function waitForImagesLoad(page: Page, timeoutMs = 6000): Promise<void> {
  await page.evaluate(
    (timeout: number) =>
      new Promise<void>((resolve) => {
        const imgs = Array.from(document.images || []);
        if (!imgs.length) return resolve();
        let settled = 0;
        const done = () => { settled++; if (settled >= imgs.length) resolve(); };
        imgs.forEach((img) => {
          const htmlImg = img as HTMLImageElement;
          if (htmlImg.complete) return done();
          const onDone = () => {
            htmlImg.removeEventListener('load', onDone);
            htmlImg.removeEventListener('error', onDone);
            done();
          };
          htmlImg.addEventListener('load', onDone);
          htmlImg.addEventListener('error', onDone);
        });
        setTimeout(() => resolve(), timeout);
      }),
    timeoutMs,
  );
}

/* ---------- Route Handler ---------- */

export async function GET(): Promise<NextResponse> {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<DiscountQuotationDocument>(COLLECTION_NAME);

    const latest = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();

    if (!latest.length) {
      return NextResponse.json({ message: 'No discount rate quotations found.' }, { status: 404 });
    }

    const quotation = latest[0];
    const html = buildDiscountQuotationHtml(quotation);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const a4WidthPx = 794;
    const a4HeightPx = 1123;

    const page = await browser.newPage();
    await page.setViewport({ width: a4WidthPx, height: a4HeightPx });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await waitForImagesLoad(page, 6000);

    const measureContentHeight = async () =>
      page.evaluate(() => {
        const el = document.documentElement || document.body;
        return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
      });

    let contentHeightPx = await measureContentHeight();
    const availableHeight = a4HeightPx - 10;

    if (contentHeightPx > availableHeight) {
      for (const density of ['density-tight', 'density-micro']) {
        await page.evaluate((cls: string) => {
          if (!document.body.classList.contains(cls)) document.body.classList.add(cls);
        }, density);
        await waitForImagesLoad(page, 500);
        contentHeightPx = await measureContentHeight();
        if (contentHeightPx <= availableHeight) break;
      }
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '5px', right: '10px', bottom: '5px', left: '10px' },
      scale: 1,
    });

    await browser.close();

    const fileName = `quotation-discount-${quotation.invoiceNumber || 'quotation'}.pdf`;
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    ) as ArrayBuffer;
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating mushahid discount rate quotation PDF:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Failed to generate quotation PDF: ${message}` },
      { status: 500 },
    );
  } finally {
    await client.close().catch(() => {});
  }
}
