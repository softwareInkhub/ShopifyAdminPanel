import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AWSContextType {
  error: Error | null;
  isLoading: boolean;
}

const AWSContext = createContext<AWSContextType | undefined>(undefined);

export function AWSProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = useQuery({
    queryKey: ['aws-services-status'],
    queryFn: async () => {
      const response = await fetch('/api/aws/services/status');
      if (!response.ok) {
        throw new Error('Failed to check AWS services status');
      }
      return response.json();
    }
  });

  return (
    <AWSContext.Provider
      value={{
        error: error as Error | null,
        isLoading
      }}
    >
      {children}
    </AWSContext.Provider>
  );
}

export function useAWS() {
  const context = useContext(AWSContext);
  if (context === undefined) {
    throw new Error('useAWS must be used within an AWSProvider');
  }
  return context;
}