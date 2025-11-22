// src/components/Footer.tsx
import Link from 'next/link';
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-xl font-bold mb-4">MK3</h3>
            <p className="text-gray-400 text-sm">
              Your trusted partner for efficient business solutions.
              <br />
              © {new Date().getFullYear()} MK3. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media (Dummy) */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Connect With Us</h4>
            <div className="flex space-x-4">
              <a href="https://facebook.com/mk3" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                {/* Dummy Facebook Icon */}
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h3V2h-3c-3.18 0-4 2.15-4 4v3.5H9v4h5V22h4v-8.5h3.5l1-4H18V10h-4v3.5z"/>
                </svg>
              </a>
              <a href="https://twitter.com/mk3" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                {/* Dummy Twitter Icon */}
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.84.37-1.75.62-2.69.73.96-.58 1.7-1.5 2.04-2.58-.9.54-1.9.94-2.96 1.18-.85-.91-2.06-1.48-3.39-1.48-2.58 0-4.68 2.1-4.68 4.68 0 .37.04.73.11 1.07-3.89-.19-7.33-2.06-9.64-4.88-.4.69-.63 1.49-.63 2.34 0 1.62.82 3.05 2.06 3.89-.76-.02-1.48-.23-2.11-.58v.06c0 2.27 1.62 4.16 3.76 4.6-.39.11-.8.17-1.22.17-.3 0-.58-.03-.86-.08.6 1.87 2.34 3.23 4.4 3.27-1.6 1.25-3.62 2-5.83 2-.38 0-.75-.02-1.12-.07C4.07 19.34 6.7 20 9.4 20c10.08 0 15.6-8.35 15.6-15.6V4.46c-.02-.12-.04-.24-.06-.36.6-.44 1.12-.96 1.54-1.56z"/>
                </svg>
              </a>
              {/* Add more social icons as needed */}
            </div>
          </div>

          {/* Contact Info (Dummy) */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <p className="text-gray-400 text-sm">
              123 Business Rd, Suite 456
              <br />
              City, State, ZIP 78901
              <br />
              Email: info@mk3.com
              <br />
              Phone: (123) 456-7890
            </p>
          </div>
        </div>

        {/* Bottom copyright line - visible on all screens, centered */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>
            Powered by the desire to innovate.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;