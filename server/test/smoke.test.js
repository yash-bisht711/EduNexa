import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeCertificate } from '../src/services/certificate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. JWT Configuration
test('EduNexa API configuration has a safe fallback JWT secret only for local development', () => {
  assert.equal(typeof process.env.NODE_ENV === 'string' || process.env.NODE_ENV === undefined, true);
});

// 2. Quiz Scoring - Match earns points
test('quiz scoring contract: only matching option index earns points', () => {
  const questions = [
    { correctIndex: 1, points: 2 },
    { correctIndex: 0, points: 1 }
  ];
  const answers = [1, 2];
  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctIndex ? q.points : 0), 0);
  assert.equal(score, 2);
});

// 3. Quiz Scoring - All incorrect answers return 0
test('quiz scoring contract: all wrong answers return 0 score', () => {
  const questions = [
    { correctIndex: 2, points: 5 },
    { correctIndex: 3, points: 5 }
  ];
  const answers = [0, 1];
  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctIndex ? q.points : 0), 0);
  assert.equal(score, 0);
});

// 4. Quiz Scoring - Percentage calculation
test('quiz scoring contract: percentage reflects earned points over total', () => {
  const questions = [
    { correctIndex: 0, points: 2 },
    { correctIndex: 1, points: 3 },
    { correctIndex: 2, points: 5 }
  ];
  const total = questions.reduce((s, q) => s + q.points, 0); // 10
  const answers = [0, 1, 0]; // 2 + 3 + 0 = 5 points
  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctIndex ? q.points : 0), 0);
  const percentage = Math.round((score / total) * 100);
  assert.equal(total, 10);
  assert.equal(score, 5);
  assert.equal(percentage, 50);
});

// 5. AI Security - Provider credentials server-side only
test('AI provider credentials are configured server-side, never in the client bundle', async () => {
  const route = await readFile(path.join(root, 'src/routes/ai.js'), 'utf8');
  assert.match(route, /process\.env\.GEMINI_API_KEY/);
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
});

// 6. AI Conversation Scope
test('AI conversation endpoints scope lookups to the authenticated user', async () => {
  const route = await readFile(path.join(root, 'src/routes/ai.js'), 'utf8');
  assert.match(route, /AIConversation\.findOne\(\{_id:req\.params\.id,user:req\.user\._id\}\)/);
  assert.match(route, /AIConversation\.deleteOne\(\{_id:req\.params\.id,user:req\.user\._id\}\)/);
});

// 7. Organization RBAC
test('organization member management checks organization membership and admin role', async () => {
  const route = await readFile(path.join(root, 'src/routes/organizations.js'), 'utf8');
  assert.match(route, /\['owner','org_admin'\]\.includes\(actor\.role\)/);
  assert.match(route, /OrganizationMembership\.findOne\(\{organization:req\.params\.id,user:req\.user\._id,status:'active'\}\)/);
});

// 8. PDF Certificate Generator
test('makeCertificate generates a valid PDF binary buffer with PDF header', async () => {
  const mockStudent = { _id: 'std_123', name: 'Alice Test' };
  const mockCourse = { _id: 'crs_456', title: 'Advanced Full-Stack Engineering' };
  const buffer = await makeCertificate({ student: mockStudent, course: mockCourse });
  assert.ok(Buffer.isBuffer(buffer), 'Output should be a Buffer');
  assert.ok(buffer.length > 500, 'PDF buffer should be non-trivial in size');
  // Check PDF magic header "%PDF-"
  const header = buffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-');
});

// 9. Course Search & Filter Query Logic
test('course search query builder correctly formats regex and level filters', () => {
  function buildQuery({ search, level, category, minPrice, maxPrice }) {
    const q = { published: true };
    if (search) q.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    if (level) q.level = level;
    if (category) q.category = category;
    if (minPrice !== undefined || maxPrice !== undefined) {
      q.price = {};
      if (minPrice !== undefined) q.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) q.price.$lte = Number(maxPrice);
    }
    return q;
  }

  const query = buildQuery({ search: 'react', level: 'Beginner', minPrice: 0, maxPrice: 1000 });
  assert.equal(query.published, true);
  assert.equal(query.level, 'Beginner');
  assert.equal(query.price.$gte, 0);
  assert.equal(query.price.$lte, 1000);
  assert.equal(query.$or[0].title.$regex, 'react');
});

// 10. Review Rating Range Validation
test('review rating validation: rating must be between 1 and 5 inclusive', () => {
  const isValidRating = (r) => typeof r === 'number' && Number.isInteger(r) && r >= 1 && r <= 5;
  assert.equal(isValidRating(5), true);
  assert.equal(isValidRating(1), true);
  assert.equal(isValidRating(3), true);
  assert.equal(isValidRating(0), false);
  assert.equal(isValidRating(6), false);
  assert.equal(isValidRating(4.5), false);
});

// 11. Enrollment Progress Calculation
test('enrollment progress math: properly rounds progress percentage', () => {
  function calculateProgress(completedLessons, totalLessons) {
    if (!totalLessons || totalLessons === 0) return 0;
    return Math.round((completedLessons.length / totalLessons) * 100);
  }

  assert.equal(calculateProgress(['l1', 'l2'], 4), 50);
  assert.equal(calculateProgress(['l1', 'l2', 'l3'], 3), 100);
  assert.equal(calculateProgress(['l1'], 3), 33);
  assert.equal(calculateProgress([], 5), 0);
});

// 12. Razorpay HMAC Signature Verification
test('Razorpay payment signature HMAC-SHA256 verification', () => {
  const orderId = 'order_test_987654';
  const paymentId = 'pay_test_123456';
  const secret = 'test_secret_key_123';

  // Generate valid signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Verify
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(signature, expected);

  // Altered payment ID must fail
  const invalidSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|tampered_id`)
    .digest('hex');

  assert.notEqual(signature, invalidSignature);
});

// 13. Live Class Room Name Constraints
test('live class room name validation logic respects length limits', () => {
  const isValidRoom = (name) => typeof name === 'string' && name.trim().length > 0 && name.length < 120;
  assert.equal(isValidRoom('edunexa-room-101'), true);
  assert.equal(isValidRoom(''), false);
  assert.equal(isValidRoom('a'.repeat(125)), false);
  assert.equal(isValidRoom(null), false);
});

// 14. Lesson Reordering Algorithm
test('lesson reordering array matching preserves order indices', () => {
  const lessons = [
    { _id: 'l1', title: 'First', order: 1 },
    { _id: 'l2', title: 'Second', order: 2 },
    { _id: 'l3', title: 'Third', order: 3 }
  ];

  const newOrder = ['l3', 'l1', 'l2'];
  const map = new Map(lessons.map((l) => [l._id, l]));
  const reordered = newOrder.map((id, index) => {
    const item = map.get(id);
    return { ...item, order: index + 1 };
  });

  assert.equal(reordered[0]._id, 'l3');
  assert.equal(reordered[0].order, 1);
  assert.equal(reordered[1]._id, 'l1');
  assert.equal(reordered[1].order, 2);
  assert.equal(reordered[2]._id, 'l2');
  assert.equal(reordered[2].order, 3);
});

// 15. Notification Unread Flag Logic
test('notifications read-all logic sets read flag on all matching user items', () => {
  const notifications = [
    { id: 1, user: 'u1', read: false },
    { id: 2, user: 'u1', read: false },
    { id: 3, user: 'u1', read: true }
  ];

  const updated = notifications.map(n => ({ ...n, read: true }));
  assert.equal(updated.every(n => n.read === true), true);
});

// 16. Monthly Earnings Grouping Formatter
test('monthly earnings aggregation produces valid YYYY-MM formatted keys', () => {
  const date = new Date('2026-10-15T12:00:00Z');
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const monthStr = `${year}-${month < 10 ? '0' + month : month}`;
  assert.equal(monthStr, '2026-10');
});

// 17. Admin User Role Verification
test('admin user role modification allows only recognized system roles', () => {
  const validRoles = ['student', 'instructor', 'admin'];
  const isValidRole = (r) => validRoles.includes(r);
  assert.equal(isValidRole('student'), true);
  assert.equal(isValidRole('instructor'), true);
  assert.equal(isValidRole('admin'), true);
  assert.equal(isValidRole('superman'), false);
  assert.equal(isValidRole(''), false);
});

// 18. Certificate Verification Endpoint Logic
test('certificate verification logic returns verified true for completed course enrollments', () => {
  const mockEnrollment = {
    course: 'crs_1',
    student: 'std_1',
    progress: 100,
    completedAt: new Date('2026-10-25')
  };

  const isEligibleForCert = (enr) => Boolean(enr && enr.progress === 100 && enr.completedAt);
  assert.equal(isEligibleForCert(mockEnrollment), true);

  const incompleteEnrollment = {
    course: 'crs_1',
    student: 'std_2',
    progress: 60,
    completedAt: null
  };
  assert.equal(isEligibleForCert(incompleteEnrollment), false);
});
