import {test,expect} from '@playwright/test';

test('register, keep session, queue save offline and reconnect',async({page,context})=>{
  const username='e2e_'+Date.now();
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Dragon Isle'})).toBeVisible();

  await page.getByRole('button',{name:'Register'}).click();
  const auth=page.locator('.react-auth');
  await auth.getByRole('textbox',{name:/Username/}).fill(username);
  await auth.locator('input[type="password"]').fill('strong-pass-123');
  await page.getByRole('button',{name:'Create account'}).click();

  await expect(page.getByText(new RegExp('Level 1 · '+username))).toBeVisible({timeout:15000});
  await page.reload();
  await expect(page.getByText(new RegExp('Level 1 · '+username))).toBeVisible({timeout:15000});

  await context.setOffline(true);
  const saveResult=await page.evaluate(()=>window.DragonGame.save());
  expect(saveResult).toBe(false);
  await expect(page.getByRole('heading',{name:'Connection lost'})).toBeVisible();
  await expect(page.getByText(/gameplay is temporarily locked/i)).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect(page.getByRole('heading',{name:'Connection lost'})).toBeHidden({timeout:15000});
  await expect(page.getByText(/Level 1 · e2e_trainer/)).toBeVisible();
});
