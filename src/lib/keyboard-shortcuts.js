/**
 * Keyboard shortcuts utility
 * Provides global keyboard shortcuts for common actions
 */

import { useEffect } from 'react';

/**
 * Hook for keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callbacks
 * @param {Array} deps - Dependencies array (optional)
 * 
 * Example:
 * useKeyboardShortcuts({
 *   'ctrl+k': () => console.log('Search'),
 *   'ctrl+n': () => console.log('New'),
 *   'escape': () => console.log('Close'),
 * });
 */
export const useKeyboardShortcuts = (shortcuts, deps = []) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Build key combination string
      let combination = '';
      if (ctrl) combination += 'ctrl+';
      if (shift) combination += 'shift+';
      if (alt) combination += 'alt+';
      combination += key;

      // Check if this combination is registered
      if (shortcuts[combination]) {
        event.preventDefault();
        shortcuts[combination](event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, ...deps]);
};

/**
 * Common keyboard shortcuts for the application
 */
export const COMMON_SHORTCUTS = {
  // Navigation
  'ctrl+k': 'Search / Quick actions',
  'ctrl+/': 'Show keyboard shortcuts',
  'escape': 'Close dialogs / Cancel',
  
  // Actions
  'ctrl+n': 'New item (context-dependent)',
  'ctrl+s': 'Save',
  'ctrl+e': 'Export',
  
  // Navigation
  'ctrl+1': 'Go to Home',
  'ctrl+2': 'Go to Employees',
  'ctrl+3': 'Go to Feedback',
  'ctrl+4': 'Go to Analytics',
  'ctrl+5': 'Go to Settings',
};

