import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface HealthMetric {
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: number;
  name: string;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export default function SystemHealth() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const { data: healthMetrics } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/health');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'alert') {
        const newAlert = {
          id: crypto.randomUUID(),
          type: data.alertType,
          message: data.message,
          timestamp: new Date()
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 50));
        toast({
          title: `New ${data.alertType} Alert`,
          description: data.message,
          variant: data.alertType === 'error' ? 'destructive' : 'default'
        });
      }
    };

    return () => ws.close();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthMetrics?.metrics.map((metric: HealthMetric) => (
          <Card key={metric.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.name}
              </CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metric.value}%</span>
                  <Badge variant="outline" className={getStatusColor(metric.status)}>
                    {metric.status.toUpperCase()}
                  </Badge>
                </div>
                <Progress value={metric.value} max={100} />
                <p className="text-xs text-muted-foreground">
                  Threshold: {metric.threshold}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Recent Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map(alert => (
              <Alert
                key={alert.id}
                variant={alert.type === 'error' ? 'destructive' : 'default'}
              >
                <AlertTitle className="flex items-center space-x-2">
                  {getStatusIcon(alert.type)}
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </AlertTitle>
                <AlertDescription>
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
