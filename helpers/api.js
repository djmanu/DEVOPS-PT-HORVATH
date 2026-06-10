const { expect } = require('@playwright/test');

let counter = 0;

function nextToken(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

function uniqueIsbn() {
  const digits = `${Date.now()}${counter}`.replace(/\D/g, '').slice(-10).padStart(10, '0');
  return `978${digits}`;
}

function memberDefaults() {
  const token = nextToken('member');
  return {
    name: `Reservations Tester ${token}`,
    email: `${token}@example.com`,
  };
}

function bookDefaults() {
  const token = nextToken('book');
  return {
    isbn: uniqueIsbn(),
    title: `Reservations Test Book ${token}`,
    author: 'Group 6 QA',
    genre: 'Testing',
    year: 2024,
    totalCopies: 1,
  };
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function expectStatus(response, status) {
  expect(response.status(), `Unexpected status for ${response.url()}`).toBe(status);
  return readJson(response);
}

async function createBook(request, overrides = {}) {
  const payload = { ...bookDefaults(), ...overrides };
  const response = await request.post('/api/books', { data: payload });
  return expectStatus(response, 201);
}

async function createMember(request, overrides = {}) {
  const payload = { ...memberDefaults(), ...overrides };
  const response = await request.post('/api/members', { data: payload });
  return expectStatus(response, 201);
}

async function deactivateMember(request, memberId) {
  const response = await request.post(`/api/members/${memberId}/deactivate`);
  return expectStatus(response, 200);
}

async function borrowBook(request, bookId, memberId) {
  const response = await request.post('/api/loans', {
    data: { bookId, memberId },
  });
  return expectStatus(response, 201);
}

async function returnLoan(request, loanId) {
  const response = await request.post(`/api/loans/${loanId}/return`);
  return expectStatus(response, 200);
}

async function createReservation(request, bookId, memberId) {
  const response = await request.post('/api/reservations', {
    data: { bookId, memberId },
  });
  return expectStatus(response, 201);
}

async function cancelReservation(request, reservationId) {
  const response = await request.post(`/api/reservations/${reservationId}/cancel`);
  return expectStatus(response, 200);
}

async function getReservation(request, reservationId) {
  const response = await request.get(`/api/reservations/${reservationId}`);
  return expectStatus(response, 200);
}

async function getBook(request, bookId) {
  const response = await request.get(`/api/books/${bookId}`);
  return expectStatus(response, 200);
}

async function listReservations(request, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await request.get(`/api/reservations${suffix}`);
  return expectStatus(response, 200);
}

async function createPendingReservation(request, overrides = {}) {
  const book = await createBook(request, overrides.book);
  const borrower = await createMember(request, overrides.borrower);
  const reserver = await createMember(request, overrides.reserver);
  const loan = await borrowBook(request, book.id, borrower.id);
  const reservation = await createReservation(request, book.id, reserver.id);

  return { book, borrower, reserver, loan, reservation };
}

async function createReadyReservation(request, overrides = {}) {
  const setup = await createPendingReservation(request, overrides);
  await returnLoan(request, setup.loan.id);

  return {
    ...setup,
    book: await getBook(request, setup.book.id),
    reservation: await getReservation(request, setup.reservation.id),
  };
}

async function createActiveReservationsForMember(request, member, count) {
  const setups = [];

  for (let index = 0; index < count; index += 1) {
    const book = await createBook(request, {
      title: `Limit Test Book ${nextToken('limit-book')}`,
    });
    const borrower = await createMember(request, {
      email: `limit-borrower-${Date.now()}-${index}-${counter}@example.com`,
    });
    const loan = await borrowBook(request, book.id, borrower.id);
    const reservation = await createReservation(request, book.id, member.id);
    setups.push({ book, borrower, loan, reservation });
  }

  return setups;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  cancelReservation,
  createActiveReservationsForMember,
  createBook,
  createMember,
  createPendingReservation,
  createReadyReservation,
  createReservation,
  deactivateMember,
  expectStatus,
  getBook,
  getReservation,
  listReservations,
  borrowBook,
  returnLoan,
  sleep,
};
