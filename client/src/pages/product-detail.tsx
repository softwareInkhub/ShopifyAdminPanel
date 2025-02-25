import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { type Product } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Tag, Clock, DollarSign, Share2, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { makeShopifyRequest, PRODUCT_DETAIL_QUERY } from "@/lib/shopify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    }
  });

  // Fetch detailed Shopify data
  const { data: shopifyData, isLoading: isLoadingShopify } = useQuery({
    queryKey: ['shopify', product?.shopifyId],
    enabled: !!product?.shopifyId,
    queryFn: async () => {
      try {
        const response = await makeShopifyRequest(PRODUCT_DETAIL_QUERY, {
          id: `gid://shopify/Product/${product?.shopifyId}`
        });
        return response.product;
      } catch (error) {
        console.error('Failed to fetch Shopify data:', error);
        return null;
      }
    }
  });

  const handleUpdateProduct = async (data: Partial<Product>) => {
    try {
      await apiRequest('PATCH', `/api/products/${id}`, data);
      queryClient.invalidateQueries({ queryKey: ['/api/products', id] });
      toast({ title: "Product updated successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to update product",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  const rawData = product.rawData ? JSON.parse(JSON.stringify(product.rawData)) : {};

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
          {product.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Basic product details and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Shopify ID</label>
                <p className="font-mono">{product.shopifyId}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Price</label>
                <p className="text-2xl font-bold">${product.price}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p>{product.category || 'Uncategorized'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p>{format(new Date(product.createdAt), 'PPP')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm">{product.description}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleUpdateProduct({ status: product.status === 'active' ? 'inactive' : 'active' })}>
                {product.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleUpdateProduct({
                      title: formData.get('title') as string,
                      description: formData.get('description') as string,
                      price: formData.get('price') as string,
                      category: formData.get('category') as string,
                    });
                  }}>
                    <Input name="title" defaultValue={product.title} placeholder="Title" />
                    <Input name="description" defaultValue={product.description || ''} placeholder="Description" />
                    <Input name="price" type="number" step="0.01" defaultValue={product.price} placeholder="Price" />
                    <Input name="category" defaultValue={product.category || ''} placeholder="Category" />
                    <Button type="submit">Save Changes</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="variants">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="variants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
                <CardDescription>All available variants of this product</CardDescription>
              </CardHeader>
              <CardContent>
                {shopifyData?.variants?.edges?.map((edge: any) => (
                  <div key={edge.node.id} className="p-4 border rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">{edge.node.title}</p>
                        <p className="text-sm text-muted-foreground">SKU: {edge.node.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${edge.node.price}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {edge.node.inventoryQuantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
                <CardDescription>Current inventory levels and tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shopifyData?.variants?.edges?.map((edge: any) => (
                    <div key={edge.node.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{edge.node.title}</p>
                        <p className="text-sm text-muted-foreground">SKU: {edge.node.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{edge.node.inventoryQuantity}</p>
                        <p className="text-sm text-muted-foreground">In Stock</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Product Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Sales</h3>
                    <p className="text-2xl font-bold">$0.00</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="text-sm font-medium text-muted-foreground">Units Sold</h3>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw Data</CardTitle>
          <CardDescription>Complete product data from Shopify</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
            {JSON.stringify({ ...rawData, ...shopifyData }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}