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
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapData = () => {
    if (!analytics?.dailyActivity) return [];

    const heatmapData = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxValue = 0;

    for (const [timestamp, count] of Object.entries(analytics.dailyActivity)) {
      const date = new Date(parseInt(timestamp));
      const day = date.getDay();
      const hour = date.getHours();
      heatmapData[day][hour] += count;
      maxValue = Math.max(maxValue, heatmapData[day][hour]);
    }

    return { heatmapData, maxValue };
  };

  const { heatmapData, maxValue } = getHeatmapData();

  const getColorIntensity = (value: number) => {
    if (maxValue === 0) return 'rgba(34, 197, 94, 0)';
    const intensity = Math.min((value / maxValue) * 0.8 + 0.2, 1);
    return `rgba(34, 197, 94, ${intensity})`;
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

      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>Job activity by day and hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="relative">
              {/* Hours header */}
              <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-2">
                <div className="w-16"></div>
                {hours.map(hour => (
                  <div key={hour} className="text-xs text-center">
                    {hour}h
                  </div>
                ))}
              </div>

              {/* Days and heatmap cells */}
              {days.map((day, dayIndex) => (
                <div key={day} className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1">
                  <div className="w-16 text-sm font-medium text-right pr-4 py-2">
                    {day}
                  </div>
                  {hours.map(hour => {
                    const value = heatmapData?.[dayIndex]?.[hour] || 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="aspect-square rounded-sm transition-colors duration-200"
                        style={{
                          backgroundColor: getColorIntensity(value),
                          cursor: 'pointer',
                        }}
                        title={`${day} ${hour}:00 - ${value} jobs`}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="mt-4 flex items-center justify-end space-x-2">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex h-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-full"
                      style={{
                        backgroundColor: getColorIntensity((i + 1) * (maxValue / 5)),
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}