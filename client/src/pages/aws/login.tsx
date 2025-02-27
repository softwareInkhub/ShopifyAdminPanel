import { useState } from "react";
import { useNavigate } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiAmazonaws } from "react-icons/si";
import { useAWS } from "@/contexts/AWSContext";

const formSchema = z.object({
  accessKeyId: z.string().min(16, "Access Key ID must be at least 16 characters"),
  secretAccessKey: z.string().min(16, "Secret Access Key must be at least 16 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AWSLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAWS();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessKeyId: "",
      secretAccessKey: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      await login(data.accessKeyId, data.secretAccessKey);
      toast({ title: "Successfully logged in to AWS" });
      navigate("/aws/dashboard");
    } catch (error) {
      toast({
        title: "Failed to login",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-lg py-10">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <SiAmazonaws className="h-10 w-10 text-orange-500" />
          </div>
          <CardTitle className="text-2xl text-center">AWS Login</CardTitle>
          <CardDescription className="text-center">
            Enter your AWS credentials to manage your resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="accessKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your AWS Access Key ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secretAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Access Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your AWS Secret Access Key"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login to AWS"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
