'use client';

import React, { useState, useCallback } from 'react';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsGst, { GstItem, GstInvoiceTotals } from '@/components/ItemsDetailsGst';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

function CreateGstInvoicePage() {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [gstItems, setGstItems] = useState<GstItem[]>([]);
  const [gstTotals, setGstTotals] = useState<GstInvoiceTotals | null>(null);

  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  const handleGstItemsChange = useCallback((items: GstItem[], totals: GstInvoiceTotals) => {
    setGstItems(items);
    setGstTotals(totals);
  }, []);

  const handleSaveGstInvoice = async () => {
    if (!clientData || gstItems.length === 0 || !gstTotals) {
      toast.error('Please fill in client details and add at least one item.', { id: 'saveGst' });
      return;
    }

    const gstInvoicePayload = { client: clientData, items: gstItems, totals: gstTotals };
    console.log('Saving GST Invoice:', gstInvoicePayload);
    toast.loading('Saving GST invoice...', { id: 'saveGst' });

    try {
      const response = await fetch('/api/gst-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gstInvoicePayload),
      });

      if (response.ok) {
        toast.success('GST invoice saved successfully!', { id: 'saveGst' });
        const result = await response.json();
        console.log('API Response:', result);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to save GST invoice: ${errorData.message || response.statusText}`, { id: 'saveGst' });
      }
    } catch (error) {
      console.error('Error saving GST invoice:', error);
      toast.error('An unexpected error occurred.', { id: 'saveGst' });
    }
  };

  const handleGeneratePDF = async () => {
    if (!clientData || gstItems.length === 0 || !gstTotals) {
      toast.error('Please fill in client details and add at least one item to generate PDF.', { id: 'generateGstPdf' });
      return;
    }

    const gstInvoicePayload = { client: clientData, items: gstItems, totals: gstTotals };
    console.log('Generating PDF for GST Invoice:', gstInvoicePayload);
    toast.loading('Generating PDF...', { id: 'generateGstPdf' });

    try {
      const response = await fetch('/api/gst-invoices/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gstInvoicePayload),
      });

      if (response.ok) {
        toast.success('PDF generated successfully!', { id: 'generateGstPdf' });
        const result = await response.json();
        console.log('PDF Generation Response:', result);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to generate PDF: ${errorData.message || response.statusText}`, { id: 'generateGstPdf' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('An unexpected error occurred during PDF generation.', { id: 'generateGstPdf' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create GST Invoice for Mustak Khan</h1>
        <div className="flex space-x-4">
          <span className="text-blue-600 font-medium cursor-pointer">Mustak ▼</span>
          <span className="text-blue-600 font-medium cursor-pointer">Mushahid ▼</span>
          <span className="text-blue-600 font-medium cursor-pointer">Spellings ▼</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsGst onItemsChange={handleGstItemsChange} />

        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-4 mt-8">
          <button
            onClick={handleSaveGstInvoice}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save GST Invoice
          </button>
          <button
            onClick={handleGeneratePDF}
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
