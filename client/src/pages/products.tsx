import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { type Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const PRODUCT_CATEGORIES = [
  "All",
  "Electronics",
  "Clothing",
  "Books",
  "Home & Garden",
  "Sports",
  "Other",
];

export default function Products() {
  const { toast } = useToast();
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    category: "All",
    status: "all",
    priceRange: { min: "", max: "" },
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch products
  const { data, isLoading } = useQuery<{
    products: Product[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/products", search, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filters.category !== "All")
        params.append("category", filters.category);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.priceRange.min)
        params.append("minPrice", filters.priceRange.min);
      if (filters.priceRange.max)
        params.append("maxPrice", filters.priceRange.max);

      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Sync products mutation
  const syncProductsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "products",
          config: { batchSize: 50 },
        }),
      });
      if (!res.ok) throw new Error("Failed to start sync");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product sync started" });
    },
    onError: () => {
      toast({
        title: "Failed to sync products",
        variant: "destructive",
      });
    },
  });

  // Batch operations mutations
  const batchUpdateMutation = useMutation({
    mutationFn: async ({
      ids,
      data,
    }: {
      ids: number[];
      data: Partial<Product>;
    }) => {
      const promises = ids.map((id) =>
        apiRequest("PATCH", `/api/products/${id}`, data)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts([]);
      toast({ title: "Products updated successfully" });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const promises = ids.map((id) =>
        apiRequest("DELETE", `/api/products/${id}`)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setSelectedProducts([]);
      toast({ title: "Products deleted successfully" });
    },
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (product: Partial<Product>) =>
      apiRequest("POST", "/api/products", product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created successfully" });
      setIsDialogOpen(false);
    },
  });

  // Update product mutation with proper cache invalidation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Product>;
    }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated successfully" });
      setIsDialogOpen(false);
      setEditProduct(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
  });

  // Calculate statistics from the products array
  const stats = data?.products
    ? {
        total: data.products.length,
        active: data.products.filter((p) => p.status === "active").length,
        totalValue: data.products.reduce(
          (sum, p) => sum + parseFloat(p.price || '0'),
          0
        ),
        avgPrice: data.products.length
          ? data.products.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0) /
            data.products.length
          : 0,
      }
    : null;

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedProducts.length === data?.products?.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(data?.products?.map((p) => p.id) || []);
    }
  };

  const handleSelectProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => syncProductsMutation.mutate()}
            disabled={syncProductsMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${
              syncProductsMutation.isPending ? "animate-spin" : ""
            }`} />
            Sync Products
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditProduct(null);
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    title: formData.get("title") as string,
                    description: formData.get("description") as string,
                    price: formData.get("price") as string,
                    category: formData.get("category") as string,
                    status: formData.get("status") as string || "active",
                  };

                  if (editProduct) {
                    updateMutation.mutate({ id: editProduct.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
              >
                <div className="space-y-4">
                  <Input
                    name="title"
                    placeholder="Product Title"
                    defaultValue={editProduct?.title || ""}
                    required
                  />
                  <Textarea
                    name="description"
                    placeholder="Product Description"
                    defaultValue={editProduct?.description || ""}
                  />
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    defaultValue={editProduct?.price || ""}
                    required
                  />
                  <Select
                    name="category"
                    defaultValue={editProduct?.category || "Other"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.filter((c) => c !== "All").map(
                        (category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <Select
                    name="status"
                    defaultValue={editProduct?.status || "active"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {editProduct ? (
                      updateMutation.isPending ? (
                        "Updating..."
                      ) : (
                        "Update"
                      )
                    ) : (
                      createMutation.isPending ? (
                        "Creating..."
                      ) : (
                        "Create"
                      )
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.active || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalValue.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.avgPrice.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filters.category}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, category: value }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              Price Range
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Price Range</h4>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, min: e.target.value },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: { ...prev.priceRange, max: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Batch Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedProducts.length} products selected
          </span>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    batchUpdateMutation.mutate({
                      ids: selectedProducts,
                      data: { status: "active" },
                    })
                  }
                >
                  Set Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    batchUpdateMutation.mutate({
                      ids: selectedProducts,
                      data: { status: "inactive" },
                    })
                  }
                >
                  Set Inactive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => batchDeleteMutation.mutate(selectedProducts)}
                >
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === data?.products?.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.products?.map((product) => (
              <TableRow
                key={product.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedProduct(product)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => handleSelectProduct(product.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {product.title}
                </TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>{product.category || "Other"}</TableCell>
                <TableCell>${product.price}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {product.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProduct(product);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const data = { ...product };
                        delete data.id;
                        createMutation.mutate(data);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/products/${product.id}`, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(product.id);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedProduct?.title}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/products/${selectedProduct?.id}`, "_blank");
                  setSelectedProduct(null);
                }}
              >
                Open in New Tab
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="grid gap-4 py-4">
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>
                <TabsContent value="details">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium mb-2">
                        Product Information
                      </h3>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">ID</dt>
                          <dd>{selectedProduct.shopifyId}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Status</dt>
                          <dd>{selectedProduct.status}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">
                            Category
                          </dt>
                          <dd>
                            {selectedProduct.category || "Uncategorized"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Price</dt>
                          <dd>${selectedProduct.price}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm">
                        {selectedProduct.description}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="variants">
                  {selectedProduct.rawData?.variants?.edges?.map(
                    (edge: any) => (
                      <div
                        key={edge.node.id}
                        className="p-4 border rounded-lg mb-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium">
                              {edge.node.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {edge.node.sku}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              ${edge.node.price}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Stock: {edge.node.inventoryQuantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </TabsContent>
                <TabsContent value="raw">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedProduct.rawData, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}