import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL || "admin@tcetmumbai.in";
const ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || "CampusLearn!2026";

test("administrator can change a user's role from the Users page", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Institutional email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/users");
  await page.getByRole("row", { name: /rohan patel/i }).getByRole("button").click();
  await page.getByRole("menuitem", { name: /change role/i }).click();
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /^student$/i }).click();
  await page.getByRole("button", { name: /save role/i }).click();

  await expect(page.getByText(/role updated/i)).toBeVisible();
});
