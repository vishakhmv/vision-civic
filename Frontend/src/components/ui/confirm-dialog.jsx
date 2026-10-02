import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'destructive', // 'destructive' | 'warning' | 'default'
  loading = false,
  trigger = null,
}) {
  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <Trash2 className="w-5 h-5 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-cyan-500" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30';
      default:
        return 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/30';
    }
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogPrimitive.Trigger asChild>
          {trigger}
        </AlertDialogPrimitive.Trigger>
      )}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl duration-200 rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shrink-0">
              {getIcon()}
            </div>
            <div className="flex-1">
              <AlertDialogPrimitive.Title className="text-base font-bold text-[var(--text-main)]">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="mt-1.5 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-2 pt-2 border-t border-[var(--border-subtle)]">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                type="button"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <button
                type="button"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  if (onConfirm) onConfirm();
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${getConfirmButtonClasses()}`}
              >
                {loading ? 'Processing...' : confirmText}
              </button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
