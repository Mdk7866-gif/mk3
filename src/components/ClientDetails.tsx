// src/components/ClientDetails.tsx
'use client';

import React, { useState, useEffect } from 'react';

// Define the shape of the form data
export interface ClientFormData {
  date: string;
  clientName: string;
  clientAddress: string;
  contact: string; // Can be email or mobile
  gstin: string;
  notes: string;
}

// Define the props for the ClientDetails component
interface ClientDetailsProps {
  // Callback function to send client data back to the parent on change
  onDataChange: (data: ClientFormData) => void;
  // Optional: Initial data to pre-fill the form
  initialData?: ClientFormData;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ onDataChange, initialData }) => {
  const [formData, setFormData] = useState<ClientFormData>(
    initialData || {
      date: new Date().toISOString().split('T')[0], // Default to today's date
      clientName: '',
      clientAddress: '',
      contact: '',
      gstin: '',
      notes: "1) 15% extra will be charged for work outside Ahmedabad.\n2) Extra charges applicable for material shifting to upper floors without lift.",
    }
  );

  // Effect to call onDataChange whenever formData changes
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg"> {/* Added responsive padding */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Client Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"> {/* Responsive grid layout */}
        {/* Date Input */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Client Name */}
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
            Client Name
          </label>
          <input
            type="text"
            id="clientName"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            placeholder="Enter client's full name"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Client Address */}
        <div className="md:col-span-2"> {/* Span full width on medium screens */}
          <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Client Address
          </label>
          <textarea
            id="clientAddress"
            name="clientAddress"
            value={formData.clientAddress}
            onChange={handleChange}
            rows={3}
            placeholder="Enter client's full address"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          ></textarea>
        </div>

        {/* Email/Mobile */}
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
            Email / Mobile
          </label>
          <input
            type="text"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="Enter email or mobile number"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* GSTIN */}
        <div>
          <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 mb-1">
            GSTIN (Optional)
          </label>
          <input
            type="text"
            id="gstin"
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            placeholder="Enter GSTIN"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Note Box */}
        <div className="md:col-span-2"> {/* Span full width on medium screens */}
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={5}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;