// src/app/mustak/quotation/page.tsx
import React from 'react';
import Link from 'next/link';

export default function MustakQuotationPage() {
  return (
    <div className="container mx-auto py-12 px-4 min-h-[calc(100vh-250px)]">
      <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">Mustak Khan - Quotations</h1>
      <p className="text-lg text-gray-700 mb-8 text-center max-w-2xl mx-auto">
        This page lists all quotations generated for Mustak Khan's clients.
        Here's a dummy list of quotations.
      </p>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Pending Quotations</h2>
        <ul className="space-y-4">
          <li className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="text-xl font-medium text-purple-700">Quotation #Q-2023-005</h3>
            <p className="text-gray-600">Client: Green Energy Solutions | Amount: ₹300,000 | Status: Pending Approval</p>
            <Link href="#" className="text-purple-500 hover:underline text-sm">Review Quotation</Link>
          </li>
          <li className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="text-xl font-medium text-purple-700">Quotation #Q-2023-006</h3>
            <p className="text-gray-600">Client: Tech Innovators | Amount: ₹180,000 | Status: Sent</p>
            <Link href="#" className="text-purple-500 hover:underline text-sm">Review Quotation</Link>
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