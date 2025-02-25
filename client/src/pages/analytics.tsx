import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

// Import types
import type { Job, JobBatch } from "@shared/schema";

interface JobAnalytics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
  jobsByType: {
    [key: string]: number;
  };
  dailyActivity: {
    [key: string]: number;
  };
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");

  const { data: analytics, isLoading } = useQuery<JobAnalytics>({
    queryKey: ['/api/analytics', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  });

  // Calculate heatmap data
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);
  
  const getHeatmapData = () => {
    if (!analytics?.dailyActivity) return [];
    
    const heatmapData = [];
    for (const [timestamp, count] of Object.entries(analytics.dailyActivity)) {
      const date = new Date(parseInt(timestamp));
      heatmapData.push({
        day: daysOfWeek[date.getDay()],
        hour: date.getHours(),
        value: count
      });
    }
    return heatmapData;
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.totalJobs || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics?.successRate ? `${Math.round(analytics.successRate)}%` : '0%'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.averageProcessingTime 
                ? `${Math.round(analytics.averageProcessingTime)}s` 
                : '0s'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {analytics?.failedJobs || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>Job activity by day and hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-24 gap-1">
              {/* Hours labels */}
              <div className="col-span-24 grid grid-cols-24 text-xs text-center mb-2">
                {hoursOfDay.map(hour => (
                  <div key={hour}>{hour}h</div>
                ))}
              </div>
              
              {/* Days and cells */}
              {daysOfWeek.map(day => (
                <div key={day} className="col-span-24 grid grid-cols-24 gap-1">
                  <div className="text-xs text-right pr-2">{day}</div>
                  {hoursOfDay.map(hour => {
                    const data = getHeatmapData().find(d => d.day === day && d.hour === hour);
                    const intensity = data ? Math.min(data.value / 10, 1) : 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="aspect-square rounded"
                        style={{
                          backgroundColor: `rgba(34, 197, 94, ${intensity})`,
                          transition: 'background-color 0.3s'
                        }}
                        title={data ? `${data.value} jobs` : '0 jobs'}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
