import React from 'react';
import { Toaster as Sonner } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

export function Toaster({ ...props }) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme === 'dark' ? 'dark' : 'light'}
      className="toaster group"
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:font-sans group-[.toaster]:text-xs group-[.toaster]:backdrop-blur-md',
          description: 'group-[.toast]:text-xs opacity-90',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-semibold',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg',
          closeButton:
            'group-[.toast]:border-none group-[.toast]:opacity-70 hover:group-[.toast]:opacity-100 transition-opacity',
          success:
            'group-[.toaster]:bg-emerald-950/90 dark:group-[.toaster]:bg-emerald-950/90 group-[.toaster]:border-emerald-600/40 group-[.toaster]:text-emerald-100',
          error:
            'group-[.toaster]:bg-rose-950/90 dark:group-[.toaster]:bg-rose-950/90 group-[.toaster]:border-rose-600/40 group-[.toaster]:text-rose-100',
          warning:
            'group-[.toaster]:bg-amber-950/90 dark:group-[.toaster]:bg-amber-950/90 group-[.toaster]:border-amber-600/40 group-[.toaster]:text-amber-100',
          info:
            'group-[.toaster]:bg-cyan-950/90 dark:group-[.toaster]:bg-cyan-950/90 group-[.toaster]:border-cyan-600/40 group-[.toaster]:text-cyan-100',
        },
      }}
      {...props}
    />
  );
}

export { toast } from 'sonner';
