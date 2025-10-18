// src/app/mushahid/gst/page.tsx
import React from 'react';
import Link from 'next/link';

export default function MushahidGstPage() {
  return (
    <div className="container mx-auto py-12 px-4 min-h-[calc(100vh-250px)]">
      <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">Mushahid Ali - GST Details</h1>
      <p className="text-lg text-gray-700 mb-8 text-center max-w-2xl mx-auto">
        This page provides an overview of GST filings and related documents for Mushahid Ali.
        Here's dummy GST information.
      </p>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">GST Filings</h2>
        <ul className="space-y-4">
          <li className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="text-xl font-medium text-orange-700">Q3 2023 GST Return</h3>
            <p className="text-gray-600">Period: July-Sept 2023 | Status: Filed | Date: 2023-10-18</p>
            <Link href="#" className="text-orange-500 hover:underline text-sm">Download Report</Link>
          </li>
          <li className="border-b border-gray-200 pb-4 last:border-b-0">
            <h3 className="text-xl font-medium text-orange-700">Q2 2023 GST Return</h3>
            <p className="text-gray-600">Period: April-June 2023 | Status: Filed | Date: 2023-07-15</p>
            <Link href="#" className="text-orange-500 hover:underline text-sm">Download Report</Link>
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