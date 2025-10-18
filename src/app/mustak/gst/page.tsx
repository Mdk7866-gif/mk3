'use client';

import React, { useState, useCallback } from 'react';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsGst, { GstItem, GstInvoiceTotals } from '@/components/ItemsDetailsGst';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

// Utility to check shallow equality for arrays and objects
const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

function CreateGstInvoicePage() {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [gstItems, setGstItems] = useState<GstItem[]>([]);
  const [gstTotals, setGstTotals] = useState<GstInvoiceTotals | null>(null);

  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData((prev) => (isEqual(prev, data) ? prev : data));
  }, []);

  const handleGstItemsChange = useCallback((items: GstItem[], totals: GstInvoiceTotals) => {
    setGstItems((prev) => (isEqual(prev, items) ? prev : items));
    setGstTotals((prev) => (isEqual(prev, totals) ? prev : totals));
  }, []);

  const handleGeneratePdfAndSave = async () => {
    if (!clientData || gstItems.length === 0 || !gstTotals) {
      toast.error('Please fill in client details and add at least one item.', { id: 'gstAction' });
      return;
    }

    const gstInvoicePayload = { client: clientData, items: gstItems, totals: gstTotals };
    console.log('Processing GST Invoice:', gstInvoicePayload);
    toast.loading('Saving and generating PDF...', { id: 'gstAction' });

    try {
      // Simulate saving to database (dummy endpoint)
      console.log('Attempting to save GST invoice:', gstInvoicePayload);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const saveResponse = await fetch('/api/gst-invoices', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(gstInvoicePayload),
      // });
      // if (!saveResponse.ok) {
      //   const errorData = await saveResponse.json();
      //   throw new Error(errorData.message || 'Failed to save GST invoice');
      // }
      console.log('GST invoice saved (dummy). Data:', gstInvoicePayload);

      // Simulate generating PDF (dummy endpoint)
      console.log('Attempting to generate PDF for GST invoice:', gstInvoicePayload);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const pdfResponse = await fetch('/api/gst-invoices/generate-pdf', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(gstInvoicePayload),
      // });
      // if (!pdfResponse.ok) {
      //   const errorData = await pdfResponse.json();
      //   throw new Error(errorData.message || 'Failed to generate PDF');
      // }
      // const result = await pdfResponse.json();
      console.log('PDF generated (dummy). Data:', gstInvoicePayload);

      toast.success('GST invoice saved and PDF generated successfully!', { id: 'gstAction' });
    } catch (error: any) {
      console.error('Error processing GST invoice:', error);
      toast.error(`Error: ${error.message || 'Failed to save invoice or generate PDF'}`, { id: 'gstAction' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create GST Invoice for Mustak Khan</h1>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsGst onItemsChange={handleGstItemsChange} />

        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-4 mt-8">
          <button
            onClick={handleGeneratePdfAndSave}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Generate PDF
          </button>
        </div>

        <div className="text-center mt-12">
          <Link href="/mustak" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm py-4 border-t border-gray-200">
        &copy; {new Date().getFullYear()} MK3. All rights reserved.
      </footer>
    </div>
  );
}

export default CreateGstInvoicePage;