// src/components/ItemsDetailsQuotation.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react'; // Using lucide-react for icons

// Define the structure for a single work item for quotation
export interface QuotationItem {
  id: string; // Unique ID for React list keys and easy manipulation
  no: number; // Row number, auto-incremented
  description: string;
  hsn: string;
  quantity: number | ''; // Allow empty string for initial state
  rate: number | ''; // Allow empty string for initial state
  // Amount field is intentionally omitted for quotation
}

// Define the props for the ItemsDetailsQuotation component
interface ItemsDetailsQuotationProps {
  onItemsChange?: (items: QuotationItem[]) => void;
  initialItems?: QuotationItem[];
}

const ItemsDetailsQuotation: React.FC<ItemsDetailsQuotationProps> = ({ onItemsChange, initialItems }) => {
  const [items, setItems] = useState<QuotationItem[]>(
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
          },
        ]
  );

  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(items);
    }
  }, [items, onItemsChange]);

  const handleItemChange = useCallback(
    (id: string, field: keyof QuotationItem, value: string | number) => {
      setItems((prevItems) => {
        return prevItems.map((item) => {
          if (item.id === id) {
            let updatedItem = { ...item, [field]: value };

            // Ensure quantity/rate values for display remain as empty string if user cleared them
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

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Work Items for Quotation</h2>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_3fr_1fr_1fr_1.2fr_auto] gap-4 text-gray-600 font-semibold border-b pb-3 mb-3 sticky top-0 bg-white z-10">
          <div className="text-left">No.</div>
          <div className="text-left">Description</div>
          <div className="text-left">HSN</div>
          <div className="text-right">QTY.</div>
          <div className="text-right">Rate</div>
          <div className="w-8"></div> {/* Placeholder for delete button column */}
        </div>

        {/* Item Rows */}
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_3fr_1fr_1fr_1.2fr_auto] gap-4 items-center mb-4 pb-4 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0"
          >
            {/* No. */}
            <div className="text-gray-700 text-left self-start pt-2">{item.no}</div>

            {/* Description */}
            <div>
              <textarea
                name="description"
                placeholder="Item Description"
                value={item.description}
                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm resize-y"
              />
            </div>

            {/* HSN */}
            <div>
              <input
                type="text"
                name="hsn"
                placeholder="HSN (Optional)"
                value={item.hsn}
                onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Quantity */}
            <div>
              <input
                type="number"
                name="quantity"
                placeholder="0"
                value={item.quantity === 0 ? '' : item.quantity}
                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                min="0"
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
              />
            </div>

            {/* Rate */}
            <div>
              <input
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

            {/* Delete Button */}
            <div className="flex items-center justify-center self-start pt-2">
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
          </div>
        ))}
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
    </div>
  );
};

export default ItemsDetailsQuotation;