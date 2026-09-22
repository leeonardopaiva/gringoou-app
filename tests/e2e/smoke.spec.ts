import { expect, test } from '@playwright/test';

test('health endpoint reports the deployed version', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
});

test('public entry renders with security headers', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  await expect(page).toHaveTitle(/Gringoou/i);
});

test('protected page redirects anonymous visitors to login', async ({ page }) => {
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/login/);
});

test('development email endpoints are disabled by default', async ({ request }) => {
  const preview = await request.post('/api/dev/email-preview', { data: { email: 'teste@example.com' } });
  expect(preview.status()).toBe(404);
  const magicLink = await request.get('/api/dev/magic-link?email=teste@example.com');
  expect(magicLink.status()).toBe(404);
});
