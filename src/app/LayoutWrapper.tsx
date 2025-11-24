'use client';
import { ReactNode } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { usePathname } from 'next/navigation';

const HIDE_LAYOUT_PREFIXES = [
  '/verifyqrcodefrontend',
  '/verifyqrcodefrontendmushahid',
  '/verifyqrcodefrontendmustak',
  '/upi-pay',
];

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideLayout = HIDE_LAYOUT_PREFIXES.some(
    (prefix) => pathname && pathname.startsWith(prefix)
  );

  return (
    <>
      {!hideLayout && <Navbar />}
      {children}
      {!hideLayout && <Footer />}
    </>
  );
}
