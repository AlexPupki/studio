import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should allow a user to complete the booking flow', async ({ page }) => {
    // Этот тест является плейсхолдером.
    // Для его работы необходимо, чтобы в БД были тестовые данные:
    // - Активный маршрут со слагом 'test-route'
    // - Доступный слот для этого маршрута

    // 1. Переходим на главную страницу
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /добро пожаловать/i })).toBeVisible();
    
    // 2. Переходим на страницу входа
    await page.getByRole('link', { name: /перейти ко входу/i }).click();
    await expect(page).toHaveURL('/login');

    // 3. Вводим номер телефона
    await page.getByLabel('Номер телефона').fill('+79991234567');
    await page.getByLabel(/я согласен/i).check();
    await page.getByRole('button', { name: /получить код/i }).click();

    // 4. Ожидаем редиректа на страницу верификации
    await expect(page).toHaveURL(/\/verify/);
    await expect(page.getByRole('heading', { name: 'Подтверждение номера' })).toBeVisible();

    // 5. Вводим код (в реальном тесте код нужно было бы получать из логов или API)
    // Для простоты мы предполагаем, что код всегда '123456' в тестовом окружении
    await page.getByLabel(/код подтверждения/i).fill('123456');
    await page.getByRole('button', { name: /подтвердить и войти/i }).click();
    
    // 6. Ожидаем редиректа в личный кабинет
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole('heading', { name: /личный кабинет/i })).toBeVisible();

    // Дальнейшие шаги (переход к каталогу, выбор слота, бронирование)
    // потребуют наличия соответствующих страниц и данных,
    // которые будут созданы на следующих этапах.
  });
});
