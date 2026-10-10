# MK3 Solutions

MK3 is a business document website for the Mustak and Mushahid issuer profiles. It creates invoices, GST invoices, quotations, discount-rate quotations, and proforma invoices, stores document data in MongoDB, and downloads printable PDFs. Customers can scan document QR codes to verify saved details or open a UPI payment page.

This document describes the inspected repository source. The live deployment, database contents, and payment completion have not been verified.

## Features and pages

The homepage (`/`) displays separate Mustak and Mushahid earnings cards. Each retrieves GST and standard invoice totals through its earnings API. These are sums of saved document amounts, not confirmed payments or accounting profit.

Both `/mustak` and `/mushahid` provide:

- `/invoice`: quantities, rates, line amounts, total, and amount in words.
- `/gst`: taxable line amounts with the implemented fixed 18% GST calculation, split into 9% CGST and 9% SGST.
- `/quotation`: quantities and quoted rates, prefilling items from the latest quotation for the issuer.
- `/quotationdiscountrate`: original and discounted unit prices, prefilling the latest discount quotation's items. `discountRate` means discounted price, not percentage.
- `/proformainvoice`: saves through the standard invoice API and uses a separate proforma PDF template.

Forms collect a date, client name and address, at least one of email or mobile, optional GSTIN and notes, and line items. Browser dates are converted from `YYYY-MM-DD` to `DD/MM/YYYY` for storage. Invoice amounts use Indian currency formatting and amount-in-words conversion with lakh, crore, and paise.

Responsive navigation offers both issuer menus. Verification and payment pages omit the normal navbar and footer.

## Document creation workflow

1. Select the issuer and document type, enter client details, and add items.
2. The page validates input and submits JSON to its save API.
3. The API validates required fields, assigns a document number, creates a verification QR image, and inserts the record into MongoDB.
4. The page calls the corresponding PDF endpoint. Puppeteer renders its HTML template into an A4 PDF.
5. The browser downloads the PDF. Toast messages report progress and failures.

Saving and PDF generation are separate operations. A PDF failure can occur after the record has been saved; repeating the full submission can create another record.

Most PDF endpoints select the latest record by `createdAt`, rather than using the ID returned by saving. Concurrent submissions can therefore download another submission's document. The Mustak GST endpoint `/api/mustakgeneratepdffgstobjectid?id=<MongoDBObjectId>` supports selecting a specific record; without an ID it uses the latest record.

PDF templates contain issuer details, document content, and verification/payment elements. Template markup and styles live inside API route files, separately from React forms and global CSS.

## Verification and UPI payments

Verification pages:

- `/verifyqrcodefrontendmustak?invoiceNumber=INV-2026-001&type=invoice`
- `/verifyqrcodefrontendmushahid?invoiceNumber=QT-2026-001&type=quotation`

Both use `VerifyInvoicePage` and request `/api/verifyqrcode` with `invoiceNumber`, `issuer`, and optional `type`. Supported types are `invoice`, `gst`, `quotation`, and `quotationdiscountrate`. The API returns the saved document without `_id`, responds with 400 for a missing number, and returns 404 when no matching record exists. Verification confirms a database match; it is not a cryptographic signature or payment confirmation.

`/upi-pay` accepts `pa` (UPI address), `pn` (payee name), optional `am` (amount), `tn` (note), and `cu` (currency). Its button opens a `upi://pay` link. `/upi-payquotation` omits the amount so the customer enters it in the UPI app. There is no payment callback, transaction reconciliation, or paid-status storage in the current source.

## Technology and structure

The project uses Next.js 16.2.6 App Router, React 19.2.6, strict TypeScript, Tailwind CSS 4, MongoDB's Node driver, Puppeteer, `qrcode`, Lucide icons, and `react-hot-toast`. Development and production builds use Turbopack. Cloudinary and pdfmake are dependencies, but the current source does not import them; PDF generation uses Puppeteer.

```text
src/app/
  page.tsx                  Homepage and earnings overview
  layout.tsx                Root layout, Inter font, metadata
  LayoutWrapper.tsx         Conditional navigation/footer
  mustak/                   Five Mustak document forms
  mushahid/                 Five Mushahid document forms
  api/                      Save, PDF, earnings, prefetch, verification
  verifyqrcodefrontend*/    Issuer-specific verification pages
  upi-pay/                  UPI link with optional amount
  upi-payquotation/         UPI link without amount
src/components/             Shared forms, navigation, password gate
src/components/Homepagecardstotalearning/
                            Issuer earnings cards
src/lib/mongodb.ts          Shared MongoDB connection promise
public/                     QR images, SVGs, PDFs, credentials assets
```

Mustak and Mushahid have separate route implementations. Changes to document fields should be checked across both issuers' forms, save handlers, PDF templates, and verification view. Import shared modules using the `@/*` alias for `src/*`. The MongoDB module reuses a global connection promise during development.

## Local setup and environment

Use Node.js 20.9.0 or newer, npm, a reachable MongoDB instance, and a host capable of running Puppeteer's Chromium browser.

```bash
npm ci
```

Create `.env.local` in the repository root:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/mk3
WEBSITE_DEPLOYEMENT=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- `MONGODB_URI` is required. The connection module throws when it is absent. Routes explicitly select database `mk3`.
- `WEBSITE_DEPLOYEMENT` is the existing variable spelling. Save APIs use it for stored verification QR URLs; preserve the spelling until all consumers are migrated.
- PDF routes resolve the base URL in this order: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, `SITE_URL`, `WEBSITE_DEPLOYEMENT`, normalized `VERCEL_URL`, then a route-specific fallback. Most fall back to localhost; the Mushahid proforma route has a hardcoded hosted-site fallback.
- Set URL variables consistently, including the protocol. Production should use the intended public HTTPS origin. Previously stored QR images may retain their original URLs.
- Never commit actual connection strings or `.env.local`. Variables prefixed with `NEXT_PUBLIC_` must contain only public values.

```bash
npm run dev
```

Open `http://localhost:3000`. The UI password gate uses the shared password defined in `src/components/PasswordProtection.tsx`; obtain access details from the maintainer.

## Development and validation

- `npm run dev`: start development with Turbopack.
- `npm run build`: create the production Next.js build.
- `npm run start`: serve the production build; build first.
- `npm run lint`: run ESLint. The configuration declares Next.js Core Web Vitals and TypeScript rules.
- `npx tsc --noEmit`: check TypeScript without emitting JavaScript.

There is no configured test framework, `npm test` script, or coverage threshold. For document changes, use a development database and manually verify both issuers: required-field errors, calculations, saved fields, PDF downloads and layout, QR verification, quotation prefill, and UPI links. Include long descriptions and many items in PDF checks. Test submissions insert real records into the configured database.

## MongoDB records and API organization

Database `mk3` contains these collections:

- Mustak: `mustakinvoice`, `mustakgst`, `mustakquotation`, `mustakquotationdiscountrate`.
- Mushahid: `mushahidinvoice`, `mushahidgst`, `mushahidquotation`, `mushahidquotationdiscountrate`.

Common fields include `invoiceNumber`, `issuer`, `documentType`, client details, `date`, `items`, a QR data URL in `qrCode`, and `createdAt`. Invoices store `totalAmount` and `amountInWords`; GST records also store taxable totals, CGST, SGST, and after-tax totals. Quotations primarily store item quantities and rates. Save handlers do not persist PDFs or a `pdfLink`.

Numbers are allocated per collection and year: `INV-YYYY-NNN` for invoices and GST invoices, `QT-YYYY-NNN` for quotations, and `QTDR-YYYY-NNN` for discount quotations. The year comes from the submitted date. Allocation reads the latest matching number and increments it; it does not use an atomic counter. Numbers can overlap between issuers and types, so include both when verifying.

Proforma records share invoice collections and use `documentType: invoice`. They have no separate sequence or stored proforma discriminator. Their amounts consequently contribute to invoice earnings totals.

API families use these existing naming patterns, with `<issuer>` replaced by `mustak` or `mushahid`:

- POST `/api/<issuer>saveinvoice`, `savegst`, `savequotation`, and `savequotationdiscountrate` (each suffix follows the issuer).
- GET `/api/<issuer>generateinvoicepdff`, `generategstpdff`, `generatequotationpdff`, `generatequotationdiscountratepdff`, and `generateinvoiceproformapdff`.
- GET `/api/prefetchdata/<issuer>quotation` and `<issuer>quotationdiscountrate`: latest saved items, or an empty items array.
- GET `/api/earnings/<issuer>`: `gstTotal` and `invoiceTotal`.
- GET `/api/verifyqrcode`: public document lookup.

## Current limitations and deployment considerations

- The client password gate uses a hardcoded shared password and the `mk3_authenticated` local-storage flag. It does not authenticate API requests. The inspected save, generation, earnings, prefetch, and verification handlers have no server-side authorization checks.
- Verification exposes saved client and document details to callers with matching query parameters. Review the intended public fields before exposing sensitive records.
- Totals are calculated in the browser and submitted to save handlers, which do not independently recompute all amounts. GST rates are fixed implementation values, without selectable rates or an IGST workflow.
- Number allocation and latest-record PDF selection need changes for reliable concurrent use.
- Links reference `/spellings` and `/contact`, but corresponding pages are absent. Root metadata still contains the starter description.
- Everything in `public/`, including `public/credentials/`, is served as static content. Review the intended visibility of those assets.
- PDF routes require Node.js, Chromium, local asset access, and enough memory and execution time to render documents. A static export cannot provide the database or PDF APIs. Chromium launches currently use `--no-sandbox` flags.
- The root layout loads Inter through `next/font/google`; builds may require network access for font retrieval.

These observations describe source behavior, not a completed production security audit or runtime test. See [AGENTS.md](AGENTS.md) for contributor conventions.
