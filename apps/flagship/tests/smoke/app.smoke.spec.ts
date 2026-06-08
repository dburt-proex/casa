import { expect, test } from '@playwright/test';

test('flagship and governance API health endpoints respond', async ({ request }) => {
  const flagshipHealth = await request.get('/health');
  expect(flagshipHealth.ok()).toBeTruthy();
  await expect
    .poll(async () => {
      const response = await request.get('http://127.0.0.1:5000/health');
      return response.status();
    })
    .toBe(200);
});

test('operator login stays in read-only posture', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Login as Operator' })).toBeVisible();
  await page.getByRole('button', { name: 'Login as Operator' }).click();

  await expect(page.getByText('Operator profile active').first()).toBeVisible();
  await expect(page.getByText('Read-only demo posture')).toBeVisible();

  await page.getByRole('button', { name: 'Policy Lab' }).click();
  await expect(page.getByText(/Policy simulations are admin-only/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Execute Simulation' })).toBeDisabled();
});

test('admin login handles workflow intake and policy dry run while apply stays blocked', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: 'Approval Workflow Pending' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Approval Workflow Pending' })).toHaveAttribute(
    'title',
    /disabled until the governance API exposes an audited apply endpoint/i
  );

  expect(pageErrors).toEqual([]);
});
