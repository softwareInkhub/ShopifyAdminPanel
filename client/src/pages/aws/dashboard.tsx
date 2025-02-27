import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AWSLayout } from "@/components/layouts/AWSLayout";
import { 
  Server, 
  Database, 
  Box as FunctionIcon, 
  HardDrive,
  Bell,
  Mail,
  Cloud,
  Terminal
} from "lucide-react";
import { SiAmazon } from "react-icons/si";

interface ServiceCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
}

const services: ServiceCard[] = [
  {
    title: "EC2 Instances",
    description: "Manage virtual servers",
    icon: <Server className="h-6 w-6" />,
    route: "/aws/ec2"
  },
  {
    title: "DynamoDB Tables",
    description: "NoSQL database service",
    icon: <Database className="h-6 w-6" />,
    route: "/aws/dynamodb"
  },
  {
    title: "Lambda Functions",
    description: "Serverless compute",
    icon: <FunctionIcon className="h-6 w-6" />,
    route: "/aws/lambda"
  },
  {
    title: "S3 Buckets",
    description: "Object storage",
    icon: <HardDrive className="h-6 w-6" />,
    route: "/aws/s3"
  },
  {
    title: "SNS Topics",
    description: "Notification service",
    icon: <Bell className="h-6 w-6" />,
    route: "/aws/sns"
  },
  {
    title: "SQS Queues",
    description: "Message queuing",
    icon: <Mail className="h-6 w-6" />,
    route: "/aws/sqs"
  },
  {
    title: "CloudFormation",
    description: "Infrastructure as code",
    icon: <Cloud className="h-6 w-6" />,
    route: "/aws/cloudformation"
  },
  {
    title: "ECS Clusters",
    description: "Container orchestration",
    icon: <SiAmazon className="h-6 w-6" />,
    route: "/aws/ecs"
  },
  {
    title: "Step Functions",
    description: "Workflow orchestration",
    icon: <Terminal className="h-6 w-6" />,
    route: "/aws/stepfunctions"
  }
];

interface AWSUser {
  UserName: string;
  Arn: string;
}

export default function AWSDashboard() {
  const { toast } = useToast();

  const { data: userInfo, error } = useQuery<AWSUser>({
    queryKey: ['/api/aws/current-user'],
    retry: false
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to fetch AWS user info",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  return (
    <AWSLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">AWS Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AWS resources
          </p>
        </div>
        {userInfo && (
          <div className="text-right">
            <p className="font-medium">{userInfo.UserName}</p>
            <p className="text-sm text-muted-foreground">
              {userInfo.Arn}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.title} className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {service.icon}
                <span>{service.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {service.description}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <a href={service.route}>Manage {service.title}</a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AWSLayout>
  );
}