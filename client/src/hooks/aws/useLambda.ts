import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface LambdaFunction {
  FunctionName: string;
  Runtime: string;
  Handler: string;
  CodeSize: number;
  Description: string;
  Timeout: number;
  MemorySize: number;
  LastModified: string;
  Version: string;
  State?: string;
}

export function useLambda() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List functions with real-time updates
  const {
    data: functions = [],
    isLoading: functionsLoading,
    error: functionsError
  } = useQuery<LambdaFunction[]>({
    queryKey: ['/api/aws/lambda/functions'],
    queryFn: async () => {
      const res = await fetch('/api/aws/lambda/functions');
      if (!res.ok) throw new Error('Failed to fetch functions');
      return res.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  // Get function details
  const getFunction = (functionName: string) => {
    return useQuery({
      queryKey: ['/api/aws/lambda/functions', functionName],
      queryFn: async () => {
        if (!functionName) return null;
        const res = await fetch(`/api/aws/lambda/functions/${functionName}`);
        if (!res.ok) throw new Error('Failed to get function');
        return res.json();
      },
      enabled: !!functionName
    });
  };

  // Create function mutation
  const createFunction = useMutation({
    mutationFn: async (params: any) => {
      const res = await fetch('/api/aws/lambda/functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error('Failed to create function');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/lambda/functions'] });
      toast({ title: "Function created successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to create function",
        variant: "destructive"
      });
    }
  });

  // Delete function mutation
  const deleteFunction = useMutation({
    mutationFn: async (functionName: string) => {
      const res = await fetch(`/api/aws/lambda/functions/${functionName}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete function');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/lambda/functions'] });
      toast({ title: "Function deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete function",
        variant: "destructive"
      });
    }
  });

  // Invoke function mutation
  const invokeFunction = useMutation({
    mutationFn: async ({ functionName, payload }: { functionName: string; payload?: Record<string, any> }) => {
      const res = await fetch(`/api/aws/lambda/functions/${functionName}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to invoke function');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Function invoked successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to invoke function",
        variant: "destructive"
      });
    }
  });

  return {
    functions,
    functionsLoading,
    functionsError,
    getFunction,
    createFunction,
    deleteFunction,
    invokeFunction
  };
}
