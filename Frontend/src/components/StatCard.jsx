import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color, bgGradient, glowColor }) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      {/* Background ambient glow blob */}
      <div
        className="absolute -top-5 -right-5 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40"
        style={{ background: glowColor || 'rgba(8, 145, 178, 0.25)' }}
      />

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[var(--text-muted)]">
          {title}
        </span>
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center border border-[var(--border-subtle)]"
          style={{ background: bgGradient || 'var(--bg-surface)' }}
        >
          {Icon && <Icon size={22} color={color || 'var(--primary)'} />}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
          {value}
        </h3>
      </div>

      {subtitle && (
        <p className="text-xs text-[var(--text-dim)] mt-1.5 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
