import { useAWS } from "@/contexts/AWSContext";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface AWSLayoutProps {
  children: React.ReactNode;
}

export function AWSLayout({ children }: AWSLayoutProps) {
  const { isAuthenticated, isLoading } = useAWS();
  const [_, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/aws/login");
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid gap-6">{children}</div>
    </div>
  );
}