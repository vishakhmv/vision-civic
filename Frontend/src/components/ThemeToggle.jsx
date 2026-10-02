import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { SimpleTooltip } from './ui/tooltip';
import { toast } from './ui/sonner';

export default function ThemeToggle({ direction = 'down', align = 'right', showText = false, className = '' }) {
  const { theme, themePreference, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (mode) => {
    setTheme(mode);
    setOpen(false);
    toast.info(`Theme set to ${mode.charAt(0).toUpperCase() + mode.slice(1)}.`);
  };

  // Determine popup position classes based on direction & align
  let positionClasses = 'top-[calc(100%+8px)] right-0';
  if (direction === 'up') {
    positionClasses = align === 'left' ? 'bottom-[calc(100%+8px)] left-0' : 'bottom-[calc(100%+8px)] right-0';
  } else if (direction === 'right') {
    positionClasses = 'left-[calc(100%+12px)] bottom-0';
  } else if (align === 'left') {
    positionClasses = 'top-[calc(100%+8px)] left-0';
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <SimpleTooltip content={`Current theme: ${themePreference}. Click to change`}>
        <button
          onClick={() => setOpen(!open)}
          className={`p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors flex items-center justify-center gap-2 ${
            showText ? 'w-full px-3 py-2 text-xs font-semibold' : ''
          }`}
          aria-label="Switch Theme"
        >
          {theme === 'dark' ? (
            <Moon size={17} className="text-cyan-400 shrink-0" />
          ) : (
            <Sun size={17} className="text-amber-500 shrink-0" />
          )}
          {showText && (
            <span className="flex-1 text-left capitalize">
              {themePreference} Mode
            </span>
          )}
        </button>
      </SimpleTooltip>

      {open && (
        <div
          className={`absolute ${positionClasses} min-w-[140px] p-1.5 z-50 flex flex-col gap-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl backdrop-blur-lg animate-in fade-in-0 zoom-in-95`}
        >
          <button
            onClick={() => handleSelectTheme('light')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${
              themePreference === 'light'
                ? 'bg-[var(--bg-surface)] text-[var(--primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Sun size={15} className="text-amber-500" />
            <span>Light</span>
          </button>

          <button
            onClick={() => handleSelectTheme('dark')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${
              themePreference === 'dark'
                ? 'bg-[var(--bg-surface)] text-[var(--primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Moon size={15} className="text-cyan-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => handleSelectTheme('system')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${
              themePreference === 'system'
                ? 'bg-[var(--bg-surface)] text-[var(--primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Laptop size={15} className="text-[var(--text-dim)]" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}
