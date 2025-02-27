import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface AWSContextType {
  currentUser: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (accessKeyId: string, secretAccessKey: string) => Promise<void>;
  logout: () => void;
}

const AWSContext = createContext<AWSContextType | undefined>(undefined);

export function AWSProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const { data: currentUser, isLoading, error } = useQuery({
    queryKey: ['aws-current-user'],
    queryFn: async () => {
      const response = await fetch('/api/aws/current-user');
      if (!response.ok) throw new Error('Failed to fetch AWS user');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const login = async (accessKeyId: string, secretAccessKey: string) => {
    try {
      const response = await fetch('/api/aws/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKeyId, secretAccessKey }),
      });

      if (!response.ok) throw new Error('AWS authentication failed');

      setIsAuthenticated(true);
      toast({
        title: 'AWS Login Successful',
        description: 'Successfully authenticated with AWS',
      });
    } catch (error) {
      toast({
        title: 'AWS Login Failed',
        description: error instanceof Error ? error.message : 'Failed to authenticate with AWS',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AWSContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        error: error as Error | null,
        login,
        logout,
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
