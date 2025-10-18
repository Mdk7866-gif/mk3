// src/app/mushahid/quotation/page.tsx
'use client';

import React, { useState, useCallback } from 'react'; // Import useCallback
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
  
  const handleSaveQuotation = async () => {
    if (!clientData || quotationItems.length === 0) {
      toast.error('Please fill in client details and add at least one item.');
      return;
    }

    const quotationPayload = {
      client: clientData,
      items: quotationItems,
      // You can add other fields like createdBy, status, etc. here
    };

    console.log('Saving Quotation:', quotationPayload);
    toast.loading('Saving quotation...', { id: 'saveQuote' });

    // Dummy API call
    try {
      const response = await fetch('/api/quotations', { // This will be your dummy endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationPayload),
      });

      if (response.ok) {
        toast.success('Quotation saved successfully!', { id: 'saveQuote' });
        const result = await response.json();
        console.log('API Response:', result);
        // Here you might navigate or clear the form
      } else {
        const errorData = await response.json();
        toast.error(`Failed to save quotation: ${errorData.message || response.statusText}`, { id: 'saveQuote' });
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('An unexpected error occurred.', { id: 'saveQuote' });
    }
  };

  const handleGeneratePDF = async () => {
    if (!clientData || quotationItems.length === 0) {
      toast.error('Please fill in client details and add at least one item to generate PDF.');
      return;
    }

    const quotationPayload = {
      client: clientData,
      items: quotationItems,
    };

    console.log('Generating PDF for Quotation:', quotationPayload);
    toast.loading('Generating PDF...', { id: 'generatePdf' });

    // Dummy API call for PDF generation
    try {
      const response = await fetch('/api/quotations/generate-pdf', { // Another dummy endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotationPayload),
      });

      if (response.ok) {
        toast.success('PDF generated successfully!', { id: 'generatePdf' });
        // In a real scenario, the response might be a blob or a URL to the PDF
        const result = await response.json(); // Assuming JSON response for dummy
        console.log('PDF Generation Response:', result);
        // Trigger download or open PDF in new tab
      } else {
        const errorData = await response.json();
        toast.error(`Failed to generate PDF: ${errorData.message || response.statusText}`, { id: 'generatePdf' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('An unexpected error occurred during PDF generation.', { id: 'generatePdf' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster /> {/* Toast notifications */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create Quotation for Mushahid Khan</h1>
    
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsQuotation onItemsChange={handleQuotationItemsChange} />

        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-4 mt-8">
          <button
            onClick={handleSaveQuotation}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save Quotation
          </button>
          <button
            onClick={handleGeneratePDF}
            className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Generate PDF
          </button>
        </div>

        <div className="text-center mt-12">
          <Link href="/mushahid" className="text-blue-600 hover:underline">
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