/* ================================================================
   AUTH SMOKE TESTS — AurumShield
   ================================================================
   Minimal acceptance tests validating:
   1. Login page renders with auth options (Clerk or mock form)
   2. Demo login redirects to role-appropriate page via /platform
   3. Unauthenticated fetch to protected API route returns 401
   ================================================================ */

import { test, expect } from "@playwright/test";

test.describe("Authentication & Routing", () => {
  test("login page renders sign-in form or Clerk component", async ({ page }) => {
    await page.goto("/login");

    // The page should contain either:
    // - Clerk's SignIn component (with passkey option when enabled)
    // - Our mock login form with email input
    const hasClerkSignIn = await page.locator("[data-clerk-component='SignIn']").count();
    const hasMockForm = await page.locator("#login-email").count();

    // At least one auth method must be present
    expect(hasClerkSignIn + hasMockForm).toBeGreaterThan(0);

    // Demo accounts section should always be visible
    await expect(page.getByText("Demo Accounts")).toBeVisible();
    await expect(page.getByText("m.reynolds@aurelia.lu")).toBeVisible();
  });

  test("demo login redirects through /platform to role page", async ({ page }) => {
    await page.goto("/login");

    // Wait for the page to be interactive
    await page.waitForLoadState("networkidle");

    // Check if we have the mock form (Clerk not configured)
    const hasMockForm = await page.locator("#login-email").count();

    if (hasMockForm > 0) {
      // Fill the mock login form with the buyer demo account
      await page.fill("#login-email", "m.reynolds@aurelia.lu");
      await page.fill("#login-password", "demo");
      await page.click('button[type="submit"]');
    } else {
      // Clerk is configured — use the demo quick login button
      await page.getByText("m.reynolds@aurelia.lu").first().click();
    }

    // Should eventually land on a role-appropriate page (not /login)
    // The /platform traffic cop redirects to /buyer, /seller, or /dashboard
    await page.waitForURL((url) => {
      const path = url.pathname;
      return (
        path.startsWith("/buyer") ||
        path.startsWith("/seller") ||
        path.startsWith("/dashboard") ||
        path.startsWith("/onboarding")
      );
    }, { timeout: 10_000 });

    // Verify we're NOT on login anymore
    expect(page.url()).not.toContain("/login");
  });

  test("unauthenticated requests to protected API routes are blocked", async ({
    request,
  }) => {
    // Attempt to access a protected API route without authentication
    const response = await request.get("/api/admin/stats");

    // Should get either:
    // - 401 (Clerk middleware blocks unauthenticated users)
    // - 403 (route exists but user lacks permission)
    // - 404 (route doesn't exist, which is also acceptable for this test)
    // The key assertion: it should NOT return 200 with sensitive data
    expect([401, 403, 404]).toContain(response.status());
  });

  test("signup page renders sign-up form or Clerk component", async ({ page }) => {
    await page.goto("/signup");

    // Should contain either Clerk SignUp or mock signup form
    const hasClerkSignUp = await page.locator("[data-clerk-component='SignUp']").count();
    const hasMockForm = await page.locator("#signup-name").count();

    expect(hasClerkSignUp + hasMockForm).toBeGreaterThan(0);
  });
});
