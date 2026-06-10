const { test, expect } = require('@playwright/test');

const {
  createActiveReservationsForMember,
  createBook,
  createMember,
  createReservation,
  getBook,
  getReservation,
  listReservations,
  borrowBook,
  returnLoan,
  sleep,
} = require('../../helpers/api');
const { resetAndStartSut, stopSut } = require('../../helpers/sut');

test.beforeAll(async () => {
  await resetAndStartSut();
});

test.afterAll(async () => {
  await stopSut();
});

test('G6-RES-INT-01 promotes the oldest pending reservation on return and keeps the copy held', async ({ request }) => {
  const book = await createBook(request);
  const borrower = await createMember(request);
  const memberA = await createMember(request);
  const memberB = await createMember(request);
  const loan = await borrowBook(request, book.id, borrower.id);

  const reservationA = await createReservation(request, book.id, memberA.id);
  await sleep(1_100);
  const reservationB = await createReservation(request, book.id, memberB.id);

  await returnLoan(request, loan.id);

  const updatedA = await getReservation(request, reservationA.id);
  const updatedB = await getReservation(request, reservationB.id);
  const updatedBook = await getBook(request, book.id);

  expect(updatedA.status).toBe('ready');
  expect(updatedB.status).toBe('pending');
  expect(updatedBook.availableCopies).toBe(0);
});

test('G6-RES-INT-02 counts a ready reservation toward the max-3 active reservation limit', async ({ request }) => {
  const member = await createMember(request);
  await createActiveReservationsForMember(request, member, 2);

  const book = await createBook(request);
  const borrower = await createMember(request);
  const loan = await borrowBook(request, book.id, borrower.id);
  const reservation = await createReservation(request, book.id, member.id);
  await returnLoan(request, loan.id);

  const promotedReservation = await getReservation(request, reservation.id);
  expect(promotedReservation.status).toBe('ready');

  const extraBook = await createBook(request);
  const extraBorrower = await createMember(request);
  await borrowBook(request, extraBook.id, extraBorrower.id);

  const response = await request.post('/api/reservations', {
    data: { bookId: extraBook.id, memberId: member.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(409);
  expect(body.error).toContain('not have more than 3 active reservations');

  const memberReservations = await listReservations(request, { memberId: member.id });
  const activeReservations = memberReservations.filter((item) => ['pending', 'ready'].includes(item.status));
  expect(activeReservations).toHaveLength(3);
});
