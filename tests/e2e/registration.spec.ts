import { test, expect } from "@playwright/test";

test.describe("Student registration", () => {
  test("rejects an invalid Student ID format", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel("Full name").fill("Test Student");
    await page.getByLabel("Student ID").fill("12345"); // Invalid format
    await page.getByLabel("Password", { exact: true }).fill("StrongPass1");
    await page.getByLabel("Confirm password").fill("StrongPass1");
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/student id must begin with/i)
    ).toBeVisible();
  });

  test("allows registration with a valid Student ID and full academic details", async ({ page }) => {
    const uniqueId = `S1032${Date.now().toString().slice(-6)}`;
    await page.goto("/auth/register");
    await page.getByLabel("Full name").fill("E2E Test Student");
    await page.getByLabel("Student ID").fill(uniqueId);
    
    // Check if the generated read-only email is visible
    await expect(page.getByText(`${uniqueId.substring(1).toLowerCase()}@tcetmumbai.in`)).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill("StrongPass1");
    await page.getByLabel("Confirm password").fill("StrongPass1");

    await page.getByLabel("Department").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Programme").click();
    await page.getByRole("option").first().click();
    await page.getByLabel(/Academic session/i).click();
    await page.getByRole("option").first().click();
    await page.getByLabel(/Year of study/i).click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Semester").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Division").click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Roll number").fill("23CE999");
    await page.getByLabel(/terms/i).check();

    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/auth\/verify-email/);
    await expect(page.getByText(/verify your email/i)).toBeVisible();
  });
});
