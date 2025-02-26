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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Settings2, Layout, LayoutGrid, ChevronRight } from "lucide-react";
import SyncHealthDashboard from './SyncHealthDashboard';

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  detailComponent?: React.ReactNode;
  enabled: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'sync-health',
    title: 'Sync Health Monitor',
    description: 'Real-time sync status and performance metrics',
    component: <SyncHealthDashboard />,
    detailComponent: <SyncHealthDashboard />,
    enabled: true,
    size: 'lg'
  },
  {
    id: 'orders',
    title: 'Recent Orders',
    description: 'Latest order activity and statistics',
    component: <OrdersWidget />,
    detailComponent: <OrdersDetailView />,
    enabled: true,
    size: 'md'
  },
  {
    id: 'products',
    title: 'Product Analytics',
    description: 'Product performance and inventory metrics',
    component: <ProductsWidget />,
    detailComponent: <ProductsDetailView />,
    enabled: true,
    size: 'md'
  },
  {
    id: 'cache',
    title: 'Cache Performance',
    description: 'Cache hit rates and optimization metrics',
    component: <CacheMetricsWidget />,
    detailComponent: <CacheDetailView />,
    enabled: true,
    size: 'sm'
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

  const getWidgetSize = (size: 'sm' | 'md' | 'lg' = 'md') => {
    switch (size) {
      case 'sm': return 'col-span-1';
      case 'lg': return 'col-span-2';
      default: return 'col-span-1 md:col-span-1';
    }
  };

  const selectedWidgetData = widgets.find(w => w.id === selectedWidget);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor your application performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLayout(prev => prev === 'grid' ? 'list' : 'grid')}
          >
            {layout === 'grid' ? <LayoutGrid className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
          </Button>
          <Button
            variant={isCustomizing ? "secondary" : "outline"}
            onClick={() => setIsCustomizing(!isCustomizing)}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Customize
          </Button>
        </div>
      </div>

      {isCustomizing ? (
        <Card>
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
                    className="space-y-2"
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
                              <h3 className="font-medium">{widget.title}</h3>
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
        <div className={`grid gap-6 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}`}>
          {widgets
            .filter(w => w.enabled)
            .map(widget => (
              <Card 
                key={widget.id}
                className={`${layout === 'grid' ? getWidgetSize(widget.size) : ''} 
                  hover:shadow-lg transition-shadow duration-200 cursor-pointer`}
                onClick={() => setSelectedWidget(widget.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{widget.title}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>{widget.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {widget.component}
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}

      <Sheet open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)}>
        <SheetContent side="right" className="w-[90vw] sm:w-[545px]">
          <SheetHeader>
            <SheetTitle>{selectedWidgetData?.title}</SheetTitle>
            <SheetDescription>{selectedWidgetData?.description}</SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedWidgetData?.detailComponent}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OrdersWidget() {
  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      return response.json();
    }
  });

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4">
        {orders?.map((order: any) => (
          <div key={order.id} className="flex justify-between items-center p-2 bg-muted rounded">
            <div>
              <p className="font-medium">Order #{order.id}</p>
              <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">${order.totalPrice}</p>
              <p className="text-sm text-muted-foreground">{order.status}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
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

function ProductsWidget() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      return response.json();
    }
  });

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4">
        {products?.map((product: any) => (
          <div key={product.id} className="flex justify-between items-center p-2 bg-muted rounded">
            <div>
              <p className="font-medium">{product.title}</p>
              <p className="text-sm text-muted-foreground">{product.status}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">${product.price}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
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

function CacheMetricsWidget() {
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
        <p className="text-sm font-medium">Miss Rate</p>
        <p className="text-2xl">{metrics?.missRate?.toFixed(1)}%</p>
      </div>
      <div>
        <p className="text-sm font-medium">Cache Size</p>
        <p className="text-2xl">{metrics?.itemCount}</p>
      </div>
      <div>
        <p className="text-sm font-medium">Avg Response</p>
        <p className="text-2xl">{metrics?.averageResponseTime?.toFixed(2)}ms</p>
      </div>
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