const express = require('express');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AzulCargo@2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'azul-cargo-cadastro-mude-em-producao';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cadastros.json');
const TEMP_FILE = `${DATA_FILE}.tmp`;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const rateLimits = new Map();
let writeQueue = Promise.resolve();

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, item) => {
    const separator = item.indexOf('=');
    if (separator < 0) return cookies;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken() {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = Buffer.from(JSON.stringify({ user: ADMIN_USER, expiresAt })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function isValidSession(token = '') {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.user === ADMIN_USER && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const token = parseCookies(req.headers.cookie).azul_admin;
  if (!isValidSession(token)) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  next();
}

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function registrationRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const entries = (rateLimits.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (entries.length >= 10) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }
  entries.push(now);
  rateLimits.set(key, entries);
  next();
}

async function readRegistrations() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function saveRegistration(registration) {
  writeQueue = writeQueue.then(async () => {
    const registrations = await readRegistrations();
    registrations.push(registration);
    await fs.writeFile(TEMP_FILE, `${JSON.stringify(registrations, null, 2)}\n`, 'utf8');
    await fs.rename(TEMP_FILE, DATA_FILE);
  });
  return writeQueue;
}

app.post('/api/cadastros', registrationRateLimit, async (req, res, next) => {
  try {
    const nome = cleanText(req.body.nome, 120);
    const telefone = cleanText(req.body.telefone, 30);
    const empresa = cleanText(req.body.empresa, 120);
    const phoneDigits = telefone.replace(/\D/g, '');

    if (nome.length < 2) return res.status(400).json({ error: 'Informe um nome válido.' });
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      return res.status(400).json({ error: 'Informe um telefone válido com DDD.' });
    }
    if (empresa.length < 2) return res.status(400).json({ error: 'Informe uma empresa válida.' });

    const registration = {
      id: crypto.randomUUID(),
      nome,
      telefone,
      empresa,
      criadoEm: new Date().toISOString()
    };

    await saveRegistration(registration);
    res.status(201).json({ message: 'Cadastro realizado com sucesso.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/login', (req, res) => {
  const userOk = safeEqual(req.body.usuario || '', ADMIN_USER);
  const passwordOk = safeEqual(req.body.senha || '', ADMIN_PASSWORD);
  if (!userOk || !passwordOk) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

  res.setHeader(
    'Set-Cookie',
    `azul_admin=${encodeURIComponent(createSessionToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}`
  );
  res.json({ message: 'Acesso autorizado.' });
});

app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'azul_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.status(204).end();
});

app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ authenticated: true }));

app.get('/api/admin/cadastros', requireAdmin, async (req, res, next) => {
  try {
    const registrations = await readRegistrations();
    res.json(registrations.slice().reverse());
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/cadastros/download', requireAdmin, async (req, res, next) => {
  try {
    const registrations = await readRegistrations();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="cadastros-${date}.json"`);
    res.type('application/json').send(`${JSON.stringify(registrations, null, 2)}\n`);
  } catch (error) {
    next(error);
  }
});

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h' }));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Não foi possível concluir a operação agora.' });
});

async function start() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cadastro disponível em http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar:', error);
  process.exit(1);
});
