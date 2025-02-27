import { useAWS } from "@/contexts/AWSContext";
import { Navigate } from "wouter";
import { Loader2 } from "lucide-react";

interface AWSLayoutProps {
  children: React.ReactNode;
}

export function AWSLayout({ children }: AWSLayoutProps) {
  const { isAuthenticated, isLoading } = useAWS();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/aws/login" />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid gap-6">{children}</div>
    </div>
  );
}
