import React from 'react';
import { Menu, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onMenuToggle }) {
  const { user, isAdmin } = useAuth();

  return (
    <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 transition-colors duration-200">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuToggle}
          className="bg-transparent text-[var(--text-muted)] flex p-1 lg:hidden cursor-pointer hover:text-[var(--text-main)] transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu size={22} />
        </button>

      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Theme Switcher */}
        <ThemeToggle />

        {/* User Information */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <span className="block text-xs sm:text-sm font-semibold text-[var(--text-main)] leading-tight">
              {user?.name}
            </span>
            <span className="block text-[11px] text-[var(--text-dim)]">
              {isAdmin ? 'Administrator' : 'Civic Operator'}
            </span>
          </div>

          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-sm ${
              isAdmin
                ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                : 'bg-gradient-to-br from-cyan-600 to-teal-700'
            }`}
          >
            {isAdmin ? <Shield size={16} /> : user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
