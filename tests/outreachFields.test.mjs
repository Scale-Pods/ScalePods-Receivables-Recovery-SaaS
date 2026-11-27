import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectStepDeliveries,
  parseOutreachDate,
} from '../src/lib/outreachFields.mjs';

test('parseOutreachDate detects a Done marker and extracts the ISO date', () => {
  const parsed = parseOutreachDate('date- done 2026-11-27 - Done');
  assert.equal(parsed.sent, true);
  assert.equal(parsed.date, '2026-11-27');
  assert.equal(parsed.raw, 'date- done 2026-11-27 - Done');
});

test('parseOutreachDate treats a plain ISO date as scheduled, not done', () => {
  const parsed = parseOutreachDate('2026-11-27');
  assert.equal(parsed.sent, false);
  assert.equal(parsed.date, '2026-11-27');
});

test('collectStepDeliveries maps nth channel columns and saved HTML content', () => {
  const row = {
    email_1_date: '2026-11-27',
    email_1_content: '<p>First reminder</p>',
    email_2_date: 'date- done 2026-11-29 - Done',
    email_2_content: '<p>Second reminder</p>',
    wa_1_date: 'date- done 2026-11-29 - Done',
  };
  const counts = { email: 0, whatsapp: 0, voice: 0 };

  const first = collectStepDeliveries(row, ['email'], counts);
  assert.equal(first.length, 1);
  assert.equal(first[0].channel, 'email');
  assert.equal(first[0].index, 1);
  assert.equal(first[0].sent, false);
  assert.equal(first[0].contentHtml, '<p>First reminder</p>');

  const second = collectStepDeliveries(row, ['email', 'whatsapp'], counts);
  assert.equal(second.length, 2);
  assert.deepEqual(second.map((d) => d.index), [2, 1]);
  assert.equal(second[0].sent, true);
  assert.equal(second[0].sentDate, '2026-11-29');
  assert.equal(second[1].channel, 'whatsapp');
  assert.equal(second[1].sent, true);
  assert.equal(second[1].contentHtml, '');
});
