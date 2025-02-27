import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DynamoDBTable {
  TableName: string;
  ItemCount: number;
  TableStatus: string;
}

export function useDynamoDB() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List tables with real-time updates
  const {
    data: tables = [],
    isLoading: tablesLoading,
    error: tablesError
  } = useQuery<DynamoDBTable[]>({
    queryKey: ['/api/aws/dynamodb/tables'],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  // Query table items with real-time updates
  const queryTable = (tableName: string, queryParams?: Record<string, any>) => {
    return useQuery({
      queryKey: ['/api/aws/dynamodb/query', tableName, queryParams],
      queryFn: async () => {
        const res = await fetch(`/api/aws/dynamodb/tables/${tableName}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryParams)
        });
        if (!res.ok) throw new Error('Failed to query table');
        return res.json();
      },
      refetchInterval: 15000, // More frequent updates for table data
      refetchOnWindowFocus: true,
      staleTime: 5000,
      enabled: !!tableName
    });
  };

  // Create table mutation
  const createTable = useMutation({
    mutationFn: async (params: any) => {
      const res = await fetch('/api/aws/dynamodb/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error('Failed to create table');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/dynamodb/tables'] });
      toast({ title: "Table created successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to create table",
        variant: "destructive"
      });
    }
  });

  // Delete table mutation
  const deleteTable = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/aws/dynamodb/tables/${name}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete table');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/dynamodb/tables'] });
      toast({ title: "Table deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete table",
        variant: "destructive"
      });
    }
  });

  // Put item mutation
  const putItem = useMutation({
    mutationFn: async ({ tableName, item }: { tableName: string; item: any }) => {
      const res = await fetch(`/api/aws/dynamodb/tables/${tableName}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error('Failed to put item');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/aws/dynamodb/query', variables.tableName]
      });
      toast({ title: "Item added successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to add item",
        variant: "destructive"
      });
    }
  });

  return {
    tables,
    tablesLoading,
    tablesError,
    queryTable,
    createTable,
    deleteTable,
    putItem
  };
}
