import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { type Job, type JobBatch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface JobWithBatches extends Job {
  batches?: JobBatch[];
}

export default function Jobs() {
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch jobs with their batches
  const { data: jobs, isLoading } = useQuery<JobWithBatches[]>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const jobs = await res.json();

      // Fetch batches for each job
      const jobsWithBatches = await Promise.all(
        jobs.map(async (job: Job) => {
          const batchRes = await fetch(`/api/jobs/${job.id}/batches`);
          const batches = batchRes.ok ? await batchRes.json() : [];
          return { ...job, batches };
        })
      );

      return jobsWithBatches;
    }
  });

  const startJobMutation = useMutation({
    mutationFn: (type: 'orders' | 'products') =>
      apiRequest('POST', '/api/jobs', { 
        type,
        config: {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          batchSize: 50
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({ title: "Job started successfully" });
    }
  });

  const downloadReport = async (jobId: number) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/report`);
      if (!res.ok) throw new Error('Failed to download report');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job-${jobId}-report.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({ 
        title: "Failed to download report",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Start New Job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range (Optional)</label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  className="flex-1"
                  onClick={() => startJobMutation.mutate('orders')}
                  disabled={startJobMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Sync Orders
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => startJobMutation.mutate('products')}
                  disabled={startJobMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Sync Products
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-4"></TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs?.map((job) => (
              <>
                <TableRow key={job.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                    >
                      {selectedJob === job.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
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
                  <TableCell>
                    {job.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(job.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {selectedJob === job.id && job.batches && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/50 p-0">
                      <div className="p-4">
                        <h3 className="font-semibold mb-2">Batch Details</h3>
                        <div className="space-y-2">
                          {job.batches.map((batch) => (
                            <Accordion
                              key={batch.id}
                              type="single"
                              collapsible
                              className="w-full"
                            >
                              <AccordionItem value={`batch-${batch.id}`}>
                                <AccordionTrigger className="text-sm">
                                  Batch #{batch.batchNumber} - {batch.status}
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2 text-sm">
                                    <div><strong>Started:</strong> {new Date(batch.startedAt).toLocaleString()}</div>
                                    {batch.completedAt && (
                                      <div><strong>Completed:</strong> {new Date(batch.completedAt).toLocaleString()}</div>
                                    )}
                                    <div><strong>Items Processed:</strong> {batch.itemsProcessed || 0}</div>
                                    {batch.error && (
                                      <div className="text-destructive"><strong>Error:</strong> {batch.error}</div>
                                    )}
                                    <div className="mt-4">
                                      <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="request">
                                          <AccordionTrigger>Request</AccordionTrigger>
                                          <AccordionContent>
                                            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                              {JSON.stringify(batch.request, null, 2)}
                                            </pre>
                                          </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="response">
                                          <AccordionTrigger>Response</AccordionTrigger>
                                          <AccordionContent>
                                            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                              {JSON.stringify(batch.response, null, 2)}
                                            </pre>
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}