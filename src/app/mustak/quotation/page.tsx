'use client';

import React, { useState, useCallback } from 'react';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsQuotation, { QuotationItem } from '@/components/ItemsDetailsQuotation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

const CreateMustakQuotationPage: React.FC = () => {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Handle client data
  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  // Handle quotation items
  const handleQuotationItemsChange = useCallback((items: QuotationItem[]) => {
    setQuotationItems(items);
  }, []);

  // Handle save & PDF generation
  const handleGeneratePdfAndSave = async () => {
    if (!clientData || quotationItems.length === 0) {
      toast.error('Please fill in client details and add at least one item.', { id: 'mustakQuotation' });
      return;
    }

    // Convert date from yyyy-mm-dd → dd/mm/yyyy
    const [year, month, day] = clientData.date?.split('-') || ['', '', ''];
    const formattedDate = `${day}/${month}/${year}`;

    const quotationPayload = {
      date: formattedDate,
      clientName: clientData.clientName || '',
      clientAddress: clientData.clientAddress || '',
      contact: clientData.contact || '',
      gstin: clientData.gstin || '',
      notes: clientData.notes || '',
      items: quotationItems.map((item) => ({
        no: item.no,
        description: item.description,
        hsn: item.hsn || '',
        quantity: item.quantity === '' ? 0 : Number(item.quantity),
        rate: item.rate === '' ? 0 : Number(item.rate),
      })),
    };

    console.log('📤 Sending quotation payload:', quotationPayload);
    toast.loading('Saving and generating PDF...', { id: 'mustakQuotation' });
    setIsProcessing(true);

    try {
      const saveResponse = await fetch('/api/mustaksavequotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationPayload),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save quotation');
      }

      const result = await saveResponse.json();
      console.log('✅ Quotation saved successfully:', result);

      // Simulate PDF generation (replace with actual endpoint later)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('📄 PDF generated (dummy).');

      toast.success('Quotation saved and PDF generated successfully!', { id: 'mustakQuotation' });
    } catch (error: any) {
      console.error('❌ Error while saving quotation:', error);
      toast.error(`Error: ${error.message || 'Failed to save quotation'}`, { id: 'mustakQuotation' });
    } finally {
      setIsProcessing(false);
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
            disabled={isProcessing || !clientData || quotationItems.length === 0}
            className={`w-full sm:w-auto px-6 py-3 rounded-md text-lg font-semibold shadow-md transition-colors duration-200
              ${
                isProcessing || !clientData || quotationItems.length === 0
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

export default CreateMustakQuotationPage;
