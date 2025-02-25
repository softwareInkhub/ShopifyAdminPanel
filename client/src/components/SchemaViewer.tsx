import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { productSchema, orderSchema } from '@shared/schemas';

interface SchemaViewerProps {
  schema: typeof productSchema | typeof orderSchema;
}

interface SchemaFieldProps {
  name: string;
  field: any;
  required: boolean;
}

const SchemaField: React.FC<SchemaFieldProps> = ({ name, field, required }) => {
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

  return (
    <div className="py-2 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {required && (
            <Badge variant="destructive" className="text-[10px]">Required</Badge>
          )}
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
    </div>
  );
};

const SchemaViewer: React.FC<SchemaViewerProps> = ({ schema }) => {
  const { properties, required = [] } = schema;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{schema.title}</CardTitle>
        <CardDescription>{schema.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fields">
          <TabsList>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="json">JSON Schema</TabsTrigger>
          </TabsList>
          <TabsContent value="fields" className="space-y-4">
            {Object.entries(properties).map(([name, field]) => (
              <SchemaField
                key={name}
                name={name}
                field={field}
                required={required.includes(name)}
              />
            ))}
          </TabsContent>
          <TabsContent value="json">
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SchemaViewer;
