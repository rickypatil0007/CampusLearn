import { test, expect } from "@playwright/test";
import path from "node:path";

const FACULTY_EMAIL = "faculty.sharma@tcetmumbai.in";
const FACULTY_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || "CampusLearn!2026";

test.beforeEach(async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Institutional email").fill(FACULTY_EMAIL);
  await page.getByLabel("Password").fill(FACULTY_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("faculty can upload a resource and it is immediately approved", async ({ page }) => {
  await page.goto("/faculty/resources/new");
  await page.getByLabel("Title").fill(`E2E Uploaded Notes ${Date.now()}`);
  await page.getByLabel("Description").fill("Uploaded by the faculty E2E test.");

  await page.getByText(/select subject/i).click();
  await page.getByRole("option").first().click();

  // A tiny text file satisfies the allowed-extension check.
  const filePath = path.join(__dirname, "fixtures", "sample-note.txt");
  await page.setInputFiles('input[type="file"]', filePath);

  await page.getByRole("button", { name: /submit resource/i }).click();
  await expect(page).toHaveURL(/\/resources\//);
  await expect(page.getByText(/verified/i)).toBeVisible();
});

test("faculty can approve a pending CR submission", async ({ page }) => {
  await page.goto("/faculty/approvals");
  const firstApprove = page.getByRole("button", { name: /^approve$/i }).first();
  if (await firstApprove.isVisible().catch(() => false)) {
    await firstApprove.click();
    await expect(page.getByText(/resource approved/i)).toBeVisible();
  } else {
    test.skip(true, "No pending CR submissions in the current seed state.");
  }
});
