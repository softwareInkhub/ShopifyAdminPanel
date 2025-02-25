import { Link, useLocation } from 'wouter';
import { Package, ShoppingCart, Activity } from 'lucide-react';

export default function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/jobs', label: 'Jobs', icon: Activity }
  ];

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-sidebar-foreground">Admin Panel</h1>
      </div>
      <nav className="space-y-1 px-2">
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
      </nav>
    </aside>
  );
}