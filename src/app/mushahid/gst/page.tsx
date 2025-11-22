'use client';

import React, { useState, useCallback } from 'react';
import ClientDetails, { ClientFormData } from '@/components/ClientDetails';
import ItemsDetailsGst, { GstItem, GstInvoiceTotals } from '@/components/ItemsDetailsGst';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

// Define the shape of the GST invoice data (aligned with API)
interface GstInvoiceData {
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
    taxableAmount: number;
    gst: number;
    totalAmount: number;
  }>;
  totalAmountBeforeTax: number;
  cgst: number;
  sgst: number;
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  amountInWords: string;
}

function CreateGstInvoicePage() {
  const [clientData, setClientData] = useState<ClientFormData | null>(null);
  const [gstItems, setGstItems] = useState<GstItem[]>([]);
  const [gstTotals, setGstTotals] = useState<GstInvoiceTotals | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleClientDataChange = useCallback((data: ClientFormData) => {
    setClientData(data);
  }, []);

  const handleGstItemsChange = useCallback((items: GstItem[], totals: GstInvoiceTotals) => {
    setGstItems(prev => {
      // Only update if items have changed to prevent infinite loop
      if (JSON.stringify(prev) !== JSON.stringify(items)) {
        return items;
      }
      return prev;
    });
    setGstTotals(prev => {
      // Only update if totals have changed
      if (JSON.stringify(prev) !== JSON.stringify(totals)) {
        return totals;
      }
      return prev;
    });
  }, []);

  const getGstInvoicePayload = (): GstInvoiceData | null => {
    if (!clientData || !clientData.clientName || !clientData.clientAddress || (!clientData.email && !clientData.mobile) || !gstItems.length || !gstTotals) {
      toast.error('Client Name, Address, at least one of Email or Mobile, and at least one item are required.', { id: 'gstError' });
      return null;
    }

    // Filter out invalid items
    const validItems = gstItems.filter(
      item => item.description.trim() !== '' && item.quantity !== '' && item.rate !== '' && item.taxableAmount > 0
    );
    if (validItems.length === 0) {
      toast.error('Please add at least one valid work item with description, quantity, rate, and taxable amount.', { id: 'gstError' });
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
        taxableAmount: parseFloat(item.taxableAmount.toFixed(2)),
        gst: parseFloat(item.gst.toFixed(2)),
        totalAmount: parseFloat(item.totalAmount.toFixed(2)),
      })),
      totalAmountBeforeTax: parseFloat(gstTotals.totalAmountBeforeTax.toFixed(2)),
      cgst: parseFloat(gstTotals.cgst.toFixed(2)),
      sgst: parseFloat(gstTotals.sgst.toFixed(2)),
      totalTaxAmount: parseFloat(gstTotals.totalTaxAmount.toFixed(2)),
      totalAmountAfterTax: parseFloat(gstTotals.totalAmountAfterTax.toFixed(2)),
      amountInWords: gstTotals.amountInWords,
    };
  };

  const handleGeneratePdfAndSave = async () => {
    const gstInvoicePayload = getGstInvoicePayload();
    if (!gstInvoicePayload) return;

    setIsProcessing(true);
    toast.loading('Saving and generating PDF...', { id: 'gstAction' });

    try {
      // Save to database
      const saveResponse = await fetch('/api/mushahidsavegst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gstInvoicePayload),
      });
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || 'Failed to save GST invoice');
      }
      const saveResult = await saveResponse.json();
      console.log('GST invoice saved:', saveResult);

      // Simulate generating PDF (dummy endpoint)
      console.log('Attempting to generate PDF for GST invoice:', gstInvoicePayload);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('PDF generated (dummy). Data:', gstInvoicePayload);

      toast.success(`GST invoice saved and PDF generated successfully! (ID: ${saveResult.invoiceNumber})`, {
        id: 'gstAction',
      });
    } catch (error: any) {
      console.error('Error processing GST invoice:', error);
      toast.error(`Error: ${error.message || 'Failed to save GST invoice or generate PDF'}`, { id: 'gstAction' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Create GST Bill for Mushahid Khan</h1>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        <ClientDetails onDataChange={handleClientDataChange} />
        <ItemsDetailsGst onItemsChange={handleGstItemsChange} />

        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-4 mt-8">
          <button
            onClick={handleGeneratePdfAndSave}
            disabled={isProcessing || !clientData || !gstItems.length || !gstTotals}
            className={`w-full sm:w-auto px-6 py-3 rounded-md text-lg font-semibold shadow-md transition-colors duration-200
              ${isProcessing || !clientData || !gstItems.length || !gstTotals
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
                Processing....
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
}

export default CreateGstInvoicePage;