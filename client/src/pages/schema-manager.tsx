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

export default function SchemaManager() {
  const [selectedSchema, setSelectedSchema] = useState<'product' | 'order'>('product');

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
          <Button variant="outline">Export Schema</Button>
          <Button variant="outline">Import Schema</Button>
        </div>
      </div>

      <div className="grid gap-6">
        <SchemaViewer 
          schema={selectedSchema === 'product' ? productSchema : orderSchema} 
        />
      </div>
    </div>
  );
}
