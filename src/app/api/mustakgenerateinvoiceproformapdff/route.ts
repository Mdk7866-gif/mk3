// src/app/api/mustakgenerateinvoicepdff/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import puppeteer, { Page } from 'puppeteer';
import clientPromise from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mustakinvoice';

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
    'https://mk3-kappa.vercel.app';


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

interface InvoiceItem {
    no?: string | number;
    description?: string;
    quantity?: string | number;
    rate?: string | number;
    amount?: string | number;
    totalAmount?: string | number;
}

interface InvoiceDocument {
    _id?: unknown;

    invoiceNumber?: string;
    date?: string;

    clientName?: string;
    clientAddress?: string;
    mobile?: string;
    email?: string;
    gstin?: string;

    items?: InvoiceItem[];

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

    // allow any extra fields from Mongo
    [key: string]: unknown;
}

/* ---------- QR Helpers ---------- */

function isQrWithProps(value: QrInput): value is { qrCode?: QrBinary; qr?: QrBinary } {
    return typeof value === 'object' && value !== null && ('qrCode' in value || 'qr' in value);
}

function hasBufferField(
    value: unknown,
): value is { buffer: ArrayBufferLike | Buffer | Uint8Array } {
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

/* ---------- Image Helper ---------- */

function loadLocalImageAsDataURI(relPath: string): string | null {
    try {
        const safeRel = relPath.replace(/^\/+/, '');
        const filePath = path.join(process.cwd(), 'public', safeRel);
        if (!fs.existsSync(filePath)) return null;
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime =
            ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (e) {
        console.error('loadLocalImageAsDataURI error:', e);
        return null;
    }
}

/* ---------- URL / Payment Helpers ---------- */

function buildVerificationUrl(invoice: InvoiceDocument): string | null {
    const rawUrl =
        invoice.verificationUrl || invoice.verifyUrl || invoice.qrLink;
    if (typeof rawUrl === 'string' && rawUrl.length > 4) return rawUrl;

    const invoiceNumber = invoice.invoiceNumber;
    if (!invoiceNumber) return null;

    const issuer = (invoice.issuer || '').toLowerCase();
    const pathname =
        issuer === 'mushahid'
            ? '/verifyqrcodefrontendmushahid'
            : issuer === 'mustak'
                ? '/verifyqrcodefrontendmustak'
                : '/verifyqrcodefrontendmustak';

    const base =
        DEFAULT_PUBLIC_BASE_URL.startsWith('http')
            ? DEFAULT_PUBLIC_BASE_URL
            : `https://${DEFAULT_PUBLIC_BASE_URL}`;

    const url = new URL(pathname, base);
    url.searchParams.set('invoiceNumber', invoiceNumber);
    if (invoice.documentType) url.searchParams.set('type', invoice.documentType);
    url.searchParams.set('issuer', issuer || 'mustak');
    return url.toString();
}

function buildPaymentLinks(
    invoice: InvoiceDocument,
    amountOverride?: number,
): { primary: string; deepLink?: string } | null {
    // If there is an explicit payment link on the invoice, use it
    const direct =
        (typeof invoice.paymentLink === 'string' && invoice.paymentLink) ||
        (typeof invoice.paymentUrl === 'string' && invoice.paymentUrl) ||
        (typeof invoice.paymentPage === 'string' && invoice.paymentPage) ||
        (typeof invoice.phonePeLink === 'string' && invoice.phonePeLink) ||
        (typeof invoice.gpayLink === 'string' && invoice.gpayLink) ||
        (typeof invoice.paytmLink === 'string' && invoice.paytmLink) ||
        '';

    if (direct && direct.length > 4) {
        return { primary: direct };
    }

    // ✅ Mustak's fixed UPI details
    const upiId = '9979174216@ybl';
    const payeeName = 'Mustak Ishamohmmed Khan';
    const note = 'thank you for yourpayment';

    // Calculate amount
    const fallbackItemsTotal =
        Array.isArray(invoice.items) && invoice.items.length
            ? invoice.items.reduce((sum: number, it: InvoiceItem) => {
                const amt = parseFloat(String(it.totalAmount ?? it.amount ?? 0)) || 0;
                return sum + amt;
            }, 0)
            : undefined;

    const amountRaw =
        amountOverride ??
        invoice.totalAmountAfterTax ??
        invoice.totalAmount ??
        fallbackItemsTotal;

    const upiParams = new URLSearchParams({
        pa: upiId,
        pn: payeeName,
        cu: 'INR',
        tn: note,
    });

    if (amountRaw !== undefined && amountRaw !== null) {
        upiParams.set('am', String(amountRaw));
    }


    // ✅ Deep UPI link
    const deepLink = `upi://pay?${upiParams.toString()}`;

    // ✅ HTTPS redirect link → /upi-pay
    const base =
        DEFAULT_PUBLIC_BASE_URL.startsWith('http')
            ? DEFAULT_PUBLIC_BASE_URL
            : `https://${DEFAULT_PUBLIC_BASE_URL}`;

    const redirectUrl = new URL('/upi-pay', base);
    redirectUrl.search = upiParams.toString();

    return {
        primary: redirectUrl.toString(), // ✅ PDF tap → browser → /upi-pay
        deepLink,
    };
}

/* ---------- HTML Builder ---------- */

function computeItemAmount(item: InvoiceItem): number {
    return (
        parseFloat(String(item.totalAmount ?? item.amount ?? 0)) || 0
    );
}

function buildInvoiceHtml(invoice: InvoiceDocument): string {
    const qrDataUri = getQrDataUri(invoice.qrCode ?? invoice.qr);
    const phonePeQr = loadLocalImageAsDataURI('phonepe-qr.jpg');
    const verificationUrl = buildVerificationUrl(invoice);

    const items: InvoiceItem[] = invoice.items ?? [];
    const itemsCount = items.length;
    const densityClass =
        itemsCount > 34
            ? 'density-ultra'
            : itemsCount > 24
                ? 'density-compact'
                : 'density-regular';

    const grandTotal: number = items.reduce(
        (sum: number, item: InvoiceItem) => sum + computeItemAmount(item),
        0,
    );

    const paymentLinks = buildPaymentLinks(invoice, grandTotal);

    const itemsRows = items
        .map(
            (item: InvoiceItem) => `
  <tr>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.no ?? ''
                }</td>
    <td style="padding:5px 4px;font-size:11px;border-bottom:1px solid #e6e6e6;text-align:center;">${item.description ?? ''
                }</td>
    <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${item.quantity ?? ''
                }</td>
    <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${(
                    parseFloat(String(item.rate ?? 0)) || 0
                ).toFixed(2)}</td>
    <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${computeItemAmount(
                    item,
                ).toFixed(2)}</td>
  </tr>`,
        )
        .join('');

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
    // ---------- TEMPORARY TOGGLE ----------
    // Set this to `true` to restore PhonePe QR and label.
    // Default: false (so QR removed and blank placeholder used).
    const showPhonePe = false;
    // -------------------------------------

    const phonePeHtml = showPhonePe && phonePeQr
        ? `<a href="${paymentHref}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;">
        <img alt="UPI Payment QR" src="${phonePeQr}" style="width:80px;height:auto;display:block;margin:0 auto;border-radius:4px;" decoding="async" />
        <div style="font-size:9px;color:#0f172a;margin-top:3px;font-weight:600;">Scan or tap to pay</div>
      </a>`
        : `<div style="width:80px;height:88px;display:block;margin:0 auto;border-radius:4px;">
         <!-- intentionally left blank to preserve layout when QR is hidden -->
       </div>`;




    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber ?? ''}</title>
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
      text-align:center; /* Default center for S.No and QTY */
      padding:6px 4px;
      background:#eef2f7; 
      font-weight:700;
      border-bottom: 2px solid #e2e8f0;
      color:#0b1220;
    }
    /* Left align Description, Rate and Amount */
    table.items th:nth-child(2), /* Description */
    table.items th:nth-child(4), /* Rate */
    table.items th:nth-child(5)  /* Amount */ {
      text-align:left;
    }

    table.items td {
      padding:5px 4px;
      vertical-align:middle;
      color:#0f172a;
      border-bottom:1px solid #f1f5f9;
    }
    
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
        <h1>MUSTAK KHAN</h1>
        <div class="muted" style="font-weight:500; color:#334155;">(An expert in plaster of paris (POP))</div>
        <div class="muted">C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat</div>
        <div style="margin-top:4px;font-size:11px;">
          <strong>Mob:</strong> 9979174216 &nbsp;&nbsp;<strong>Email:</strong> mustakkhan.mk550@gmail.com
        </div>
        <div style="margin-top:2px;font-size:11px;"><strong>.</strong></div>
      </div>
      <div class="qr-holder" title="Invoice QR">${qrHtml}</div>
    </div>

    <div class="title">PROFORMA INVOICE</div>

    <div class="meta">
      <div><strong>Invoice No:</strong> ${invoice.invoiceNumber ?? 'N/A'}</div>
      <div style="text-align:right"><strong>Invoice Date:</strong> ${invoice.date ?? new Date().toLocaleDateString('en-IN')
        }</div>
    </div>

    <div class="section">
      <div class="box">
        <h4>Company Details</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
          <strong>Name:</strong> MUSTAK KHAN<br/>
          <strong>Address:</strong> C-1/207 Marjan Residency Nr. Alkuba Canal Road, Vatva, Ahmedabad - 382440, Gujarat<br/>
          <strong>Mobile:</strong> 9979174216<br/>
          <strong>Email:</strong> mustakkhan.mk550@gmail.com<br/>
          
        </div>
      </div>
      <div class="box">
        <h4>Bill To</h4>
        <div style="font-size:10.5px;color:#0b1220;line-height:1.25;">
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
          <th style="width:8%;">S. No.</th>
          <th style="width:52%;text-align:center;">Product Description</th>
          <th style="width:15%;">QTY.</th>
          <th style="width:10%;">Rate</th>
          <th style="width:2%;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="bottom-split">
      <div class="bottom-left">
      </div>
      <div class="totals" role="note" aria-label="Amount Summary">
        <div class="row total">
          <div>Total Amount</div>
          <div>₹${grandTotal.toFixed(2)}</div>
        </div>
        ${invoice.amountInWords ? `
        <div style="padding:6px 10px; border-top:1px solid #f1f5f9; font-size:10px; color:#374151; background:#ffffff;">
           <span style="font-weight:700; color:#0b1220;">In Words:</span> ${invoice.amountInWords}
        </div>` : ''}
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
      <!-- phonepe box: when showPhonePe is false, override border/background so no visible box shows -->
      <div
        class="phonepe-box"
        title="Pay via PhonePe"
        style="${showPhonePe ? '' : 'border:none;background:transparent;padding:4px;'}"
        aria-hidden="${showPhonePe ? 'false' : 'true'}"
      >
        ${showPhonePe ? `<h5>Pay via PhonePe</h5>${phonePeHtml}` : phonePeHtml}
      </div>
    </div>

    <div style="text-align:center;margin-top:4px;font-size:9px;color:#94a3b8;">
      This is a computer generated invoice.
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
        const collection = db.collection<InvoiceDocument>(COLLECTION_NAME);

        const latest = await collection
            .find({})
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();

        if (!latest.length) {
            return NextResponse.json(
                { message: 'No invoices found.' },
                { status: 404 },
            );
        }

        const invoice = latest[0];
        const html = buildInvoiceHtml(invoice);

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

        const fileName = `invoice-${invoice.invoiceNumber || 'invoice'}.pdf`;
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
        console.error('Error generating PDF:', error);

        let message = 'Unknown error';
        if (error instanceof Error && error.message) {
            message = error.message;
        }

        return NextResponse.json(
            { message: `Failed to generate PDF: ${message}` },
            { status: 500 },
        );
    } finally {
        await client.close().catch(() => { });
    }
}