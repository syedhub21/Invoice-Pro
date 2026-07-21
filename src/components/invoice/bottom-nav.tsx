'use client';

import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import { LayoutDashboard, FilePlus, History, Scale, Settings } from 'lucide-react';
import type { AppView } from '@/lib/types';

interface NavItem {
  label: string;
  view: AppView;
  icon: React.ElementType;
  /** Map other views to this tab for active state */
  aliases: AppView[];
}

const navItems: NavItem[] = [
  { label: 'Home', view: 'home', icon: LayoutDashboard, aliases: ['search'] },
  { label: 'New', view: 'new-invoice', icon: FilePlus, aliases: [] },
  { label: 'History', view: 'history', icon: History, aliases: ['preview'] },
  { label: 'Reports', view: 'reports', icon: Scale, aliases: ['expenses', 'clients'] },
  { label: 'Settings', view: 'settings', icon: Settings, aliases: ['recurring'] },
];

export function BottomNav() {
  const { currentView, setView } = useAppStore();

  const getIsActive = (item: NavItem) => {
    return currentView === item.view || item.aliases.includes(currentView);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Bottom navigation"
    >
      {/* Gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500" />
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = getIsActive(item);
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full
                transition-colors
                ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
              `}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-[2px] left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Icon className="size-5" />
              </motion.div>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
