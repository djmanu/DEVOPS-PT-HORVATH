const { test, expect } = require('@playwright/test');

const {
  createBook,
  createMember,
  createReadyReservation,
  listReservations,
  borrowBook,
} = require('../../helpers/api');
const { resetAndStartSut, stopSut } = require('../../helpers/sut');

test.beforeAll(async () => {
  await resetAndStartSut();
});

test.afterAll(async () => {
  await stopSut();
});

async function openReservationsTab(page) {
  await page.goto('/');
  await page.locator('#nav').getByRole('button', { name: 'Reservations' }).click();
  await expect(page.getByRole('heading', { name: 'Reserve a Book' })).toBeVisible();
}

test('G6-RES-UI-01 creates a reservation from the reservations tab', async ({ page, request }) => {
  const book = await createBook(request);
  const borrower = await createMember(request);
  const member = await createMember(request);
  await borrowBook(request, book.id, borrower.id);

  await openReservationsTab(page);

  await page.getByPlaceholder('Book ID').fill(String(book.id));
  await page.getByPlaceholder('Member ID').fill(String(member.id));
  await page.getByRole('button', { name: 'Reserve' }).click();

  await expect(page.locator('.msg.ok')).toContainText('Reservation created');

  const reservations = await listReservations(request, {
    bookId: book.id,
    memberId: member.id,
    status: 'pending',
  });
  const reservation = reservations.find((item) => item.bookId === book.id && item.memberId === member.id);

  await page.locator('table tbody tr').last().click();

  await expect(page.getByRole('heading', { name: `Reservation #${reservation.id}` })).toBeVisible();
  await expect(page.locator('.dl').first()).toContainText('pending');
});

test('G6-RES-UI-02 shows a validation error when the selected book is available', async ({ page, request }) => {
  const book = await createBook(request, { totalCopies: 2 });
  const member = await createMember(request);

  await openReservationsTab(page);

  await page.getByPlaceholder('Book ID').fill(String(book.id));
  await page.getByPlaceholder('Member ID').fill(String(member.id));
  await page.getByRole('button', { name: 'Reserve' }).click();

  await expect(page.locator('.msg.err')).toContainText('Book is available');
});

test('G6-RES-UI-03 cancels a ready reservation from the detail view', async ({ page, request }) => {
  const { reservation } = await createReadyReservation(request);

  await openReservationsTab(page);

  await page.locator('table tbody tr').last().click();
  await expect(page.getByRole('heading', { name: `Reservation #${reservation.id}` })).toBeVisible();
  await expect(page.locator('.dl').first()).toContainText('ready');

  await page.getByRole('button', { name: 'Cancel Reservation' }).click();

  await expect(page.locator('.msg.ok')).toContainText('Reservation cancelled.');
  await expect
    .poll(async () => {
      const response = await request.get(`/api/reservations/${reservation.id}`);
      return (await response.json()).status;
    })
    .toBe('cancelled');

  await openReservationsTab(page);
  await page.locator('table tbody tr').last().click();
  await expect(page.getByRole('heading', { name: `Reservation #${reservation.id}` })).toBeVisible();
  await expect(page.locator('.dl').first()).toContainText('cancelled');
  await expect(page.getByRole('button', { name: 'Cancel Reservation' })).toHaveCount(0);
});
