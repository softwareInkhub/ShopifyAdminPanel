import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import TransformationRuleForm from './TransformationRuleForm';
import JsonPathViewer from './JsonPathViewer';
import { type TransformationRule } from '@shared/schemas/transformations';
import { useToast } from "@/hooks/use-toast";

interface TransformationRuleEditorProps {
  sourceSchema: any;
  targetSchema: any;
  onSave: (rule: TransformationRule) => void;
  onExecute?: (rule: TransformationRule) => void;
}

export default function TransformationRuleEditor({
  sourceSchema,
  targetSchema,
  onSave,
  onExecute
}: TransformationRuleEditorProps) {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<any>(null);

  const handlePreview = async (rule: Partial<TransformationRule>) => {
    try {
      // Here you would typically make an API call to preview the transformation
      const response = await fetch('/api/transformations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });

      if (!response.ok) throw new Error('Preview failed');

      const data = await response.json();
      setPreviewData(data);
      toast({ title: "Preview generated successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to generate preview",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (values: TransformationRule) => {
    try {
      onSave(values);
      toast({ title: "Transformation rule saved successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to save transformation rule",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Transformation Rule</CardTitle>
          <CardDescription>
            Define how data should be transformed between schemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransformationRuleForm
            sourceSchema={sourceSchema}
            targetSchema={targetSchema}
            onSubmit={handleSubmit}
            onPreview={handlePreview}
          />
        </CardContent>
      </Card>

      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Preview of the transformation result</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[400px]">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Source Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <JsonPathViewer data={sourceSchema} />
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <JsonPathViewer data={targetSchema} />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}