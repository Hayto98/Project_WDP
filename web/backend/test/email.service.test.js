const test = require('node:test');
const assert = require('node:assert/strict');

const emailService = require('../src/services/email.service');

const env = require('../src/config/env');

test('email service skips sending when SMTP is not configured', async () => {
  const originalEnabled = env.email.enabled;
  env.email.enabled = false;

  const result = await emailService.sendMail({
    to: 'student@example.com',
    subject: 'Test',
    text: 'Hello',
  });

  env.email.enabled = originalEnabled;

  assert.equal(result.sent, false);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'EMAIL_NOT_CONFIGURED');
});
