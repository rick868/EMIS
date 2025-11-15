import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COMMON_SHORTCUTS } from '@/lib/keyboard-shortcuts';

export default function KeyboardShortcutsDialog({ open, onOpenChange }) {
  const shortcuts = [
    { keys: 'Ctrl + N', description: 'Add new item (context-dependent)' },
    { keys: 'Ctrl + E', description: 'Export data (CSV)' },
    { keys: 'Ctrl + K', description: 'Focus search / Quick actions' },
    { keys: 'Escape', description: 'Close dialogs / Cancel' },
    { keys: 'Ctrl + 1', description: 'Go to Home' },
    { keys: 'Ctrl + 2', description: 'Go to Employees' },
    { keys: 'Ctrl + 3', description: 'Go to Feedback' },
    { keys: 'Ctrl + 4', description: 'Go to Analytics' },
    { keys: 'Ctrl + 5', description: 'Go to Settings' },
    { keys: 'Ctrl + /', description: 'Show keyboard shortcuts' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
                <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border rounded">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Tip: Most shortcuts work contextually. For example, Ctrl+N opens the add dialog on the current page.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

