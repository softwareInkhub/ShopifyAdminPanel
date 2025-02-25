import { useQuery, useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { type Job } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Jobs() {
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      return res.json();
    }
  });

  const startJobMutation = useMutation({
    mutationFn: (type: 'orders' | 'products') =>
      apiRequest('POST', '/api/jobs', { type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({ title: "Job started successfully" });
    }
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <div className="space-x-2">
          <Button onClick={() => startJobMutation.mutate('orders')}>
            <Play className="mr-2 h-4 w-4" />
            Sync Orders
          </Button>
          <Button onClick={() => startJobMutation.mutate('products')}>
            <Play className="mr-2 h-4 w-4" />
            Sync Products
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs?.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="capitalize">{job.type}</TableCell>
                <TableCell>{job.status}</TableCell>
                <TableCell>
                  <Progress value={job.progress || 0} className="w-[60%]" />
                </TableCell>
                <TableCell>
                  {new Date(job.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {job.completedAt
                    ? new Date(job.completedAt).toLocaleString()
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}