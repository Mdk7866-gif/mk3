'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Define the structure for a single work item for quotation with discount rate
export interface QuotationDiscountItem {
  id: string;          // Unique ID for React list keys
  no: number;          // Row number, auto-incremented
  description: string;
  hsn?: string;        // Optional
  quantity: number | '';
  originalRate: number | ''; // Original (strikethrough) price
  discountRate: number | ''; // Discounted price shown to client
}

interface ItemsDetailsQuotationDiscountRateProps {
  onItemsChange?: (items: QuotationDiscountItem[]) => void;
  initialItems?: QuotationDiscountItem[];
}

const ItemsDetailsQuotationDiscountRate: React.FC<ItemsDetailsQuotationDiscountRateProps> = ({
  onItemsChange,
  initialItems,
}) => {
  const [items, setItems] = useState<QuotationDiscountItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems
      : [
          {
            id: crypto.randomUUID(),
            no: 1,
            description: '',
            hsn: '',
            quantity: '',
            originalRate: '',
            discountRate: '',
          },
        ]
  );

  useEffect(() => {
    if (onItemsChange) {
      const formattedItems = items.map((item) => ({
        ...item,
        quantity:
          item.quantity === ''
            ? ''
            : typeof item.quantity === 'string'
            ? parseFloat(item.quantity) || 0
            : item.quantity,
        originalRate:
          item.originalRate === ''
            ? ''
            : typeof item.originalRate === 'string'
            ? parseFloat(item.originalRate) || 0
            : item.originalRate,
        discountRate:
          item.discountRate === ''
            ? ''
            : typeof item.discountRate === 'string'
            ? parseFloat(item.discountRate) || 0
            : item.discountRate,
      })) as QuotationDiscountItem[];
      onItemsChange(formattedItems);
    }
  }, [items, onItemsChange]);

  const handleItemChange = useCallback(
    (id: string, field: keyof QuotationDiscountItem, value: string | number) => {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  const handleAddItem = useCallback(() => {
    setItems((prevItems) => {
      const newNo =
        prevItems.length > 0
          ? Math.max(...prevItems.map((item) => item.no)) + 1
          : 1;
      return [
        ...prevItems,
        {
          id: crypto.randomUUID(),
          no: newNo,
          description: '',
          hsn: '',
          quantity: '',
          originalRate: '',
          discountRate: '',
        },
      ];
    });
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prevItems) => {
      const updated = prevItems.filter((item) => item.id !== id);
      return updated.map((item, index) => ({ ...item, no: index + 1 }));
    });
  }, []);

  const inputClass =
    'w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm';

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Work Items — Quotation with Discount
      </h2>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        {/* Header */}
        <div className="grid grid-cols-[auto_3fr_1fr_1fr_1.3fr_1.3fr_auto] gap-3 text-gray-600 font-semibold border-b pb-3 mb-3 sticky top-0 bg-white z-10">
          <div className="text-left">No.</div>
          <div className="text-left">Description</div>
          <div className="text-left">HSN</div>
          <div className="text-right">QTY.</div>
          <div className="text-right">Original Rate</div>
          <div className="text-right">Discount Rate</div>
          <div className="w-8" />
        </div>

        {/* Rows */}
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_3fr_1fr_1fr_1.3fr_1.3fr_auto] gap-3 items-center mb-4 pb-4 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0"
          >
            {/* No. */}
            <div className="text-gray-700 self-start pt-2">{item.no}</div>

            {/* Description */}
            <div>
              <textarea
                name="description"
                placeholder="Item Description"
                value={item.description}
                onChange={(e) =>
                  handleItemChange(item.id, 'description', e.target.value)
                }
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* HSN */}
            <div>
              <input
                type="text"
                name="hsn"
                placeholder="HSN (Optional)"
                value={item.hsn}
                onChange={(e) =>
                  handleItemChange(item.id, 'hsn', e.target.value)
                }
                className={inputClass}
              />
            </div>

            {/* Quantity */}
            <div>
              <input
                type="number"
                name="quantity"
                placeholder="0"
                value={item.quantity === 0 ? '' : item.quantity}
                onChange={(e) =>
                  handleItemChange(
                    item.id,
                    'quantity',
                    e.target.value === '' ? '' : parseFloat(e.target.value)
                  )
                }
                min="0"
                className={`${inputClass} text-right`}
              />
            </div>

            {/* Original Rate */}
            <div>
              <input
                type="number"
                name="originalRate"
                placeholder="0.00"
                value={item.originalRate === 0 ? '' : item.originalRate}
                onChange={(e) =>
                  handleItemChange(
                    item.id,
                    'originalRate',
                    e.target.value === '' ? '' : parseFloat(e.target.value)
                  )
                }
                min="0"
                step="0.01"
                className={`${inputClass} text-right`}
              />
            </div>

            {/* Discount Rate */}
            <div>
              <input
                type="number"
                name="discountRate"
                placeholder="0.00"
                value={item.discountRate === 0 ? '' : item.discountRate}
                onChange={(e) =>
                  handleItemChange(
                    item.id,
                    'discountRate',
                    e.target.value === '' ? '' : parseFloat(e.target.value)
                  )
                }
                min="0"
                step="0.01"
                className={`${inputClass} text-right text-green-700 font-semibold`}
              />
            </div>

            {/* Delete */}
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
          <div
            key={item.id}
            className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-lg font-bold text-gray-800">
                Item #{item.no}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-md"
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor={`desc-dr-${item.id}`}
                  className="block text-xs font-medium text-gray-600"
                >
                  Description
                </label>
                <textarea
                  id={`desc-dr-${item.id}`}
                  placeholder="Item Description"
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(item.id, 'description', e.target.value)
                  }
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div>
                <label
                  htmlFor={`hsn-dr-${item.id}`}
                  className="block text-xs font-medium text-gray-600"
                >
                  HSN
                </label>
                <input
                  id={`hsn-dr-${item.id}`}
                  type="text"
                  placeholder="HSN (Optional)"
                  value={item.hsn}
                  onChange={(e) =>
                    handleItemChange(item.id, 'hsn', e.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor={`qty-dr-${item.id}`}
                    className="block text-xs font-medium text-gray-600"
                  >
                    QTY.
                  </label>
                  <input
                    id={`qty-dr-${item.id}`}
                    type="number"
                    placeholder="0"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        'quantity',
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    min="0"
                    className={`${inputClass} text-right`}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`orig-dr-${item.id}`}
                    className="block text-xs font-medium text-gray-600"
                  >
                    Original Rate
                  </label>
                  <input
                    id={`orig-dr-${item.id}`}
                    type="number"
                    placeholder="0.00"
                    value={item.originalRate === 0 ? '' : item.originalRate}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        'originalRate',
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    min="0"
                    step="0.01"
                    className={`${inputClass} text-right`}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`disc-dr-${item.id}`}
                    className="block text-xs font-medium text-gray-600"
                  >
                    Discount Rate
                  </label>
                  <input
                    id={`disc-dr-${item.id}`}
                    type="number"
                    placeholder="0.00"
                    value={item.discountRate === 0 ? '' : item.discountRate}
                    onChange={(e) =>
                      handleItemChange(
                        item.id,
                        'discountRate',
                        e.target.value === '' ? '' : parseFloat(e.target.value)
                      )
                    }
                    min="0"
                    step="0.01"
                    className={`${inputClass} text-right text-green-700 font-semibold`}
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

export default ItemsDetailsQuotationDiscountRate;
