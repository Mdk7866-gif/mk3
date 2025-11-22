// src/components/Footer.tsx
import Link from 'next/link';
import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-12 bg-slate-900 text-slate-100 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Brand / Info */}
          <div>
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-slate-900 text-sm font-bold">
                MK
              </span>
              <span>MK3 Billing</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Create quotations, invoices, and GST bills for Mustak &amp; Mushahid
              with a clean, consistent format.
              <br />
              <span className="mt-2 block text-slate-500">
                © {new Date().getFullYear()} MK3. All rights reserved.
              </span>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide mb-3 uppercase text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-slate-400 hover:text-green-400 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/mustak"
                  className="text-slate-400 hover:text-green-400 transition-colors"
                >
                  Mustak Billing
                </Link>
              </li>
              <li>
                <Link
                  href="/mushahid"
                  className="text-slate-400 hover:text-green-400 transition-colors"
                >
                  Mushahid Billing
                </Link>
              </li>
              <li>
                <Link
                  href="/spellings"
                  className="text-slate-400 hover:text-green-400 transition-colors"
                >
                  Spellings Helper
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide mb-3 uppercase text-slate-200">
              Support
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              For any changes in format or new features,
              contact your developer (you 😎) or
              write to:
              <br />
              <span className="text-slate-200">
                support@mk3.com
              </span>
            </p>
          </div>

          {/* Dummy Contact */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide mb-3 uppercase text-slate-200">
              Office
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              123 Business Rd, Suite 456
              <br />
              Ahmedabad, Gujarat
              <br />
              Phone: +91 98765 43210
            </p>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs sm:text-sm text-slate-500">
          <p>Built for speed, accuracy, and peace of mind while billing.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
