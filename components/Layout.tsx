import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ScanLine, 
  PenTool, 
  ShieldAlert, 
  Palette, 
  Workflow,
  Sparkles
} from 'lucide-react';
import { NavItem } from '../types';

const navItems: NavItem[] = [
  { id: 'home', label: '工作台', icon: LayoutDashboard, path: '/' },
  { id: 'parser', label: '图文解析', icon: ScanLine, path: '/parser' },
  { id: 'rewriter', label: 'AI改写', icon: PenTool, path: '/rewriter' },
  { id: 'audit', label: '违禁检测', icon: ShieldAlert, path: '/audit' },
  { id: 'designer', label: '排版设计', icon: Palette, path: '/designer' },
  { id: 'workflow', label: '爆款工作流', icon: Workflow, path: '/workflow' },
];

export const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-rednote-500 p-2 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">RedNote Ops</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-rednote-50 text-rednote-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-rednote-500' : 'text-gray-400'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-rednote-500 to-rednote-600 rounded-xl p-4 text-white">
            <p className="text-xs opacity-80 mb-1">PRO Membership</p>
            <p className="font-bold text-sm">Unlock NotebookLM Analysis</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">Gemini 2.5 Active</span>
            <div className="w-8 h-8 rounded-full bg-rednote-100 border border-rednote-200 flex items-center justify-center text-rednote-600 font-bold text-xs">
              U
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto pb-24">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
