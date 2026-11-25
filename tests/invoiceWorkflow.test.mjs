import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDate,
  buildRecoveryRow,
  findDuplicate,
  findDuplicateStrict,
  generateSchedule,
  getScheduleStartDate,
  normalizeDate,
  normalizeExtracted,
  normalizeSequence,
  parsePaymentTermsDays,
} from '../server/invoiceWorkflow.js';

test('normalizeDate handles ISO and Indian date formats', () => {
  assert.equal(normalizeDate('2024-06-12'), '2024-06-12');
  assert.equal(normalizeDate('12/06/2024'), '2024-06-12');
  assert.equal(normalizeDate('12-06-24'), '2024-06-12');
});

test('parsePaymentTermsDays reads common credit terms', () => {
  assert.equal(parsePaymentTermsDays('Net 30'), 30);
  assert.equal(parsePaymentTermsDays('2/10 Net 30'), 30);
  assert.equal(parsePaymentTermsDays('N/60'), 60);
  assert.equal(parsePaymentTermsDays('Payment within 15 days of invoice date'), 15);
  assert.equal(parsePaymentTermsDays('Credit period: 45 days'), 45);
  assert.equal(parsePaymentTermsDays('30'), 30);
  assert.equal(parsePaymentTermsDays('Due on receipt'), 0);
  assert.equal(parsePaymentTermsDays('End of following month'), null);
  assert.equal(parsePaymentTermsDays(null), null);
});

test('due date is calculated from payment terms when the invoice has no printed due date', () => {
  const extracted = normalizeExtracted({
    transaction_date: '2024-05-01',
    payment_terms: 'Net 30',
    payment_terms_days: 30,
  });

  assert.equal(extracted.due_date, '2024-05-31');
  assert.equal(extracted.oldest_due_date, '2024-05-31');
  assert.equal(extracted.due_date_source, 'payment_terms');
  assert.equal(getScheduleStartDate({ dueDate: extracted.due_date }), '2024-06-01');
});

test('payment terms without an invoice date do not invent a due date', () => {
  const extracted = normalizeExtracted({ payment_terms: 'Net 30' });

  assert.equal(extracted.due_date, null);
  assert.equal(extracted.due_date_source, null);
});

test('an explicit due date always wins over payment terms', () => {
  const extracted = normalizeExtracted({
    transaction_date: '2024-05-01',
    due_date: '2024-05-10',
    payment_terms: 'Net 30',
  });

  assert.equal(extracted.due_date, '2024-05-10');
  assert.equal(extracted.due_date_source, 'due_date');
  assert.equal(extracted.payment_terms_days, 30);
});

test('re-normalizing a calculated draft keeps its source, but a manual override does not', () => {
  const extracted = normalizeExtracted({
    transaction_date: '2024-05-01',
    payment_terms: 'Net 30',
  });
  const again = normalizeExtracted(extracted);
  assert.equal(again.due_date, '2024-05-31');
  assert.equal(again.due_date_source, 'payment_terms');

  const overridden = normalizeExtracted({ ...extracted, due_date: '2024-06-15' });
  assert.equal(overridden.due_date, '2024-06-15');
  assert.equal(overridden.due_date_source, 'due_date');
});

test('addDaysToDate applies sequence day offsets', () => {
  assert.equal(addDaysToDate('2024-06-12', 1), '2024-06-13');
  assert.equal(addDaysToDate('2024-06-12', 10), '2024-06-22');
});

test('schedule starts the day after the due date and overrides legacy cycle starts', () => {
  assert.equal(
    getScheduleStartDate({
      dueDate: '2024-06-12',
      cycleStartedDate: '2024-01-01',
    }),
    '2024-06-13'
  );
  assert.equal(getScheduleStartDate({ cycleStartedDate: '2024-06-12' }), '2024-06-12');
});

test('first scheduled action is derived from the due date anchor', () => {
  const startDate = getScheduleStartDate({ dueDate: '2024-06-12' });
  const sequence = normalizeSequence([
    { day: 1, stage: 'Friendly', channels: ['email'], headline: 'Day 1 Reminder' },
    { day: 3, stage: 'Firm', channels: ['whatsapp', 'voice'], headline: 'Day 3 Escalation' },
  ]);
  const schedule = generateSchedule(sequence, startDate);

  assert.equal(startDate, '2024-06-13');
  assert.equal(schedule.firstStep.headline, 'Day 1 Reminder');
  assert.equal(schedule.firstStep.scheduled_date, '2024-06-13');
  assert.equal(schedule.rowDates.email_1_date, '2024-06-13');
  assert.equal(schedule.scheduledSteps[1].scheduled_date, '2024-06-15');
  assert.deepEqual(schedule.scheduledSteps[1].channels, ['whatsapp', 'voice']);
  assert.equal(schedule.rowDates.wa_1_date, '2024-06-15');
  assert.equal(schedule.rowDates.call_1_date, '2024-06-15');
});

test('generateSchedule writes channel counters and first action date', () => {
  const sequence = normalizeSequence([
    { day: 1, stage: 'Friendly', channels: ['email'], headline: 'First email' },
    { day: 3, stage: 'Firm', channels: ['wa', 'voice', 'email'], headline: 'Multi touch' },
  ]);
  const schedule = generateSchedule(sequence, '2024-06-12');

  assert.equal(schedule.firstStep.headline, 'First email');
  assert.equal(schedule.firstStep.scheduled_date, '2024-06-12');
  assert.equal(schedule.rowDates.email_1_date, '2024-06-12');
  assert.equal(schedule.rowDates.email_2_date, '2024-06-14');
  assert.equal(schedule.rowDates.wa_1_date, '2024-06-14');
  assert.equal(schedule.rowDates.call_1_date, '2024-06-14');
});

test('pre-due steps are scheduled before the due date and keep their phase', () => {
  const sequence = normalizeSequence([
    {
      day: -21,
      phase: 'before_due',
      stage: 'Pre-due',
      channels: ['email'],
      headline: '3 weeks before due date: Early payment reminder',
    },
    {
      day: -7,
      phase: 'before_due',
      stage: 'Pre-due',
      channels: ['whatsapp'],
      headline: '1 week before due date: Gentle payment heads-up',
    },
    { day: 1, stage: 'Friendly', channels: ['email'], headline: 'Day 1 Reminder' },
  ]);

  assert.deepEqual(
    sequence.map((step) => step.day),
    [-21, -7, 1]
  );
  assert.equal(sequence[0].phase, 'before_due');

  const schedule = generateSchedule(sequence, getScheduleStartDate({ dueDate: '2024-06-12' }));
  assert.deepEqual(
    schedule.scheduledSteps.map((step) => step.scheduled_date),
    ['2024-05-22', '2024-06-05', '2024-06-13']
  );
  assert.equal(schedule.rowDates.email_1_date, '2024-05-22');
  assert.equal(schedule.rowDates.wa_1_date, '2024-06-05');
  assert.equal(schedule.rowDates.email_2_date, '2024-06-13');
  assert.equal(schedule.firstStep.phase, 'before_due');
});

test('approval row stores pre-due channel dates before the due date', () => {
  const dueDate = '2026-12-16';
  const sequence = normalizeSequence([
    { day: -7, stage: 'Pre-due', channels: ['email'], headline: 'Email 1 week before' },
    { day: -5, stage: 'Pre-due', channels: ['email'], headline: 'Email 5 days before' },
    { day: -3, stage: 'Pre-due', channels: ['whatsapp'], headline: 'WhatsApp 3 days before' },
    { day: 1, stage: 'Friendly', channels: ['email'], headline: 'Day 1 Reminder' },
  ]);
  const startDate = getScheduleStartDate({ dueDate });
  const schedule = generateSchedule(sequence, startDate);
  const row = buildRecoveryRow({
    extracted: { due_date: dueDate, oldest_due_date: dueDate, overdue_amount: 100 },
    context: {},
    sequenceInfo: { source: 'Credentials' },
    schedule,
    risk: { risk_score: 50, risk_reason: 'test' },
    startDate,
  });

  assert.equal(row.cycle_started_date, '2026-12-17');
  assert.equal(row.next_action_date, '2026-12-09');
  assert.equal(row.email_1_date, '2026-12-09');
  assert.equal(row.email_2_date, '2026-12-11');
  assert.equal(row.wa_1_date, '2026-12-13');
  assert.equal(row.email_3_date, '2026-12-17');
});

test('day zero is rejected as a sequence step', () => {
  const sequence = normalizeSequence([
    { day: 0, channels: ['email'] },
    { day: -7, channels: ['email'] },
    { day: 1, channels: ['email'] },
  ]);
  assert.deepEqual(
    sequence.map((step) => step.day),
    [-7, 1]
  );
});

test('customer provided contact details override extracted values', () => {
  const extracted = normalizeExtracted(
    { email: 'extracted@example.com', phone: '9999999999', bill_no: 'INV-1', overdue_amount: '₹1,25,000' },
    { customerEmail: 'typed@example.com', customerPhone: '8888888888' }
  );

  assert.equal(extracted.email, 'typed@example.com');
  assert.equal(extracted.phone, '8888888888');
  assert.equal(extracted.overdue_amount, 125000);
});

test('buildRecoveryRow maps approval data to recovery_outreach columns', () => {
  const extracted = normalizeExtracted(
    {
      party_name: 'Acme Pvt Ltd',
      gstin: '27AABCK1234F1Z9',
      bill_no: 'INV-2024-01',
      overdue_amount: 50000,
      due_date: '2024-05-20',
      transaction_date: '2024-05-01',
      max_overdue_days: 23,
    },
    { customerEmail: 'owner@scalepods.co', customerPhone: '8888888888' }
  );
  const context = {
    userEmail: 'owner@scalepods.co',
    userTier: 'enterprise',
    customer_uid: 'cust-1',
    userCompany: 'ScalePods',
  };
  const sequenceInfo = { source: 'Credentials', tier: 'enterprise' };
  const schedule = generateSchedule(
    normalizeSequence([{ day: 1, stage: 'Friendly', channels: ['email'], headline: 'Day 1 Reminder' }]),
    '2024-06-12'
  );
  const row = buildRecoveryRow({
    extracted,
    context,
    sequenceInfo,
    schedule,
    startDate: getScheduleStartDate({ dueDate: '2024-05-20' }),
    risk: { risk_score: 72, risk_reason: 'baseline' },
  });

  assert.equal(row.gstin, '27AABCK1234F1Z9');
  assert.equal(row.bill_no, 'INV-2024-01');
  assert.equal(row.email, 'owner@scalepods.co');
  assert.equal(row.overdue_amount, '50000');
  assert.equal(row.next_action, 'Day 1 Reminder');
  assert.equal(row.next_action_date, '2024-06-12');
  assert.equal(row.cycle_started_date, '2024-05-21');
  assert.equal(row.email_1_date, '2024-06-12');
  assert.equal(row.risk_score, 72);
});

function createDuplicateSupabase(rows) {
  const queries = [];

  return {
    queries,
    from() {
      return {
        filters: [],
        select() {
          return this;
        },
        eq(column, value) {
          this.filters.push([column, value]);
          return this;
        },
        limit() {
          return this;
        },
        async maybeSingle() {
          queries.push([...this.filters]);
          const match = rows.find((row) =>
            this.filters.every(([column, value]) => String(row[column] ?? '') === String(value ?? ''))
          );
          return { data: match || null, error: null };
        },
      };
    },
  };
}

test('duplicate lookup is scoped to the logged-in account', async () => {
  const gstin = '33FDRPS0542E1ZH';
  const billNo = 'SP-758/2/26-27';
  const supabase = createDuplicateSupabase([
    {
      id: 'row-1',
      bill_no: billNo,
      gstin,
      customer_uid: 'account-a',
      customer_email: 'owner-a@example.com',
    },
  ]);
  const extracted = { bill_no: billNo, gstin };

  const ownDuplicate = await findDuplicateStrict(supabase, extracted, {
    customer_uid: 'account-a',
    userEmail: 'owner-a@example.com',
  });
  assert.equal(ownDuplicate?.id, 'row-1');

  const otherAccountDuplicate = await findDuplicateStrict(supabase, extracted, {
    customer_uid: 'account-b',
    userEmail: 'owner-b@example.com',
  });
  assert.equal(otherAccountDuplicate, null);

  assert.ok(supabase.queries.length > 0);
  assert.ok(
    supabase.queries.every((filters) =>
      filters.some(([column]) => column === 'customer_uid' || column === 'customer_email')
    ),
    'every duplicate query must include an account scope'
  );
});

test('duplicate lookup falls back to the logged-in account email', async () => {
  const supabase = createDuplicateSupabase([
    {
      id: 'row-2',
      bill_no: 'INV-100',
      gstin: '27AABCK1234F1Z9',
      customer_uid: null,
      customer_email: 'owner@example.com',
    },
  ]);

  const duplicate = await findDuplicate(
    supabase,
    { bill_no: 'INV-100', gstin: '27AABCK1234F1Z9' },
    { userEmail: '  OWNER@EXAMPLE.COM  ' }
  );

  assert.equal(duplicate?.id, 'row-2');
  assert.ok(
    supabase.queries.every((filters) =>
      filters.some(([column]) => column === 'customer_uid' || column === 'customer_email')
    )
  );
});
