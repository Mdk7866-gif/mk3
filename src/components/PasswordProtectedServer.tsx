'use client';

import { ReactNode } from 'react';
import PasswordProtection from './PasswordProtection';

interface PasswordProtectedServerProps {
  children: ReactNode;
}

export default function PasswordProtectedServer({ children }: PasswordProtectedServerProps) {
  return <PasswordProtection>{children}</PasswordProtection>;
}


