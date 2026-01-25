import type { Page } from 'playwright';
import type { SnapshotElement } from './types.js';

type PlaywrightAccessibilityNode = {
  role: string;
  name: string;
  description?: string;
  value?: string;
  disabled?: boolean;
  focused?: boolean;
  children?: PlaywrightAccessibilityNode[];
};

let idCounter = 0;

const resetIdCounter = () => {
  idCounter = 0;
};

const generateId = (role: string): string => {
  idCounter++;
  const rolePrefix = role.toLowerCase().slice(0, 3);
  return `${rolePrefix}-${idCounter}`;
};

const isInteractive = (role: string): boolean => {
  const interactiveRoles = [
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
  ];
  return interactiveRoles.includes(role.toLowerCase());
};

const transformNode = (
  node: PlaywrightAccessibilityNode,
  includeNonInteractive: boolean = false
): SnapshotElement | null => {
  const isNodeInteractive = isInteractive(node.role);

  // Skip non-interactive nodes without interesting content
  if (!includeNonInteractive && !isNodeInteractive && !node.name && !node.children?.length) {
    return null;
  }

  const element: SnapshotElement = {
    id: generateId(node.role),
    role: node.role,
    name: node.name || '',
  };

  if (node.description) element.description = node.description;
  if (node.value) element.value = node.value;
  if (node.disabled) element.disabled = node.disabled;
  if (node.focused) element.focused = node.focused;

  if (node.children?.length) {
    const children = node.children
      .map((child) => transformNode(child, includeNonInteractive))
      .filter((child): child is SnapshotElement => child !== null);

    if (children.length > 0) {
      element.children = children;
    }
  }

  return element;
};

const flattenInteractiveElements = (elements: SnapshotElement[]): SnapshotElement[] => {
  const result: SnapshotElement[] = [];

  const traverse = (element: SnapshotElement) => {
    if (isInteractive(element.role)) {
      // Add without children for flat list
      result.push({
        id: element.id,
        role: element.role,
        name: element.name,
        description: element.description,
        value: element.value,
        disabled: element.disabled,
        focused: element.focused,
      });
    }

    if (element.children) {
      element.children.forEach(traverse);
    }
  };

  elements.forEach(traverse);
  return result;
};

export const captureAccessibilitySnapshot = async (page: Page): Promise<SnapshotElement[]> => {
  resetIdCounter();

  // Use Playwright's accessibility snapshot via locator
  const snapshot = await page.locator('body').ariaSnapshot();

  if (!snapshot) {
    return [];
  }

  // Parse the ARIA snapshot format and extract interactive elements
  // ARIA snapshot returns a string representation, we need to parse it
  return parseAriaSnapshot(snapshot);
};

const parseAriaSnapshot = (snapshot: string): SnapshotElement[] => {
  const elements: SnapshotElement[] = [];
  const lines = snapshot.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('-')) continue;

    // Parse lines like: "- button \"Submit\""
    // or "- textbox \"Email\" [focused]"
    const match = trimmed.match(/^-\s+(\w+)(?:\s+"([^"]*)")?(.*)$/);
    if (match) {
      const [, role, name, rest] = match;
      if (role && isInteractive(role)) {
        const element: SnapshotElement = {
          id: generateId(role),
          role,
          name: name || '',
        };

        if (rest?.includes('[disabled]')) element.disabled = true;
        if (rest?.includes('[focused]')) element.focused = true;

        // Extract value if present
        const valueMatch = rest?.match(/=\s*"([^"]*)"/);
        if (valueMatch) element.value = valueMatch[1];

        elements.push(element);
      }
    }
  }

  return elements;
};

export const formatSnapshotForLLM = (elements: SnapshotElement[]): string => {
  if (elements.length === 0) {
    return 'No interactive elements found on the page.';
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
