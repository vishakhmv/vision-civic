import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Video,
  UploadCloud,
  History,
  BarChart3,
  Users,
  UserCheck,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Shield
} from 'lucide-react';
import VisionCivicLogo from './VisionCivicLogo';
import ThemeToggle from './ThemeToggle';
import { SimpleTooltip } from './ui/tooltip';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('civic_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('civic_sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live-monitoring', label: 'Live Monitoring', icon: Video, badge: 'LIVE' },
    { to: '/upload-video', label: 'Upload Video', icon: UploadCloud },
    { to: '/past-events', label: 'Past Events', icon: History },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/profile', label: 'Profile', icon: UserCheck },
  ];

  if (isAdmin) {
    navItems.push({ to: '/user-management', label: 'User Management', icon: Users, admin: true });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col h-screen fixed lg:sticky top-0 z-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        {/* Brand Header */}
        <div className={`p-4 border-b border-[var(--border-subtle)] flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <VisionCivicLogo size={34} showText={!isCollapsed} />
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
              aria-label="Close Navigation"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;

            const linkContent = (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                    isCollapsed
                      ? 'justify-center w-12 h-12 mx-auto'
                      : 'gap-3.5 px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[var(--bg-surface)] text-[var(--primary)] font-semibold border-l-4 border-[var(--primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-main)]'
                  }`
                }
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon size={19} color={item.admin ? '#f59e0b' : 'currentColor'} />
                  {isCollapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <SimpleTooltip key={item.to} content={item.label} side="right">
                  <div>{linkContent}</div>
                </SimpleTooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Footer Area: Theme Toggle + User Info & Logout */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/40 flex flex-col gap-2.5">
          {/* Theme Toggle in Sidebar */}
          {isCollapsed ? (
            <div className="flex justify-center">
              <ThemeToggle direction="right" />
            </div>
          ) : (
            <div className="flex items-center justify-between px-1 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <span className="text-xs font-medium text-[var(--text-dim)] pl-2">
                Appearance
              </span>
              <ThemeToggle direction="up" align="right" />
            </div>
          )}

          {/* User Profile Info & Sign Out */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <SimpleTooltip
                content={`${user?.name || 'Operator'} (${isAdmin ? 'Admin' : 'Operator'})`}
                side="right"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm cursor-pointer ${
                    isAdmin
                      ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                      : 'bg-gradient-to-br from-cyan-600 to-teal-700'
                  }`}
                  onClick={() => navigate('/profile')}
                >
                  {isAdmin ? <Shield size={16} /> : user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              </SimpleTooltip>

              <SimpleTooltip content="Sign Out" side="right">
                <button
                  onClick={handleLogout}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/20 bg-red-500/10 border border-red-500/30 transition-all cursor-pointer"
                  aria-label="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </SimpleTooltip>
            </div>
          ) : (
            <div className="pt-1">
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer transition-colors mb-2 group"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 ${
                    isAdmin
                      ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                      : 'bg-gradient-to-br from-cyan-600 to-teal-700'
                  }`}
                >
                  {isAdmin ? <Shield size={16} /> : user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--primary)] transition-colors">
                    {user?.name || 'Civic Operator'}
                  </p>
                  <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-user'} text-[9px] px-1.5 py-0 mt-0.5 inline-block`}>
                    {isAdmin ? 'ADMINISTRATOR' : 'OPERATOR'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
