import {
  LayoutDashboard,
  Route,
  Users,
  Truck,
  FileText,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Rotas', url: '/rotas', icon: Route },
  { title: 'Motoristas', url: '/motoristas', icon: Users },
  { title: 'Veículos', url: '/veiculos', icon: Truck },
  { title: 'Notas Fiscais', url: '/notas-fiscais', icon: FileText },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('rotafacil_auth');
    sessionStorage.removeItem('rotafacil_role');
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            {!collapsed && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 text-sidebar-primary-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sidebar-foreground text-sm">RotaFácil</p>
                  <p className="text-[10px] text-sidebar-foreground/60">Gestão de Entregas</p>
                </div>
              </div>
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Sair'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
