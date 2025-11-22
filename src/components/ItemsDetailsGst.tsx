'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Utility function to convert numbers to words
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

// Constants for GST rates
const GST_RATE_PERCENTAGE = 18; // 18%
const SGST_RATE_PERCENTAGE = GST_RATE_PERCENTAGE / 2; // 9%
const CGST_RATE_PERCENTAGE = GST_RATE_PERCENTAGE / 2; // 9%

// Define the structure for a single work item
export interface GstItem {
  id: string; // Unique ID for React list keys
  no: number; // Row number, auto-incremented
  description: string;
  hsn?: string; // Optional
  quantity: number | ''; // Allow empty string for input
  rate: number | ''; // Allow empty string for input
  taxableAmount: number; // QTY * Rate
  gst: number; // 18% of taxableAmount
  totalAmount: number; // Taxable Amount + GST Amount
}

// Define the props for the ItemsDetailsGst component
interface ItemsDetailsGstProps {
  onItemsChange?: (items: GstItem[], totals: GstInvoiceTotals) => void;
  initialItems?: GstItem[];
}

// Define the totals interface (aligned with API)
export interface GstInvoiceTotals {
  totalAmountBeforeTax: number;
  cgst: number; // 9%
  sgst: number; // 9%
  totalTaxAmount: number;
  totalAmountAfterTax: number;
  amountInWords: string;
}

const ItemsDetailsGst: React.FC<ItemsDetailsGstProps> = ({ onItemsChange, initialItems }) => {
  const [items, setItems] = useState<GstItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems
      : [
          {
            id: crypto.randomUUID(),
            no: 1,
            description: '',
            hsn: '',
            quantity: '',
            rate: '',
            taxableAmount: 0,
            gst: 0,
            totalAmount: 0,
          },
        ]
  );

  const calculateAllTotals = useCallback((): GstInvoiceTotals => {
    let totalAmountBeforeTax = 0;
    items.forEach(item => {
      totalAmountBeforeTax += item.taxableAmount;
    });

    const cgst = parseFloat((totalAmountBeforeTax * (CGST_RATE_PERCENTAGE / 100)).toFixed(2));
    const sgst = parseFloat((totalAmountBeforeTax * (SGST_RATE_PERCENTAGE / 100)).toFixed(2));
    const totalTaxAmount = parseFloat((cgst + sgst).toFixed(2));
    const totalAmountAfterTax = parseFloat((totalAmountBeforeTax + totalTaxAmount).toFixed(2));
    const amountInWords = numberToWords(totalAmountAfterTax);

    return {
      totalAmountBeforeTax,
      cgst,
      sgst,
      totalTaxAmount,
      totalAmountAfterTax,
      amountInWords,
    };
  }, [items]);

  const totals = calculateAllTotals();

  // Memoize formattedItems to prevent unnecessary re-renders
  const formattedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      hsn: item.hsn || '',
      quantity: item.quantity === '' ? 0 : typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
      rate: item.rate === '' ? 0 : typeof item.rate === 'string' ? parseFloat(item.rate) || 0 : item.rate,
      taxableAmount: parseFloat(item.taxableAmount.toFixed(2)),
      gst: parseFloat(item.gst.toFixed(2)),
      totalAmount: parseFloat(item.totalAmount.toFixed(2)),
    }));
  }, [items]);

  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(formattedItems, totals);
    }
  }, [formattedItems, totals, onItemsChange]);

  const handleItemChange = useCallback(
    (id: string, field: keyof GstItem, value: string | number) => {
      setItems((prevItems) => {
        return prevItems.map((item) => {
          if (item.id === id) {
            const updatedItem = { ...item, [field]: value };

            const qty = field === 'quantity'
              ? (typeof value === 'string' ? parseFloat(value) || 0 : value || 0) as number
              : (typeof updatedItem.quantity === 'number' ? updatedItem.quantity : parseFloat(String(updatedItem.quantity)) || 0);

            const rate = field === 'rate'
              ? (typeof value === 'string' ? parseFloat(value) || 0 : value || 0) as number
              : (typeof updatedItem.rate === 'number' ? updatedItem.rate : parseFloat(String(updatedItem.rate)) || 0);

            // Calculate Taxable Amount
            updatedItem.taxableAmount = parseFloat((qty * rate).toFixed(2));

            // Calculate GST Amount (18% of taxableAmount)
            updatedItem.gst = parseFloat((updatedItem.taxableAmount * (GST_RATE_PERCENTAGE / 100)).toFixed(2));

            // Calculate Total Amount (Taxable Amount + GST Amount)
            updatedItem.totalAmount = parseFloat((updatedItem.taxableAmount + updatedItem.gst).toFixed(2));

            // Preserve empty strings for input fields
            if (field === 'quantity' && value === '') updatedItem.quantity = '';
            if (field === 'rate' && value === '') updatedItem.rate = '';

            return updatedItem;
          }
          return item;
        });
      });
    },
    []
  );

  const handleAddItem = useCallback(() => {
    setItems((prevItems) => {
      const newNo = prevItems.length > 0 ? Math.max(...prevItems.map(item => item.no)) + 1 : 1;
      return [
        ...prevItems,
        {
          id: crypto.randomUUID(),
          no: newNo,
          description: '',
          hsn: '',
          quantity: '',
          rate: '',
          taxableAmount: 0,
          gst: 0,
          totalAmount: 0,
        },
      ];
    });
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prevItems) => {
      const updatedItems = prevItems.filter((item) => item.id !== id);
      return updatedItems.map((item, index) => ({ ...item, no: index + 1 }));
    });
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">GST Work Items</h2>

      {/* Desktop Table Layout */}
      <div className="overflow-x-auto">
        <div className="hidden md:block min-w-max">
          <div className="grid grid-cols-[40px_minmax(180px,2.5fr)_80px_60px_80px_100px_100px_120px_40px] gap-2 text-gray-600 font-semibold border-b pb-3 mb-3 sticky top-0 bg-white z-10 text-xs md:text-sm">
            <div className="text-left">No.</div>
            <div className="text-left">Description</div>
            <div className="text-left">HSN</div>
            <div className="text-right">QTY.</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Taxable Amt.</div>
            <div className="text-right">GST ({GST_RATE_PERCENTAGE}%)</div>
            <div className="text-right">Total Amt.</div>
            <div className="w-8"></div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[40px_minmax(180px,2.5fr)_80px_60px_80px_100px_100px_120px_40px] gap-2 items-center mb-4 pb-4 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0 text-xs md:text-sm"
            >
              <div className="text-gray-700 text-left self-start pt-2">{item.no}</div>
              <div>
                <textarea
                  name="description"
                  placeholder="Item Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs resize-y"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="hsn"
                  placeholder="HSN (Optional)"
                  value={item.hsn}
                  onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                  className="w-full px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="quantity"
                  placeholder="0"
                  value={item.quantity === 0 ? '' : item.quantity}
                  onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  min="0"
                  className="w-full px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs text-right"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="rate"
                  placeholder="0.00"
                  value={item.rate === 0 ? '' : item.rate}
                  onChange={(e) => handleItemChange(item.id, 'rate', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full px-1 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs text-right"
                />
              </div>
              <div className="text-gray-900 text-right self-start pt-2 font-medium">
                {formatCurrency(item.taxableAmount)}
              </div>
              <div className="text-gray-900 text-right self-start pt-2 font-medium">
                {formatCurrency(item.gst)}
              </div>
              <div className="text-gray-900 font-bold text-right self-start pt-2">
                {formatCurrency(item.totalAmount)}
              </div>
              <div className="flex items-center justify-center self-start pt-2">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg font-bold text-gray-800">Item #{item.no}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-300"
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label htmlFor={`description-${item.id}`} className="block text-xs font-medium text-gray-600">Description</label>
                <textarea
                  id={`description-${item.id}`}
                  name="description"
                  placeholder="Item Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
                />
              </div>
              <div>
                <label htmlFor={`hsn-${item.id}`} className="block text-xs font-medium text-gray-600">HSN</label>
                <input
                  id={`hsn-${item.id}`}
                  type="text"
                  name="hsn"
                  placeholder="HSN (Optional)"
                  value={item.hsn}
                  onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`quantity-${item.id}`} className="block text-xs font-medium text-gray-600">QTY.</label>
                  <input
                    id={`quantity-${item.id}`}
                    type="number"
                    name="quantity"
                    placeholder="0"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    min="0"
                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                  />
                </div>
                <div>
                  <label htmlFor={`rate-${item.id}`} className="block text-xs font-medium text-gray-600">Rate</label>
                  <input
                    id={`rate-${item.id}`}
                    type="number"
                    name="rate"
                    placeholder="0.00"
                    value={item.rate === 0 ? '' : item.rate}
                    onChange={(e) => handleItemChange(item.id, 'rate', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-3">
                <span className="text-md font-semibold text-gray-800">Taxable Amount:</span>
                <span className="text-lg font-bold text-gray-700">{formatCurrency(item.taxableAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-3">
                <span className="text-md font-semibold text-gray-800">GST ({GST_RATE_PERCENTAGE}%):</span>
                <span className="text-lg font-bold text-gray-700">{formatCurrency(item.gst)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-3">
                <span className="text-md font-semibold text-gray-800">Total Item Amount:</span>
                <span className="text-lg font-bold text-green-700">{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <div className="mt-6 flex justify-center md:justify-start">
        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          <Plus size={20} className="mr-2" /> Add Item
        </button>
      </div>

      {/* Total Amount Display for GST Invoice */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-right">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right max-w-sm ml-auto">
          <p className="text-md font-medium text-gray-700">Total Amount Before Tax:</p>
          <p className="text-md font-semibold text-gray-800">{formatCurrency(totals.totalAmountBeforeTax)}</p>
          <p className="text-md font-medium text-gray-700">CGST ({CGST_RATE_PERCENTAGE}%):</p>
          <p className="text-md font-semibold text-gray-800">{formatCurrency(totals.cgst)}</p>
          <p className="text-md font-medium text-gray-700">SGST ({SGST_RATE_PERCENTAGE}%):</p>
          <p className="text-md font-semibold text-gray-800">{formatCurrency(totals.sgst)}</p>
          <p className="text-lg font-semibold text-gray-800 border-t pt-2 mt-2">Total Tax Amount:</p>
          <p className="text-lg font-bold text-red-600 border-t pt-2 mt-2">{formatCurrency(totals.totalTaxAmount)}</p>
          <p className="text-xl font-bold text-gray-900 border-t pt-2 mt-2">Total Amount After Tax:</p>
          <p className="text-3xl font-extrabold text-green-700 border-t pt-2 mt-2">{formatCurrency(totals.totalAmountAfterTax)}</p>
        </div>
        <p className="text-lg text-gray-600 italic mt-4">{totals.amountInWords}</p>
      </div>
    </div>
  );
};

export default ItemsDetailsGst;