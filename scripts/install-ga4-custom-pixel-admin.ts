/**
 * Install GA4 Purchase custom pixel via Shopify Admin UI.
 * Run without piping through `tail` so logs stream.
 */
import {chromium} from 'playwright';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const STATE = resolve(ROOT, '.shopify-admin-state.json');
const CODE = readFileSync(
  resolve(ROOT, 'scripts/ga4-shopify-custom-pixel.js'),
  'utf8',
)
  .replace(/^\/\*[\s\S]*?\*\//, '')
  .trim();

const STORE = '70yuey-sr';
const URL = `https://admin.shopify.com/store/${STORE}/settings/customer_events`;
const NAME = 'GA4 — Purchase (Hydrogen)';

async function main() {
  mkdirSync(resolve(ROOT, 'tmp'), {recursive: true});
  console.log('Launching Chrome…');
  const browser = await chromium.launch({headless: false, channel: 'chrome'});
  const context = await browser.newContext({
    storageState: existsSync(STATE) ? STATE : undefined,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  console.log('Goto', URL);
  await page.goto(URL, {waitUntil: 'domcontentloaded', timeout: 120000});
  await page.waitForTimeout(2500);
  console.log('URL now:', page.url());

  if (/accounts\.shopify\.com|\/login/i.test(page.url())) {
    console.log('Login required — complete it in the browser (up to 3 min)…');
    await page.waitForURL(new RegExp(`/store/${STORE}/`), {timeout: 180000});
    await page.goto(URL, {waitUntil: 'domcontentloaded', timeout: 120000});
    await page.waitForTimeout(2000);
  }

  await context.storageState({path: STATE});
  await page.screenshot({
    path: resolve(ROOT, 'tmp/ga4-customer-events-1.png'),
    fullPage: true,
  });

  const existing = page.getByText(NAME, {exact: false}).first();
  if (await existing.isVisible().catch(() => false)) {
    console.log('Existing pixel found — opening…');
    await existing.click();
  } else {
    console.log('Looking for Add custom pixel…');
    const add = page.getByRole('button', {name: /add custom pixel/i}).or(
      page.getByRole('link', {name: /add custom pixel/i}),
    );
    if (await add.first().isVisible().catch(() => false)) {
      await add.first().click();
    } else {
      const addPixel = page.getByRole('button', {name: /add pixel/i}).first();
      if (await addPixel.isVisible().catch(() => false)) {
        await addPixel.click();
        await page.getByText(/custom pixel/i).first().click();
      } else {
        throw new Error('Could not find Add custom pixel control');
      }
    }
  }

  await page.waitForTimeout(1500);
  await page.screenshot({
    path: resolve(ROOT, 'tmp/ga4-customer-events-2.png'),
    fullPage: true,
  });

  const nameField = page
    .locator(
      'input[name="name"], input[aria-label*="name" i], input[placeholder*="Pixel name" i]',
    )
    .first();
  if (await nameField.isVisible().catch(() => false)) {
    await nameField.fill(NAME);
    console.log('Set name');
  }

  console.log('Pasting pixel code…');
  const monaco = page.locator('.monaco-editor textarea').first();
  const cm = page.locator('.cm-content').first();
  const ta = page.locator('textarea').last();

  if (await monaco.isVisible().catch(() => false)) {
    await monaco.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.insertText(CODE);
  } else if (await cm.isVisible().catch(() => false)) {
    await cm.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.insertText(CODE);
  } else if (await ta.isVisible().catch(() => false)) {
    await ta.fill(CODE);
  } else {
    const box = page.locator('[contenteditable="true"]').last();
    await box.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.insertText(CODE);
  }

  const save = page.getByRole('button', {name: /^save$/i}).first();
  await save.click();
  console.log('Clicked Save');
  await page.waitForTimeout(2500);

  for (const label of [/^connect$/i, /connect pixel/i]) {
    const btn = page.getByRole('button', {name: label}).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      console.log('Clicked', label);
      await page.waitForTimeout(1000);
      const confirm = page.getByRole('button', {name: /^connect$/i}).last();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
        console.log('Confirmed Connect');
      }
      break;
    }
  }

  await context.storageState({path: STATE});
  await page.screenshot({
    path: resolve(ROOT, 'tmp/ga4-customer-events-done.png'),
    fullPage: true,
  });
  console.log('Done. Screenshots in tmp/. Closing in 3s…');
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
