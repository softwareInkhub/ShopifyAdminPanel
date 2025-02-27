import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Database, Plus, Trash2, Loader2 } from "lucide-react";
import { useDynamoDB } from "@/hooks/aws/useDynamoDB";
import { Skeleton } from "@/components/ui/skeleton";

export default function DynamoDBPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  const {
    tables,
    tablesLoading,
    queryTable,
    createTable,
    deleteTable,
    putItem
  } = useDynamoDB();

  // Get items for selected table
  const {
    data: items = [],
    isLoading: itemsLoading,
    error: itemsError
  } = queryTable(selectedTable || "");

  // Function to format DynamoDB attributes for display
  const formatAttribute = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">DynamoDB Tables</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AWS DynamoDB tables and items
          </p>
        </div>
        <Button onClick={() => setIsCreateTableOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Table
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tables List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tables</CardTitle>
          </CardHeader>
          <CardContent>
            {tablesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {tables.map((table) => (
                  <div
                    key={table.TableName}
                    className={`
                      flex items-center justify-between p-3 rounded-lg cursor-pointer
                      ${selectedTable === table.TableName ? 'bg-primary/10' : 'hover:bg-muted'}
                    `}
                    onClick={() => setSelectedTable(table.TableName)}
                  >
                    <div className="flex items-center">
                      <Database className="mr-2 h-4 w-4" />
                      <div>
                        <div>{table.TableName}</div>
                        <div className="text-sm text-muted-foreground">
                          {table.ItemCount} items • {table.TableStatus}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTable.mutate(table.TableName);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedTable ? `Items in ${selectedTable}` : 'Select a table to view items'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTable ? (
              itemsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : itemsError ? (
                <div className="text-center py-8 text-destructive">
                  Error loading items. Please try again.
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items found in this table
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Data</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <pre className="whitespace-pre-wrap text-sm">
                              {formatAttribute(item)}
                            </pre>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a table to view its contents
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Table Dialog */}
      <Dialog open={isCreateTableOpen} onOpenChange={setIsCreateTableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Table Name</label>
              <Input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Enter table name"
              />
            </div>
            <Button
              onClick={() => {
                createTable.mutate({
                  TableName: newTableName,
                  AttributeDefinitions: [
                    { AttributeName: "id", AttributeType: "S" }
                  ],
                  KeySchema: [
                    { AttributeName: "id", KeyType: "HASH" }
                  ],
                  ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                  }
                });
                setIsCreateTableOpen(false);
                setNewTableName("");
              }}
              disabled={!newTableName.trim() || createTable.isPending}
            >
              {createTable.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}