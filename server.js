// J8 — servidor de protótipo (Node puro, sem dependências externas)
// Motivo: evitar exigir "npm install" para testar — corre com `node server.js`.
// ATENÇÃO: isto é um protótipo para teste local. Antes de qualquer uso real com
// dados de clientes de verdade, ver as notas de segurança no README.md deste projeto
// e os documentos J8_PROFESSIONAL_EDITION.md / J8_FICHA_CLIENTE_IA.md (LGPD/RGPD).

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const DB_PATH = path.join(__dirname, "data", "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;
const SESSION_COOKIE = "j8session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

// ---------- "banco de dados" em arquivo JSON (só para protótipo) ----------
function readDB() {
  if (!fs.existsSync(DB_PATH)) return { users: [], bookings: [] };
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    if (!db.bookings) db.bookings = [];
    if (!db.users) db.users = [];
    return db;
  } catch (e) {
    console.error("Erro ao ler db.json, iniciando vazio:", e.message);
    return { users: [], bookings: [] };
  }
}
function writeDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}
function findUserByEmail(db, email) {
  return db.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
}

// ---------- senha (crypto.scrypt — nativo do Node, sem dependência externa) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return salt + ":" + hash;
}
function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(":") === -1) return false;
  const [salt, hashHex] = stored.split(":");
  const hash = crypto.scryptSync(String(password), salt, 64);
  const storedBuf = Buffer.from(hashHex, "hex");
  if (storedBuf.length !== hash.length) return false;
  return crypto.timingSafeEqual(hash, storedBuf);
}

// ---------- sessões em memória (token aleatório em cookie httpOnly) ----------
const sessions = new Map(); // token -> { userEmail, expires }

function createSession(userEmail) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { userEmail, expires: Date.now() + SESSION_TTL_MS });
  return token;
}
function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || s.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return s;
}
function destroySession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];
  if (token) sessions.delete(token);
}
function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

// ---------- helpers HTTP ----------
function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) req.destroy(); // limite generoso, protótipo
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        const err = new Error("JSON inválido no corpo da requisição.");
        err.statusCode = 400; // corpo malformado é erro do cliente, não do servidor
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Não encontrado.");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// ---------- profissionais parceiros (catálogo fixo, só para protótipo) ----------
const PROFISSIONAIS = [
  { id: "prof1", nome: "Marta Silva", especialidade: "Colorista — visagismo e colorimetria" },
  { id: "prof2", nome: "Bruno Ferreira", especialidade: "Cortes — visagismo masculino e feminino" },
  { id: "prof3", nome: "Inês Duarte", especialidade: "Tricologista — couro cabeludo e queda" }
];

function gerarSlotsDisponiveis(profissionalId, db) {
  const slots = [];
  const agora = new Date();
  let diasGerados = 0;
  let cursor = 0;
  while (diasGerados < 10) {
    cursor += 1;
    const d = new Date(agora.getTime() + cursor * 24 * 60 * 60 * 1000);
    const diaSemana = d.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    diasGerados += 1;
    [9, 11, 14, 16].forEach((hora) => {
      const slot = new Date(d);
      slot.setHours(hora, 0, 0, 0);
      slots.push(slot.toISOString());
    });
  }
  const ocupados = new Set(
    (db.bookings || []).filter((b) => b.profissionalId === profissionalId).map((b) => b.horarioISO)
  );
  return slots.filter((s) => !ocupados.has(s));
}

// ---------- roteador ----------
const routes = [];
function route(method, pattern, handler) {
  routes.push({ method, pattern, handler });
}
function matchRoute(method, pathname) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const parts = r.pattern.split("/").filter(Boolean);
    const actual = pathname.split("/").filter(Boolean);
    if (parts.length !== actual.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(":")) {
        params[parts[i].slice(1)] = decodeURIComponent(actual[i]);
      } else if (parts[i] !== actual[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { handler: r.handler, params };
  }
  return null;
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJSON(res, 401, { error: "Não autenticado. Faça login novamente." });
    return null;
  }
  return session;
}

// ---------- rotas: autenticação ----------
route("POST", "/api/signup", async (req, res) => {
  const body = await readBody(req);
  const { email, password, nome } = body;

  if (!isValidEmail(email)) return sendJSON(res, 400, { error: "E-mail inválido." });
  if (!password || String(password).length < 6)
    return sendJSON(res, 400, { error: "A senha precisa ter pelo menos 6 caracteres." });

  const db = readDB();
  if (findUserByEmail(db, email)) return sendJSON(res, 409, { error: "Já existe uma conta com este e-mail." });

  const novoUsuario = {
    email: String(email).toLowerCase(),
    nome: nome || "",
    passwordHash: hashPassword(password),
    criadoEm: new Date().toISOString(),
    fichas: [],
    pedidos: []
  };
  db.users.push(novoUsuario);
  writeDB(db);

  const token = createSession(novoUsuario.email);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
  sendJSON(res, 200, { ok: true, email: novoUsuario.email, nome: novoUsuario.nome });
});

route("POST", "/api/login", async (req, res) => {
  const body = await readBody(req);
  const { email, password } = body;
  const db = readDB();
  const user = findUserByEmail(db, email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendJSON(res, 401, { error: "E-mail ou senha incorretos." });
  }

  const token = createSession(user.email);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
  sendJSON(res, 200, { ok: true, email: user.email, nome: user.nome });
});

route("POST", "/api/logout", async (req, res) => {
  destroySession(req);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  sendJSON(res, 200, { ok: true });
});

route("GET", "/api/me", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  if (!user) return sendJSON(res, 401, { error: "Sessão inválida." });
  sendJSON(res, 200, { email: user.email, nome: user.nome, fichas: user.fichas || [] });
});

// ---------- rotas: ficha da cliente ----------
route("POST", "/api/ficha", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const body = await readBody(req);
  const { diagnostico, orcamento } = body;
  if (!diagnostico || !orcamento) return sendJSON(res, 400, { error: "Dados de diagnóstico/orçamento ausentes." });

  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  if (!user) return sendJSON(res, 401, { error: "Sessão inválida." });

  const registro = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    criadoEm: new Date().toISOString(),
    diagnostico,
    orcamento
  };
  user.fichas = user.fichas || [];
  user.fichas.unshift(registro);
  writeDB(db);

  sendJSON(res, 200, { ok: true, ficha: registro });
});

route("GET", "/api/ficha", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  sendJSON(res, 200, { fichas: (user && user.fichas) || [] });
});

route("DELETE", "/api/ficha/:id", async (req, res, params) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  if (!user) return sendJSON(res, 401, { error: "Sessão inválida." });

  const antes = (user.fichas || []).length;
  user.fichas = (user.fichas || []).filter((f) => f.id !== params.id);
  writeDB(db);
  sendJSON(res, 200, { ok: true, removido: antes !== user.fichas.length });
});

// ---------- rotas: agenda ----------
route("GET", "/api/profissionais", async (req, res) => {
  sendJSON(res, 200, { profissionais: PROFISSIONAIS });
});

route("GET", "/api/agenda/horarios", async (req, res, params, query) => {
  const profissionalId = query.get("profissionalId");
  if (!profissionalId || !PROFISSIONAIS.find((p) => p.id === profissionalId)) {
    return sendJSON(res, 400, { error: "Profissional inválido." });
  }
  const db = readDB();
  sendJSON(res, 200, { horarios: gerarSlotsDisponiveis(profissionalId, db) });
});

route("POST", "/api/agenda/marcar", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const body = await readBody(req);
  const { profissionalId, horarioISO, servico } = body;
  const prof = PROFISSIONAIS.find((p) => p.id === profissionalId);
  if (!prof || !horarioISO) return sendJSON(res, 400, { error: "Dados de marcação incompletos." });

  const db = readDB();
  const jaOcupado = (db.bookings || []).some(
    (b) => b.profissionalId === profissionalId && b.horarioISO === horarioISO
  );
  if (jaOcupado) return sendJSON(res, 409, { error: "Este horário acabou de ser reservado por outra pessoa. Escolha outro." });

  const marcacao = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    userEmail: session.userEmail,
    profissionalId,
    profissionalNome: prof.nome,
    servico: servico || "Consulta/serviço não especificado",
    horarioISO,
    criadoEm: new Date().toISOString()
  };
  db.bookings = db.bookings || [];
  db.bookings.push(marcacao);
  writeDB(db);
  sendJSON(res, 200, { ok: true, marcacao });
});

route("GET", "/api/agenda/minhas", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const minhas = (db.bookings || []).filter((b) => b.userEmail === session.userEmail);
  sendJSON(res, 200, { marcacoes: minhas });
});

route("DELETE", "/api/agenda/:id", async (req, res, params) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const antes = (db.bookings || []).length;
  db.bookings = (db.bookings || []).filter((b) => !(b.id === params.id && b.userEmail === session.userEmail));
  writeDB(db);
  sendJSON(res, 200, { ok: true, removido: antes !== db.bookings.length });
});

// ---------- rotas: pedidos de produtos ----------
route("POST", "/api/pedidos", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const body = await readBody(req);
  const { itens, totalEUR } = body;
  if (!Array.isArray(itens) || !itens.length) return sendJSON(res, 400, { error: "O pedido precisa de pelo menos um item." });

  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  if (!user) return sendJSON(res, 401, { error: "Sessão inválida." });

  const pedido = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    criadoEm: new Date().toISOString(),
    itens,
    totalEUR: totalEUR || itens.reduce((s, i) => s + (i.precoEUR || 0), 0),
    status: "pendente"
  };
  user.pedidos = user.pedidos || [];
  user.pedidos.unshift(pedido);
  writeDB(db);
  sendJSON(res, 200, { ok: true, pedido });
});

route("GET", "/api/pedidos", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  sendJSON(res, 200, { pedidos: (user && user.pedidos) || [] });
});

route("DELETE", "/api/pedidos/:id", async (req, res, params) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const db = readDB();
  const user = findUserByEmail(db, session.userEmail);
  if (!user) return sendJSON(res, 401, { error: "Sessão inválida." });

  const antes = (user.pedidos || []).length;
  user.pedidos = (user.pedidos || []).filter((p) => p.id !== params.id);
  writeDB(db);
  sendJSON(res, 200, { ok: true, removido: antes !== user.pedidos.length });
});

// ---------- servidor HTTP ----------
const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsed.pathname;

  if (pathname.startsWith("/api/")) {
    const match = matchRoute(req.method, pathname);
    if (!match) return sendJSON(res, 404, { error: "Rota não encontrada." });
    try {
      await match.handler(req, res, match.params, parsed.searchParams);
    } catch (e) {
      const status = e.statusCode || 500;
      if (status >= 500) console.error(e);
      sendJSON(res, status, { error: e.message || "Erro interno do servidor." });
    }
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`J8 app rodando em http://localhost:${PORT}`);
});
