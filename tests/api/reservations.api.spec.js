const { test, expect } = require('@playwright/test');

const {
  createActiveReservationsForMember,
  createBook,
  createMember,
  createPendingReservation,
  createReservation,
  deactivateMember,
  getReservation,
  listReservations,
  borrowBook,
  cancelReservation,
} = require('../../helpers/api');
const { resetAndStartSut, stopSut } = require('../../helpers/sut');

test.beforeAll(async () => {
  await resetAndStartSut();
});

test.afterAll(async () => {
  await stopSut();
});

test('G6-RES-API-01 lists seeded reservations', async ({ request }) => {
  const reservations = await listReservations(request);

  expect(Array.isArray(reservations)).toBe(true);
  expect(reservations.length).toBeGreaterThan(50);
  expect(reservations[0]).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      bookId: expect.any(Number),
      memberId: expect.any(Number),
      createdAt: expect.any(String),
      status: expect.any(String),
    })
  );
});

test('G6-RES-API-02 filters reservations by book, member, and status', async ({ request }) => {
  const { book, reserver, reservation } = await createPendingReservation(request);

  const reservations = await listReservations(request, {
    bookId: book.id,
    memberId: reserver.id,
    status: 'pending',
  });

  expect(reservations.some((item) => item.id === reservation.id)).toBe(true);
  for (const item of reservations) {
    expect(item.bookId).toBe(book.id);
    expect(item.memberId).toBe(reserver.id);
    expect(item.status).toBe('pending');
  }
});

test('G6-RES-API-03 gets a reservation by id', async ({ request }) => {
  const { reservation } = await createPendingReservation(request);

  const loadedReservation = await getReservation(request, reservation.id);

  expect(loadedReservation.id).toBe(reservation.id);
  expect(loadedReservation.status).toBe('pending');
});

test('G6-RES-API-04 returns 404 for an unknown reservation id', async ({ request }) => {
  const response = await request.get('/api/reservations/999999');
  const body = await response.json();

  expect(response.status()).toBe(404);
  expect(body.error).toContain('Reservation not found');
});

test('G6-RES-API-05 creates a reservation when the book is unavailable', async ({ request }) => {
  const { book, reserver } = await createPendingReservation(request);

  const reservations = await listReservations(request, {
    bookId: book.id,
    memberId: reserver.id,
    status: 'pending',
  });
  const created = reservations.find((item) => item.memberId === reserver.id);

  expect(created).toEqual(
    expect.objectContaining({
      bookId: book.id,
      memberId: reserver.id,
      status: 'pending',
    })
  );
});

test('G6-RES-API-06 rejects a reservation when the book is still available', async ({ request }) => {
  const book = await createBook(request, { totalCopies: 2 });
  const member = await createMember(request);

  const response = await request.post('/api/reservations', {
    data: { bookId: book.id, memberId: member.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(400);
  expect(body.error).toContain('Book is available');
});

test('G6-RES-API-07 rejects a reservation for an inactive member', async ({ request }) => {
  const book = await createBook(request);
  const borrower = await createMember(request);
  const member = await createMember(request);

  await borrowBook(request, book.id, borrower.id);
  await deactivateMember(request, member.id);

  const response = await request.post('/api/reservations', {
    data: { bookId: book.id, memberId: member.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(400);
  expect(body.error).toContain('Inactive members cannot make reservations');
});

test('G6-RES-API-08 returns 404 for a missing book on creation', async ({ request }) => {
  const member = await createMember(request);

  const response = await request.post('/api/reservations', {
    data: { bookId: 999999, memberId: member.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(404);
  expect(body.error).toContain('Book not found');
});

test('G6-RES-API-09 returns 404 for a missing member on creation', async ({ request }) => {
  const book = await createBook(request);
  const borrower = await createMember(request);

  await borrowBook(request, book.id, borrower.id);

  const response = await request.post('/api/reservations', {
    data: { bookId: book.id, memberId: 999999 },
  });
  const body = await response.json();

  expect(response.status()).toBe(404);
  expect(body.error).toContain('Member not found');
});

test('G6-RES-API-10 rejects a reservation when the member already has the same book on loan', async ({ request }) => {
  const book = await createBook(request);
  const member = await createMember(request);

  await borrowBook(request, book.id, member.id);

  const response = await request.post('/api/reservations', {
    data: { bookId: book.id, memberId: member.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(409);
  expect(body.error).toContain('already have this book on loan');
});

test('G6-RES-API-11 rejects a duplicate active reservation for the same book and member', async ({ request }) => {
  const { book, reserver } = await createPendingReservation(request);

  const response = await request.post('/api/reservations', {
    data: { bookId: book.id, memberId: reserver.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(409);
  expect(body.error).toContain('active reservation for this book');
});

test('G6-RES-API-12 allows a third active reservation', async ({ request }) => {
  const member = await createMember(request);

  await createActiveReservationsForMember(request, member, 2);

  const book = await createBook(request, { totalCopies: 1 });
  const borrower = await createMember(request);
  await borrowBook(request, book.id, borrower.id);

  const reservation = await createReservation(request, book.id, member.id);

  expect(reservation.status).toBe('pending');

  const memberReservations = await listReservations(request, { memberId: member.id });
  const activeReservations = memberReservations.filter((item) => ['pending', 'ready'].includes(item.status));
  expect(activeReservations).toHaveLength(3);
});

test('G6-RES-API-13 rejects a fourth active reservation', async ({ request }) => {
  const member = await createMember(request);

  await createActiveReservationsForMember(request, member, 3);

  const book = await createBook(request, { totalCopies: 1 });
  const borrower = await createMember(request);
  await borrowBook(request, book.id, borrower.id);

  const response = await request.post('/api/reservations', {
    data: { bookId: book.id, memberId: member.id },
  });
  const body = await response.json();

  expect(response.status()).toBe(409);
  expect(body.error).toContain('not have more than 3 active reservations');
});

test('G6-RES-API-14 cancels a pending reservation', async ({ request }) => {
  const { reservation } = await createPendingReservation(request);

  const cancelled = await cancelReservation(request, reservation.id);

  expect(cancelled.status).toBe('cancelled');

  const loadedReservation = await getReservation(request, reservation.id);
  expect(loadedReservation.status).toBe('cancelled');
});

test('G6-RES-API-15 returns 404 when cancelling an unknown reservation', async ({ request }) => {
  const response = await request.post('/api/reservations/999999/cancel');
  const body = await response.json();

  expect(response.status()).toBe(404);
  expect(body.error).toContain('Reservation not found');
});

test('G6-RES-API-16 returns 409 when cancelling an already cancelled reservation', async ({ request }) => {
  const { reservation } = await createPendingReservation(request);

  await cancelReservation(request, reservation.id);

  const response = await request.post(`/api/reservations/${reservation.id}/cancel`);
  const body = await response.json();

  expect(response.status()).toBe(409);
  expect(body.error).toContain('already cancelled');
});
