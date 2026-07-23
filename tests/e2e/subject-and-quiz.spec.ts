import { test, expect } from "@playwright/test";

const STUDENT_EMAIL = "student.desai@tcetmumbai.in";
const STUDENT_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || "CampusLearn!2026";

test.beforeEach(async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Institutional email").fill(STUDENT_EMAIL);
  await page.getByLabel("Password").fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("student can view an enrolled subject", async ({ page }) => {
  await page.goto("/subjects");
  await page.getByRole("link", { name: /data structures/i }).click();
  await expect(page.getByRole("heading", { name: /data structures/i })).toBeVisible();
  await expect(page.getByText(/units.*topics/i)).toBeVisible();
});

test("student can attempt the seeded published quiz end-to-end", async ({ page }) => {
  await page.goto("/quizzes");
  await page.getByText(/linked lists.*quick check/i).click();
  await page.getByRole("button", { name: /start attempt|resume attempt/i }).click();

  // Answer the first question (a radio option) if present.
  const firstRadio = page.getByRole("radio").first();
  if (await firstRadio.isVisible().catch(() => false)) {
    await firstRadio.check();
  }

  await page.getByRole("button", { name: /submit quiz/i }).click();
  await page.getByRole("button", { name: /^submit$/i }).click();

  await expect(page).toHaveURL(/\/results/);
  await expect(page.getByText(/score/i)).toBeVisible();
});
