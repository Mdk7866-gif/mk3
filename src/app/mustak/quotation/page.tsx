'use client';

import React, { useState, useCallback } from 'react';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsQuotation, { QuotationItem } from '@/components/ItemsDetailsQuotation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

const CreateQuotationPage: React.FC = () => {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);

  // Memoize handleClientDataChange
  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  // Memoize handleQuotationItemsChange
  const handleQuotationItemsChange = useCallback((items: QuotationItem[]) => {
    setQuotationItems(items);
  }, []);

  const handleGeneratePdfAndSave = async () => {
    if (!clientData || quotationItems.length === 0) {
      toast.error('Please fill in client details and add at least one item.', { id: 'quotationAction' });
      return;
    }

    const quotationPayload = {
      client: clientData,
      items: quotationItems,
    };

    console.log('Processing Quotation:', quotationPayload);
    toast.loading('Saving and generating PDF...', { id: 'quotationAction' });

    try {
      // Simulate saving to database (dummy endpoint)
      console.log('Attempting to save quotation:', quotationPayload);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const saveResponse = await fetch('/api/quotations', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(quotationPayload),
      // });
      // if (!saveResponse.ok) {
      //   const errorData = await saveResponse.json();
      //   throw new Error(errorData.message || 'Failed to save quotation');
      // }
      console.log('Quotation saved (dummy). Data:', quotationPayload);

      // Simulate generating PDF (dummy endpoint)
      console.log('Attempting to generate PDF for quotation:', quotationPayload);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const pdfResponse = await fetch('/api/quotations/generate-pdf', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(quotationPayload),
      // });
      // if (!pdfResponse.ok) {
      //   const errorData = await pdfResponse.json();
      //   throw new Error(errorData.message || 'Failed to generate PDF');
      // }
      // const result = await pdfResponse.json();
      console.log('PDF generated (dummy). Data:', quotationPayload);

      toast.success('Quotation saved and PDF generated successfully!', { id: 'quotationAction' });
    } catch (error: any) {
      console.error('Error processing quotation:', error);
      toast.error(`Error: ${error.message || 'Failed to save quotation or generate PDF'}`, { id: 'quotationAction' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create Quotation for Mustak Khan</h1>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsQuotation onItemsChange={handleQuotationItemsChange} />

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
};

export default CreateQuotationPage;