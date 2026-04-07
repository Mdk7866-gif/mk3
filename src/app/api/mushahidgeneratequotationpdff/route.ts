// src/app/api/mushahidgeneratequotationpdff/route.ts
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer, { Page } from 'puppeteer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'mk3';
const COLLECTION_NAME = 'mushahidquotation'; // collection for quotations

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

/* ---------- TYPES ---------- */

interface QuotationItem {
  no?: number;
  description?: string;
  quantity?: number | string;
  rate?: number | string;
  amount?: number | string;
  totalAmount?: number | string;
}

interface Quotation {
  _id?: unknown;

  qrCode?: unknown;
  qr?: unknown;

  verificationUrl?: string;
  verifyUrl?: string;
  qrLink?: string;

  invoiceNumber?: string; // used as quotation number
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
  clientName?: string;
  clientAddress?: string;
  mobile?: string;
  email?: string;
  gstin?: string;

  items?: QuotationItem[];

  amountInWords?: string;
  notes?: string;
  date?: string;

  totalAmountAfterTax?: number | string;
  totalAmount?: number | string;

  createdAt?: Date | string;

  [key: string]: unknown;
}

const client = new MongoClient(MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

/* ---------- HELPERS ---------- */

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
      } catch {
        // ignore file errors
      }
    }

    if (typeof qr === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(qr) && qr.length > 100) {
      return `data:image/png;base64,${qr.replace(/\s+/g, '')}`;
    }

    if (qr && typeof qr === 'object' && 'buffer' in qr) {
      const bufLike = (qr as { buffer: Buffer | ArrayBuffer | Uint8Array }).buffer;
      const b = Buffer.isBuffer(bufLike) ? bufLike : Buffer.from(bufLike as ArrayBuffer);
      return `data:image/png;base64,${b.toString('base64')}`;
    }

    if (Buffer.isBuffer(qr)) {
      return `data:image/png;base64,${qr.toString('base64')}`;
    }

    if (Array.isArray(qr) && qr.length > 0 && typeof qr[0] === 'number') {
      return `data:image/png;base64,${Buffer.from(qr).toString('base64')}`;
    }

    return null;
  } catch (err) {
    console.error('getQrDataUri error:', err);
    return null;
  }
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
  } catch (e) {
    console.error('loadLocalImageAsDataURI error:', e);
    return null;
  }
}

function buildVerificationUrl(doc: Quotation): string | null {
  const rawUrl =
    (typeof doc.verificationUrl === 'string' && doc.verificationUrl.length > 4 && doc.verificationUrl) ||
    (typeof doc.verifyUrl === 'string' && doc.verifyUrl.length > 4 && doc.verifyUrl) ||
    (typeof doc.qrLink === 'string' && doc.qrLink.length > 4 && doc.qrLink) ||
    null;

  if (rawUrl) return rawUrl;

  const invoiceNumber = doc.invoiceNumber;
  if (!invoiceNumber) return null;

  const issuer = (doc.issuer ?? '').toString().toLowerCase();

  const pathname =
    issuer === 'mushahid'
      ? '/verifyqrcodefrontendmushahid'
      : issuer === 'mustak'
      ? '/verifyqrcodefrontendmustak'
      : '/verifyqrcodefrontendmushahid';

  const base =
    DEFAULT_PUBLIC_BASE_URL.startsWith('http')
      ? DEFAULT_PUBLIC_BASE_URL
      : `https://${DEFAULT_PUBLIC_BASE_URL}`;

  const url = new URL(pathname, base);
  url.searchParams.set('invoiceNumber', invoiceNumber);
  if (doc.documentType) url.searchParams.set('type', String(doc.documentType));
  url.searchParams.set('issuer', issuer || 'mushahid');

  return url.toString();
}

function buildPaymentLinks(doc: Quotation): { primary: string; deepLink?: string } | null {
  // If quotation already has an explicit payment link, use that
  const direct =
    (typeof doc.paymentLink === 'string' && doc.paymentLink) ||
    (typeof doc.paymentUrl === 'string' && doc.paymentUrl) ||
    (typeof doc.paymentPage === 'string' && doc.paymentPage) ||
    (typeof doc.phonePeLink === 'string' && doc.phonePeLink) ||
    (typeof doc.gpayLink === 'string' && doc.gpayLink) ||
    (typeof doc.paytmLink === 'string' && doc.paytmLink) ||
    '';

  if (direct && direct.length > 4) {
    return { primary: direct };
  }

  // ✅ Your fixed UPI details (no amount)
  const upiId = '9979174216@ybl';
  const payeeName = 'Mustak Ishamohmmed Khan';
  const note = 'thank you for yourpayment';

  // No amount here on purpose – user will enter any amount in UPI app
  const upiParams = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    cu: 'INR',
    tn: note,
  });

  // Deep link that actually opens UPI app
  const deepLink = `upi://pay?${upiParams.toString()}`;

  // HTTPS link to your quotation payment page
  const base =
    DEFAULT_PUBLIC_BASE_URL.startsWith('http')
      ? DEFAULT_PUBLIC_BASE_URL
      : `https://${DEFAULT_PUBLIC_BASE_URL}`;

  const redirectUrl = new URL('/upi-payquotation', base);
  redirectUrl.search = upiParams.toString();

  return {
    primary: redirectUrl.toString(), // 🔹 this goes into the PDF QR <a href="">
    deepLink,
  };
}


function buildQuotationHtml(quotation: Quotation): string {
  const qrDataUri = getQrDataUri(quotation.qrCode ?? quotation.qr);
  const phonePeQr = loadLocalImageAsDataURI('phonepe-qr.jpg');
  const verificationUrl = buildVerificationUrl(quotation);

  const items: QuotationItem[] = quotation.items ?? [];
  const itemsCount = items.length;
  const densityClass =
    itemsCount > 34 ? 'density-ultra' : itemsCount > 24 ? 'density-compact' : 'density-regular';

  const computeAmount = (item: QuotationItem): number => {
    const qty = Number(item.quantity ?? 0) || 0;
    const rate = Number(item.rate ?? 0) || 0;
    const directAmt = item.amount ?? item.totalAmount;
    const amt =
      directAmt !== undefined && directAmt !== null && directAmt !== ''
        ? Number(directAmt) || 0
        : qty * rate;
    return amt || 0;
  };

  const grandTotal: number = items.reduce(
    (sum: number, item: QuotationItem) => sum + computeAmount(item),
    0,
  );

  const paymentLinks = buildPaymentLinks(quotation);


  const itemsRows = items
    .map(
      (item: QuotationItem) => `
      <tr>
        <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;">${
          item.no ?? ''
        }</td>
        <td style="padding:5px 4px;font-size:11px;border-bottom:1px solid #e6e6e6;">${
          item.description ?? ''
        }</td>
        <td style="padding:5px 4px;text-align:center;font-size:11px;border-bottom:1px solid #e6e6e6;"></td>
        <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">${
          item.quantity ?? ''
        }</td>
        <td style="padding:5px 4px;text-align:left;font-size:11px;border-bottom:1px solid #e6e6e6;">₹${computeAmount(
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

    const paymentHref = paymentLinks?.primary || '#';

  const phonePeHtml = `
  <div
    style="
      width: 80px;
      height: 95px;
      background: #ffffff;
      margin: 0 auto;
    "
  ></div>
`;

  



  const amountWordsHtml = quotation.amountInWords
    ? `<div style="margin-top:4px;font-weight:800;font-size:10.5px;color:#0b1220;">Amount in Words: ${quotation.amountInWords}</div>`
    : '';

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
      color: #0f172a;
      font-size: 11.5px;
      background: #fff;
    }

    .container { max-width: 750px; margin: 0 auto; padding: 0 5px; background: #fff; }

    .header {
      display:flex; justify-content:space-between; align-items:flex-start; gap:12px;
      border-bottom:1px solid #eef2f7; padding-bottom:6px; margin-bottom:8px; padding-top: 8px;
    }

    .company h1 { font-size:20px; margin:0 0 4px 0; letter-spacing:0.5px; color:#0b1220; font-weight: 800; }
    .muted { color:#475569; font-size:11px; margin-top:2px; }

    .qr-holder { width:86px; height:86px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:#fff; padding:2px; }

    .title { text-align:center; font-weight:700; font-size:15px; letter-spacing:1px; margin: 4px 0 8px; padding:5px 0; background:#f1f5f9; color:#0b3d91; border-radius:4px; text-transform: uppercase; }

    .meta { display:flex; justify-content:space-between; gap:12px; margin-bottom:8px; border-bottom: 1px dotted #e6eef6; padding-bottom: 6px; }
    .section { display:flex; gap:12px; margin-bottom:8px; }
    .box { flex:1; padding:8px; border-radius:4px; background:#f8fafc; border:1px solid #eef2f9; }
    .box h4 { margin:0 0 3px 0; font-size:11.5px; color:#0b1220; text-transform: uppercase; }

    table.items { width:100%; border-collapse: collapse; margin-bottom:8px; font-size:11px; }
    table.items thead th { text-align:center; padding:6px 4px; background:#eef2f7; font-weight:700; border-bottom: 2px solid #e2e8f0; color:#0b1220; }
    table.items th:nth-child(2), table.items th:nth-child(4), table.items th:nth-child(5) { text-align:left; }
    table.items td { padding:5px 4px; vertical-align:middle; color:#0f172a; border-bottom:1px solid #f1f5f9; }
    table.items td.right { text-align:right; }
    table, thead, tbody, tr, td, th { page-break-inside: avoid; }

    .bottom-split { display: flex; gap: 16px; align-items: flex-start; }
    .bottom-left { flex: 1; }
    .totals { width:260px; margin-left:auto; border:1px solid #eef2f7; border-radius:4px; overflow:hidden; }
    .totals .row { display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #f1f5f9; font-size:11px; background:#fff; color:#0b1220; }
    .totals .row.total { font-weight:800; background:#f1f5f9; border-bottom: none; }

    .sign-block { display:flex; justify-content:space-between; gap:20px; align-items:flex-end; margin-top: 0px; padding-top: 4px; border-top: 1px solid #f1f5f9; }
    .signature-line { border-top:1.5px solid #0b1220; width:160px; padding-top:4px; font-weight:700; font-size:10.5px; text-align:center; margin-bottom: 2px; }

    .phonepe-box { width:105px; border:1px solid #eef2f7; border-radius:6px; padding:4px; text-align:center; background:#fff; }
    .phonepe-box h5 { margin:0 0 3px 0; font-size:10.5px; color:#0b1220; font-weight: 700; }

    .density-compact table.items td, .density-compact table.items th { padding:4px 3px; font-size:10px; }
    .density-compact .box { padding:5px; }
    .density-compact .totals .row { padding:5px 8px; font-size:10px; }
    .density-ultra table.items td, .density-ultra table.items th { padding:2px 2px; font-size:9.5px; }
    .density-ultra .box { padding:4px; }
    .density-ultra body, .density-ultra .container { font-size:10px; }
    .density-ultra .totals .row { padding:4px 5px; font-size:9.5px; }
    .density-ultra .sign-block { margin-top: 0; padding-top: 2px; }
    .density-ultra .signature-line { padding-top: 2px; }
    @media print { .container { margin:0 auto; border:none; padding:0 5px; } }
  </style>
  </head>
  <body class="${densityClass}">
    <div class="container">
      <div class="header">
        <div class="company">
          <h1>MUSHAHID KHAN</h1>
          <div class="muted" style="font-weight:500; color:#334155;">(An expert in plaster of paris (POP))</div>
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
            <th style="width:8%;">S. No.</th>
            <th style="width:52%;">Product Description</th>
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
            Bank Name: SBI BANK-LAMBHA<br/>
            A/C: 42005260280 &nbsp;|&nbsp; IFSC: SBIN0016026 &nbsp;|&nbsp; PAN No: GDYPM4112E
          </div>
          
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

/* ---------- ROUTE HANDLER ---------- */

export async function GET(): Promise<NextResponse> {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<Quotation>(COLLECTION_NAME);

    const latest = await collection.find({}).sort({ createdAt: -1 }).limit(1).toArray();

    if (!latest.length) {
      return NextResponse.json({ message: 'No quotations found.' }, { status: 404 });
    }

    const quotation = latest[0];
    const html = buildQuotationHtml(quotation);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const a4WidthPx = 794;
    const a4HeightPx = 1123;

    const page = await browser.newPage();
    await page.setViewport({ width: a4WidthPx, height: a4HeightPx });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await waitForImagesLoad(page, 6000);

    const measureContentHeight = async (): Promise<number> =>
      page.evaluate(() => {
        const el = document.documentElement || document.body;
        return Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);
      });

    let contentHeightPx = await measureContentHeight();
    const verticalMarginsPx = 5 + 5;
    const availableHeight = a4HeightPx - verticalMarginsPx;

    const extraDensityClasses: string[] = ['density-tight', 'density-micro'];
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Failed to generate quotation PDF: ${message}` },
      { status: 500 },
    );
  } finally {
    await client.close().catch(() => {
      // ignore
    });
  }
}
