import { z } from 'zod';

export type TransformationType = 'increment' | 'decrement' | 'sum' | 'count' | 'custom';
export type TriggerEvent = 'onCreate' | 'onUpdate' | 'onDelete';

export const transformationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  sourceSchema: z.string(),
  targetSchema: z.string(),
  sourcePath: z.string(),
  targetPath: z.string(),
  transformationType: z.enum(['increment', 'decrement', 'sum', 'count', 'custom']),
  triggerEvent: z.enum(['onCreate', 'onUpdate', 'onDelete']),
  condition: z.string().optional(),
  customLogic: z.string().optional(),
});

export type TransformationRule = z.infer<typeof transformationRuleSchema>;

export const sampleOrderToProductRule: TransformationRule = {
  id: 'order-product-count',
  name: 'Update Product Order Count',
  description: 'Increment product total order count when a new order is created',
  sourceSchema: 'order',
  targetSchema: 'product',
  sourcePath: 'lineItems[].quantity',
  targetPath: 'totalOrderCount',
  transformationType: 'increment',
  triggerEvent: 'onCreate',
  condition: 'lineItems.length > 0'
};

export function applyTransformation(
  sourceData: any,
  targetData: any,
  rule: TransformationRule
): any {
  switch (rule.transformationType) {
    case 'increment':
      return {
        ...targetData,
        [rule.targetPath]: (targetData[rule.targetPath] || 0) + 
          evaluatePath(sourceData, rule.sourcePath)
      };
    // Add other transformation types here
    default:
      return targetData;
  }
}

function evaluatePath(data: any, path: string): number {
  const parts = path.split('.');
  let value = data;
  
  for (const part of parts) {
    if (part.endsWith('[]')) {
      // Handle array summation
      const arrayKey = part.slice(0, -2);
      if (Array.isArray(value[arrayKey])) {
        return value[arrayKey].reduce((sum: number, item: any) => sum + (parseFloat(item.quantity) || 0), 0);
      }
    } else {
      value = value[part];
    }
  }
  
  return parseFloat(value) || 0;
}
