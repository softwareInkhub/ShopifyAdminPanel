import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, ShoppingCart, Activity, BarChart, Cloud } from 'lucide-react';
import { SiAmazon } from 'react-icons/si';

export default function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/jobs', label: 'Jobs', icon: Activity },
    { href: '/analytics', label: 'Analytics', icon: BarChart }
  ];

  const awsLinks = [
    { href: '/aws/dashboard', label: 'AWS Resources', icon: SiAmazon }
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-sidebar-foreground">Admin Panel</h1>
      </div>
      <nav className="space-y-1 px-2">
        {/* Main navigation */}
        {links.map(({ href, label, icon: Icon }) => (
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

        {/* AWS Section */}
        <div className="pt-4 mt-4 border-t border-sidebar-border">
          <div className="px-4 py-2">
            <div className="flex items-center text-sm text-sidebar-foreground/70">
              <Cloud className="mr-2 h-4 w-4" />
              AWS Services
            </div>
          </div>
          {awsLinks.map(({ href, label, icon: Icon }) => (
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
      </nav>
    </aside>
  );
}