const test = require('node:test');
const assert = require('node:assert/strict');

const { digestSubjects, sinceForFrequency } = require('../src/services/followDigest.service');

test('follow digest filters active email subjects by frequency', () => {
  const user = {
    followed_subjects: [
      { follow_id: 'a', active: true, rule: { email: true, frequency: 'daily' } },
      { follow_id: 'b', active: true, rule: { email: true, frequency: 'weekly' } },
      { follow_id: 'c', active: true, rule: { email: false, frequency: 'daily' } },
      { follow_id: 'd', active: false, rule: { email: true, frequency: 'daily' } },
    ],
  };

  assert.deepEqual(digestSubjects(user, 'daily').map((subject) => subject.follow_id), ['a']);
  assert.deepEqual(digestSubjects(user, 'weekly').map((subject) => subject.follow_id), ['b']);
});

test('follow digest computes daily and weekly windows', () => {
  const now = new Date('2026-07-11T12:00:00.000Z');
  assert.equal(sinceForFrequency('daily', now).toISOString(), '2026-07-10T12:00:00.000Z');
  assert.equal(sinceForFrequency('weekly', now).toISOString(), '2026-07-04T12:00:00.000Z');
});
