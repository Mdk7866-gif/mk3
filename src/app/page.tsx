// src/app/page.tsx

import Link from 'next/link';
import MushahidTotalEarning from '@/components/Homepagecardstotalearning/MushahidTotalEarning';
import MustakTotalEarning from '@/components/Homepagecardstotalearning/MustakTotalEarning';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="mx-auto flex min-h-[280px] max-w-6xl flex-col items-center justify-center px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-3xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/90">
              MK3 SOLUTIONS
            </p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
              Welcome to MK3
              <span className="block">Solutions</span>
            </h1>
            <p className="mt-4 text-base text-blue-100/90 md:text-lg">
              Your comprehensive platform for managing invoices, quotations,
              and GST — built to simplify your business operations.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/mustak/invoice"
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-blue-600 shadow-md shadow-blue-900/20 transition hover:-translate-y-[1px] hover:bg-slate-50 hover:shadow-lg"
              >
                Get Started
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-white/80 bg-white/0 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/10 transition hover:-translate-y-[1px] hover:bg-white hover:text-indigo-700 hover:shadow-lg"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Clients / Cards Section */}
      <section className="bg-gray-50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">
              Dashboard Overview
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Key Clients
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-sm text-slate-500 sm:text-base">
              Real-time earnings summary for your main clients, combining
              GST and standard invoices in one clean view.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:gap-8 justify-items-center">
             <MustakTotalEarning />
            <MushahidTotalEarning />
          </div>
        </div>
      </section>

    </div>
  );
}
