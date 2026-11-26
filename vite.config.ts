import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { createInvoiceWorkflowHandler } from './server/invoiceWorkflow.js'
import planLimitsHandler from './api/plan-limits.js'
import aiChatHandler from './api/ai-chat.js'
import chatImageHandler from './api/chat-image.js'

function googleTokenExchangePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'google-token-exchange-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/google-token-exchange', async (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const { code, redirectUri, customerUid } = JSON.parse(body || '{}')
              const clientId = env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID
              const clientSecret = env.VITE_GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET

              if (!clientId || !clientSecret) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    error: 'Missing VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_SECRET in .env',
                  })
                )
                return
              }

              // Exchange code with Google
              const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  code,
                  client_id: clientId,
                  client_secret: clientSecret,
                  redirect_uri: redirectUri,
                  grant_type: 'authorization_code',
                }),
              })

              const tokenData: any = await tokenRes.json()

              if (!tokenRes.ok) {
                res.statusCode = tokenRes.status
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    error: tokenData.error_description || tokenData.error || 'Token exchange failed',
                  })
                )
                return
              }

              // Fetch Google user email
              const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
              })
              const profile: any = await profileRes.json()
              const email = profile.email || 'accounts@workspace'

              // Upsert to Supabase if configured
              const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL
              const supabaseKey =
                env.SUPABASE_SERVICE_ROLE_KEY ||
                env.VITE_SUPABASE_ANON_KEY

              if (supabaseUrl && supabaseKey) {
                const { createClient } = await import('@supabase/supabase-js')
                const sb = createClient(supabaseUrl, supabaseKey)
                const rowPayload = {
                  customer_uid: customerUid || 'local_user',
                  provider: 'google',
                  connected_email: email,
                  refresh_token: tokenData.refresh_token || '',
                  is_active: true,
                  updated_at: new Date().toISOString(),
                }
                const attempt1 = await sb.from('user_email_integrations').upsert(rowPayload, { onConflict: 'customer_uid' })
                if (attempt1.error) {
                  const attempt2 = await sb.from('user_email_integrations').upsert(rowPayload, { onConflict: 'customer_uid,provider' })
                  if (attempt2.error) {
                    await sb.from('user_email_integrations').upsert(rowPayload)
                  }
                }

                // Sync connected_email to "Credentials" table
                if (customerUid && customerUid !== 'local_user') {
                  const numericId = Number(customerUid)
                  const idVal = !isNaN(numericId) && numericId > 0 && String(numericId) === String(customerUid) ? numericId : customerUid
                  const credAttempt1 = await sb.from('Credentials').update({ connected_email: email }).eq('uid', customerUid)
                  if (credAttempt1.error) {
                    const credAttempt2 = await sb.from('Credentials').update({ connected_email: email }).eq('id', idVal)
                    if (credAttempt2.error) {
                      await sb.from('Credentials').update({ connected_email: email }).eq('customer_uid', customerUid)
                    }
                  }
                }
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, email }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message || 'Internal error' }))
            }
          })
        } else {
          res.statusCode = 405
          res.end('Method not allowed')
        }
      })
    },
  }
}

function planLimitsPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'plan-limits-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/plan-limits', async (req, res) => {
        await planLimitsHandler(req, res, env)
      })
    },
  }
}

function aiChatPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'ai-chat-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/ai-chat', async (req, res) => {
        await aiChatHandler(req, res, env)
      })
    },
  }
}

function chatImagePlugin(): Plugin {
  return {
    name: 'chat-image-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/chat-image', async (req, res) => {
        await chatImageHandler(req, res)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat-image', async (req, res) => {
        await chatImageHandler(req, res)
      })
    },
  }
}

function invoiceWorkflowPlugin(env: Record<string, string>): Plugin {
  const routes: Record<string, ReturnType<typeof createInvoiceWorkflowHandler>> = {
    '/api/invoice-extract': createInvoiceWorkflowHandler('extract'),
    '/api/invoice-approve': createInvoiceWorkflowHandler('approve'),
    '/api/sequence-save': createInvoiceWorkflowHandler('sequence'),
  }

  return {
    name: 'invoice-workflow-dev-middleware',
    configureServer(server) {
      for (const [path, handler] of Object.entries(routes)) {
        server.middlewares.use(path, async (req, res) => {
          await handler(req, res, env)
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), googleTokenExchangePlugin(env), planLimitsPlugin(env), aiChatPlugin(env), chatImagePlugin(), invoiceWorkflowPlugin(env)],
    resolve: {
      alias: [
        // Keep generated/copied UI primitives at the requested root-level /components/ui path.
        { find: /^@\/components(?:\/|$)/, replacement: `${path.resolve(process.cwd(), 'components')}/` },
        // Everything else follows the Vite + src convention used by the rest of the app.
        { find: /^@\//, replacement: `${path.resolve(process.cwd(), 'src')}/` },
      ],
    },
    envPrefix: ['VITE_', 'SUPABASE_'],
  }
})
