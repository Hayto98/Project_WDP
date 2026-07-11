const test = require('node:test');
const assert = require('node:assert/strict');

const { _private } = require('../src/services/ai.service');

test('AI public text guard redacts email and phone-like values', () => {
  const text = _private.cleanPublicText('Contact alice@example.com or +84 912 345 678 for details.', 500);
  assert.equal(text.includes('alice@example.com'), false);
  assert.equal(text.includes('+84 912 345 678'), false);
  assert.match(text, /\[redacted-email\]/);
  assert.match(text, /\[redacted-phone\]/);
});
