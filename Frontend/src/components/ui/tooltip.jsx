import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef(
  ({ className = '', sideOffset = 4, children, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-50 overflow-hidden rounded-md bg-[var(--navy-900)] dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-xl border border-[var(--border-subtle)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-[var(--navy-900)] dark:fill-slate-900" />
    </TooltipPrimitive.Content>
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Convenient wrapper for wrapping any icon/button with a stylish tooltip.
 */
export function SimpleTooltip({ content, side = 'top', children, delayDuration = 200 }) {
  if (!content) return children;
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
