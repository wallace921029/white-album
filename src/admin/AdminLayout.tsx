import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Image as ImageIcon, Bell, Key, LogOut, ArrowLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: '仪表盘', icon: Home, end: true },
    { to: '/admin/photos', label: '照片管理', icon: ImageIcon },
    { to: '/admin/notices', label: '通知管理', icon: Bell },
    { to: '/admin/invites', label: '邀请码管理', icon: Key },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-50/50 border-r border-zinc-200 text-zinc-900">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 mb-2">
        <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center shadow-sm">
          <ImageIcon className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">White Album</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                  isActive
                    ? 'bg-white shadow-sm ring-1 ring-zinc-200 text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Utility Actions */}
      <div className="p-3 border-t border-zinc-200 space-y-1">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="w-full justify-start gap-3 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 font-medium text-sm px-3 h-10"
        >
          <ArrowLeft className="w-[18px] h-[18px] shrink-0" />
          返回前台
        </Button>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium text-sm px-3 h-10"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          退出登录
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 bg-white border-b border-zinc-200 text-zinc-900 flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-zinc-900 text-white rounded-md flex items-center justify-center shadow-sm">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight">White Album</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-600 hover:bg-zinc-100">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r border-zinc-200">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-white">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
