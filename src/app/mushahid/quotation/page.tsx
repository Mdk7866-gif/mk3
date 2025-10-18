'use client';

import React, { useState, useCallback } from 'react';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsQuotation, { QuotationItem } from '@/components/ItemsDetailsQuotation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

// Define the shape of the quotation data (aligned with API)
interface QuotationData {
  date: string; // DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  contact: string;
  gstin?: string;
  notes?: string;
  items: Array<{
    no: number;
    description: string;
    hsn?: string;
    quantity: number;
    rate: number;
  }>;
}

const CreateQuotationPage: React.FC = () => {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Memoize handleClientDataChange
  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  // Memoize handleQuotationItemsChange
  const handleQuotationItemsChange = useCallback((items: QuotationItem[]) => {
    setQuotationItems(items);
  }, []);

  // Function to gather and validate quotation data
  const getQuotationPayload = (): QuotationData | null => {
    if (!clientData || !clientData.clientName || !clientData.clientAddress || !clientData.contact) {
      toast.error('Client Name, Address, and Contact are required.', { id: 'quotationError' });
      return null;
    }

    // Filter out invalid items (missing description or invalid quantity/rate)
    const validItems = quotationItems.filter(
      item => item.description.trim() !== '' && item.quantity !== '' && item.rate !== ''
    );
    if (validItems.length === 0) {
      toast.error('Please add at least one valid work item with description, quantity, and rate.', { id: 'quotationError' });
      return null;
    }

    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = clientData.date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    return {
      date: formattedDate,
      clientName: clientData.clientName,
      clientAddress: clientData.clientAddress,
      contact: clientData.contact,
      gstin: clientData.gstin || '',
      notes: clientData.notes || '',
      items: validItems.map(item => ({
        no: item.no,
        description: item.description,
        hsn: item.hsn || '',
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
        rate: typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : item.rate,
      })),
    };
  };

  const handleGeneratePdfAndSave = async () => {
    const quotationPayload = getQuotationPayload();
    if (!quotationPayload) return;

    setIsProcessing(true);
    toast.loading('Saving and generating PDF...', { id: 'quotationAction' });

    try {
      // Save to database
      const saveResponse = await fetch('/api/mushahidsavequotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationPayload),
      });
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save quotation');
      }
      const saveResult = await saveResponse.json();
      console.log('Quotation saved:', saveResult);

      // Simulate generating PDF (dummy endpoint)
      console.log('Attempting to generate PDF for quotation:', quotationPayload);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const pdfResponse = await fetch('/api/mushahid/quotation/generate-pdf', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(quotationPayload),
      // });
      // if (!pdfResponse.ok) {
      //   const errorData = await pdfResponse.json();
      //   throw new Error(errorData.message || 'Failed to generate PDF');
      // }
      // const blob = await pdfResponse.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `quotation_mushahid_${clientData?.clientName.replace(/\s/g, '_') || 'document'}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // a.remove();
      // window.URL.revokeObjectURL(url);
      console.log('PDF generated (dummy). Data:', quotationPayload);

      toast.success(`Quotation saved and PDF generated successfully! (ID: ${saveResult.invoiceNumber})`, {
        id: 'quotationAction',
      });
    } catch (error: any) {
      console.error('Error processing quotation:', error);
      toast.error(`Error: ${error.message || 'Failed to save quotation or generate PDF'}`, { id: 'quotationAction' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create Quotation for Mushahid Khan</h1>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsQuotation onItemsChange={handleQuotationItemsChange} />

        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-4 mt-8">
          <button
            onClick={handleGeneratePdfAndSave}
            disabled={isProcessing || !clientData || quotationItems.length === 0}
            className={`w-full sm:w-auto px-6 py-3 rounded-md text-lg font-semibold shadow-md transition-colors duration-200
              ${isProcessing || !clientData || quotationItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
          >
            {isProcessing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              'Generate PDF'
            )}
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