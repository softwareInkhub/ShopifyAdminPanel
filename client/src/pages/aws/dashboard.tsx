import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
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
    description: "Manage virtual servers in the cloud",
    icon: <Server className="h-6 w-6" />,
    route: "/aws/ec2"
  },
  {
    title: "DynamoDB Tables",
    description: "Fully managed NoSQL database service",
    icon: <Database className="h-6 w-6" />,
    route: "/aws/dynamodb"
  },
  {
    title: "Lambda Functions",
    description: "Run code without provisioning servers",
    icon: <FunctionIcon className="h-6 w-6" />,
    route: "/aws/lambda"
  },
  {
    title: "S3 Buckets",
    description: "Scalable object storage service",
    icon: <HardDrive className="h-6 w-6" />,
    route: "/aws/s3"
  },
  {
    title: "SNS Topics",
    description: "Fully managed pub/sub messaging",
    icon: <Bell className="h-6 w-6" />,
    route: "/aws/sns"
  },
  {
    title: "SQS Queues",
    description: "Fully managed message queuing",
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
    description: "Run containerized applications",
    icon: <SiAmazon className="h-6 w-6" />,
    route: "/aws/ecs"
  },
  {
    title: "Step Functions",
    description: "Visual workflow service",
    icon: <Terminal className="h-6 w-6" />,
    route: "/aws/stepfunctions"
  }
];

export default function AWSDashboard() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">AWS Resources</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AWS infrastructure and services
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Link key={service.title} href={service.route}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {service.icon}
                  <span>{service.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}