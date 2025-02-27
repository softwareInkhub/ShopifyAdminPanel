import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/layout/Sidebar";
import AdminDashboard from "@/components/AdminDashboard";
import Orders from "@/pages/orders";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Jobs from "@/pages/jobs";
import Analytics from "@/pages/analytics";
import SchemaManager from "@/pages/schema-manager";
import S3Page from "@/pages/aws/s3";
import DynamoDBPage from "@/pages/aws/dynamodb";
import LambdaPage from "@/pages/aws/lambda";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/orders" component={Orders} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/schemas" component={SchemaManager} />
          {/* AWS Routes */}
          <Route path="/aws/s3" component={S3Page} />
          <Route path="/aws/dynamodb" component={DynamoDBPage} />
          <Route path="/aws/lambda" component={LambdaPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;