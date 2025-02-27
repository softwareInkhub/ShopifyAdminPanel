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
      if (!response.ok) {
        if (response.status === 401) {
          // Clear authenticated state on unauthorized
          setIsAuthenticated(false);
          throw new Error('AWS session expired');
        }
        throw new Error('Failed to fetch AWS user');
      }
      return response.json();
    },
    enabled: isAuthenticated,
    retry: false
  });

  const login = async (accessKeyId: string, secretAccessKey: string) => {
    try {
      const response = await fetch('/api/aws/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKeyId, secretAccessKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'AWS authentication failed');
      }

      setIsAuthenticated(true);
      toast({
        title: 'AWS Login Successful',
        description: 'Successfully authenticated with AWS',
      });
    } catch (error) {
      setIsAuthenticated(false);
      toast({
        title: 'AWS Login Failed',
        description: error instanceof Error ? error.message : 'Failed to authenticate with AWS',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/aws/logout', { method: 'POST' });
      setIsAuthenticated(false);
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Failed to logout from AWS',
        variant: 'destructive',
      });
    }
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