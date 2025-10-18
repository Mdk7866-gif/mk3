// src/components/ClientDetails.tsx
'use client'; // This component will use client-side interactivity for form inputs and state

import React, { useState } from 'react';

// Define the props for the ClientDetails component (if any external data needs to be passed)
interface ClientDetailsProps {
  // Optional: A callback function to send client data back to the parent
  onSave?: (data: ClientFormData) => void;
  // Optional: Initial data to pre-fill the form
  initialData?: ClientFormData;
}

// Define the shape of the form data
interface ClientFormData {
  date: string;
  clientName: string;
  clientAddress: string;
  contact: string; // Can be email or mobile
  gstin: string;
  notes: string;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ onSave, initialData }) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Client Details Submitted:', formData);
    if (onSave) {
      onSave(formData);
    }
    // Optionally, you might want to reset the form or show a success message
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Client Details</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Client Address */}
        <div>
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          ></textarea>
        </div>

        {/* Email/Mobile */}
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
            Email / Mobile
          </label>
          <input
            type="text" // Can be 'email' or 'tel' for specific validation if needed
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="Enter email or mobile number"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Note Box */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={5}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Save Client Details
        </button>
      </form>
    </div>
  );
};

export default ClientDetails;