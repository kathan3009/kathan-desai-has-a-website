import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// Run with: node --test tests/admin-auth.test.mjs
// Transpile only the owned modules in memory. Next's request/response classes
// are real; cookies, time and env are isolated. No server, .env file or DB loads.
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { NextRequest } = require("next/server");
const nodeCrypto = require("node:crypto");
const compiled = new Map();

function fixture(overrides = {}, dependencies = {}) {
  const env = {
    ADMIN_USERNAME: "test-admin",
    ADMIN_PASSWORD: "local-test-password-☀️",
    NODE_ENV: "production",
    ...overrides,
  };
  let now = 1_800_000_000_000;
  let storedCookie;
  let comparisons = 0;
  const modules = new Map();
  class Clock extends Date {
    static now() { return now; }
  }
  const cookieStore = {
    get(name) { return storedCookie?.name === name ? storedCookie : undefined; },
    set(name, value, options) { storedCookie = { name, value, options }; },
  };

  function load(relativePath) {
    const filename = resolve(root, relativePath);
    if (modules.has(filename)) return modules.get(filename).exports;
    if (!compiled.has(filename)) {
      compiled.set(filename, ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        fileName: filename,
      }).outputText);
    }
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    vm.runInNewContext(compiled.get(filename), {
      module: loadedModule,
      exports: loadedModule.exports,
      process: { env },
      crypto: globalThis.crypto,
      TextEncoder,
      URL,
      Uint8Array,
      btoa,
      atob,
      Date: Clock,
      require(specifier) {
        if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
        if (specifier === "next/headers") return { cookies: async () => cookieStore };
        if (specifier === "next/server") return require(specifier);
        if (specifier === "node:crypto") return {
          createHash: nodeCrypto.createHash,
          timingSafeEqual(a, b) {
            comparisons++;
            return nodeCrypto.timingSafeEqual(a, b);
          },
        };
        if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`);
        if (specifier.startsWith(".")) return load(resolve(dirname(filename), `${specifier}.ts`));
        throw new Error(`Unexpected dependency: ${specifier}`);
      },
    }, { filename });
    return loadedModule.exports;
  }
  return {
    env,
    load,
    session: load("lib/adminSession.ts"),
    auth: load("lib/auth.ts"),
    advance(seconds) { now += seconds * 1000; },
    get cookie() { return storedCookie; },
    get comparisons() { return comparisons; },
    setCookie(value) { cookieStore.set("admin-auth", value, {}); },
  };
}

function request(path, session) {
  return new NextRequest(`https://example.test${path}`, {
    headers: session ? { cookie: `admin-auth=${session}` } : {},
  });
}

function loginRequest(body) {
  return new NextRequest("https://example.test/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.test" },
    body: JSON.stringify(body),
  });
}

test("sessions are unique, signed, valid until the seven-day expiry boundary", async () => {
  const f = fixture();
  const first = await f.session.createAdminSession();
  const second = await f.session.createAdminSession();
  assert.notEqual(first, second);
  assert.equal(await f.session.verifyAdminSession(first), true);
  assert.equal(await f.session.verifyAdminSession(second), true);
  f.advance(f.session.ADMIN_SESSION_MAX_AGE - 1);
  assert.equal(await f.session.verifyAdminSession(first), true);
  f.advance(1);
  assert.equal(await f.session.verifyAdminSession(first), false);
});

test("future sessions, malformed values and missing values fail closed", async () => {
  const f = fixture();
  const session = await f.session.createAdminSession();
  for (const value of [undefined, null, 42, {}, [], "", "invalid", "v1.invalid", "x".repeat(4096), `${session}\n`, ` ${session}`, `${session}.extra`]) {
    assert.equal(await f.session.verifyAdminSession(value), false);
  }
  f.advance(-1);
  assert.equal(await f.session.verifyAdminSession(session), false);
});

test("optional secret and fallback work; key and credential rotation invalidate sessions", async () => {
  const fallback = fixture();
  const token = await fallback.session.createAdminSession();
  assert.equal(await fixture().session.verifyAdminSession(token), true);
  const dedicated = fixture({ ADMIN_SESSION_SECRET: "local-test-dedicated-signing-secret" });
  const dedicatedToken = await dedicated.session.createAdminSession();
  assert.equal(await dedicated.session.verifyAdminSession(dedicatedToken), true);
  assert.equal(await dedicated.session.verifyAdminSession(token), false);
  for (const [key, value] of [
    ["ADMIN_SESSION_SECRET", "local-test-rotated-secret"],
    ["ADMIN_PASSWORD", "local-test-rotated-password"],
    ["ADMIN_USERNAME", "different-admin"],
  ]) {
    const changed = fixture({ ...dedicated.env, [key]: value });
    assert.equal(await changed.session.verifyAdminSession(dedicatedToken), false);
  }
});

test("missing or malformed configuration cannot issue or accept sessions", async () => {
  const token = await fixture().session.createAdminSession();
  for (const overrides of [
    { ADMIN_USERNAME: undefined }, { ADMIN_PASSWORD: undefined },
    { ADMIN_PASSWORD: "   " }, { ADMIN_PASSWORD: "invalid\u0000value" },
    { ADMIN_SESSION_SECRET: "\n" },
  ]) {
    const f = fixture(overrides);
    await assert.rejects(f.session.createAdminSession(), /not configured/);
    assert.equal(await f.session.verifyAdminSession(token), false);
  }
});

test("credentials use both timing-safe comparisons and reject malformed input", async () => {
  const f = fixture();
  assert.equal(await f.auth.verifyAdmin(f.env.ADMIN_USERNAME, f.env.ADMIN_PASSWORD), true);
  assert.equal(f.comparisons, 2);
  assert.equal(await f.auth.verifyAdmin("different-admin", f.env.ADMIN_PASSWORD), false);
  assert.equal(f.comparisons, 4);
  assert.equal(await f.auth.verifyAdmin(f.env.ADMIN_USERNAME, "wrong-password"), false);
  assert.equal(f.comparisons, 6);
  for (const value of [undefined, null, {}, [], 42, "", "   ", "a\u0000b", "a\nb", "a\ud800", "x".repeat(4097)]) {
    assert.equal(await f.auth.verifyAdmin(value, f.env.ADMIN_PASSWORD), false);
    assert.equal(await f.auth.verifyAdmin(f.env.ADMIN_USERNAME, value), false);
  }
});

test("login, API verification and logout preserve their contracts and cookie scope", async () => {
  const f = fixture();
  const login = f.load("app/api/admin/login/route.ts");
  const verify = f.load("app/api/admin/verify/route.ts");
  const logout = f.load("app/api/admin/logout/route.ts");
  assert.equal(await f.auth.isAdminAuthenticated(), false);
  const response = await login.POST(loginRequest({ username: f.env.ADMIN_USERNAME, password: f.env.ADMIN_PASSWORD }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(f.cookie.name, "admin-auth");
  assert.equal(f.cookie.options.httpOnly, true);
  assert.equal(f.cookie.options.secure, true);
  assert.equal(f.cookie.options.sameSite, "lax");
  assert.equal(f.cookie.options.path, "/");
  assert.equal(f.cookie.options.maxAge, 604800);
  assert.equal(await f.session.verifyAdminSession(f.cookie.value), true);
  const authenticated = await verify.GET();
  assert.deepEqual(await authenticated.json(), { authenticated: true });
  assert.equal(authenticated.headers.get("cache-control"), "no-store");
  const result = await logout.POST(new NextRequest("https://example.test/api/admin/logout", {
    method: "POST", headers: { origin: "https://example.test" },
  }));
  assert.deepEqual(await result.json(), { success: true });
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(f.cookie.value, "");
  assert.equal(f.cookie.options.path, "/");
  assert.equal(f.cookie.options.maxAge, 0);
  assert.equal(f.cookie.options.expires.getTime(), 0);
  assert.deepEqual(await (await verify.GET()).json(), { authenticated: false });
});

test("malformed login bodies return 400; incorrect credentials return 401 without a cookie", async () => {
  const f = fixture();
  const login = f.load("app/api/admin/login/route.ts");
  for (const body of [null, [], "text", {}, { username: {}, password: [] }, { username: "admin", password: "" }]) {
    assert.equal((await login.POST(loginRequest(body))).status, 400);
  }
  const malformedJson = new NextRequest("https://example.test/api/admin/login", {
    method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: "{",
  });
  assert.equal((await login.POST(malformedJson)).status, 400);
  assert.equal((await login.POST(loginRequest({ username: f.env.ADMIN_USERNAME, password: "wrong-password" }))).status, 401);
  assert.equal(f.cookie, undefined);
});

test("API and middleware agree on valid, expired and malformed sessions for both admin paths", async () => {
  for (const adminPath of ["admin", "private-admin"]) {
    const f = fixture({ NEXT_PUBLIC_ADMIN_PATH: adminPath });
    const { middleware } = f.load("middleware.ts");
    const verify = f.load("app/api/admin/verify/route.ts");
    const session = await f.session.createAdminSession();
    for (const state of ["valid", "expired", "malformed", "absent"]) {
      if (state === "expired") f.advance(f.session.ADMIN_SESSION_MAX_AGE);
      const token = state === "malformed" ? "invalid" : state === "absent" ? undefined : session;
      f.setCookie(token);
      assert.equal((await (await verify.GET()).json()).authenticated, state === "valid");
      const response = await middleware(request(`/${adminPath}/projects`, token));
      if (state === "valid") {
        assert.equal(response.status, 200);
        if (adminPath !== "admin") {
          assert.equal(response.headers.get("x-middleware-rewrite"), "https://example.test/admin/projects");
        } else {
          assert.equal(response.headers.get("x-middleware-next"), "1");
        }
      } else {
        assert.equal(response.status, 307);
        assert.equal(response.headers.get("location"), `https://example.test/${adminPath}/login`);
      }
    }
    assert.equal((await middleware(request(`/${adminPath}/login`))).status, 200);
    assert.equal((await middleware(request("/about"))).headers.get("x-middleware-next"), "1");
    if (adminPath !== "admin") {
      assert.equal((await middleware(request("/admin"))).headers.get("location"), "https://example.test/");
    }
  }
});

test("local development cookie supports HTTP", async () => {
  const f = fixture({ NODE_ENV: "development" });
  await f.auth.setAdminSession();
  assert.equal(f.cookie.options.secure, false);
  assert.equal(await f.auth.isAdminAuthenticated(), true);
});

function mutation(path, { method = "POST", body, origin = "https://example.test", url = "https://example.test", contentType = "application/json" } = {}) {
  const headers = {};
  if (origin !== null) headers.origin = origin;
  if (body !== undefined) headers["content-type"] = contentType;
  return new NextRequest(`${url}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function expectError(response, status, text) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  if (text) assert.match(body.error, text);
}

test("login/logout require a strict trusted origin before changing cookies", async () => {
  for (const route of ["login", "logout"]) {
    for (const origin of [null, "null", "invalid", "https://other.test", "https://sub.example.test", "https://example.test/path", "https://example.test https://other.test"]) {
      const f = fixture();
      const handler = f.load(`app/api/admin/${route}/route.ts`);
      const response = await handler.POST(mutation(`/api/admin/${route}`, {
        origin, body: route === "login" ? { username: f.env.ADMIN_USERNAME, password: f.env.ADMIN_PASSWORD } : undefined,
      }));
      await expectError(response, 403, /origin/);
      assert.equal(f.cookie, undefined);
    }
  }
});

test("origin guard supports configured canonical and Vercel origins and local development", async () => {
  for (const [env, url, origin] of [
    [{ SITE_URL: "https://canonical.test/" }, "http://internal.test", "https://canonical.test"],
    [{ NEXT_PUBLIC_SITE_URL: "https://canonical.test" }, "http://internal.test", "https://canonical.test"],
    [{ VERCEL_URL: "deployment.vercel.app" }, "http://internal.test", "https://deployment.vercel.app"],
    [{ VERCEL_URL: "deployment.vercel.app" }, "https://custom.test", "https://custom.test"],
    [{ NODE_ENV: "development" }, "http://localhost:3000", "http://localhost:3000"],
  ]) {
    const f = fixture(env);
    const response = await f.load("app/api/admin/logout/route.ts").POST(mutation("/api/admin/logout", { url, origin }));
    assert.equal(response.status, 200);
  }
  const f = fixture({ SITE_URL: "not-a-url" });
  await expectError(await f.load("app/api/admin/logout/route.ts").POST(mutation("/api/admin/logout")), 503);
  assert.equal(f.cookie, undefined);
});

const resources = {
  about: "About", blog: "Blog", certifications: "Certification", faq: "FAQ",
  photos: "Photo", projects: "Project", skills: "Skill", work: "Work",
};
const recordId = "0123456789abcdef01234567";
const params = { params: Promise.resolve({ id: recordId }) };

function dataFixture(resource, options = {}) {
  const calls = [];
  const item = { _id: recordId, title: "Local fixture", name: "Local fixture" };
  const result = operation => {
    calls.push(operation);
    if (options.error) throw options.error;
    return options.notFound ? null : item;
  };
  const model = {
    find() { calls.push("find"); return { sort: async () => [result("sort")] }; },
    async create(body) { calls.push({ create: body }); return result("create"); },
    async findByIdAndUpdate(id, body, settings) {
      assert.equal(id, recordId);
      assert.equal(settings.runValidators, true);
      calls.push({ update: body });
      return result("update");
    },
    async findByIdAndDelete(id) { assert.equal(id, recordId); return result("delete"); },
    async findById() { return result("findById"); },
  };
  const f = fixture({ OPENAI_API_KEY: "local-test-only", ...options.env }, {
    "@/lib/db": { default: async () => {
      calls.push("db");
      return options.unavailable ? null : {};
    } },
    [`@/models/${resources[resource]}`]: { default: model },
    "@/lib/r2": { uploadBufferToR2: async () => { throw new Error("Unexpected external upload"); } },
    openai: { default: class { constructor() { throw new Error("Unexpected provider call"); } } },
  });
  return { ...f, calls, item };
}

async function signIn(f) {
  f.setCookie(await f.session.createAdminSession());
}

test("all collection handlers preserve authenticated CRUD and readonly GET without Origin", async () => {
  for (const resource of Object.keys(resources)) {
    const f = dataFixture(resource);
    await signIn(f);
    const list = f.load(`app/api/admin/${resource}/route.ts`);
    const detail = f.load(`app/api/admin/${resource}/[id]/route.ts`);
    const response = await list.GET();
    assert.deepEqual(await response.json(), [f.item]);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await list.POST(mutation(`/api/admin/${resource}`, { body: { title: "New item" } }))).status, 200);
    assert.equal((await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", body: { title: "Changed" } }), params)).status, 200);
    if (resource === "blog") {
      const update = f.calls.find(value => typeof value === "object" && value.update).update;
      assert.equal(typeof update.dateModified.getTime(), "number");
    }
    const deleted = await detail.DELETE(mutation(`/api/admin/${resource}/${recordId}`, { method: "DELETE" }), params);
    assert.deepEqual(await deleted.json(), { success: true });
  }
});

test("every data mutation rejects missing Origin before DB work; every data read requires auth", async () => {
  for (const resource of Object.keys(resources)) {
    const f = dataFixture(resource);
    const list = f.load(`app/api/admin/${resource}/route.ts`);
    const detail = f.load(`app/api/admin/${resource}/[id]/route.ts`);
    await expectError(await list.GET(), 401);
    await expectError(await list.POST(mutation(`/api/admin/${resource}`, { body: {} })), 401);
    await expectError(await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", body: {} }), params), 401);
    await expectError(await detail.DELETE(mutation(`/api/admin/${resource}/${recordId}`, { method: "DELETE" }), params), 401);
    await signIn(f);
    await expectError(await list.POST(mutation(`/api/admin/${resource}`, { origin: null, body: {} })), 403);
    await expectError(await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", origin: null, body: {} }), params), 403);
    await expectError(await detail.DELETE(mutation(`/api/admin/${resource}/${recordId}`, { method: "DELETE", origin: null }), params), 403);
    assert.deepEqual(f.calls, []);
  }
});

test("all CRUD handlers return 503 for unavailable DB without calling models", async () => {
  for (const resource of Object.keys(resources)) {
    const f = dataFixture(resource, { unavailable: true });
    await signIn(f);
    const list = f.load(`app/api/admin/${resource}/route.ts`);
    const detail = f.load(`app/api/admin/${resource}/[id]/route.ts`);
    await expectError(await list.GET(), 503);
    await expectError(await list.POST(mutation(`/api/admin/${resource}`, { body: { title: "New" } })), 503);
    await expectError(await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", body: { title: "Update" } }), params), 503);
    await expectError(await detail.DELETE(mutation(`/api/admin/${resource}/${recordId}`, { method: "DELETE" }), params), 503);
    assert.deepEqual(f.calls, ["db", "db", "db", "db"]);
  }
});

test("JSON objects, JSON content types and valid record IDs are required before DB work", async () => {
  for (const resource of Object.keys(resources)) {
    const f = dataFixture(resource);
    await signIn(f);
    const list = f.load(`app/api/admin/${resource}/route.ts`);
    const detail = f.load(`app/api/admin/${resource}/[id]/route.ts`);
    for (const body of [null, [], 1, "text"]) {
      await expectError(await list.POST(mutation(`/api/admin/${resource}`, { body })), 400);
      await expectError(await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", body }), params), 400);
    }
    await expectError(await list.POST(mutation(`/api/admin/${resource}`, { body: {}, contentType: "text/plain" })), 400);
    const badJson = new NextRequest(`https://example.test/api/admin/${resource}`, {
      method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: "{",
    });
    await expectError(await list.POST(badJson), 400);
    const invalidParams = { params: Promise.resolve({ id: "invalid-id" }) };
    await expectError(await detail.PUT(mutation(`/api/admin/${resource}/invalid-id`, { method: "PUT", body: {} }), invalidParams), 400);
    await expectError(await detail.DELETE(mutation(`/api/admin/${resource}/invalid-id`, { method: "DELETE" }), invalidParams), 400);
    assert.deepEqual(f.calls, []);
  }
});

test("CRUD validation, duplicates, connection failures and unknown errors have safe JSON responses", async () => {
  for (const resource of Object.keys(resources)) {
    for (const [error, status] of [
      [{ name: "ValidationError", message: "private diagnostics" }, 400],
      [{ name: "CastError", message: "private diagnostics" }, 400],
      [{ code: 11000, message: "private diagnostics" }, 409],
      [{ name: "MongoNetworkError", message: "private diagnostics" }, 503],
      [new Error("private diagnostics"), 500],
    ]) {
      const f = dataFixture(resource, { error });
      await signIn(f);
      const list = f.load(`app/api/admin/${resource}/route.ts`);
      const detail = f.load(`app/api/admin/${resource}/[id]/route.ts`);
      for (const response of [
        await list.POST(mutation(`/api/admin/${resource}`, { body: { title: "Valid input" } })),
        await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", body: { title: "Valid input" } }), params),
      ]) {
        assert.equal(response.status, status);
        assert.doesNotMatch(await response.text(), /private diagnostics/);
      }
    }
    const missing = dataFixture(resource, { notFound: true });
    await signIn(missing);
    const detail = missing.load(`app/api/admin/${resource}/[id]/route.ts`);
    await expectError(await detail.PUT(mutation(`/api/admin/${resource}/${recordId}`, { method: "PUT", body: {} }), params), 404);
    await expectError(await detail.DELETE(mutation(`/api/admin/${resource}/${recordId}`, { method: "DELETE" }), params), 404);
  }
});

test("audio generation checks Origin, auth, record ID and DB availability before external work", async () => {
  const f = dataFixture("blog", { unavailable: true });
  const handler = f.load("app/api/admin/blog/[id]/generate-audio/route.ts");
  const path = `/api/admin/blog/${recordId}/generate-audio`;
  await expectError(await handler.POST(mutation(path), params), 401);
  await signIn(f);
  await expectError(await handler.POST(mutation(path, { origin: null }), params), 403);
  await expectError(await handler.POST(mutation(path), { params: Promise.resolve({ id: "invalid-id" }) }), 400);
  assert.deepEqual(f.calls, []);
  await expectError(await handler.POST(mutation(path), params), 503);
  assert.deepEqual(f.calls, ["db"]);
});
