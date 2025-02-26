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
import { Settings2, Layout, LayoutGrid } from "lucide-react";
import SyncHealthDashboard from './SyncHealthDashboard';

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
  enabled: boolean;
}

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'sync-health',
    title: 'Sync Health Monitor',
    description: 'Real-time sync status and performance metrics',
    component: <SyncHealthDashboard />,
    enabled: true
  },
  {
    id: 'orders',
    title: 'Recent Orders',
    description: 'Latest order activity and statistics',
    component: <OrdersWidget />,
    enabled: true
  },
  {
    id: 'products',
    title: 'Product Analytics',
    description: 'Product performance and inventory metrics',
    component: <ProductsWidget />,
    enabled: true
  },
  {
    id: 'cache',
    title: 'Cache Performance',
    description: 'Cache hit rates and optimization metrics',
    component: <CacheMetricsWidget />,
    enabled: true
  }
];

export default function AdminDashboard() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [isCustomizing, setIsCustomizing] = useState(false);

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
        <div className={`grid gap-6 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2' : ''}`}>
          {widgets
            .filter(w => w.enabled)
            .map(widget => (
              <Card key={widget.id}>
                <CardHeader>
                  <CardTitle>{widget.title}</CardTitle>
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
