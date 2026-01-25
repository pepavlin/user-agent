import type { Page } from 'playwright';
import type { SnapshotElement } from './types.js';

let idCounter = 0;

const resetIdCounter = () => {
  idCounter = 0;
};

const generateId = (role: string): string => {
  idCounter++;
  const rolePrefix = role.toLowerCase().slice(0, 3);
  return `${rolePrefix}-${idCounter}`;
};

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'treeitem',
]);

const isInteractive = (role: string): boolean => {
  return INTERACTIVE_ROLES.has(role.toLowerCase());
};

const parseAriaSnapshot = (snapshot: string): SnapshotElement[] => {
  const elements: SnapshotElement[] = [];
  const lines = snapshot.split('\n');

  for (const line of lines) {
    // Skip empty lines and property lines (starting with /)
    if (!line.trim() || line.trim().startsWith('/')) continue;

    // Match lines like "- button" or "- link \"text\"" or "- textbox \"placeholder\""
    // The pattern: "- role" or "- role \"name\"" optionally followed by : or attributes
    const match = line.match(/^(\s*)-\s+(\w+)(?:\s+"([^"]*)")?/);

    if (match) {
      const [, indent, role, name] = match;

      // Only include interactive elements at top level (minimal indentation)
      // Skip deeply nested elements to avoid duplicates
      const indentLevel = indent?.length || 0;

      if (isInteractive(role) && indentLevel <= 2) {
        const element: SnapshotElement = {
          id: generateId(role),
          role,
          name: name || '',
        };

        // Check for attributes in the line
        if (line.includes('[disabled]')) element.disabled = true;
        if (line.includes('[focused]')) element.focused = true;

        elements.push(element);
      }
    }
  }

  return elements;
};

export const captureAccessibilitySnapshot = async (page: Page): Promise<SnapshotElement[]> => {
  resetIdCounter();

  try {
    const ariaSnapshot = await page.locator('body').ariaSnapshot();

    if (!ariaSnapshot) {
      return [];
    }

    return parseAriaSnapshot(ariaSnapshot);
  } catch (error) {
    // Fallback: return empty array if snapshot fails
    console.error('Failed to capture accessibility snapshot:', error);
    return [];
  }
};

export const formatSnapshotForLLM = (elements: SnapshotElement[]): string => {
  if (elements.length === 0) {
    return 'No interactive elements found. You may need to scroll or wait for the page to load.';
  }

  return elements
    .map((el) => {
      let line = `[${el.id}] ${el.role}: "${el.name}"`;
      if (el.description) line += ` (${el.description})`;
      if (el.value) line += ` = "${el.value}"`;
      if (el.disabled) line += ' [disabled]';
      if (el.focused) line += ' [focused]';
      return line;
    })
    .join('\n');
};
