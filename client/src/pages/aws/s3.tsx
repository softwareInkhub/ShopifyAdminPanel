import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HardDrive, Upload, Trash2, Download, FolderOpen } from "lucide-react";
import { useS3 } from "@/hooks/aws/useS3";

export default function S3Page() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");

  const {
    buckets,
    bucketsLoading,
    listObjects,
    createBucket,
    deleteBucket
  } = useS3();

  // Get objects for selected bucket
  const {
    data: objects = [],
    isLoading: objectsLoading
  } = listObjects(selectedBucket || "");

  // Format bytes to human readable size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">S3 Buckets</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AWS S3 storage buckets and objects
          </p>
        </div>
        <Button onClick={() => setIsCreateBucketOpen(true)}>
          <HardDrive className="mr-2 h-4 w-4" />
          Create Bucket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buckets List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Buckets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {buckets.map((bucket) => (
                <div
                  key={bucket.Name}
                  className={`
                    flex items-center justify-between p-3 rounded-lg cursor-pointer
                    ${selectedBucket === bucket.Name ? 'bg-primary/10' : 'hover:bg-muted'}
                  `}
                  onClick={() => setSelectedBucket(bucket.Name)}
                >
                  <div className="flex items-center">
                    <HardDrive className="mr-2 h-4 w-4" />
                    <span>{bucket.Name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBucket.mutate(bucket.Name);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Objects List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedBucket ? `Objects in ${selectedBucket}` : 'Select a bucket to view objects'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedBucket ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Last Modified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objects.map((object) => (
                    <TableRow key={object.Key}>
                      <TableCell>{object.Key}</TableCell>
                      <TableCell>{formatBytes(object.Size)}</TableCell>
                      <TableCell>
                        {new Date(object.LastModified).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a bucket to view its contents
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Bucket Dialog */}
      <Dialog open={isCreateBucketOpen} onOpenChange={setIsCreateBucketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Bucket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bucket Name</label>
              <Input
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="Enter bucket name"
              />
            </div>
            <Button
              onClick={() => {
                createBucket.mutate(newBucketName);
                setIsCreateBucketOpen(false);
                setNewBucketName("");
              }}
              disabled={!newBucketName.trim() || createBucket.isPending}
            >
              Create Bucket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}