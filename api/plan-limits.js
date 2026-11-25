import { createClient } from '@supabase/supabase-js';

/**
 * Server-only read of `public.recovery_plan_limits`.
 *
 * The browser must never write to this table. `Price_monthly` and `Price_yearly`
 * are deliberately served through this handler instead of being read from a
 * client-side Supabase query.
 */
const PLAN_LIMIT_COLUMNS = [
  'id',
  'plan_name',
  'max_invoices_per_month',
  'max_ai_call_minutes',
  'email_enabled',
  'whatsapp_enabled',
  'ai_calls_enabled',
  'manual_upload_enabled',
  'bulk_upload_enabled',
  'email_forwarding_enabled',
  'max_invoicing_connections',
  'light_sequence_enabled',
  'standard_sequence_enabled',
  'intensive_sequence_enabled',
  'editable_sequence_enabled',
  'max_sequence_days',
  'ai_bucket_selection',
  'advanced_risk_scoring',
  'ai_risk_weighting',
  'ai_reply_analysis',
  'promise_capture',
  'ai_next_step',
  'ai_payment_plans',
  'ai_best_time_channel',
  'dispute_tracking',
  'auto_dispute_extension',
  'credit_hold',
  'team_alerts',
  'lawyer_handoff',
  'late_interest_claim',
  'international_payments',
  'invoice_grouping',
  'instalments_enabled',
  'multiple_bank_accounts',
  'bulk_payment_marking',
  'custom_payment_gateways',
  'history_months',
  'allowed_channels',
  'allowed_sequence_types',
  'payment_methods',
  'custom_limits',
  'status',
  '"Sequence"',
  '"Price_yearly"',
  '"Price_monthly"',
].join(',');

function envValue(name, env) {
  return env?.[name] || process.env[name] || '';
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res, env = process.env) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed. Plan pricing is read-only for clients.' });
    return;
  }

  try {
    const supabaseUrl = envValue('SUPABASE_URL', env) || envValue('VITE_SUPABASE_URL', env);
    // Never use a VITE_-prefixed service-role key here: those are bundled into the browser.
    const supabaseKey =
      envValue('SUPABASE_SERVICE_ROLE_KEY', env) ||
      envValue('SUPABASE_ANON_KEY', env) ||
      envValue('VITE_SUPABASE_ANON_KEY', env);

    if (!supabaseUrl || !supabaseKey) {
      sendJson(res, 503, { error: 'Supabase is not configured for plan pricing.' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('recovery_plan_limits')
      .select(PLAN_LIMIT_COLUMNS)
      .eq('status', 'Active')
      .order('id', { ascending: true });

    if (error) {
      console.error('Plan limits query failed:', error);
      sendJson(res, 500, { error: 'Unable to load plan pricing.' });
      return;
    }

    sendJson(res, 200, {
      data: data ?? [],
      source: 'recovery_plan_limits',
    });
  } catch (error) {
    console.error('Plan limits handler failed:', error);
    sendJson(res, 500, { error: error?.message || 'Internal server error' });
  }
}
