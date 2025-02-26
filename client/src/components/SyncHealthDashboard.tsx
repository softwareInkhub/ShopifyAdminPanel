import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SyncMetrics {
  syncSpeed: number;
  itemsProcessed: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: number;
}

interface SyncError {
  id: string;
  message: string;
  timestamp: number;
  type: string;
}

interface SyncCheckpoint {
  lastOrderId: string | null;
  lastSyncTime: number | null;
}

interface Job {
  id: number;
  status: string;
  progress: number;
  createdAt: string;
  type: string;
}

function StartSyncJobForm() {
  const { toast } = useToast();
  const [batchSize, setBatchSize] = useState(100);
  const [includeMetafields, setIncludeMetafields] = useState(false);

  const startJob = async () => {
    try {
      const response = await fetch('/api/jobs/sync-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchSize,
          includeMetafields
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start sync job');
      }

      const result = await response.json();
      toast({
        title: 'Sync Job Started',
        description: `Job ID: ${result.jobId}`,
      });
    } catch (error) {
      console.error('Start job error:', error);
      toast({
        title: 'Error',
        description: 'Failed to start sync job',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="batchSize">Batch Size</Label>
        <Input
          id="batchSize"
          type="number"
          min={1}
          max={1000}
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value))}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="includeMetafields"
          checked={includeMetafields}
          onCheckedChange={setIncludeMetafields}
        />
        <Label htmlFor="includeMetafields">Include Metafields</Label>
      </div>
      <Button onClick={startJob}>Start Sync Job</Button>
    </div>
  );
}

function SyncJobsList() {
  const { toast } = useToast();

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['sync-jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs/sync-orders');
      if (!response.ok) {
        throw new Error('Failed to fetch sync jobs');
      }
      return response.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const cancelJob = async (jobId: number) => {
    try {
      const response = await fetch(`/api/jobs/sync-orders/${jobId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      toast({
        title: 'Job Cancelled',
        description: 'Sync job cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel job error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel job',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div>Loading jobs...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobsData?.jobs?.map((job: Job) => (
          <TableRow key={job.id}>
            <TableCell>{job.id}</TableCell>
            <TableCell>{job.status}</TableCell>
            <TableCell>{job.progress}%</TableCell>
            <TableCell>
              {new Date(job.createdAt).toLocaleString()}
            </TableCell>
            <TableCell>
              {job.status === 'processing' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelJob(job.id)}
                >
                  Cancel
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SyncJobsManager() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Start New Sync Job</CardTitle>
        </CardHeader>
        <CardContent>
          <StartSyncJobForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <SyncJobsList />
        </CardContent>
      </Card>
    </div>
  );
}

interface SyncHealthDashboardProps {
  jobId?: string;
}

export default function SyncHealthDashboard({ jobId }: SyncHealthDashboardProps) {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SyncMetrics[]>([]);
  const [recentErrors, setRecentErrors] = useState<SyncError[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch current sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['syncStatus', jobId],
    queryFn: async () => {
      const response = await fetch(jobId ? `/api/sync/status?jobId=${jobId}` : '/api/sync/status');
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      return response.json();
    },
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Fetch sync metrics
  const { data: syncMetrics } = useQuery({
    queryKey: ['syncMetrics', jobId],
    queryFn: async () => {
      const response = await fetch(jobId ? `/api/sync/metrics?jobId=${jobId}` : '/api/sync/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch sync metrics');
      }
      return response.json();
    },
    refetchInterval: 10000 // Poll every 10 seconds
  });

  // Fetch sync checkpoint
  const { data: checkpoint } = useQuery({
    queryKey: ['syncCheckpoint'],
    queryFn: async () => {
      const response = await fetch('/api/sync/checkpoint');
      if (!response.ok) {
        throw new Error('Failed to fetch sync checkpoint');
      }
      return response.json();
    },
    refetchInterval: 30000
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    const reconnect = () => {
      setTimeout(() => {
        setWsConnected(false);
        console.log('Attempting to reconnect WebSocket...');
        ws.close();
        const newWs = new WebSocket(`${protocol}//${window.location.host}/ws`);
        setupWebSocket(newWs);
      }, 5000);
    };

    const setupWebSocket = (socket: WebSocket) => {
      socket.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        reconnect();
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync_update') {
            setMetrics(prev => [...prev, {
              syncSpeed: data.metrics.currentSpeed,
              itemsProcessed: data.metrics.totalProcessed,
              cacheHitRate: data.metrics.cacheHitRate,
              errorRate: data.metrics.errorRate,
              timestamp: Date.now()
            }].slice(-20));
          } else if (data.type === 'sync_error') {
            setRecentErrors(prev => [{
              id: crypto.randomUUID(),
              message: data.error.message,
              timestamp: Date.now(),
              type: data.error.type
            }, ...prev].slice(0, 10));

            toast({
              title: 'Sync Error',
              description: data.error.message,
              variant: 'destructive'
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    };

    setupWebSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const resumeSync = async () => {
    try {
      const response = await fetch('/api/sync/resume', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to resume sync');
      }
      const result = await response.json();
      toast({
        title: 'Sync Resumed',
        description: `Resuming sync from order ${result.checkpoint.lastOrderId}`,
      });
    } catch (error) {
      console.error('Resume sync error:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume sync',
        variant: 'destructive'
      });
    }
  };

  const getSyncHealthStatus = () => {
    if (!syncMetrics) return 'unknown';
    if (syncMetrics.errorRate > 10) return 'critical';
    if (syncMetrics.errorRate > 5) return 'warning';
    return 'healthy';
  };

  const healthColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-500'
  };

  return (
    <div className="space-y-6">
      <SyncJobsManager/>
      {!wsConnected && (
        <Alert variant="destructive">
          <AlertTitle>Connection Lost</AlertTitle>
          <AlertDescription>
            Real-time updates are currently unavailable. Attempting to reconnect...
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sync Health Status</CardTitle>
            <Badge
              variant="outline"
              className={healthColors[getSyncHealthStatus()]}
            >
              {getSyncHealthStatus().toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{syncStatus?.progress || 0}%</span>
              </div>
              <Progress value={syncStatus?.progress || 0} />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Items Processed</p>
                <p className="text-2xl">{syncMetrics?.totalProcessed || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Sync Speed</p>
                <p className="text-2xl">{syncMetrics?.currentSpeed || 0}/s</p>
              </div>
              <div>
                <p className="text-sm font-medium">Cache Hit Rate</p>
                <p className="text-2xl">{syncMetrics?.cacheHitRate || 0}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Error Rate</p>
                <p className="text-2xl">{syncMetrics?.errorRate || 0}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <LineChart
              width={800}
              height={300}
              data={metrics}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              />
              <Legend />
              <Line type="monotone" dataKey="syncSpeed" stroke="#8884d8" name="Sync Speed" />
              <Line type="monotone" dataKey="cacheHitRate" stroke="#82ca9d" name="Cache Hit Rate" />
              <Line type="monotone" dataKey="errorRate" stroke="#ff7300" name="Error Rate" />
            </LineChart>
          </div>
        </CardContent>
      </Card>

      {/* Error Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {recentErrors.map(error => (
                <Alert key={error.id} variant="destructive">
                  <AlertTitle>{error.type}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {error.message}
                    <span className="block text-xs opacity-70">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Sync Checkpoint */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Checkpoint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Last Synced Order</p>
                <p className="text-lg">{checkpoint?.lastOrderId || 'No checkpoint'}</p>
                <p className="text-sm text-muted-foreground">
                  {checkpoint?.lastSyncTime
                    ? new Date(checkpoint.lastSyncTime).toLocaleString()
                    : 'Never synced'}
                </p>
              </div>
              <Button
                onClick={resumeSync}
                disabled={syncStatus?.status === 'processing'}
              >
                Resume Sync
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}