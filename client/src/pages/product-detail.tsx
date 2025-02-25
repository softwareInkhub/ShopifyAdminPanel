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
import { ArrowLeft, Package, Tag, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    }
  });

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
                <label className="text-sm font-medium text-muted-foreground">ID</label>
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
          </CardContent>
        </Card>

        <Tabs defaultValue="variants">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>
          <TabsContent value="variants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
                <CardDescription>All available variants of this product</CardDescription>
              </CardHeader>
              <CardContent>
                {rawData.variants?.edges?.map((edge: any) => (
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
                  {rawData.variants?.edges?.map((edge: any) => (
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
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw Data</CardTitle>
                <CardDescription>Complete product data from Shopify</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
