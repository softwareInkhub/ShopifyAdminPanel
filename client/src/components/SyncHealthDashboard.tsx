import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface SyncHealthDashboardProps {
  jobId?: string;
}

export default function SyncHealthDashboard({ jobId }: SyncHealthDashboardProps) {
  const [metrics, setMetrics] = useState<SyncMetrics[]>([]);
  const [recentErrors, setRecentErrors] = useState<SyncError[]>([]);

  // Fetch current sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['syncStatus', jobId],
    queryFn: async () => {
      const response = await fetch(jobId ? `/api/sync/status?jobId=${jobId}` : '/api/sync/status');
      return response.json();
    },
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Fetch sync metrics
  const { data: syncMetrics } = useQuery({
    queryKey: ['syncMetrics', jobId],
    queryFn: async () => {
      const response = await fetch(jobId ? `/api/sync/metrics?jobId=${jobId}` : '/api/sync/metrics');
      return response.json();
    },
    refetchInterval: 10000 // Poll every 10 seconds
  });

  // Update metrics chart data
  useEffect(() => {
    if (syncMetrics) {
      setMetrics(prev => {
        const newMetrics = [...prev, {
          syncSpeed: syncMetrics.currentSpeed,
          itemsProcessed: syncMetrics.totalProcessed,
          cacheHitRate: syncMetrics.cacheHitRate,
          errorRate: syncMetrics.errorRate,
          timestamp: Date.now()
        }].slice(-20); // Keep last 20 data points
        return newMetrics;
      });
    }
  }, [syncMetrics]);

  // Update error log
  useEffect(() => {
    if (syncStatus?.errors) {
      setRecentErrors(syncStatus.errors);
    }
  }, [syncStatus]);

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
    <div className="grid gap-4">
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
    </div>
  );
}