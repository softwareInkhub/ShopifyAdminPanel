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
import { Copy, Check } from "lucide-react";
import { productSchema, orderSchema } from '@shared/schemas';

interface SchemaViewerProps {
  schema: typeof productSchema | typeof orderSchema;
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

interface JSONViewerProps {
  data: any;
  path?: string;
}

const JSONViewer: React.FC<JSONViewerProps> = ({ data, path = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (typeof data !== 'object' || data === null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{JSON.stringify(data)}</span>
        {path && (
          <Badge 
            variant="outline" 
            className="text-[10px] cursor-pointer" 
            onClick={handleCopyPath}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {path}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="pl-4 border-l border-gray-200">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="py-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{key}:</span>
            {typeof value === 'object' && value !== null ? (
              <Badge 
                variant="outline" 
                className="text-[10px] cursor-pointer" 
                onClick={handleCopyPath}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {path ? `${path}.${key}` : key}
              </Badge>
            ) : null}
          </div>
          <JSONViewer 
            data={value} 
            path={path ? `${path}.${key}` : key}
          />
        </div>
      ))}
    </div>
  );
};

interface TemplateCreatorProps {
  schema: any;
}

const TemplateCreator: React.FC<TemplateCreatorProps> = ({ schema }) => {
  const [templateName, setTemplateName] = useState('');
  const [templateValue, setTemplateValue] = useState('');

  const generateTemplate = () => {
    const template = {};
    const generateForSchema = (schemaObj: any) => {
      const result: any = {};
      Object.entries(schemaObj.properties || {}).forEach(([key, value]: [string, any]) => {
        if (value.type === 'object') {
          result[key] = generateForSchema(value);
        } else if (value.type === 'array') {
          result[key] = [generateForSchema(value.items)];
        } else {
          result[key] = `{{${key}}}`;
        }
      });
      return result;
    };

    const generated = generateForSchema(schema);
    setTemplateValue(JSON.stringify(generated, null, 2));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Template Name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
        <Button onClick={generateTemplate}>Generate Template</Button>
      </div>
      <Textarea
        placeholder="Template JSON"
        value={templateValue}
        onChange={(e) => setTemplateValue(e.target.value)}
        className="font-mono h-[400px]"
      />
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
            <TabsTrigger value="template">Template Creator</TabsTrigger>
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
            <JSONViewer data={schema} />
          </TabsContent>
          <TabsContent value="template">
            <TemplateCreator schema={schema} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SchemaViewer;