import type { Page } from 'playwright';
import type { ActionDecision } from '../core/types.js';
import type { SnapshotElement } from '../vision/types.js';
import type { ActionResult } from './types.js';

// Map role names to Playwright getByRole types
const roleMap: Record<string, string> = {
  button: 'button',
  link: 'link',
  textbox: 'textbox',
  checkbox: 'checkbox',
  radio: 'radio',
  combobox: 'combobox',
  listbox: 'listbox',
  menuitem: 'menuitem',
  option: 'option',
  searchbox: 'searchbox',
  slider: 'slider',
  spinbutton: 'spinbutton',
  switch: 'switch',
  tab: 'tab',
  treeitem: 'treeitem',
};

const findElement = (page: Page, element: SnapshotElement) => {
  const role = roleMap[element.role.toLowerCase()];

  if (role && element.name) {
    // Use getByRole with name for best match, take first if multiple
    return page.getByRole(role as Parameters<Page['getByRole']>[0], {
      name: element.name,
      exact: false,
    }).first();
  } else if (element.name) {
    // Fallback to getByText, take first if multiple
    return page.getByText(element.name, { exact: false }).first();
  } else if (role) {
    // Just role without name
    return page.getByRole(role as Parameters<Page['getByRole']>[0]).first();
  }

  throw new Error(`Cannot find element: ${JSON.stringify(element)}`);
};

export const executeAction = async (
  page: Page,
  action: ActionDecision,
  element?: SnapshotElement,
  allElements?: SnapshotElement[]
): Promise<ActionResult> => {
  const startTime = Date.now();

  try {
    switch (action.action) {
      case 'click': {
        if (!element) {
          throw new Error('Element required for click action');
        }
        const locator = findElement(page, element);
        await locator.click({ timeout: 10000, force: true });
        break;
      }

      case 'type': {
        if (!element) {
          throw new Error('Element required for type action');
        }
        if (!action.value) {
          throw new Error('Value required for type action');
        }
        const locator = findElement(page, element);
        await locator.fill(action.value, { timeout: 10000 });
        break;
      }

      case 'fill': {
        // Fill multiple form fields at once
        if (!action.inputs || action.inputs.length === 0) {
          throw new Error('Inputs array required for fill action');
        }
        if (!allElements) {
          throw new Error('All elements required for fill action');
        }

        for (const input of action.inputs) {
          const targetElement = allElements.find(el => el.id === input.elementId);
          if (!targetElement) {
            throw new Error(`Element not found: ${input.elementId}`);
          }
          const locator = findElement(page, targetElement);
          await locator.fill(input.value, { timeout: 10000 });
        }
        break;
      }

      case 'scroll': {
        if (element) {
          const locator = findElement(page, element);
          await locator.scrollIntoViewIfNeeded({ timeout: 10000 });
        } else {
          await page.evaluate('window.scrollBy(0, 300)');
        }
        break;
      }

      case 'wait': {
        const waitTime = action.value ? parseInt(action.value, 10) : 1000;
        await page.waitForTimeout(waitTime);
        break;
      }

      case 'navigate': {
        if (!action.value) {
          throw new Error('URL required for navigate action');
        }
        await page.goto(action.value);
        break;
      }

      case 'read': {
        // Read action is passive - just for AI to analyze content
        // No browser action needed
        break;
      }

      default: {
        throw new Error(`Unknown action type: ${action.action}`);
      }
    }

    return {
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
};
