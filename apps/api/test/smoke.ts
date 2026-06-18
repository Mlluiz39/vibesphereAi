/**
 * Smoke e2e do fluxo principal — Tarefa 14.
 *
 * Exercita: registrar empresa -> login -> criar agente -> criar base de
 * conhecimento -> conectar canal (mock) -> simular mensagem (webhook) ->
 * verificar que a conversa/mensagem foram criadas e (com worker + OPENAI_API_KEY
 * ativos) que uma resposta do agente foi gerada.
 *
 * Pré-requisitos para rodar:
 *   - Infra de pé (docker compose up -d) + migrations + rls.sql + seed
 *   - API rodando (pnpm --filter @vibesphere/api dev)
 *   - Para validar a RESPOSTA da IA: worker rodando (pnpm --filter @vibesphere/worker dev)
 *     e OPENAI_API_KEY configurada
 *
 * Uso: SMOKE_API_URL=http://localhost:3001/api pnpm --filter @vibesphere/api smoke
 */

const BASE = process.env.SMOKE_API_URL ?? 'http://localhost:3001/api';

let accessToken = '';

async function call<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return data as T;
}

function step(name: string) {
  // eslint-disable-next-line no-console
  console.log(`\n▶ ${name}`);
}

function ok(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${msg}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const suffix = Date.now().toString(36);
  const subdomain = `smoke${suffix}`;
  const email = `owner@${subdomain}.com`;
  const password = 'smoke-pass-123';
  const customerPhone = '5511999998888';

  step('Registrar empresa + Owner');
  await call('POST', '/auth/register', {
    companyName: 'Smoke Co',
    subdomain,
    ownerEmail: email,
    ownerPassword: password,
    ownerName: 'Owner Smoke',
  }, false);
  ok(`tenant ${subdomain} criado`);

  step('Login');
  const tokens = await call<{ accessToken: string }>('POST', '/auth/login', {
    subdomain,
    email,
    password,
  }, false);
  accessToken = tokens.accessToken;
  ok('autenticado');

  step('Criar agente');
  const agent = await call<{ id: string }>('POST', '/agents', {
    name: 'Agente Smoke',
    systemPrompt: 'Você é um atendente cordial. Responda em uma frase.',
  });
  ok(`agente ${agent.id}`);

  step('Criar base de conhecimento');
  const kb = await call<{ id: string }>('POST', '/knowledge-bases', { name: 'KB Smoke' });
  ok(`base ${kb.id}`);

  step('Conectar canal de WhatsApp (mock)');
  const channel = await call<{ id: string }>('POST', '/whatsapp-channels', {
    phoneNumber: '5511000000000',
    phoneNumberId: 'mock-phone-id',
    accessToken: 'mock-token',
    defaultAgentId: agent.id,
  });
  ok(`canal ${channel.id}`);

  step('Simular mensagem recebida (webhook)');
  const inboundPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: customerPhone, profile: { name: 'Cliente Smoke' } }],
              messages: [
                {
                  from: customerPhone,
                  id: `wamid.smoke.${suffix}`,
                  type: 'text',
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  text: { body: 'Olá, vocês estão abertos?' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const accepted = await call<{ accepted: number }>(
    'POST',
    `/webhooks/whatsapp/${channel.id}`,
    inboundPayload,
    false,
  );
  ok(`webhook aceitou ${accepted.accepted} mensagem(ns)`);

  step('Verificar conversa/mensagem (processada pelo worker)');
  let found = false;
  let hasReply = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const conversations = await call<
      { id: string; messages?: { direction: string }[] }[]
    >('GET', '/inbox/conversations');
    if (conversations.length > 0) {
      found = true;
      const detail = await call<{ messages: { direction: string }[] }>(
        'GET',
        `/inbox/conversations/${conversations[0].id}`,
      );
      hasReply = detail.messages.some((m) => m.direction === 'outbound');
      if (hasReply) break;
    }
  }

  if (found) {
    ok('conversa criada com a mensagem do cliente');
  } else {
    throw new Error(
      'Nenhuma conversa encontrada. O worker está rodando? (pnpm --filter @vibesphere/worker dev)',
    );
  }

  if (hasReply) {
    ok('resposta da IA gerada e registrada 🎉');
  } else {
    // eslint-disable-next-line no-console
    console.log(
      '  ⚠ Sem resposta da IA. Verifique se o worker está rodando e OPENAI_API_KEY configurada.',
    );
  }

  // eslint-disable-next-line no-console
  console.log('\n✅ Smoke concluído.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('\n❌ Smoke falhou:', err.message);
  process.exit(1);
});
