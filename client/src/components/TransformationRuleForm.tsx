import React, { useState, useEffect } from 'react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { transformationRuleSchema, type TransformationRule } from '@shared/schemas/transformations';
import JsonPathViewer from './JsonPathViewer';

interface TransformationRuleFormProps {
  sourceSchema: any;
  targetSchema: any;
  initialValues?: Partial<TransformationRule>;
  onSubmit: (values: TransformationRule) => void;
  onPreview?: (values: Partial<TransformationRule>) => void;
}

const TRANSFORMATION_TYPES = [
  { value: 'increment', label: 'Increment Value' },
  { value: 'decrement', label: 'Decrement Value' },
  { value: 'sum', label: 'Sum Values' },
  { value: 'count', label: 'Count Occurrences' },
  { value: 'custom', label: 'Custom Logic' },
];

const TRIGGER_EVENTS = [
  { value: 'onCreate', label: 'On Create' },
  { value: 'onUpdate', label: 'On Update' },
  { value: 'onDelete', label: 'On Delete' },
  { value: 'onDemand', label: 'On Demand (Manual/Job)' },
];

export default function TransformationRuleForm({
  sourceSchema,
  targetSchema,
  initialValues,
  onSubmit,
  onPreview
}: TransformationRuleFormProps) {
  const form = useForm<TransformationRule>({
    resolver: zodResolver(transformationRuleSchema),
    defaultValues: {
      id: String(Date.now()),
      transformationType: 'increment',
      triggerEvent: 'onCreate',
      ...initialValues
    }
  });

  const [selectedPaths, setSelectedPaths] = useState({
    source: initialValues?.sourcePath || '',
    target: initialValues?.targetPath || ''
  });

  // Preview changes as user types
  useEffect(() => {
    if (onPreview) {
      const values = form.getValues();
      onPreview(values);
    }
  }, [form.watch(), onPreview]);

  const handlePathSelect = (type: 'source' | 'target', path: string) => {
    setSelectedPaths(prev => ({ ...prev, [type]: path }));
    form.setValue(type === 'source' ? 'sourcePath' : 'targetPath', path);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Update Product Order Count" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe what this transformation does" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transformationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transformation Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSFORMATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="triggerEvent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRIGGER_EVENTS.map(event => (
                          <SelectItem key={event.value} value={event.value}>
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('transformationType') === 'custom' && (
              <FormField
                control={form.control}
                name="customLogic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Logic</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="font-mono"
                        placeholder="Write your custom transformation logic here"
                      />
                    </FormControl>
                    <FormDescription>
                      Use JavaScript syntax. Available variables: source, target
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="font-mono"
                      placeholder="e.g., source.lineItems.length > 0"
                    />
                  </FormControl>
                  <FormDescription>
                    JavaScript expression that must be true for the transformation to run
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <FormLabel>Source Path</FormLabel>
                  <Badge variant="outline">{selectedPaths.source}</Badge>
                </div>
                <div className="h-[300px] overflow-auto border rounded-md p-4">
                  <JsonPathViewer 
                    data={sourceSchema} 
                    onPathSelect={(path) => handlePathSelect('source', path)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <FormLabel>Target Path</FormLabel>
                  <Badge variant="outline">{selectedPaths.target}</Badge>
                </div>
                <div className="h-[300px] overflow-auto border rounded-md p-4">
                  <JsonPathViewer 
                    data={targetSchema}
                    onPathSelect={(path) => handlePathSelect('target', path)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit">Save Transformation Rule</Button>
          {form.watch('triggerEvent') === 'onDemand' && (
            <Button type="button" variant="outline" onClick={() => onPreview?.(form.getValues())}>
              Preview Transformation
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
