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
import { Download, Upload, Save, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import TransformationRuleEditor from '@/components/TransformationRuleEditor';
import type { TransformationRule } from '@shared/schemas/transformations';

// Placeholder for apiRequest function
const apiRequest = async (method: string, url: string, data: any) => {
  // Replace with your actual API request logic
  console.log(`Making ${method} request to ${url} with data:`, data);
  return Promise.resolve(); // Or reject with an error
};

export default function SchemaManager() {
  const [selectedSchema, setSelectedSchema] = useState<'product' | 'order'>('product');
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [transformationRules, setTransformationRules] = useState<TransformationRule[]>([]);
  const [updatedSchemas, setUpdatedSchemas] = useState({
    product: productSchema,
    order: orderSchema
  });
  const { toast } = useToast();

  const handleExportSchema = () => {
    const schema = selectedSchema === 'product' ? updatedSchemas.product : updatedSchemas.order;
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
          setUpdatedSchemas(prev => ({
            ...prev,
            [selectedSchema]: schema
          }));
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

  const handleSchemaChange = (schema: any) => {
    setUpdatedSchemas(prev => ({
      ...prev,
      [selectedSchema]: schema
    }));
    toast({ title: "Schema updated successfully" });
  };

  const handleSaveTransformationRule = (rule: TransformationRule) => {
    setTransformationRules(prev => [...prev, rule]);
    toast({ title: "Transformation rule saved successfully" });
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

      <Tabs defaultValue="schema">
        <TabsList>
          <TabsTrigger value="schema">Schema Editor</TabsTrigger>
          <TabsTrigger value="transformations">Transformation Rules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="schema">
          <SchemaViewer 
            schema={selectedSchema === 'product' ? updatedSchemas.product : updatedSchemas.order}
            onSchemaChange={handleSchemaChange}
          />
        </TabsContent>

        <TabsContent value="transformations">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Transformation Rules</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Create Transformation Rule</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[calc(80vh-8rem)]">
                    <TransformationRuleEditor 
                      sourceSchema={selectedSchema === 'product' ? updatedSchemas.order : updatedSchemas.product}
                      targetSchema={selectedSchema === 'product' ? updatedSchemas.product : updatedSchemas.order}
                      onSave={handleSaveTransformationRule}
                      onExecute={async (rule) => {
                        try {
                          await apiRequest('POST', '/api/jobs', {
                            type: 'transform',
                            rule: rule
                          });
                          toast({ title: "Transformation job started" });
                        } catch (error) {
                          toast({ 
                            title: "Failed to start transformation job",
                            variant: "destructive"
                          });
                        }
                      }}
                    />
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {transformationRules.map(rule => (
                <Card key={rule.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{rule.name}</span>
                      <Badge variant="outline">{rule.triggerEvent}</Badge>
                    </CardTitle>
                    <CardDescription>{rule.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Source</p>
                        <p>{rule.sourceSchema} → {rule.sourcePath}</p>
                      </div>
                      <div>
                        <p className="font-medium">Target</p>
                        <p>{rule.targetSchema} → {rule.targetPath}</p>
                      </div>
                      {rule.condition && (
                        <div className="col-span-2">
                          <p className="font-medium">Condition</p>
                          <pre className="bg-muted p-2 rounded-md">{rule.condition}</pre>
                        </div>
                      )}
                      {rule.customLogic && (
                        <div className="col-span-2">
                          <p className="font-medium">Custom Logic</p>
                          <pre className="bg-muted p-2 rounded-md">{rule.customLogic}</pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Saved Templates</h2>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}