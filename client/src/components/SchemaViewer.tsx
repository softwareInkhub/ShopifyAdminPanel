import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { productSchema, orderSchema } from '@shared/schemas';
import JsonPathViewer from './JsonPathViewer';
import TransformationRuleEditor from './TransformationRuleEditor';

interface SchemaViewerProps {
  schema: typeof productSchema | typeof orderSchema;
  onSchemaChange?: (schema: any) => void;
}

interface SchemaFieldProps {
  name: string;
  field: any;
  required: boolean;
  path: string;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ name, field, required, path }) => {
  const [copied, setCopied] = useState(false);

  const getTypeColor = (type: string | string[]) => {
    const typeMap: Record<string, string> = {
      string: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      integer: 'bg-green-100 text-green-800',
      boolean: 'bg-yellow-100 text-yellow-800',
      array: 'bg-purple-100 text-purple-800',
      object: 'bg-pink-100 text-pink-800',
    };
    return Array.isArray(type) 
      ? 'bg-gray-100 text-gray-800'
      : typeMap[type] || 'bg-gray-100 text-gray-800';
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-2 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {required && (
            <Badge variant="destructive" className="text-[10px]">Required</Badge>
          )}
          <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={handleCopyPath}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {path}
          </Badge>
        </div>
        <Badge className={getTypeColor(field.type)}>
          {Array.isArray(field.type) ? field.type.join(' | ') : field.type}
        </Badge>
      </div>
      {field.description && (
        <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
      )}
      {field.enum && (
        <div className="mt-1 flex gap-1 flex-wrap">
          {field.enum.map((value: string) => (
            <Badge key={value} variant="outline" className="text-[10px]">
              {value}
            </Badge>
          ))}
        </div>
      )}
      {field.properties && (
        <div className="pl-4 mt-2 border-l">
          {Object.entries(field.properties).map(([subName, subField]: [string, any]) => (
            <SchemaField
              key={`${path}.${subName}`}
              name={subName}
              field={subField}
              required={field.required?.includes(subName) || false}
              path={`${path}.${subName}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SchemaExtenderProps {
  schema: any;
  onExtend: (field: any) => void;
}

const SchemaExtender: React.FC<SchemaExtenderProps> = ({ schema, onExtend }) => {
  const [newField, setNewField] = useState({
    name: '',
    type: 'string',
    description: '',
    required: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExtend({
      [newField.name]: {
        type: newField.type,
        description: newField.description
      }
    });
    setNewField({
      name: '',
      type: 'string',
      description: '',
      required: false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Field Name</Label>
        <Input
          value={newField.name}
          onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., totalOrderCount"
        />
      </div>

      <div className="space-y-2">
        <Label>Field Type</Label>
        <select
          className="w-full border rounded-md p-2"
          value={newField.type}
          onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="integer">Integer</option>
          <option value="boolean">Boolean</option>
          <option value="array">Array</option>
          <option value="object">Object</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={newField.description}
          onChange={(e) => setNewField(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the purpose of this field"
        />
      </div>

      <Button type="submit">Add Field</Button>
    </form>
  );
};

const SchemaViewer: React.FC<SchemaViewerProps> = ({ schema, onSchemaChange }) => {
  const { properties, required = [] } = schema;
  const [selectedTab, setSelectedTab] = useState('fields');

  const handleExtendSchema = (newField: any) => {
    const updatedSchema = {
      ...schema,
      properties: {
        ...schema.properties,
        ...newField
      }
    };
    onSchemaChange?.(updatedSchema);
  };

  const handleSaveTransformation = (rule: any) => {
    console.log('Transformation rule saved:', rule);
    // Here you would typically save the transformation rule to your backend
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{schema.title}</CardTitle>
        <CardDescription>{schema.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fields" onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="json">JSON Schema</TabsTrigger>
            <TabsTrigger value="extend">Extend Schema</TabsTrigger>
            <TabsTrigger value="transform">Transformations</TabsTrigger>
          </TabsList>
          <TabsContent value="fields" className="space-y-4">
            {Object.entries(properties).map(([name, field]) => (
              <SchemaField
                key={name}
                name={name}
                field={field}
                required={required.includes(name)}
                path={name}
              />
            ))}
          </TabsContent>
          <TabsContent value="json">
            <JsonPathViewer data={schema} />
          </TabsContent>
          <TabsContent value="extend">
            <SchemaExtender schema={schema} onExtend={handleExtendSchema} />
          </TabsContent>
          <TabsContent value="transform">
            <TransformationRuleEditor 
              sourceSchema={orderSchema} 
              targetSchema={productSchema}
              onSave={handleSaveTransformation}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SchemaViewer;