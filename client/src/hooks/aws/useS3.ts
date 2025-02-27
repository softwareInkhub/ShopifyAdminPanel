import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface S3Bucket {
  Name: string;
  CreationDate: Date;
}

interface S3Object {
  Key: string;
  Size: number;
  LastModified: Date;
}

export function useS3() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // List buckets with real-time updates
  const {
    data: buckets = [],
    isLoading: bucketsLoading,
    error: bucketsError
  } = useQuery<S3Bucket[]>({
    queryKey: ['/api/aws/s3/buckets'],
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // List objects in a bucket with real-time updates
  const listObjects = (bucketName: string) => {
    return useQuery<S3Object[]>({
      queryKey: ['/api/aws/s3/objects', bucketName],
      queryFn: async () => {
        const res = await fetch(`/api/aws/s3/buckets/${bucketName}/objects`);
        if (!res.ok) throw new Error('Failed to fetch objects');
        return res.json();
      },
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 10000,
      enabled: !!bucketName
    });
  };

  // Create bucket mutation
  const createBucket = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/aws/s3/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create bucket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/s3/buckets'] });
      toast({ title: "Bucket created successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to create bucket",
        variant: "destructive"
      });
    }
  });

  // Delete bucket mutation
  const deleteBucket = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/aws/s3/buckets/${name}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete bucket');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/aws/s3/buckets'] });
      toast({ title: "Bucket deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete bucket",
        variant: "destructive"
      });
    }
  });

  return {
    buckets,
    bucketsLoading,
    bucketsError,
    listObjects,
    createBucket,
    deleteBucket
  };
}
