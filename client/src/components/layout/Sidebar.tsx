import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Activity, 
  BarChart,
  Database,
  HardDrive,
  Server,
  Terminal, 
  Network,
  MessageSquare,
  Layers
} from 'lucide-react';

export default function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/jobs', label: 'Jobs', icon: Activity },
    { href: '/analytics', label: 'Analytics', icon: BarChart },
    // AWS Services Section
    { 
      label: 'AWS Resources',
      children: [
        { href: '/aws/s3', label: 'S3 Buckets', icon: HardDrive },
        { href: '/aws/dynamodb', label: 'DynamoDB', icon: Database },
        { href: '/aws/lambda', label: 'Lambda', icon: Terminal }, 
        { href: '/aws/compute', label: 'EC2/ECS', icon: Server },
        { href: '/aws/network', label: 'Network & CDN', icon: Network },
        { href: '/aws/messaging', label: 'SNS/SQS', icon: MessageSquare },
        { href: '/aws/cloudformation', label: 'CloudFormation', icon: Layers }
      ]
    }
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-sidebar-foreground">Admin Panel</h1>
      </div>
      <nav className="space-y-1 px-2">
        {links.map((item) => (
          item.children ? (
            <div key={item.label} className="space-y-1">
              <h2 className="px-4 py-2 text-sm font-semibold text-sidebar-foreground/70">
                {item.label}
              </h2>
              {item.children.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <span className={`
                    flex items-center px-4 py-2 text-sm rounded-md cursor-pointer
                    ${location === href 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }
                  `}>
                    <Icon className="mr-3 h-5 w-5" />
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Link key={item.href} href={item.href}>
              <span className={`
                flex items-center px-4 py-2 text-sm rounded-md cursor-pointer
                ${location === item.href 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }
              `}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </span>
            </Link>
          )
        ))}
      </nav>
    </aside>
  );
}