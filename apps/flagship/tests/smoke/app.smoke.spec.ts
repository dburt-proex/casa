import { expect, test } from '@playwright/test';

test('flagship health endpoint reports service status', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({
    status: 'ok',
    service: 'casa-flagship',
    config: {
      geminiConfigured: false,
    },
  });
});

test('operator console handles auth, sidebar navigation, workflow intake, and policy lab', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login as Admin' })).toBeVisible();
  await page.getByRole('button', { name: 'Login as Admin' }).click();

  await expect(page.getByRole('button', { name: 'Workflow Intake' })).toBeVisible();
  await expect(page.getByText('Demo Readiness')).toBeVisible();
  await expect(page.getByText('Admin profile active').first()).toBeVisible();
  await expect(page.getByText('Full demo control')).toBeVisible();

  for (const navItem of [
    'Workflow Intake',
    'System Dashboard',
    'Review Gate',
    'Governance Sprint',
    'Policy Lab',
    'Boundary Stress',
    'Audit Ledger',
    'Operator Chat',
    'Ops Metrics',
  ]) {
    await page.getByRole('button', { name: navItem }).click();
    await expect(page.locator('main')).toBeVisible();
  }

  await page.getByRole('button', { name: 'Workflow Intake' }).click();
  await expect(page.getByRole('button', { name: 'Load ALLOW demo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load REVIEW demo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load HALT demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Load REVIEW demo' }).click();
  await page.getByRole('button', { name: 'Evaluate with CASA' }).click();
  await expect(page.getByText('Why CASA Decided This')).toBeVisible();
  await expect(page.getByText('Reason Code')).toBeVisible();
  await page.getByRole('button', { name: 'Create Governance Sprint' }).click();
  await expect(page.getByText(/SPR-/)).toBeVisible();
  await page.getByRole('button', { name: 'Open Governance Sprint' }).click();
  await expect(page.getByText('Governance Sprint Workspace')).toBeVisible();
  await expect(page.getByText('Implementation Checklist')).toBeVisible();

  await page.getByRole('button', { name: 'Policy Lab' }).click();
  await page.getByLabel('Target Policy').selectOption('POL-105');
  await page.getByLabel('Environment').selectOption('production');
  await page.getByRole('button', { name: 'Execute Simulation' }).click();
  await expect(page.getByText('Simulation Results')).toBeVisible();
  await expect(page.getByText('Approval Workflow Pending')).toBeDisabled();

  expect(pageErrors).toEqual([]);
});

test('operator console shows read-only demo mode messaging on restricted workflows', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login as Operator' })).toBeVisible();
  await page.getByRole('button', { name: 'Login as Operator' }).click();

  await page.getByRole('button', { name: 'Review Gate' }).click();
  await expect(page.getByText('Read-only client demo mode: operators can inspect review evidence, but only admins can approve or halt decisions.')).toBeVisible();

  await page.getByRole('button', { name: 'Governance Sprint' }).click();
  await expect(page.getByText('Read-only client demo mode: operators can request and view sprints, but only admins can activate, advance, complete, or cancel them.')).toBeVisible();
});
