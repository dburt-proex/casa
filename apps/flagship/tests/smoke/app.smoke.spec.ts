import { expect, test } from '@playwright/test';

test('operator console handles auth, sidebar navigation, workflow intake, and policy lab', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login as Admin' })).toBeVisible();
  await page.getByRole('button', { name: 'Login as Admin' }).click();

  await expect(page.getByRole('button', { name: 'Workflow Intake' })).toBeVisible();

  for (const navItem of [
    'Workflow Intake',
    'System Dashboard',
    'Review Gate',
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
  await page.getByRole('button', { name: 'Evaluate with CASA' }).click();
  await expect(page.getByText('Why CASA Decided This')).toBeVisible();
  await expect(page.getByText('Reason Code')).toBeVisible();

  await page.getByRole('button', { name: 'Policy Lab' }).click();
  await page.getByLabel('Target Policy').selectOption('POL-105');
  await page.getByLabel('Environment').selectOption('production');
  await page.getByRole('button', { name: 'Execute Simulation' }).click();
  await expect(page.getByText('Simulation Results')).toBeVisible();
  await expect(page.getByText('Approval Workflow Pending')).toBeDisabled();

  expect(pageErrors).toEqual([]);
});
