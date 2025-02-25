import { z } from 'zod';

export type TransformationType = 'increment' | 'decrement' | 'sum' | 'count' | 'custom';
export type TriggerEvent = 'onCreate' | 'onUpdate' | 'onDelete' | 'onDemand';

export const transformationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  sourceSchema: z.string(),
  targetSchema: z.string(),
  sourcePath: z.string(),
  targetPath: z.string(),
  transformationType: z.enum(['increment', 'decrement', 'sum', 'count', 'custom']),
  triggerEvent: z.enum(['onCreate', 'onUpdate', 'onDelete', 'onDemand']),
  condition: z.string().optional(),
  customLogic: z.string().optional(),
});

export type TransformationRule = z.infer<typeof transformationRuleSchema>;

// Sample transformation rules that make business sense
export const sampleTransformationRules: TransformationRule[] = [
  {
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
  },
  {
    id: 'product-revenue-tracking',
    name: 'Track Product Revenue',
    description: 'Calculate total revenue for each product based on order line items',
    sourceSchema: 'order',
    targetSchema: 'product',
    sourcePath: 'lineItems',
    targetPath: 'totalRevenue',
    transformationType: 'custom',
    triggerEvent: 'onCreate',
    customLogic: `
      const revenue = source.lineItems
        .filter(item => item.productId === target.id)
        .reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      target.totalRevenue = (parseFloat(target.totalRevenue) || 0) + revenue;
    `
  },
  {
    id: 'product-sales-status',
    name: 'Update Product Sales Status',
    description: 'Update product status based on order volume',
    sourceSchema: 'order',
    targetSchema: 'product',
    sourcePath: 'totalOrderCount',
    targetPath: 'status',
    transformationType: 'custom',
    triggerEvent: 'onDemand',
    customLogic: `
      if (target.totalOrderCount > 100) {
        target.status = 'bestseller';
      } else if (target.totalOrderCount > 50) {
        target.status = 'popular';
      } else if (target.totalOrderCount > 0) {
        target.status = 'active';
      } else {
        target.status = 'inactive';
      }
    `
  },
  {
    id: 'order-quantity-sum',
    name: 'Total Order Quantity',
    description: 'Sum up total quantity ordered for each product',
    sourceSchema: 'order',
    targetSchema: 'product',
    sourcePath: 'lineItems[].quantity',
    targetPath: 'totalQuantityOrdered',
    transformationType: 'sum',
    triggerEvent: 'onCreate',
    condition: 'lineItems.some(item => item.productId === target.id)'
  }
];

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
    case 'sum':
      return {
        ...targetData,
        [rule.targetPath]: evaluatePath(sourceData, rule.sourcePath)
      };
    case 'custom':
      if (rule.customLogic) {
        const updatedTarget = { ...targetData };
        const customLogicFn = new Function('source', 'target', rule.customLogic);
        customLogicFn(sourceData, updatedTarget);
        return updatedTarget;
      }
      return targetData;
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