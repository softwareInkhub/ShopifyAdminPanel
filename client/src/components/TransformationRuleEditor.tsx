import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import JsonPathViewer from './JsonPathViewer';

type TransformationType = 'increment' | 'decrement' | 'sum' | 'count' | 'custom';
type TriggerEvent = 'onCreate' | 'onUpdate' | 'onDelete' | 'onDemand';

interface TransformationRule {
  id: string;
  name: string;
  description: string;
  sourceSchema: string;
  targetSchema: string;
  sourcePath: string;
  targetPath: string;
  transformationType: TransformationType;
  triggerEvent: TriggerEvent;
  condition?: string;
  customLogic?: string;
}

interface TransformationRuleEditorProps {
  sourceSchema: any;
  targetSchema: any;
  onSave: (rule: TransformationRule) => void;
  onExecute?: (rule: TransformationRule) => void;
}

const PRESET_RULES = {
  orderCountIncrement: {
    name: "Update Product Order Count",
    description: "Increment product total order count when a new order is created",
    sourceSchema: "order",
    targetSchema: "product",
    sourcePath: "lineItems[].quantity",
    targetPath: "totalOrderCount",
    transformationType: "increment" as TransformationType,
    triggerEvent: "onCreate" as TriggerEvent,
    condition: "lineItems.length > 0"
  }
};

export default function TransformationRuleEditor({
  sourceSchema,
  targetSchema,
  onSave,
  onExecute
}: TransformationRuleEditorProps) {
  const [rule, setRule] = useState<Partial<TransformationRule>>({
    transformationType: 'increment',
    triggerEvent: 'onCreate'
  });

  const transformationTypes = [
    { value: 'increment', label: 'Increment Value' },
    { value: 'decrement', label: 'Decrement Value' },
    { value: 'sum', label: 'Sum Values' },
    { value: 'count', label: 'Count Occurrences' },
    { value: 'custom', label: 'Custom Logic' }
  ];

  const triggerEvents = [
    { value: 'onCreate', label: 'On Create' },
    { value: 'onUpdate', label: 'On Update' },
    { value: 'onDelete', label: 'On Delete' },
    { value: 'onDemand', label: 'On Demand (Manual/Job)' }
  ];

  const handleSave = () => {
    if (!rule.name || !rule.sourcePath || !rule.targetPath) {
      return;
    }
    onSave({
      id: Date.now().toString(),
      ...rule as TransformationRule
    });
  };

  const applyPreset = (preset: typeof PRESET_RULES.orderCountIncrement) => {
    setRule(preset);
  };

  const handleExecuteTransformation = () => {
    if (onExecute && rule.name && rule.sourcePath && rule.targetPath) {
      onExecute(rule as TransformationRule);
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => applyPreset(PRESET_RULES.orderCountIncrement)}
            >
              Use Order Count Increment Preset
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input
              value={rule.name || ''}
              onChange={(e) => setRule(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Update Product Order Count"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={rule.description || ''}
              onChange={(e) => setRule(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this transformation does"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Schema</Label>
              <Select
                value={rule.sourceSchema}
                onValueChange={(value) => setRule(prev => ({ ...prev, sourceSchema: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source schema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order Schema</SelectItem>
                  <SelectItem value="product">Product Schema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Schema</Label>
              <Select
                value={rule.targetSchema}
                onValueChange={(value) => setRule(prev => ({ ...prev, targetSchema: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target schema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order Schema</SelectItem>
                  <SelectItem value="product">Product Schema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source Path</Label>
              <Input
                value={rule.sourcePath || ''}
                onChange={(e) => setRule(prev => ({ ...prev, sourcePath: e.target.value }))}
                placeholder="e.g., lineItems[].quantity"
              />
            </div>

            <div className="space-y-2">
              <Label>Target Path</Label>
              <Input
                value={rule.targetPath || ''}
                onChange={(e) => setRule(prev => ({ ...prev, targetPath: e.target.value }))}
                placeholder="e.g., totalOrderCount"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transformation Type</Label>
              <Select
                value={rule.transformationType}
                onValueChange={(value: TransformationType) => 
                  setRule(prev => ({ ...prev, transformationType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {transformationTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select
                value={rule.triggerEvent}
                onValueChange={(value: TriggerEvent) => 
                  setRule(prev => ({ ...prev, triggerEvent: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {triggerEvents.map(event => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {rule.transformationType === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Logic</Label>
              <Textarea
                value={rule.customLogic || ''}
                onChange={(e) => setRule(prev => ({ ...prev, customLogic: e.target.value }))}
                placeholder="Write your custom transformation logic here"
                className="font-mono"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Condition (Optional)</Label>
            <Textarea
              value={rule.condition || ''}
              onChange={(e) => setRule(prev => ({ ...prev, condition: e.target.value }))}
              placeholder="Add a condition for when this transformation should be applied"
              className="font-mono"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>Save Transformation Rule</Button>
            {rule.triggerEvent === 'onDemand' && (
              <Button variant="outline" onClick={handleExecuteTransformation}>
                Execute Transformation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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