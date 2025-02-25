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
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown } from "lucide-react";

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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const { data: analytics, isLoading } = useQuery<JobAnalytics>({
    queryKey: ['/api/analytics', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  });

  // Format data for pie chart
  const pieData = analytics?.jobsByType 
    ? Object.entries(analytics.jobsByType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }))
    : [];

  // Format data for line chart
  const lineData = analytics?.dailyActivity
    ? Object.entries(analytics.dailyActivity)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([timestamp, count]) => ({
          date: format(new Date(parseInt(timestamp)), 'MMM dd'),
          jobs: count
        }))
    : [];

  // Calculate heatmap data
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapData = () => {
    if (!analytics?.dailyActivity) return { heatmapData: [], maxValue: 0 };

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
            <div className="text-3xl font-bold flex items-center gap-2">
              {analytics?.totalJobs || 0}
              {analytics?.totalJobs > 0 && (
                <TrendingUp className="text-green-600 h-6 w-6" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
              {analytics?.successRate ? `${Math.round(analytics.successRate)}%` : '0%'}
              {analytics?.successRate > 90 ? (
                <TrendingUp className="text-green-600 h-6 w-6" />
              ) : (
                <TrendingDown className="text-red-600 h-6 w-6" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Job Distribution</CardTitle>
            <CardDescription>Distribution of jobs by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Trends</CardTitle>
            <CardDescription>Number of jobs over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="jobs" stroke="#22c55e" />
                </LineChart>
              </ResponsiveContainer>
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
              <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-2">
                <div className="w-16"></div>
                {hours.map(hour => (
                  <div key={hour} className="text-xs text-center">
                    {hour}h
                  </div>
                ))}
              </div>

              {days.map((day, dayIndex) => (
                <div key={day} className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 mb-1">
                  <div className="w-16 text-sm font-medium text-right pr-4 py-2">
                    {day}
                  </div>
                  {hours.map(hour => {
                    const value = heatmapData?.[dayIndex]?.[hour] || 0;
                    const cellId = `${day}-${hour}`;
                    return (
                      <div
                        key={cellId}
                        className={`
                          aspect-square rounded-sm transition-colors duration-200 cursor-pointer
                          hover:ring-2 hover:ring-primary hover:ring-offset-1
                          ${selectedCell === cellId ? 'ring-2 ring-primary ring-offset-1' : ''}
                        `}
                        style={{
                          backgroundColor: getColorIntensity(value),
                        }}
                        onClick={() => setSelectedCell(selectedCell === cellId ? null : cellId)}
                        title={`${day} ${hour}:00 - ${value} jobs`}
                      />
                    );
                  })}
                </div>
              ))}

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