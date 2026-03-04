import { describe, it, expect, vi } from 'vitest';
import { executeAction } from '@/browser/actions';
import type { ActionDecision } from '@/core/types';
import type { SnapshotElement } from '@/vision/types';

const createMockPage = () => ({
  mouse: {
    click: vi.fn().mockResolvedValue(undefined),
  },
  getByRole: vi.fn().mockReturnValue({
    nth: vi.fn().mockReturnValue({
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  getByText: vi.fn().mockReturnValue({
    nth: vi.fn().mockReturnValue({
      click: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  evaluate: vi.fn().mockResolvedValue(undefined),
  waitForTimeout: vi.fn().mockResolvedValue(undefined),
  goto: vi.fn().mockResolvedValue(undefined),
});

const makeElement = (overrides: Partial<SnapshotElement> = {}): SnapshotElement => ({
  id: 'btn-1',
  role: 'button',
  name: 'Submit',
  nthIndex: 0,
  ...overrides,
});

describe('executeAction', () => {
  describe('click with coordinates', () => {
    it('calls page.mouse.click with given coordinates', async () => {
      const page = createMockPage();
      const action: ActionDecision = {
        action: 'click',
        coordinates: { x: 640, y: 360 },
        reasoning: 'clicking the card in the center',
      };

      const result = await executeAction(page as any, action);

      expect(result.success).toBe(true);
      expect(page.mouse.click).toHaveBeenCalledWith(640, 360);
    });

    it('does not require an element when coordinates are provided', async () => {
      const page = createMockPage();
      const action: ActionDecision = {
        action: 'click',
        coordinates: { x: 100, y: 200 },
        reasoning: 'clicking a visual element',
      };

      const result = await executeAction(page as any, action, undefined);

      expect(result.success).toBe(true);
      expect(page.mouse.click).toHaveBeenCalledWith(100, 200);
    });

    it('prefers coordinates over elementId when both are provided', async () => {
      const page = createMockPage();
      const element = makeElement();
      const action: ActionDecision = {
        action: 'click',
        elementId: 'btn-1',
        coordinates: { x: 500, y: 300 },
        reasoning: 'coordinates take precedence',
      };

      const result = await executeAction(page as any, action, element);

      expect(result.success).toBe(true);
      expect(page.mouse.click).toHaveBeenCalledWith(500, 300);
      expect(page.getByRole).not.toHaveBeenCalled();
    });
  });

  describe('click with elementId', () => {
    it('uses element locator for element-based click', async () => {
      const page = createMockPage();
      const element = makeElement();
      const action: ActionDecision = {
        action: 'click',
        elementId: 'btn-1',
        reasoning: 'clicking submit button',
      };

      const result = await executeAction(page as any, action, element);

      expect(result.success).toBe(true);
      expect(page.getByRole).toHaveBeenCalledWith('button', {
        name: 'Submit',
        exact: false,
      });
      expect(page.mouse.click).not.toHaveBeenCalled();
    });

    it('fails when neither element nor coordinates are provided', async () => {
      const page = createMockPage();
      const action: ActionDecision = {
        action: 'click',
        reasoning: 'no target specified',
      };

      const result = await executeAction(page as any, action, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Element or coordinates required for click action');
    });
  });

  describe('coordinate edge cases', () => {
    it('handles coordinates at origin (0, 0)', async () => {
      const page = createMockPage();
      const action: ActionDecision = {
        action: 'click',
        coordinates: { x: 0, y: 0 },
        reasoning: 'clicking top-left corner',
      };

      const result = await executeAction(page as any, action);

      expect(result.success).toBe(true);
      expect(page.mouse.click).toHaveBeenCalledWith(0, 0);
    });

    it('handles coordinates at viewport boundary (1280, 720)', async () => {
      const page = createMockPage();
      const action: ActionDecision = {
        action: 'click',
        coordinates: { x: 1280, y: 720 },
        reasoning: 'clicking bottom-right corner',
      };

      const result = await executeAction(page as any, action);

      expect(result.success).toBe(true);
      expect(page.mouse.click).toHaveBeenCalledWith(1280, 720);
    });

    it('returns failure when mouse.click throws', async () => {
      const page = createMockPage();
      page.mouse.click.mockRejectedValue(new Error('click failed'));
      const action: ActionDecision = {
        action: 'click',
        coordinates: { x: 640, y: 360 },
        reasoning: 'clicking something',
      };

      const result = await executeAction(page as any, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('click failed');
    });
  });
});
