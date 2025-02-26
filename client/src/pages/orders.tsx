import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Package, Search, Calendar as CalendarIcon, Filter, ArrowUpDown, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Order status options with colors
const ORDER_STATUSES = {
  all: { label: "All Orders", color: "gray" },
  UNFULFILLED: { label: "Unfulfilled", color: "orange" },
  FULFILLED: { label: "Fulfilled", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
};

interface Order {
  id: string;
  customerEmail: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  currency: string;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

export default function Orders() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch orders with all params
  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ['/api/orders', filter, search, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (search) params.append('search', search);
      if (dateRange.from) params.append('from', dateRange.from.toISOString());
      if (dateRange.to) params.append('to', dateRange.to.toISOString());

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    }
  });

  // Sync orders mutation
  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'orders',
          config: {
            startDate: dateRange.from?.toISOString(),
            endDate: dateRange.to?.toISOString(),
            batchSize: 50
          }
        })
      });
      if (!res.ok) throw new Error('Failed to start sync job');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: "Order sync started" });
    },
    onError: () => {
      toast({ 
        title: "Failed to sync orders",
        variant: "destructive"
      });
    }
  });

  // Calculate statistics from orders data
  const orders = data?.orders || [];
  const stats = {
    total: data?.total || 0,
    fulfilled: orders.filter(o => o.status === 'FULFILLED').length,
    unfulfilled: orders.filter(o => o.status === 'UNFULFILLED').length,
    totalValue: orders.reduce((sum, order) => sum + parseFloat(order.totalPrice.toString()), 0),
    avgValue: orders.length ? orders.reduce((sum, order) => sum + parseFloat(order.totalPrice.toString()), 0) / orders.length : 0
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => syncOrdersMutation.mutate()}
            disabled={syncOrdersMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncOrdersMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Orders
          </Button>
          <Button variant="outline">Export Orders</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total orders in system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fulfillment Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total ? Math.round((stats.fulfilled / stats.total) * 100) : 0}%
              <TrendingUp className="inline-block ml-2 h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toFixed(2)}
              <TrendingUp className="inline-block ml-2 h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.avgValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Date Range
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range: any) => setDateRange(range)}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : orders.map((order) => (
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.customerEmail}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${order.status === 'FULFILLED' ? 'bg-green-100 text-green-800' : ''}
                    ${order.status === 'UNFULFILLED' ? 'bg-orange-100 text-orange-800' : ''}
                    ${order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}`
                  }>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>${parseFloat(order.totalPrice.toString()).toFixed(2)}</TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Order ID</h4>
              <p>{selectedOrder?.id}</p>
            </div>
            <div>
              <h4 className="font-medium">Customer</h4>
              <p>{selectedOrder?.customerEmail}</p>
            </div>
            <div>
              <h4 className="font-medium">Status</h4>
              <p>{selectedOrder?.status}</p>
            </div>
            <div>
              <h4 className="font-medium">Amount</h4>
              <p>${selectedOrder && parseFloat(selectedOrder.totalPrice.toString()).toFixed(2)}</p>
            </div>
            <div>
              <h4 className="font-medium">Date</h4>
              <p>{selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}