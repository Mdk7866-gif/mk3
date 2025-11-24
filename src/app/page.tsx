// src/app/page.tsx

import MushahidTotalEarning from "@/components/Homepagecardstotalearning/MushahidTotalEarning";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 px-4 sm:px-6 lg:px-8 text-center shadow-lg">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 animate-fadeInDown">
            Welcome to MK3 Solutions
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 animate-fadeInUp">
            Your comprehensive platform for managing invoices, quotations, and GST.
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="/mustak/invoice"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Get Started
            </a>
            <a
              href="/contact"
              className="border border-white text-white hover:bg-white hover:text-indigo-700 px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-800 mb-12 text-center">
            Our Key Clients
          </h2>

          {/* ✅ Add Total Earnings Card */}
          <div className="flex justify-center">
            <MushahidTotalEarning />
          </div>
        </div>
      </section>
    </div>
  );
}
