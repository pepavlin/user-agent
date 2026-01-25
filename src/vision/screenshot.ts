import type { Page } from 'playwright';

export const captureScreenshot = async (page: Page): Promise<Buffer> => {
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: false,
  });
  return screenshot;
};
