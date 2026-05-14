import { ClerkProvider as ReactClerkProvider } from '@clerk/react';
import type { ComponentType, ReactNode } from 'react';

type ClerkProviderProps = {
  children: ReactNode;
  afterSignOutUrl?: string;
};

// @clerk/react reads VITE_CLERK_PUBLISHABLE_KEY at runtime, but v6.6.2 still
// publishes a stricter provider prop type than the React Vite quickstart uses.
export const ClerkProvider = ReactClerkProvider as ComponentType<ClerkProviderProps>;
