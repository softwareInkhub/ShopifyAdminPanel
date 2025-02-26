import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';

const timeRanges = {
  '1h': 'Last Hour',
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days'
};

export default function PerformanceMetrics() {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: metrics } = useQuery({
    queryKey: ['performance-metrics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/performance?range=${timeRange}`);
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const syncMetrics = metrics?.sync || [];
  const systemMetrics = metrics?.system || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Analytics</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timeRanges).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sync Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              width={500}
              height={300}
              data={syncMetrics}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                formatter={(value) => [`${value}`, 'Items/sec']}
              />
              <Legend />
              <Line type="monotone" dataKey="syncSpeed" stroke="#8884d8" name="Sync Speed" />
              <Line type="monotone" dataKey="errorRate" stroke="#ff7300" name="Error Rate" />
            </LineChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChart
              width={500}
              height={300}
              data={systemMetrics}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()} />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              />
              <Legend />
              <Area type="monotone" dataKey="cpuUsage" stackId="1" stroke="#8884d8" fill="#8884d8" name="CPU Usage" />
              <Area type="monotone" dataKey="memoryUsage" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Memory Usage" />
            </AreaChart>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
