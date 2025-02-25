import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import productSchema from './product.schema.json';
import orderSchema from './order.schema.json';

// Export JSON schemas
export { productSchema, orderSchema };

// Create Zod schemas from JSON Schema
const createZodSchemaFromJsonSchema = (jsonSchema: any) => {
  // This is a simplified version, in practice you'd want to handle all JSON Schema features
  const properties = jsonSchema.properties;
  const required = jsonSchema.required || [];
  
  const zodSchema: Record<string, any> = {};
  
  Object.entries(properties).forEach(([key, value]: [string, any]) => {
    let fieldSchema;
    
    switch (value.type) {
      case 'string':
        fieldSchema = z.string();
        if (value.format === 'date-time') {
          fieldSchema = z.string().datetime();
        } else if (value.format === 'email') {
          fieldSchema = z.string().email();
        } else if (value.pattern) {
          fieldSchema = z.string().regex(new RegExp(value.pattern));
        }
        if (value.enum) {
          fieldSchema = z.enum(value.enum);
        }
        break;
      case 'integer':
        fieldSchema = z.number().int();
        break;
      case 'number':
        fieldSchema = z.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'array':
        fieldSchema = z.array(z.any()); // You'd want to recursively handle array items
        break;
      case 'object':
        fieldSchema = z.record(z.any()); // You'd want to recursively handle nested objects
        break;
      default:
        if (Array.isArray(value.type)) {
          // Handle union types
          if (value.type.includes('null')) {
            fieldSchema = z.string().nullable();
          }
        }
        break;
    }
    
    if (fieldSchema) {
      zodSchema[key] = required.includes(key) ? fieldSchema : fieldSchema.optional();
    }
  });
  
  return z.object(zodSchema);
};

export const productZodSchema = createZodSchemaFromJsonSchema(productSchema);
export const orderZodSchema = createZodSchemaFromJsonSchema(orderSchema);

// Type inference
export type Product = z.infer<typeof productZodSchema>;
export type Order = z.infer<typeof orderZodSchema>;

// Validation functions
export const validateProduct = (data: unknown): Product => {
  return productZodSchema.parse(data);
};

export const validateOrder = (data: unknown): Order => {
  return orderZodSchema.parse(data);
};

// Schema utilities
export const getSchemaFields = (schema: any) => {
  return Object.keys(schema.properties);
};

export const getRequiredFields = (schema: any) => {
  return schema.required || [];
};

export const getFieldType = (schema: any, field: string) => {
  return schema.properties[field]?.type;
};

export const getFieldDescription = (schema: any, field: string) => {
  return schema.properties[field]?.description;
};
