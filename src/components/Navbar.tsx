// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navItems = [
    {
      name: 'Mustak',
      dropdown: [
        { label: 'Invoice', href: '/mustak/invoice' },
        { label: 'GST', href: '/mustak/gst' },
        { label: 'Quotation', href: '/mustak/quotation' },
      ],
    },
    {
      name: 'Mushahid',
      dropdown: [
        { label: 'Invoice', href: '/mushahid/invoice' },
        { label: 'GST', href: '/mushahid/gst' },
        { label: 'Quotation', href: '/mushahid/quotation' },
      ],
    },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-green-50 border-b border-green-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white text-sm font-semibold shadow-sm">
            MK
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-gray-900 tracking-tight">
              MK3 Billing
            </span>
            <span className="text-xs text-gray-600 hidden sm:inline">
              Invoices · GST · Quotations
            </span>
          </div>
        </Link>

        {/* Hamburger (mobile) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden inline-flex items-center justify-center rounded-md border border-green-200 bg-white/90 p-2 text-gray-700 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {isMobileMenuOpen ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7h16M4 12h16M4 17h16"
              />
            </svg>
          )}
        </button>

        {/* Desktop Menu */}
        <ul className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-800">
          {navItems.map((item) => (
            <li key={item.name} className="relative group">
              <button className="flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-green-100 hover:text-green-800 transition-colors">
                <span>{item.name}</span>
                <ChevronDown size={14} className="mt-0.5" />
              </button>

              {/* Dropdown */}
              <div className="pointer-events-none absolute left-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition duration-150 origin-top">
                {item.dropdown.map((d) => (
                  <Link
                    key={d.label}
                    href={d.href}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md"
                  >
                    {d.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}

          {/* Spellings link */}
          <li>
            <Link
              href="/spellings"
              className="rounded-full px-3 py-1.5 text-sm hover:bg-green-100 hover:text-green-800 transition-colors"
            >
              Spellings
            </Link>
          </li>
        </ul>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-green-100 bg-green-50 shadow-inner">
          {navItems.map((item) => (
            <div key={item.name} className="border-b border-green-100">
              <button
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === item.name ? null : item.name,
                  )
                }
                className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-semibold text-gray-800"
              >
                {item.name}
                <ChevronDown
                  size={18}
                  className={`transition-transform ${
                    activeDropdown === item.name ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {activeDropdown === item.name && (
                <div className="bg-white">
                  {item.dropdown.map((d) => (
                    <Link
                      key={d.label}
                      href={d.href}
                      className="block px-6 py-2 text-sm text-gray-700 hover:bg-green-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {d.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="border-b border-green-100">
            <Link
              href="/spellings"
              className="block px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-green-100"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Spellings
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
