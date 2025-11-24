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
    <nav className="bg-gray-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold flex items-center space-x-2">
          <span>🚀</span>
          <span>MK3</span>
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Desktop Menu */}
        <ul className="hidden md:flex space-x-8 text-lg items-center">
          {/* Home link (no dropdown) */}
          <li>
            <Link
              href="/"
              className="hover:text-gray-300 px-2 py-1 text-lg font-medium"
            >
              Home
            </Link>
          </li>

          {navItems.map((item) => (
            <li key={item.name} className="relative group">
              <button className="flex items-center gap-1 hover:text-gray-300">
                {item.name} <ChevronDown size={16} />
              </button>
              <div className="absolute left-0 mt-2 w-44 bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-150">
                {item.dropdown.map((d) => (
                  <Link
                    key={d.label}
                    href={d.href}
                    className="block px-4 py-2 text-sm hover:bg-gray-700 rounded-md"
                  >
                    {d.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}

          {/* Spellings link (no dropdown) */}
          <li>
            <Link
              href="/spellings"
              className="hover:text-gray-300 px-2 py-1 text-lg font-medium"
            >
              Spellings
            </Link>
          </li>
        </ul>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700 animate-slideDown">
          {/* Home link for mobile */}
          <div className="border-b border-gray-700">
            <Link
              href="/"
              className="block px-4 py-3 text-lg font-medium hover:bg-gray-700"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
          </div>

          {navItems.map((item) => (
            <div key={item.name} className="border-b border-gray-700">
              <button
                onClick={() =>
                  setActiveDropdown(activeDropdown === item.name ? null : item.name)
                }
                className="w-full flex justify-between items-center px-4 py-3 text-left text-lg font-medium"
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
                <div className="bg-gray-700">
                  {item.dropdown.map((d) => (
                    <Link
                      key={d.label}
                      href={d.href}
                      className="block px-6 py-2 text-gray-200 hover:bg-gray-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {d.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Spellings link for mobile */}
          <div className="border-b border-gray-700">
            <Link
              href="/spellings"
              className="block px-4 py-3 text-lg font-medium hover:bg-gray-700"
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
