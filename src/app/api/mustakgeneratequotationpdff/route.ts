// src/app/api/mustakgeneratequotationpdff/route.ts
import fs from 'fs';
import path from 'path';
import {  NextResponse } from 'next/server';
import puppeteer, { Page } from 'puppeteer';
import clientPromise from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mustakquotation';

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


/* ---------- Types ---------- */

type QrBinary =
  | string
  | Buffer
  | number[]
  | { buffer: ArrayBufferLike | Buffer | Uint8Array };

type QrInput =
  | QrBinary
  | {
      qrCode?: QrBinary;
      qr?: QrBinary;
    }
  | null
  | undefined;

interface QuotationItem {
  no?: string | number;
  description?: string;
  quantity?: string | number;
  rate?: string | number;
  amount?: string | number;
  totalAmount?: string | number;
}

interface QuotationDocument {
  _id?: unknown;

  invoiceNumber?: string;
  date?: string;

  clientName?: string;
  clientAddress?: string;
  mobile?: string;
  email?: string;
  gstin?: string;

  items?: QuotationItem[];

  amountInWords?: string;
  notes?: string;

  qrCode?: QrInput;
  qr?: QrInput;

  verificationUrl?: string;
  verifyUrl?: string;
  qrLink?: string;

  issuer?: string;
  documentType?: string;

  paymentLink?: string;
  paymentUrl?: string;
  paymentPage?: string;
  phonePeLink?: string;
  gpayLink?: string;
  paytmLink?: string;

  upiId?: string;
  upi?: string;
  upiName?: string;

  totalAmountAfterTax?: number;
  totalAmount?: number;

  createdAt?: Date;

  // Allow unknown extra fields from Mongo
  [key: string]: unknown;
}

/* ---------- QR Helpers ---------- */

function isQrWithProps(value: QrInput): value is { qrCode?: QrBinary; qr?: QrBinary } {
  return typeof value === 'object' && value !== null && ('qrCode' in value || 'qr' in value);
}

function hasBufferField(value: unknown): value is { buffer: ArrayBufferLike | Buffer | Uint8Array } {
  return typeof value === 'object' && value !== null && 'buffer' in value;
}

function getQrDataUri(qrAny: QrInput): string | null {
  try {
    if (!qrAny) return null;

    const qr: QrBinary | QrInput = isQrWithProps(qrAny)
      ? qrAny.qrCode ?? qrAny.qr
      : qrAny;

    if (!qr) return null;

    // String: already data URI
    if (typeof qr === 'string' && qr.startsWith('data:')) return qr;

    // String: URL
    if (
      typeof qr === 'string' &&
      (qr.startsWith('http://') || qr.startsWith('https://'))
    ) {
      return qr;
    }

    // String: local file path
    if (
      typeof qr === 'string' &&
      (qr.startsWith('/') ||
        qr.includes('./') ||
        qr.includes('../') ||
        qr.includes('/mnt/'))
    ) {
      try {
        const filePath = path.isAbsolute(qr) ? qr : path.resolve(process.cwd(), qr);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mime =
            ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      } catch {
        /* ignore */
      }
    }

    // String: base64 payload
    if (
      typeof qr === 'string' &&
      /^[A-Za-z0-9+/=\s]+$/.test(qr) &&
      qr.length > 100
    ) {
      return `data:image/png;base64,${qr.replace(/\s+/g, '')}`;
    }

    // Object with .buffer
    if (hasBufferField(qr)) {
      const buf =
        qr.buffer instanceof Buffer
          ? qr.buffer
          : Buffer.from(qr.buffer as ArrayBufferLike);
      return `data:image/png;base64,${buf.toString('base64')}`;
    }

    // Raw Buffer
    if (Buffer.isBuffer(qr)) {
      return `data:image/png;base64,${qr.toString('base64')}`;
    }

    // Array<number>
    if (Array.isArray(qr) && qr.length > 0 && typeof qr[0] === 'number') {
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;
    }

    return null;
  } catch (err) {
    console.error('getQrDataUri error:', err);
    return null;
  }
}



/* ---------- URL / Payment Helpers ---------- */

function buildVerificationUrl(doc: QuotationDocument): string | null {
  const rawUrl =
    doc.verificationUrl || doc.verifyUrl || doc.qrLink;
  if (typeof rawUrl === 'string' && rawUrl.length > 4) return rawUrl;

  const invoiceNumber = doc.invoiceNumber;
  if (!invoiceNumber) return null;

  const issuer = (doc.issuer || '').toLowerCase();
  const pathname =
    issuer === 'mushahid'
      ? '/verifyqrcodefrontendmushahid'
      : '/verifyqrcodefrontendmustak';

  const base =
    DEFAULT_PUBLIC_BASE_URL.startsWith('http')
      ? DEFAULT_PUBLIC_BASE_URL
      : `https://${DEFAULT_PUBLIC_BASE_URL}`;

  const url = new URL(pathname, base);
  url.searchParams.set('invoiceNumber', invoiceNumber);
  if (doc.documentType) url.searchParams.set('type', doc.documentType);
  url.searchParams.set('issuer', issuer || 'mustak');
  return url.toString();
}




/* ---------- HTML Builder ---------- */

function computeItemAmount(item: QuotationItem): number {
  const qty = parseFloat(String(item.quantity ?? 0)) || 0;
  const rate = parseFloat(String(item.rate ?? 0)) || 0;
  return (
    parseFloat(String(item.amount ?? item.totalAmount ?? qty * rate)) || 0
  );
}

function buildQuotationHtml(quotation: QuotationDocument): string {
  const qrDataUri = getQrDataUri(quotation.qrCode ?? quotation.qr);
  const verificationUrl = buildVerificationUrl(quotation);

  const items: QuotationItem[] = quotation.items ?? [];
  const itemsCount = items.length;
  const densityClass =
    itemsCount > 34
      ? 'density-ultra'
      : itemsCount > 24
      ? 'density-compact'
      : 'density-regular';





  const itemsRows = items
    .map(
      (item: QuotationItem) => `
  <tr>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${
      item.no ?? ''
    }</td>
    <td style="padding:5px 4px;font-size:11px;border-bottom:1px solid #e6e6e6;text-align:center;">${
      item.description ?? ''
    }</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;"></td>
    <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">${
      item.quantity ?? ''
    }</td>
    <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${computeItemAmount(
      item,
    ).toFixed(2)}</td>
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



  

 

  const amountWordsHtml = quotation.amountInWords
    ? `<div style="margin-top:4px;font-weight:800;font-size:10.5px;color:#0b1220;">Amount in Words: ${quotation.amountInWords}</div>`
    : '';

  const notesHtml = quotation.notes
    ? `<div style="margin-top:3px;"><strong>Notes:</strong><br/>${quotation.notes}</div>`
    : '';



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
      color: #0f172a;
      font-size: 11.5px;
      background: #fff;
    }

    .container {
      max-width: 750px;
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
      padding-bottom:6px;
      margin-bottom:8px;
      padding-top: 8px;
    }

    .company h1 {
      font-size:20px;
      margin:0 0 4px 0;
      letter-spacing:0.5px;
      color:#0b1220;
      font-weight: 800;
    }

    .muted { color:#475569; font-size:11px; margin-top:2px; }

    .qr-holder {
      width:86px;
      height:86px;
      border-radius:4px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fff;
      padding:2px;
    }

    .title {
      text-align:center;
      font-weight:700;
      font-size:15px;
      letter-spacing:1px;
      margin: 4px 0 8px;
      padding:5px 0;
      background:#f1f5f9;
      color:#0b3d91;
      border-radius:4px;
      text-transform: uppercase;
    }

    .meta {
      display:flex;
      justify-content:space-between;
      gap:12px;
      margin-bottom:8px;
      border-bottom: 1px dotted #e6eef6;
      padding-bottom: 6px;
    }
    
    .section { display:flex; gap:12px; margin-bottom:8px; }
    .box {
      flex:1;
      padding:8px;
      border-radius:4px;
      background:#f8fafc;
      border:1px solid #eef2f9;
    }
    .box h4 {
      margin:0 0 3px 0;
      font-size:11.5px;
      color:#0b1220;
      text-transform: uppercase;
    }

    table.items {
      width:100%;
      border-collapse: collapse;
      margin-bottom:8px;
      font-size:11px;
    }
    table.items thead th {
      text-align:center;
      padding:6px 4px;
      background:#eef2f7; 
      font-weight:700;
      border-bottom: 2px solid #e2e8f0;
      color:#0b1220;
    }
    table.items th:nth-child(4),
    table.items th:nth-child(5) {
      text-align:left;
    }

    table.items td {
      padding:5px 4px;
      vertical-align:middle;
      color:#0f172a;
      border-bottom:1px solid #f1f5f9;
    }
    table.items td.right { text-align:right; }

    table, thead, tbody, tr, td, th { page-break-inside: avoid; }

    .bottom-split {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .bottom-left { flex: 1; }
    
    .totals {
      width:260px;
      margin-left:auto;
      border:1px solid #eef2f7;
      border-radius:4px;
      overflow:hidden;
    }
    .totals .row {
      display:flex;
      justify-content:space-between;
      padding:6px 10px;
      border-bottom:1px solid #f1f5f9;
      font-size:11px;
      background:#fff;
      color:#0b1220;
    }
    .totals .row.total {
      font-weight:800;
      background:#f1f5f9;
      border-bottom: none;
    }

    .sign-block { 
      display:flex; 
      justify-content:space-between; 
      gap:20px; 
      align-items:flex-end; 
      margin-top: 0px;
      padding-top: 4px; 
      border-top: 1px solid #f1f5f9;
    }
    .signature-line {
      border-top:1.5px solid #0b1220;
      width:160px;
      padding-top:4px;
      font-weight:700;
      font-size:10.5px;
      text-align:center;
      margin-bottom: 2px;
    }

    .phonepe-box {
      width:105px;
      border:1px solid #eef2f7;
      border-radius:6px;
      padding:4px;
      text-align:center;
      background:#fff;
    }
    .phonepe-box h5 {
      margin:0 0 3px 0;
      font-size:10.5px;
      color:#0b1220;
      font-weight: 700;
    }

    .density-compact table.items td,
    .density-compact table.items th { padding:4px 3px; font-size:10px; }
    .density-compact .box { padding:5px; }
    .density-compact .totals .row { padding:5px 8px; font-size:10px; }
    
    .density-ultra table.items td,
    .density-ultra table.items th { padding:2px 2px; font-size:9.5px; }
    .density-ultra .box { padding:4px; }
    .density-ultra body,
    .density-ultra .container { font-size:10px; }
    .density-ultra .totals .row { padding:4px 5px; font-size:9.5px; }
    .density-ultra .sign-block { margin-top: 0; padding-top: 2px; }
    .density-ultra .signature-line { padding-top: 2px; }

    @media print {
      .container { margin:0 auto; border:none; padding:0 5px; }
    }
  </style>
</head>
<body class="${densityClass}">
  <div class="container">
    <div class="header">
      <div class="company">
        <h1>MUSTAK ISHAMOHAMMAD KHAN</h1>
        <div class="muted" style="font-weight:500; color:#334155;">(An expert in plaster of paris (POP))</div>
        <div class="muted">C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat</div>
        <div style="margin-top:4px;font-size:11px;">
          <strong>Mob:</strong> 9979174216 &nbsp;&nbsp;<strong>Email:</strong> mustakkhan.mk550@gmail.com
        </div>
        <div style="margin-top:2px;font-size:11px;"><strong>GSTIN:</strong> 24BEQPK9997B1ZW</div>
      </div>
      <div class="qr-holder" title="Quotation QR">${qrHtml}</div>
    </div>

    <div class="title">QUOTATION</div>

    <div class="meta">
      <div><strong>Quotation No:</strong> ${quotation.invoiceNumber ?? 'N/A'}</div>
      <div style="text-align:right"><strong>Quotation Date:</strong> ${
        quotation.date ?? new Date().toLocaleDateString('en-IN')
      }</div>
    </div>

    <div class="section">
      <div class="box">
        <h4>Company Details</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
          <strong>Name:</strong> MUSTAK ISHAMOHAMMAD KHAN<br/>
          <strong>Address:</strong> C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9979174216<br/>
          <strong>Email:</strong> mustakkhan.mk550@gmail.com<br/>
          <strong>GSTIN:</strong> 24BEQPK9997B1ZW
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
          <th style="width:8%;">S. No.</th>
          <th style="width:65%;text-align:center;">Product Description</th>
          <th style="width:15%;"></th>
          <th style="width:10%;">QTY.</th>
          <th style="width:2%;">Rate</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="bottom-split">
      <div class="bottom-left">
        <div style="font-size:11px;font-weight:700;color:#0b1220;text-transform:uppercase;margin-bottom:2px;">Bank Details</div>
        <div style="font-size:10.5px;color:#374151;line-height:1.25;">
          Bank Name: SBI BANK-SHAHALAM GATE<br/>
          A/C: 30391756262 &nbsp;|&nbsp; IFSC: SBIN0003046 &nbsp;|&nbsp; PAN No: BEQPK9997B
        </div>
        ${amountWordsHtml}
        
        <div style="font-size:9.5px;color:#475569;margin-top:3px;">
          ${notesHtml}
        </div>
      </div>
    
    </div>

    <div class="sign-block">
      <div style="text-align:center;">
        <div style="height: 10px;"></div>
        <div class="signature-line">Customer Signature</div>
      </div>
      <div style="text-align:center;">
        <div style="height: 10px;"></div>
        <div class="signature-line">Authorised Signatory</div>
      </div>
     <div
  style="
    width:105px;
    height:140px;
    background:#ffffff;
  "
></div>

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
        const done = () => {
          settled++;
          if (settled >= imgs.length) resolve();
        };
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
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<QuotationDocument>(COLLECTION_NAME);

    const latest = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (!latest.length) {
      return NextResponse.json(
        { message: 'No quotations found.' },
        { status: 404 },
      );
    }

    const quotation = latest[0];
    const html = buildQuotationHtml(quotation);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

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
    const verticalMarginsPx = 5 + 5;
    const availableHeight = a4HeightPx - verticalMarginsPx;

    const extraDensityClasses = ['density-tight', 'density-micro'];
    if (contentHeightPx > availableHeight) {
      for (const density of extraDensityClasses) {
        await page.evaluate((densityClass: string) => {
          if (!document.body.classList.contains(densityClass)) {
            document.body.classList.add(densityClass);
          }
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

    const fileName = `quotation-${quotation.invoiceNumber || 'quotation'}.pdf`;
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
    console.error('Error generating quotation PDF:', error);

    let message = 'Unknown error';
    if (error instanceof Error && error.message) {
      message = error.message;
    }

    return NextResponse.json(
      { message: `Failed to generate quotation PDF: ${message}` },
      { status: 500 },
    );
  } finally {
      }
}
