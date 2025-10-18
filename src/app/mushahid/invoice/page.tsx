// src/app/mushahid/invoice/page.tsx
import React from 'react';
import Link from 'next/link';

export default function MushahidInvoicePage() {
  return (
    <div className="container mx-auto py-12 px-4 min-h-[calc(100vh-250px)]">
      <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">Mushahid Ali - Invoices</h1>
      <p className="text-lg text-gray-700 mb-8 text-center max-w-2xl mx-auto">
        This page displays all invoices associated with Mushahid Ali.
        Here's a dummy list of invoices.
      </p>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recent Invoices</h2>
        <ul className="space-y-4">
          <li className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="text-xl font-medium text-blue-700">Invoice #INV-2023-004</h3>
            <p className="text-gray-600">Client: Data Solutions Inc. | Amount: ₹95,000 | Date: 2023-10-20</p>
            <Link href="#" className="text-blue-500 hover:underline text-sm">View Details</Link>
          </li>
          <li className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="text-xl font-medium text-blue-700">Invoice #INV-2023-005</h3>
            <p className="text-gray-600">Client: Global Logistics | Amount: ₹170,000 | Date: 2023-10-05</p>
            <Link href="#" className="text-blue-500 hover:underline text-sm">View Details</Link>
          </li>
        </ul>
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="text-blue-600 hover:underline text-lg">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}