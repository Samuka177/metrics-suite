import { LayoutDashboard, Route, Users, Truck, FileText, BarChart3 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const items = [
  { title: 'Início', url: '/', icon: LayoutDashboard },
  { title: 'Rotas', url: '/rotas', icon: Route },
  { title: 'Motoristas', url: '/motoristas', icon: Users },
  { title: 'Veículos', url: '/veiculos', icon: Truck },
  { title: 'NFs', url: '/notas-fiscais', icon: FileText },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className="flex flex-col items-center gap-1 text-muted-foreground text-[10px] px-2 py-1"
            activeClassName="text-primary font-semibold"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
