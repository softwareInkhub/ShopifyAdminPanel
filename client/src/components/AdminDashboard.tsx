import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings2, Layout, LayoutGrid, ChevronRight } from "lucide-react";
import SyncHealthDashboard from './SyncHealthDashboard';

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  detailComponent?: React.ReactNode;
  enabled: boolean;
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'sync-health',
    title: 'Sync Health Monitor',
    description: 'Real-time sync status and performance metrics',
    component: <SyncSummaryWidget />,
    detailComponent: <SyncHealthDashboard />,
    enabled: true
  },
  {
    id: 'performance',
    title: 'Performance Analytics',
    description: 'Detailed performance metrics and trends',
    component: <PerformanceMetricsSummary />,
    detailComponent: <PerformanceMetrics />,
    enabled: true
  },
  {
    id: 'system-health',
    title: 'System Health',
    description: 'Real-time system monitoring and alerts',
    component: <SystemHealthSummary />,
    detailComponent: <SystemHealth />,
    enabled: true
  },
  {
    id: 'orders',
    title: 'Recent Orders',
    description: 'Latest order activity and statistics',
    component: <OrdersSummaryWidget />,
    detailComponent: <OrdersDetailView />,
    enabled: true
  },
  {
    id: 'products',
    title: 'Product Analytics',
    description: 'Product performance and inventory metrics',
    component: <ProductsSummaryWidget />,
    detailComponent: <ProductsDetailView />,
    enabled: true
  },
  {
    id: 'cache',
    title: 'Cache Performance',
    description: 'Cache hit rates and optimization metrics',
    component: <CacheSummaryWidget />,
    detailComponent: <CacheDetailView />,
    enabled: true
  }
];

export default function AdminDashboard() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setWidgets(items);
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  const selectedWidgetData = widgets.find(w => w.id === selectedWidget);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your application performance
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLayout(prev => prev === 'grid' ? 'list' : 'grid')}
            className="h-10 w-10"
          >
            {layout === 'grid' ? <LayoutGrid className="h-5 w-5" /> : <Layout className="h-5 w-5" />}
          </Button>
          <Button
            variant={isCustomizing ? "secondary" : "outline"}
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="h-10"
          >
            <Settings2 className="h-5 w-5 mr-2" />
            Customize
          </Button>
        </div>
      </div>

      {isCustomizing ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Dashboard Customization</CardTitle>
            <CardDescription>
              Enable/disable widgets and drag to reorder them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="widgets">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {widgets.map((widget, index) => (
                      <Draggable
                        key={widget.id}
                        draggableId={widget.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-4 bg-card rounded-lg border"
                          >
                            <div>
                              <h3 className="font-semibold">{widget.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {widget.description}
                              </p>
                            </div>
                            <Switch
                              checked={widget.enabled}
                              onCheckedChange={() => toggleWidget(widget.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-6 ${
          layout === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1'
        }`}>
          {widgets
            .filter(w => w.enabled)
            .map(widget => (
              <Card
                key={widget.id}
                className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-[200px]"
                onClick={() => setSelectedWidget(widget.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{widget.title}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription className="text-sm">{widget.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {widget.component}
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}

      <Dialog open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedWidgetData?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-6">
            {selectedWidgetData?.detailComponent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SyncSummaryWidget() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['syncMetrics'],
    queryFn: async () => {
      const response = await fetch('/api/sync/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch sync metrics');
      }
      return response.json();
    },
    refetchInterval: 5000
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="animate-pulse bg-gray-200 h-16 rounded" />
        <div className="animate-pulse bg-gray-200 h-16 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Error loading sync metrics
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium">Sync Speed</p>
        <p className="text-2xl">{metrics?.currentSpeed || 0}/s</p>
      </div>
      <div>
        <p className="text-sm font-medium">Error Rate</p>
        <p className="text-2xl">{metrics?.errorRate || 0}%</p>
      </div>
    </div>
  );
}

function OrdersSummaryWidget() {
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders?page=1&limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse bg-gray-200 h-8 rounded" />
        <div className="space-y-1">
          <div className="animate-pulse bg-gray-200 h-4 rounded" />
          <div className="animate-pulse bg-gray-200 h-4 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Error loading orders
      </div>
    );
  }

  const recentOrders = ordersData?.orders?.slice(0, 2) || [];
  const totalOrders = ordersData?.pagination?.total || 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Total Orders</p>
        <p className="text-2xl">{totalOrders}</p>
      </div>
      <div className="text-sm text-muted-foreground">
        {recentOrders.map((order: any) => (
          <div key={order.id} className="truncate">
            Order #{order.id} - ${order.totalPrice}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductsSummaryWidget() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    }
  });

  // Safely access the products array from the response
  const productsArray = products?.products || [];
  const totalProducts = productsArray.length || 0;
  const totalValue = productsArray.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">Products</p>
          <p className="text-2xl">{totalProducts}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Value</p>
          <p className="text-2xl">${totalValue.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
}

function CacheSummaryWidget() {
  const { data: metrics } = useQuery({
    queryKey: ['cache-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/cache/metrics');
      return response.json();
    },
    refetchInterval: 5000
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium">Hit Rate</p>
        <p className="text-2xl">{metrics?.hitRate?.toFixed(1)}%</p>
      </div>
      <div>
        <p className="text-sm font-medium">Items</p>
        <p className="text-2xl">{metrics?.itemCount}</p>
      </div>
    </div>
  );
}

function OrdersDetailView() {
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orders?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${orders?.reduce((sum: number, order: any) => sum + parseFloat(order.totalPrice), 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {orders?.map((order: any) => (
                <div key={order.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-lg">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-lg">${order.totalPrice}</p>
                      <p className="text-sm text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
                    {order.rawData && (
                      <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                        {JSON.stringify(order.rawData, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsDetailView() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      return response.json();
    }
  });

  const totalValue = products?.reduce((sum: number, product: any) =>
    sum + (parseFloat(product.price) || 0), 0
  ) || 0;

  const productsByStatus = products?.reduce((acc: Record<string, number>, product: any) => {
    acc[product.status] = (acc[product.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{products?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(productsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="font-medium">{status}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {products?.map((product: any) => (
                <div key={product.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-lg">{product.title}</p>
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-lg">${product.price}</p>
                      <p className="text-sm text-muted-foreground">{product.status}</p>
                    </div>
                  </div>
                  {product.rawData && (
                    <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                      {JSON.stringify(product.rawData, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function CacheDetailView() {
  const { data: metrics } = useQuery({
    queryKey: ['cache-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/cache/metrics');
      return response.json();
    },
    refetchInterval: 5000
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Hit Rate</CardTitle>
            <CardDescription>Cache effectiveness</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.hitRate?.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Miss Rate</CardTitle>
            <CardDescription>Cache misses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.missRate?.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cache Size</CardTitle>
            <CardDescription>Total cached items</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.itemCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response Time</CardTitle>
            <CardDescription>Average latency</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics?.averageResponseTime?.toFixed(2)}ms</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PerformanceMetricsSummary() {
  const { data: metrics } = useQuery({
    queryKey: ['performance-metrics-summary'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/performance/summary');
      return response.json();
    },
    refetchInterval: 30000
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium">Avg Response</p>
        <p className="text-2xl">{metrics?.avgResponse || 0}ms</p>
      </div>
      <div>
        <p className="text-sm font-medium">Error Rate</p>
        <p className="text-2xl">{metrics?.errorRate || 0}%</p>
      </div>
    </div>
  );
}

function SystemHealthSummary() {
  const { data: health } = useQuery({
    queryKey: ['system-health-summary'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/health/summary');
      return response.json();
    },
    refetchInterval: 30000
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">System Status</p>
        <p className={`text-lg font-semibold ${getStatusColor(health?.status || 'unknown')}`}>
          {(health?.status || 'Unknown').toUpperCase()}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {health?.activeAlerts || 0} active alerts
      </p>
    </div>
  );
}

// Placeholder components - Replace with actual implementations
function PerformanceMetrics() { return <div>Performance Metrics Detail</div>; }
function SystemHealth() { return <div>System Health Detail</div>; }