import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar as CalendarIcon, TrendingUp, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Order status options with colors
const ORDER_STATUSES = {
  all: { label: "All Orders", color: "gray" },
  UNFULFILLED: { label: "Unfulfilled", color: "orange" },
  FULFILLED: { label: "Fulfilled", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
};

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerEmail: string;
  customerName?: string; // Added optional customerName
  totalPrice: number;
  status: string;
  createdAt: string;
  currency: string;
  tax?: number; // Added optional tax
  notes?: string; // Added optional notes
  items?: OrderItem[]; // Added optional items
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    total: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

function Orders() {
  const { get: getFromIDB, set: setInIDB } = useIndexedDB();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 100; // Show 100 orders per page
  const queryClient = useQueryClient();

  // Enhanced fetch function with IndexedDB caching
  const fetchOrders = async (pageNum: number) => {
    const cacheKey = `orders:${JSON.stringify({ filter, search, dateRange, pageNum, pageSize })}`;

    // Try IndexedDB first
    const cachedData = await getFromIDB(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const params = new URLSearchParams();
    if (filter !== 'all') params.append('status', filter);
    if (search) params.append('search', search);
    if (dateRange.from) params.append('from', dateRange.from.toISOString());
    if (dateRange.to) params.append('to', dateRange.to.toISOString());
    params.append('page', pageNum.toString());
    params.append('pageSize', pageSize.toString());

    const res = await fetch(`/api/orders?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();

    // Cache in IndexedDB
    await setInIDB(cacheKey, data, 30 * 60 * 1000); // 30 minutes TTL
    return data;
  };

  // Enhanced prefetch function
  const prefetchPages = async (currentPage: number, totalPages: number) => {
    const pagesToPrefetch = [];
    // Prefetch next 2 pages and previous page
    for (let i = -1; i <= 2; i++) {
      const pageNum = currentPage + i;
      if (pageNum > 0 && pageNum <= totalPages && pageNum !== currentPage) {
        pagesToPrefetch.push(pageNum);
      }
    }

    await Promise.all(
      pagesToPrefetch.map(pageNum =>
        queryClient.prefetchQuery({
          queryKey: ['/api/orders', filter, search, dateRange, pageNum, pageSize],
          queryFn: () => fetchOrders(pageNum),
          staleTime: 5 * 60 * 1000,
          cacheTime: 30 * 60 * 1000,
        })
      )
    );
  };

  // Main query with optimized caching
  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ['/api/orders', filter, search, dateRange, page, pageSize],
    queryFn: () => fetchOrders(page),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    keepPreviousData: true,
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
            batchSize: pageSize
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

  // Memoized stats calculation to prevent unnecessary recalculations
  const stats = useMemo(() => {
    const orders = data?.orders || [];
    return {
      total: data?.pagination?.total || 0,
      fulfilled: orders.filter(o => o.status === 'FULFILLED').length,
      unfulfilled: orders.filter(o => o.status === 'UNFULFILLED').length,
      totalValue: orders.reduce((sum, order) => sum + parseFloat(order.totalPrice.toString()), 0),
      avgValue: orders.length ? orders.reduce((sum, order) => sum + parseFloat(order.totalPrice.toString()), 0) / orders.length : 0
    };
  }, [data]);

  // Optimized page change handler
  const handlePageChange = (newPage: number) => {
    // Check if the next page data is already in cache
    const nextPageData = queryClient.getQueryData(['/api/orders', filter, search, dateRange, newPage, pageSize]);

    // If not in cache, start prefetching
    if (!nextPageData) {
      prefetchPages(newPage, data?.pagination?.totalPages || 1);
    }

    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Enhanced Order Details Modal
  const OrderDetailsModal = ({ order, onClose }: { order: Order | null; onClose: () => void }) => {
    if (!order) return null;

    const statusColors = {
      FULFILLED: 'bg-green-100 text-green-800',
      UNFULFILLED: 'bg-orange-100 text-orange-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };

    return (
      <Dialog open={!!order} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Order Details</DialogTitle>
            <DialogDescription>
              Complete information for order #{order.id}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Order Status Section */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <Badge variant={order.status === 'FULFILLED' ? 'success' :
                              order.status === 'CANCELLED' ? 'destructive' : 'warning'}
                       className="mt-1">
                  {order.status}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Order Date</h3>
                <p className="mt-1 text-sm">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email</h4>
                  <p className="mt-1">{order.customerEmail}</p>
                </div>
                {order.customerName && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Name</h4>
                    <p className="mt-1">{order.customerName}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Financial Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Total Amount</h4>
                  <p className="mt-1 text-xl font-bold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: order.currency
                    }).format(order.totalPrice)}
                  </p>
                </div>
                {order.tax && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Tax</h4>
                    <p className="mt-1">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.currency
                      }).format(order.tax)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items Section */}
            {order.items && order.items.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: order.currency
                          }).format(item.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Additional Information */}
            {order.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {order.status === 'UNFULFILLED' && (
                <Button>Mark as Fulfilled</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor your orders
          </p>
        </div>
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
          <CardHeader>
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
          <CardHeader>
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
          <CardHeader>
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
          <CardHeader>
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

      {/* Orders Table with optimistic loading states */}
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
            ) : (data?.orders || []).map((order) => (
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

      {/* Pagination Controls */}
      {data?.pagination && (
        <div className="flex justify-between items-center mt-4">
          <div>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total} orders
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(Math.min(data.pagination.totalPages, page + 1))}
              disabled={page === data.pagination.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Use the enhanced OrderDetailsModal */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful');
      },
      (err) => {
        console.log('ServiceWorker registration failed:', err);
      }
    );
  });
}

export default function OrdersPage() {
  return (
    <ErrorBoundary>
      <Orders />
    </ErrorBoundary>
  );
}