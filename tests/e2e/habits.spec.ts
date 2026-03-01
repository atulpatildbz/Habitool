import { expect, test, type Page } from "@playwright/test";

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

async function gotoApp(page: Page) {
  await page.route("https://unpkg.com/lucide-static@latest/tags.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    })
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Habit Tracker" })).toBeVisible();
}

async function createHabit(page: Page, name: string, options?: { target?: number; streakGoal?: number }) {
  await page.getByRole("button", { name: "Add habit" }).click();
  await expect(page.getByText("Add New Habit")).toBeVisible();

  await page.getByPlaceholder("Name your habit...").fill(name);

  if (options?.target || options?.streakGoal) {
    await page.getByRole("button", { name: "Advanced" }).click();

    if (options.target) {
      await page.locator('label:has-text("Daily Target") input').fill(String(options.target));
    }

    if (options.streakGoal) {
      await page.locator('label:has-text("Streak Goal") input').fill(String(options.streakGoal));
    }
  }

  await page.getByRole("button", { name: "Create Habit" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("creates, updates, and deletes a habit in local mode", async ({ page }) => {
  await gotoApp(page);

  await expect(page.getByText("No habits yet. Add one above to get started!")).toBeVisible();

  await createHabit(page, "Read 20 minutes");

  await page.getByRole("button", { name: "Toggle Read 20 minutes for today" }).click();
  await expect(page.locator(`button[title="${todayLabel()}: 1 / 1"]`)).toBeVisible();

  await page.getByRole("button", { name: "Edit Read 20 minutes" }).click();
  await expect(page.getByText("Edit Habit")).toBeVisible();
  await page.getByPlaceholder("Name your habit...").fill("Read 30 minutes");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByRole("heading", { name: "Read 30 minutes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Read 20 minutes" })).toHaveCount(0);

  await page.getByRole("button", { name: "Delete Read 30 minutes" }).click();
  await expect(page.getByText("No habits yet. Add one above to get started!")).toBeVisible();
});

test("persists local habit progress after reload", async ({ page }) => {
  await gotoApp(page);

  await createHabit(page, "Walk");
  await page.getByRole("button", { name: "Toggle Walk for today" }).click();
  await expect(page.locator(`button[title="${todayLabel()}: 1 / 1"]`)).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Walk" })).toBeVisible();
  await expect(page.locator(`button[title="${todayLabel()}: 1 / 1"]`)).toBeVisible();
});

test("supports target-based habits and opens calendar details", async ({ page }) => {
  await gotoApp(page);

  await createHabit(page, "Workout", { target: 2, streakGoal: 5 });

  const progressInput = page.getByLabel("Workout progress for today");
  await expect(progressInput).toHaveValue("0");
  await progressInput.fill("2");
  await expect(page.locator(`button[title="${todayLabel()}: 2 / 2"]`)).toBeVisible();

  await page.getByRole("heading", { name: "Workout" }).click();
  const dialog = page.getByRole("dialog", { name: "Track Workout" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Su")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
