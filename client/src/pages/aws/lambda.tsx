import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal, Plus, Trash2, Play, Code, Loader2 } from "lucide-react";
import { useLambda } from "@/hooks/aws/useLambda";
import { Skeleton } from "@/components/ui/skeleton";

const RUNTIMES = [
  "nodejs20.x",
  "nodejs18.x",
  "python3.11",
  "python3.10",
  "java17",
  "java11",
  "dotnet6",
  "go1.x",
  "ruby3.2"
];

export default function LambdaPage() {
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [isCreateFunctionOpen, setIsCreateFunctionOpen] = useState(false);
  const [isInvokeDialogOpen, setIsInvokeDialogOpen] = useState(false);
  const [newFunctionData, setNewFunctionData] = useState({
    name: "",
    runtime: "nodejs20.x",
    handler: "index.handler",
    code: "exports.handler = async (event) => {\n  return {\n    statusCode: 200,\n    body: JSON.stringify({ message: 'Hello from Lambda!' })\n  };\n};",
    description: "",
    memory: 128,
    timeout: 3
  });
  const [invokePayload, setInvokePayload] = useState("{}");

  const {
    functions,
    functionsLoading,
    createFunction,
    deleteFunction,
    invokeFunction
  } = useLambda();

  const handleCreateFunction = () => {
    createFunction.mutate({
      FunctionName: newFunctionData.name,
      Runtime: newFunctionData.runtime,
      Handler: newFunctionData.handler,
      Code: {
        ZipFile: Buffer.from(newFunctionData.code).toString('base64')
      },
      Description: newFunctionData.description,
      MemorySize: newFunctionData.memory,
      Timeout: newFunctionData.timeout,
      Role: process.env.AWS_LAMBDA_ROLE
    });
    setIsCreateFunctionOpen(false);
    setNewFunctionData({
      name: "",
      runtime: "nodejs20.x",
      handler: "index.handler",
      code: "exports.handler = async (event) => {\n  return {\n    statusCode: 200,\n    body: JSON.stringify({ message: 'Hello from Lambda!' })\n  };\n};",
      description: "",
      memory: 128,
      timeout: 3
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lambda Functions</h1>
          <p className="text-muted-foreground mt-2">
            Manage and execute your AWS Lambda functions
          </p>
        </div>
        <Button onClick={() => setIsCreateFunctionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Function
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Functions</CardTitle>
          </CardHeader>
          <CardContent>
            {functionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : functions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No Lambda functions found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Runtime</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead>Timeout</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {functions.map((func) => (
                    <TableRow key={func.FunctionName}>
                      <TableCell>{func.FunctionName}</TableCell>
                      <TableCell>{func.Runtime}</TableCell>
                      <TableCell>{new Date(func.LastModified).toLocaleString()}</TableCell>
                      <TableCell>{func.MemorySize} MB</TableCell>
                      <TableCell>{func.Timeout}s</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFunction(func.FunctionName);
                              setIsInvokeDialogOpen(true);
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFunction.mutate(func.FunctionName)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Function Dialog */}
      <Dialog open={isCreateFunctionOpen} onOpenChange={setIsCreateFunctionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Function</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Function Name</label>
              <Input
                value={newFunctionData.name}
                onChange={(e) => setNewFunctionData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="my-lambda-function"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Runtime</label>
              <Select
                value={newFunctionData.runtime}
                onValueChange={(value) => setNewFunctionData(prev => ({ ...prev, runtime: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select runtime" />
                </SelectTrigger>
                <SelectContent>
                  {RUNTIMES.map(runtime => (
                    <SelectItem key={runtime} value={runtime}>
                      {runtime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Handler</label>
              <Input
                value={newFunctionData.handler}
                onChange={(e) => setNewFunctionData(prev => ({ ...prev, handler: e.target.value }))}
                placeholder="index.handler"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Function Code</label>
              <Textarea
                value={newFunctionData.code}
                onChange={(e) => setNewFunctionData(prev => ({ ...prev, code: e.target.value }))}
                className="font-mono"
                rows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Memory (MB)</label>
                <Input
                  type="number"
                  value={newFunctionData.memory}
                  onChange={(e) => setNewFunctionData(prev => ({ ...prev, memory: parseInt(e.target.value) }))}
                  min={128}
                  max={10240}
                  step={64}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timeout (seconds)</label>
                <Input
                  type="number"
                  value={newFunctionData.timeout}
                  onChange={(e) => setNewFunctionData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                  min={1}
                  max={900}
                />
              </div>
            </div>
            <Button
              onClick={handleCreateFunction}
              disabled={!newFunctionData.name.trim() || createFunction.isPending}
              className="w-full"
            >
              {createFunction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Function
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoke Function Dialog */}
      <Dialog open={isInvokeDialogOpen} onOpenChange={setIsInvokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoke Function</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payload (JSON)</label>
              <Textarea
                value={invokePayload}
                onChange={(e) => setInvokePayload(e.target.value)}
                className="font-mono"
                rows={5}
              />
            </div>
            <Button
              onClick={() => {
                if (selectedFunction) {
                  invokeFunction.mutate({
                    functionName: selectedFunction,
                    payload: JSON.parse(invokePayload)
                  });
                  setIsInvokeDialogOpen(false);
                  setInvokePayload("{}");
                }
              }}
              disabled={!selectedFunction || invokeFunction.isPending}
              className="w-full"
            >
              {invokeFunction.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Invoke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
