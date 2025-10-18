// src/components/ui/Card.tsx
import React from 'react';
import Link from 'next/link';

// Define the props for the Card component
interface CardProps {
  heading: string;
  totalAmount: number; // For "total money earned"
  linkPrefix: string; // e.g., "/mustak" or "/mushahid"
}

const NameCard: React.FC<CardProps> = ({ heading, totalAmount, linkPrefix }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-auto hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-3xl font-bold text-gray-800 mb-4 text-center">{heading}</h3>

      <div className="space-y-3 text-lg text-gray-700 mb-6">
        <p className="flex justify-between items-center">
          <span>Invoice Bill:</span>
          <Link href={`${linkPrefix}/invoice`} className="text-blue-600 hover:underline">View</Link>
        </p>
        <p className="flex justify-between items-center">
          <span>Quotation Bill:</span>
          <Link href={`${linkPrefix}/quotation`} className="text-blue-600 hover:underline">View</Link>
        </p>
        <p className="flex justify-between items-center">
          <span>GST Bill:</span>
          <Link href={`${linkPrefix}/gst`} className="text-blue-600 hover:underline">View</Link>
        </p>
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <p className="text-xl font-semibold text-gray-900 flex justify-between items-center">
          <span>Total Earned:</span>
          <span className="text-green-600">₹{totalAmount.toLocaleString('en-IN')}</span>
        </p>
      </div>
    </div>
  );
};

export default NameCard;