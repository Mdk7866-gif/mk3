'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsInvoice, { WorkItem } from '@/components/ItemsDetailsInvoice';

// Define the shape of the full invoice data
interface InvoiceData {
  client: ClientFormData;
  items: WorkItem[];
  totalAmount: number;
}

export default function MustakInvoicePage() {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<WorkItem[]>([]);
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Callback to receive client data from ClientDetails component
  const handleClientDataChange = (data: ClientFormData) => {
    setClientData(data);
  };

  // Callback to receive items and total from ItemsDetailsInvoice component
  const handleItemsAndTotalChange = (items: WorkItem[], totalAmount: number) => {
    setInvoiceItems(items);
    setTotalInvoiceAmount(totalAmount);
  };

  // Function to gather all invoice data with validation
  const getFullInvoiceData = (): InvoiceData | null => {
    if (!clientData || !clientData.clientName || !clientData.clientAddress) {
      setMessage('Error: Client Name and Address are required.');
      setTimeout(() => setMessage(null), 3000);
      return null;
    }
    // Filter out items with no description or invalid amounts before sending
    const validItems = invoiceItems.filter(item => item.description.trim() !== '' && item.amount > 0);

    if (validItems.length === 0) {
        setMessage('Error: Please add at least one valid work item with description and amount.');
        setTimeout(() => setMessage(null), 5000);
        return null;
    }

    return {
      client: clientData,
      items: validItems,
      totalAmount: totalInvoiceAmount,
    };
  };

  // Combined function to save invoice and generate PDF
  const handleGeneratePdfAndSave = async () => {
    setMessage(null); // Clear previous messages
    const fullInvoiceData = getFullInvoiceData();
    if (!fullInvoiceData) return; // Validation failed inside getFullInvoiceData

    setIsProcessing(true);

    try {
      // Simulate saving to database (dummy endpoint)
      console.log('Attempting to save invoice data:', fullInvoiceData);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const saveResponse = await fetch('/api/mustak/invoice/save', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(fullInvoiceData),
      // });
      // if (!saveResponse.ok) {
      //   const errorData = await saveResponse.json();
      //   throw new Error(errorData.message || 'Failed to save invoice');
      // }
      console.log('Invoice saved (dummy). Data:', fullInvoiceData);

      // Simulate generating PDF (dummy endpoint)
      console.log('Attempting to generate PDF for invoice data:', fullInvoiceData);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate network delay
      // --- Replace with actual fetch to your Next.js API route ---
      // const pdfResponse = await fetch('/api/mustak/invoice/generate-pdf', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(fullInvoiceData),
      // });
      // if (!pdfResponse.ok) {
      //   const errorData = await pdfResponse.json();
      //   throw new Error(errorData.message || 'Failed to generate PDF');
      // }
      // const blob = await pdfResponse.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `invoice_mustak_${clientData?.clientName.replace(/\s/g, '_') || 'document'}.pdf`;
      // document.body.appendChild(a);
      // a.click();
      // a.remove();
      // window.URL.revokeObjectURL(url);
      console.log('PDF generated (dummy). Data:', fullInvoiceData);

      setMessage('Invoice saved and PDF generated successfully! (Dummy ID: #INV-007)');
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'Failed to save invoice or generate PDF'}`);
      console.error('Error (dummy):', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create Invoice for Mustak Khan</h1>
      </header>

      <div className="max-w-4xl mx-auto space-y-8 lg:space-y-12">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsInvoice onItemsChange={handleItemsAndTotalChange} />

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={handleGeneratePdfAndSave}
            disabled={isProcessing || !clientData || invoiceItems.length === 0}
            className={`flex items-center justify-center px-8 py-3 rounded-md text-lg font-semibold shadow-md transition-colors duration-200 w-full sm:w-auto
              ${isProcessing || !clientData || invoiceItems.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
              }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Generate PDF'
            )}
          </button>
        </div>

        {/* Message for save/PDF generation */}
        {message && (
          <div className={`mt-4 p-4 rounded-md text-center text-lg ${message.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            <p>{message}</p>
          </div>
        )}
      </div>
      <div className="text-center mt-12">
        <Link href="/" className="text-blue-600 hover:underline text-lg">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}