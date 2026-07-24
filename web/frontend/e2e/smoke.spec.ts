import { expect, test, type Page } from "@playwright/test";

const student = {
  email: process.env.E2E_STUDENT_EMAIL ?? "lan.anh@uni.edu.vn",
  password: process.env.E2E_STUDENT_PASSWORD ?? "password123",
};

const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? "minh.thanh@uni.edu.vn",
  password: process.env.E2E_ADMIN_PASSWORD ?? "password123",
};

async function login(page: Page, email: string, password: string) {
  await page.goto("/#login");
  await page.getByPlaceholder("Nhập email của bạn").fill(email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test.describe("production smoke", () => {
  test("student can search, save, update library, follow, and open workspace", async ({ page }) => {
    await login(page, student.email, student.password);
    await expect(page.getByRole("heading", { name: /Tổng quan|Overview/i })).toBeVisible();

    await page.goto("/#search");
    await page.getByLabel("Từ khóa tìm kiếm").fill("ai harness");
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
    await expect(page.getByRole("main")).toContainText(/Kết quả|Không có kết quả|Không thể tìm kiếm/i);

    const saveButton = page.getByRole("button", { name: /^Lưu$/ }).first();
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
      await expect(page.getByRole("status")).toContainText(/Đã lưu|đã lưu/i);
    }

    await page.goto("/#library");
    await expect(page.getByRole("heading", { name: "Thư viện" })).toBeVisible();
    const noteBox = page.getByLabel("Ghi chú cá nhân cho bài báo").first();
    if (await noteBox.isVisible().catch(() => false)) {
      await noteBox.fill(`E2E smoke note ${Date.now()}`);
      await noteBox.blur();
      await expect(page.getByRole("status")).toContainText(/Đã lưu|đã cập nhật|cập nhật/i);
    }

    await page.goto("/#account");
    await expect(page.getByRole("button", { name: /Lưu thông tin/i })).toBeVisible();

    await page.goto("/#follow");
    await expect(page.getByRole("heading", { name: "Theo dõi" })).toBeVisible();
    const followInput = page.getByPlaceholder("Ví dụ: graph retrieval").first();
    if (await followInput.isVisible().catch(() => false)) {
      await followInput.fill(`e2e-${Date.now()}`);
      await page.getByRole("button", { name: "Thêm mục theo dõi" }).click();
      await expect(page.locator("body")).toContainText(/Đã thêm|đã thêm|theo dõi/i);
    }

    await page.goto("/#workspace");
    await expect(page.getByRole("heading", { name: /Workspace/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Viewer|Editor|Owner|Thành viên|Workspace/i);
  });

  test("admin can load source health screen", async ({ page }) => {
    await login(page, admin.email, admin.password);
    await expect(page.getByRole("heading", { name: "Website Admin" })).toBeVisible();
    await page.getByRole("tab", { name: "Nguồn dữ liệu" }).click();
    await expect(page.getByRole("button", { name: /Kiểm tra API nguồn/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/OpenAlex|Crossref|Semantic Scholar|IEEE|Exa/i);
  });

  test("research opportunity maps show explicit statuses and responsive groups", async ({ page }) => {
    await login(page, student.email, student.password);
    await expect(page.getByRole("heading", { name: /Tổng quan|Overview/i })).toBeVisible();

    const overviewMap = page.getByLabel("Cơ hội nghiên cứu nổi bật", { exact: true });
    await expect(overviewMap).toBeVisible();
    await expect(overviewMap).toContainText(/khoảng trống nổi bật/i);
    await expect(overviewMap.locator(".opportunity-summary__item").first()).toContainText(/Điểm/i);

    await page.goto("/#gap");
    await expect(page.getByRole("heading", { name: "Research Gap" })).toBeVisible();

    const detailMap = page.getByLabel("Bản đồ cơ hội nghiên cứu theo lĩnh vực và khía cạnh", { exact: true });
    await expect(detailMap).toBeVisible();
    await expect(detailMap).toContainText(/Điểm = Quan tâm × Độ khan hiếm/i);
    await expect(detailMap.locator(".opportunity-priority__item").first()).toContainText(/Quan tâm|Khan hiếm/);
    await detailMap.getByRole("tab", { name: /Toàn bộ bản đồ/i }).click();
    await expect(detailMap).toContainText("Thiếu dữ liệu");

    const detailCell = detailMap.locator(".opportunity-map__cell").first();
    await expect(detailCell).toHaveAttribute("aria-label", /mật độ/i);
    await detailCell.click();
    await expect(detailCell).toHaveAttribute("aria-pressed", "true");
    await expect(detailMap.locator(".opportunity-map__selection")).toContainText(/Mật độ|Quan tâm/);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(detailMap.locator(".opportunity-map__cell-aspect").first()).toBeVisible();
    const dimensions = await detailMap.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    await expect(detailMap.locator(".opportunity-map__field").first()).toBeVisible();
  });
});
