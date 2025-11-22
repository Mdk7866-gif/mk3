// src/app/mushahid/invoice/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsInvoice, { WorkItem } from '@/components/ItemsDetailsInvoice';

// Utility function to convert numbers to words (copied from ItemsDetailsInvoice.tsx)
const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'lakh ' + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + 'crore ' + convert(n % 10000000);
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  let words = convert(wholePart).trim();
  if (words === '') words = 'Zero';
  if (decimalPart > 0) {
    words += ' and ' + convert(decimalPart).trim() + ' paise';
  }
  return words.charAt(0).toUpperCase() + words.slice(1) + ' only.';
};

// Define the shape of the full invoice data (aligned with API)
interface InvoiceData {
  date: string; // DD/MM/YYYY
  clientName: string;
  clientAddress: string;
  email?: string;
  mobile?: string;
  gstin?: string;
  notes?: string;
  items: Array<{
    no: number;
    description: string;
    hsn?: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  totalAmount: number;
  amountInWords: string;
}

export default function MushahidInvoicePage() {
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
    if (!clientData || !clientData.clientName || !clientData.clientAddress || (!clientData.email && !clientData.mobile)) {
      toast.error('Client Name, Address, and at least one of Email or Mobile are required.', { id: 'invoiceError' });
      return null;
    }
    // Filter out items with no description or invalid amounts
    const validItems = invoiceItems.filter(item => item.description.trim() !== '' && item.amount > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid work item with description and amount.', { id: 'invoiceError' });
      return null;
    }

    // Convert date from YYYY-MM-DD to DD/MM/YYYY
    const dateParts = clientData.date.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    return {
      date: formattedDate,
      clientName: clientData.clientName,
      clientAddress: clientData.clientAddress,
      email: clientData.email || '',
      mobile: clientData.mobile || '',
      gstin: clientData.gstin || '',
      notes: clientData.notes || '',
      items: validItems.map(item => ({
        no: item.no,
        description: item.description,
        hsn: item.hsn || '',
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
        rate: typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : item.rate,
        amount: item.amount,
      })),
      totalAmount: totalInvoiceAmount,
      amountInWords: numberToWords(totalInvoiceAmount),
    };
  };

  // Combined function to save invoice and generate PDF
  const handleGeneratePdfAndSave = async () => {
    setMessage(null); // Clear previous messages
    const fullInvoiceData = getFullInvoiceData();
    if (!fullInvoiceData) return;

    setIsProcessing(true);
    toast.loading('Saving and generating PDF...', { id: 'invoiceAction' });

    try {
      // Save to database
      const saveResponse = await fetch('/api/mushahidsaveinvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullInvoiceData),
      });
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save invoice');
      }
      const saveResult = await saveResponse.json();
      console.log('Invoice saved:', saveResult);

      const generateResponse = await fetch('/api/mushahidgenerateinvoicepdff', { method: 'GET' });
      if (!generateResponse.ok) {
        let message = 'Failed to generate PDF';
        try {
          const err = await generateResponse.json();
          message = err.message || message;
        } catch {}
        throw new Error(message);
      }
      const pdfBlob = await generateResponse.blob();
      const fileName = `invoice-${saveResult.invoiceNumber}.pdf`;
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Invoice saved and PDF generated successfully! (ID: ${saveResult.invoiceNumber})`, {
        id: 'invoiceAction',
      });
      setMessage(`Invoice saved and PDF generated successfully! (ID: ${saveResult.invoiceNumber})`);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to save invoice or generate PDF';
      toast.error(`Error: ${messageText}`, { id: 'invoiceAction' });
      setMessage(`Error: ${messageText}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create Invoice for Mushahid Khan</h1>
      </header>

      <div className="max-w-4xl mx-auto space-y-8 lg:space-y-12">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsInvoice onItemsChange={handleItemsAndTotalChange} />

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
          <button
            type="button"
            onClick={handleGeneratePdfAndSave}
            disabled={isProcessing || !clientData || !clientData.clientName || !clientData.clientAddress || (!clientData.email && !clientData.mobile) || invoiceItems.length === 0}
            className={`flex items-center justify-center px-8 py-3 rounded-md text-lg font-semibold shadow-md transition-colors duration-200 w-full sm:w-auto
              ${isProcessing || !clientData || !clientData.clientName || !clientData.clientAddress || (!clientData.email && !clientData.mobile) || invoiceItems.length === 0
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

        {/* Message for save/PDF generation */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-md text-center text-lg ${
              message.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            <p>{message}</p>
          </div>
        )}
      </div>
      <div className="text-center mt-12">
        <Link href="/mushahid" className="text-blue-600 hover:underline text-lg">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}