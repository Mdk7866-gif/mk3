# Repository Guidelines

## Project Structure & Module Organization

MK3 Solutions is a Next.js App Router application for Mustak and Mushahid business documents. Pages and API handlers live in `src/app/`; issuer forms are under `mustak/` and `mushahid/`, and save/PDF endpoints under `api/`. Shared forms and navigation live in `src/components/`, with earnings cards in `Homepagecardstotalearning/`. Use `src/lib/mongodb.ts` for database connections. Static QR images, SVGs, and reference documents live in `public/`.

## Build, Test, and Development Commands

Use Node.js 20.9+ and npm:

- `npm ci`: install locked dependencies.
- `npm run dev`: start development with Turbopack.
- `npm run build`: create the production build.
- `npm run start`: serve an existing production build.
- `npm run lint`: run configured ESLint rules.
- `npx tsc --noEmit`: check TypeScript.

Configure `.env.local` before database-dependent work; see `README.md`.

## Coding Style & Naming Conventions

Use TypeScript, functional React components, and explicit API payload types. Prefer two-space indentation, matching surrounding formatting in existing files. Components use PascalCase (`ClientDetails.tsx`); App Router entrypoints use `page.tsx`, `layout.tsx`, and `route.ts`. Import shared modules through `@/*`, which maps to `src/*`. Keep Tailwind classes consistent with neighboring UI. ESLint declares Next.js Core Web Vitals and TypeScript rules; no separate formatter is configured.

## Testing Guidelines

There is no test script, framework, coverage threshold, or established test naming convention. Run lint, type checking, and a production build as applicable. Use a development database to check both issuers' forms, validation, totals, PDF layouts, QR verification, quotation prefill, and payment links. Document reproducible checks in the PR. Include long descriptions and multiple items when checking PDFs.

## Commit & Pull Request Guidelines

History uses informal messages and descriptive fixes such as `Fix ReferenceError in mustak proforma invoice PDF route`; no strict prefix convention is established. Prefer concise, imperative messages identifying the workflow. PRs should explain the change, link relevant issues, report validation and known failures, and include screenshots or sample PDFs for visual changes.

## Configuration & Document Integrity

Never commit credentials or `.env.local`. Preserve the existing `WEBSITE_DEPLOYEMENT` spelling. Check field changes across forms, save APIs, PDF templates, and verification views for both issuers. Proforma records share invoice collections; most PDF endpoints select the latest record. The client password gate does not secure APIs. Files in `public/credentials/` are directly accessible.
