# MK3 Solutions

MK3 is a business document website for the Mustak and Mushahid issuer profiles. It creates invoices, GST invoices, quotations, discount-rate quotations, and proforma invoices, stores document data in MongoDB, and downloads printable PDFs. Customers can scan document QR codes to verify saved details or open a UPI payment page.

This document describes the inspected repository source. The live deployment, database contents, and payment completion have not been verified.

## Features and pages

The homepage (`/`) displays separate Mustak and Mushahid earnings cards. Each retrieves GST and standard invoice totals through its earnings API. These are sums of saved document amounts, not confirmed payments or accounting profit.

Both `/mustak` and `/mushahid` provide:

- `/invoice`: quantities, rates, line amounts, total, and amount in words.
- `/gst`: taxable line amounts with the implemented fixed 18% GST calculation, split into 9% CGST and 9% SGST.
- `/quotation`: quantities and quoted rates, prefilling editable items from the issuer's root-level JSON defaults.
- `/quotationdiscountrate`: original and discounted unit prices, prefilling editable items from the issuer's discount defaults JSON. `discountRate` means discounted price, not percentage.
- `/proformainvoice`: saves through the standard invoice API and uses a separate proforma PDF template.

Forms collect a date, client name and address, at least one of email or mobile, optional GSTIN and notes, and line items. Browser dates are converted from `YYYY-MM-DD` to `DD/MM/YYYY` for storage. Invoice amounts use Indian currency formatting and amount-in-words conversion with lakh, crore, and paise.

Responsive navigation offers both issuer menus. Verification and payment pages omit the normal navbar and footer.

## Editing default quotation products

Each quotation page starts from its own root-level JSON file, without fetching previous records from MongoDB:

- [mustak-quotation-defaults.json](mustak-quotation-defaults.json): Mustak standard quotations.
- [mushahid-quotation-defaults.json](mushahid-quotation-defaults.json): Mushahid standard quotations.
- [mustak-quotation-discount-defaults.json](mustak-quotation-discount-defaults.json): Mustak discount quotations.
- [mushahid-quotation-discount-defaults.json](mushahid-quotation-discount-defaults.json): Mushahid discount quotations.

All four files contain 21 default products. **Curve Ceiling is item 10**, with quantity 1, a standard rate of 120, and both original and discounted prices of 120 in the discount files. The former items 10 through 20 are now numbered 11 through 21. Use JSON numbers for `no`, `quantity`, and prices. Standard items use `rate`; discount items use `originalRate` and `discountRate`. Both discount prices initially equal the supplied rate because no separate discount prices were provided. Edit them independently as needed.

Edit the relevant file to change future defaults, then rebuild and redeploy the website. Rows remain editable, addable, and removable in the form. Use the row + button to insert a blank product directly below an existing one. Drag the grip to reorder products, or use the up/down buttons (also available on mobile) or arrow keys on the focused grip. Row numbers update automatically, and the submitted quotation preserves the selected order. Form edits affect only that quotation and never write back to these files. Empty defaults produce one blank editable row. Defaults are imported directly into the pages, so no backend API or database read is needed to load them. Historical saved quotations remain in MongoDB.

The previous fetch-on-mount logic, asynchronous prefill state, previous-quotation notifications, and item synchronization effects were removed. These unused endpoints were deleted:

- `/api/prefetchdata/mustakquotation`
- `/api/prefetchdata/mushahidquotation`
- `/api/prefetchdata/mustakquotationdiscountrate`
- `/api/prefetchdata/mushahidquotationdiscountrate`

## Editing and ordering document items

All ten document forms support these controls for both `/mustak` and `/mushahid`: `/invoice`, `/proformainvoice`, `/gst`, `/quotation`, and `/quotationdiscountrate`.

- **Insert between products:** click the row + button to insert a blank item below it. To add item 8, click + beside item 7.
- **Drag to reorder:** hold the grip icon, drag the row to another position, and release over the highlighted destination. Dropping in the upper or lower half places it before or after that row.
- **Move with buttons or keyboard:** use the up/down buttons, including on mobile. A focused grip also supports the Up/Down arrow keys. Boundary move buttons are disabled.
- **Add or remove:** the bottom Add Item button appends a row; the trash button removes one. The last remaining row cannot be deleted through the UI.

Row numbers update automatically, and submitted items retain the selected order. Reordering preserves descriptions, HSN, quantities, prices, line amounts, and GST values. Inserting a blank row leaves totals unchanged; deleting a populated row updates them. Form edits do not alter the JSON defaults or earlier saved records.

The shared implementation is [useDocumentItems.ts](src/components/useDocumentItems.ts) and [DocumentItemActions.tsx](src/components/DocumentItemActions.tsx), used by all four item-editor components. Invoice/proforma callbacks and GST totals are stabilized to avoid repeated parent updates when rendering.

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
  api/                      Save, PDF, earnings, verification
  verifyqrcodefrontend*/    Issuer-specific verification pages
  upi-pay/                  UPI link with optional amount
  upi-payquotation/         UPI link without amount
src/components/             Shared forms, navigation, password gate
src/components/Homepagecardstotalearning/
                            Issuer earnings cards
src/lib/mongodb.ts          Shared MongoDB connection promise
public/                     QR images, SVGs, PDFs, credentials assets
*-quotation-defaults.json   Standard quotation defaults for each issuer
*-quotation-discount-defaults.json
                            Discount quotation defaults for each issuer
AGENTS.md                   Contributor guidelines
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

### Validation of the document-item changes

Local headless-browser checks covered all ten forms. The six invoice, proforma, and GST pages passed insertion, mouse dragging, arrow movement, automatic numbering, preservation of amounts and tax values, deletion totals, and mobile-control checks. The four quotation pages passed default-row and insertion regression checks; earlier quotation checks also covered editing, dragging, and fresh defaults after reload. No bills were saved during these row-control checks.

TypeScript checks, the production build, and whitespace checks passed for the row-control changes. The four JSON files were subsequently checked for 21 sequential products and Curve Ceiling at position 10 with the requested price.

Known verification limitations: `npm run lint` fails in the existing ESLint configuration with a circular-structure error during config validation. The production build still reports a Turbopack file-tracing warning in the Mustak quotation PDF route. There is no persistent automated test suite for these checks, and live deployment, payment completion, and PDF generation were not exercised by the row-control browser checks.

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
- GET `/api/earnings/<issuer>`: `gstTotal` and `invoiceTotal`.
- GET `/api/verifyqrcode`: public document lookup.

## Current limitations and deployment considerations

- The client password gate uses a hardcoded shared password and the `mk3_authenticated` local-storage flag. It does not authenticate API requests. The inspected save, generation, earnings and verification handlers have no server-side authorization checks.
- Verification exposes saved client and document details to callers with matching query parameters. Review the intended public fields before exposing sensitive records.
- Totals are calculated in the browser and submitted to save handlers, which do not independently recompute all amounts. GST rates are fixed implementation values, without selectable rates or an IGST workflow.
- Number allocation and latest-record PDF selection need changes for reliable concurrent use.
- Links reference `/spellings` and `/contact`, but corresponding pages are absent. Root metadata still contains the starter description.
- Everything in `public/`, including `public/credentials/`, is served as static content. Review the intended visibility of those assets.
- PDF routes require Node.js, Chromium, local asset access, and enough memory and execution time to render documents. A static export cannot provide the database or PDF APIs. Chromium launches currently use `--no-sandbox` flags.
- The root layout loads Inter through `next/font/google`; builds may require network access for font retrieval.

Source observations and local validation are documented above; they do not constitute a production security audit or live-deployment verification. See [AGENTS.md](AGENTS.md) for contributor conventions.
