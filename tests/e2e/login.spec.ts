import { test, expect } from "@playwright/test";

const STUDENT_ID = "TCET002";
const STUDENT_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || "CampusLearn!2026";

test.describe("Login", () => {
  test("logs in a seeded student and lands on the dashboard", async ({ page }) => {
    await page.goto("/auth/login/student");
    await page.getByLabel("Student ID").fill(STUDENT_ID);
    await page.getByLabel("Password").fill(STUDENT_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/your dashboard/i)).toBeVisible();
  });

  test("shows an error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login/student");
    await page.getByLabel("Student ID").fill(STUDENT_ID);
    await page.getByLabel("Password").fill("WrongPassword1");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test("a student cannot reach an admin-only route", async ({ page }) => {
    await page.goto("/auth/login/student");
    await page.getByLabel("Student ID").fill(STUDENT_ID);
    await page.getByLabel("Password").fill(STUDENT_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await page.goto("/admin/users");
    // requireRoleOrRedirect() sends non-admins back to /dashboard.
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
