import React from 'react';
import { Home, CalendarPlus, FileText, ShieldCheck } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'book' | 'status' | 'admin';
  onSelectTab: (tab: 'home' | 'book' | 'status' | 'admin') => void;
  pendingApprovalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
}) => {
  const navItems = [
    {
      id: 'home' as const,
      label: 'Utama',
      icon: Home,
    },
    {
      id: 'book' as const,
      label: 'Tempah',
      icon: CalendarPlus,
    },
    {
      id: 'status' as const,
      label: 'Status',
      icon: FileText,
    },
    {
      id: 'admin' as const,
      label: 'Admin',
      icon: ShieldCheck,
      badge: pendingApprovalsCount,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#112240]/95 backdrop-blur-md border-t border-slate-800/90 px-3 py-2 sm:px-6 shadow-[0_-8px_25px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition cursor-pointer group active:scale-90 ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active indicator dot/pill */}
              {isActive && (
                <span className="absolute -top-1 w-6 h-1 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}

              <div className="relative p-1">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center pulse-gold">
                    {item.badge}
                  </span>
                ) : null}
              </div>

              <span className={`text-[10px] mt-0.5 tracking-wide ${isActive ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
