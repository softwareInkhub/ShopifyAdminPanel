import { useState } from 'react';
import { productSchema, orderSchema } from '@shared/schemas';
import SchemaViewer from '@/components/SchemaViewer';
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function SchemaManager() {
  const [selectedSchema, setSelectedSchema] = useState<'product' | 'order'>('product');
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const handleExportSchema = () => {
    const schema = selectedSchema === 'product' ? productSchema : orderSchema;
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSchema}-schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSchema = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const schema = JSON.parse(e.target?.result as string);
          // Here you would validate and save the schema
          toast({ title: "Schema imported successfully" });
        } catch (error) {
          toast({ 
            title: "Failed to import schema",
            description: "Invalid JSON format",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSaveTemplate = (name: string, template: string) => {
    try {
      const templateObj = JSON.parse(template);
      setTemplates(prev => ({
        ...prev,
        [name]: templateObj
      }));
      toast({ title: "Template saved successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to save template",
        description: "Invalid JSON format",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Schema Manager</h1>
        <div className="flex gap-2">
          <Select
            value={selectedSchema}
            onValueChange={(value) => setSelectedSchema(value as 'product' | 'order')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select schema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product Schema</SelectItem>
              <SelectItem value="order">Order Schema</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportSchema}>
            <Download className="mr-2 h-4 w-4" />
            Export Schema
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import Schema
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Schema</DialogTitle>
                <DialogDescription>
                  Upload a JSON schema file to import
                </DialogDescription>
              </DialogHeader>
              <Input
                type="file"
                accept=".json"
                onChange={handleImportSchema}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        <SchemaViewer 
          schema={selectedSchema === 'product' ? productSchema : orderSchema} 
        />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Saved Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(templates).map(([name, template]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle>{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[200px]">
                  {JSON.stringify(template, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}