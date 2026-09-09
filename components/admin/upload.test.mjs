import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

// node --test components/admin/upload.test.mjs
// Isolated env, mocked storage/browser transports; never reads .env or contacts R2.
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const compiled = new Map();
function compile(filename) {
  if (!compiled.has(filename)) compiled.set(filename, ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename,
  }).outputText);
  return compiled.get(filename);
}
function fixture({ realSigner = false } = {}) {
  const env = { R2_ACCOUNT_ID: "00000000000000000000000000000000", R2_ACCESS_KEY_ID: "test-access", R2_SECRET_ACCESS_KEY: "test-secret", R2_BUCKET_NAME: "test-bucket", R2_PUBLIC_URL: "https://media.example.test", VERCEL: "1" };
  const calls = [];
  let authenticated = true, now = 1_800_000_000_000;
  let head = { ContentLength: 123, ContentType: "image/png" };
  let providerError;
  let corsRules = [];
  let denyCorsWrite = false;
  class Clock extends Date { static now() { return now; } }
  class PutObjectCommand { constructor(input) { this.input = input; } }
  class HeadObjectCommand { constructor(input) { this.input = input; } }
  class GetBucketCorsCommand { constructor(input) { this.input = input; } }
  class PutBucketCorsCommand { constructor(input) { this.input = input; } }
  class S3Client {
    constructor(config) { calls.push({ kind: "client", config }); }
    async send(command) {
      calls.push({ kind: command.constructor.name, input: command.input });
      if (providerError) throw providerError;
      if (command instanceof GetBucketCorsCommand) return { CORSRules: corsRules };
      if (command instanceof PutBucketCorsCommand) {
        if (denyCorsWrite) throw { name: "AccessDenied" };
        corsRules = command.input.CORSConfiguration.CORSRules; return {};
      }
      return head;
    }
    destroy() {}
  }
  const sdk = realSigner ? require("@aws-sdk/client-s3") : { S3Client, PutObjectCommand, HeadObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand };
  const modules = new Map();
  function load(relativePath) {
    const filename = resolve(root, relativePath);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} }; modules.set(filename, loadedModule);
    vm.runInNewContext(compile(filename), {
      module: loadedModule, exports: loadedModule.exports, process: { env }, Buffer, URL, Date: Clock,
      TextDecoder, Uint8Array, Request, Response, FormData, File,
      require(specifier) {
        if (specifier === "@aws-sdk/client-s3") return sdk;
        if (specifier === "@aws-sdk/s3-request-presigner") return realSigner ? require(specifier) : {
          async getSignedUrl(client, command, options) { calls.push({ kind: "sign", input: command.input, options }); return "https://storage.example.test/presigned"; },
        };
        if (specifier === "node:crypto") return require(specifier);
        if (specifier === "next/server") return require(specifier);
        if (specifier === "./auth") return { isAdminAuthenticated: async () => authenticated };
        if (specifier === "@/lib/upload") return { saveUpload: async () => { calls.push({ kind: "local-save" }); return "/uploads/test.png"; } };
        if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`);
        if (specifier.startsWith(".")) return load(resolve(dirname(filename), `${specifier}.ts`));
        throw new Error(`Unexpected dependency: ${specifier}`);
      },
    }, { filename });
    return loadedModule.exports;
  }
  return { env, calls, load, r2: load("lib/r2.ts"), setCorsRules(value) { corsRules = value; }, denyCorsWrite() { denyCorsWrite = true; }, setAuth(value) { authenticated = value; }, setHead(value) { head = value; }, setProviderError(value) { providerError = value; }, advance(seconds) { now += seconds * 1000; } };
}
function jsonRequest(body, headers = {}) {
  return new Request("https://app.example.test/api/admin/upload-presign", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.test", ...headers }, body: JSON.stringify(body) });
}
function multipartRequest(file, subdir) {
  const body = new FormData(); body.append("file", file); if (subdir !== undefined) body.append("subdir", subdir);
  return new Request("https://app.example.test/api/admin/upload-r2", { method: "POST", headers: { origin: "https://app.example.test" }, body });
}
const valid = { type: "image/png", size: 123, subdir: "blog/photos" };

test("MIME allowlist and nonempty integer sizes enforce exact image/video boundaries", () => {
  const { r2 } = fixture();
  for (const type of [...r2.IMAGE_TYPES, ...r2.VIDEO_TYPES]) {
    const max = r2.getMaxBytes(type);
    assert.equal(r2.validateFile({ type, size: max }).ok, true);
    assert.equal(r2.validateFile({ type, size: max + 1 }).ok, false);
    for (const size of [0, -1, 0.5, NaN, Infinity, "123"]) assert.equal(r2.validateFile({ type, size }).ok, false);
  }
  for (const type of ["", "image/svg+xml", "text/html", "application/octet-stream"]) assert.equal(r2.validateFile({ type, size: 123 }).ok, false);
});

test("prepare generates key/extension, signs exact size/type and never returns a public URL", async () => {
  const f = fixture();
  const result = await f.r2.prepareR2Upload({ ...valid, key: "chosen.html", name: "chosen.html" });
  assert.equal(result.url, undefined);
  assert.equal(result.headers["Content-Type"], "image/png");
  const signed = f.calls.find(call => call.kind === "sign");
  assert.match(signed.input.Key, /^blog\/photos\/[a-f0-9-]{36}\.png$/);
  assert.equal(signed.input.ContentLength, 123);
  assert.equal(signed.input.ContentType, "image/png");
  assert.equal(signed.options.expiresIn, 600);
  assert.ok(signed.options.signableHeaders.has("content-type"));
  assert.ok(signed.options.signableHeaders.has("content-length"));
  assert.equal(JSON.stringify(result).includes(f.env.R2_SECRET_ACCESS_KEY), false);
  assert.equal(f.calls.some(call => call.kind.endsWith("Command")), false);
});

test("actual AWS signer includes content length/type and no empty-body checksum, without a network call", async () => {
  const f = fixture({ realSigner: true });
  const result = await f.r2.prepareR2Upload(valid);
  const url = new URL(result.uploadUrl);
  const signed = url.searchParams.get("X-Amz-SignedHeaders").split(";");
  assert.ok(signed.includes("content-length"));
  assert.ok(signed.includes("content-type"));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "600");
  for (const key of url.searchParams.keys()) assert.equal(key.toLowerCase().includes("checksum"), false);
});

test("invalid types, oversized files and unsafe folder names fail before signing", async () => {
  const f = fixture();
  for (const input of [null, [], {}, { ...valid, type: "image/svg+xml" }, { ...valid, size: 5 * 1024 * 1024 + 1 }, { ...valid, size: "123" }]) await assert.rejects(f.r2.prepareR2Upload(input));
  for (const subdir of ["../photos", "/photos", "photos/", "a//b", "a\\b", "a b", "a?b", "a#b", "a%2fb", "a\nb", "a/..", "a".repeat(161), {}, ["a"]]) await assert.rejects(f.r2.prepareR2Upload({ ...valid, subdir }));
  assert.equal(f.calls.length, 0);
});

test("only a valid receipt and matching HEAD return the public URL; confirmations can be retried", async () => {
  const f = fixture(); const { token } = await f.r2.prepareR2Upload(valid);
  const url = await f.r2.finalizeR2Upload(token);
  assert.match(url, /^https:\/\/media\.example\.test\/blog\/photos\/[a-f0-9-]{36}\.png$/);
  assert.equal(await f.r2.finalizeR2Upload(token), url);
  for (const head of [{ ContentLength: 124, ContentType: "image/png" }, { ContentLength: 123, ContentType: "text/html" }, {}]) {
    f.setHead(head); await assert.rejects(f.r2.finalizeR2Upload(token), error => error.status === 409);
  }
  f.setProviderError({ $metadata: { httpStatusCode: 404 } });
  await assert.rejects(f.r2.finalizeR2Upload(token), error => error.status === 409);
  assert.equal(f.calls.filter(call => call.kind === "PutObjectCommand").length, 0);
});

test("tampered, expired, rotated and cross-bucket receipts cannot confirm objects", async () => {
  const f = fixture(); const { token } = await f.r2.prepareR2Upload(valid);
  const [payload, signature] = token.split(".");
  const altered = JSON.parse(Buffer.from(payload, "base64url")); altered.key = "different.png";
  for (const value of [undefined, {}, "", "a".repeat(2049), `${token}\n`, `${Buffer.from(JSON.stringify(altered)).toString("base64url")}.${signature}`]) await assert.rejects(f.r2.finalizeR2Upload(value));
  f.env.R2_BUCKET_NAME = "other-bucket"; await assert.rejects(f.r2.finalizeR2Upload(token)); f.env.R2_BUCKET_NAME = "test-bucket";
  f.env.R2_SECRET_ACCESS_KEY = "rotated"; await assert.rejects(f.r2.finalizeR2Upload(token)); f.env.R2_SECRET_ACCESS_KEY = "test-secret";
  f.advance(3600); await assert.rejects(f.r2.finalizeR2Upload(token), error => error.status === 410);
  assert.equal(f.calls.filter(call => call.kind === "HeadObjectCommand").length, 0);
});

test("all upload mutations reject unauthenticated, missing Origin and cross-origin requests before storage", async () => {
  for (const path of ["upload", "upload-r2", "upload-presign"]) {
    const f = fixture(); const route = f.load(`app/api/admin/${path}/route.ts`);
    f.setAuth(false); assert.equal((await route.POST(jsonRequest({ action: "prepare", ...valid }))).status, 401);
    f.setAuth(true);
    for (const origin of ["", "null", "https://untrusted.example.test", "https://app.example.test/", "https://app.example.test.evil.test"]) {
      const result = await route.POST(jsonRequest({ action: "prepare", ...valid }, { origin }));
      assert.equal(result.status, 403);
      assert.equal(result.headers.get("cache-control"), "no-store");
    }
    const missing = jsonRequest({}); missing.headers.delete("origin"); assert.equal((await route.POST(missing)).status, 403);
    assert.equal(f.calls.length, 0);
  }
});

test("presign route supports trusted app origin and bounded JSON; errors do not leak SDK details", async () => {
  const f = fixture(); const route = f.load("app/api/admin/upload-presign/route.ts");
  const response = await route.POST(jsonRequest({ action: "prepare", ...valid }));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json(); assert.equal(data.url, undefined);
  assert.equal((await route.POST(jsonRequest({ action: "complete", token: data.token }))).status, 200);
  for (const body of [[], null, {}, { action: "other" }]) assert.equal((await route.POST(jsonRequest(body))).status, 400);
  const malformed = jsonRequest({});
  assert.equal((await route.POST(new Request(malformed.url, { method: "POST", headers: malformed.headers, body: "{" }))).status, 400);
  assert.equal((await route.POST(jsonRequest({}, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await route.POST(jsonRequest({ padding: "a".repeat(8193) }))).status, 413);
  f.setProviderError(new Error("private-provider-error-with-credentials"));
  const failed = await route.POST(jsonRequest({ action: "complete", token: data.token }));
  assert.equal(failed.status, 502); assert.equal((await failed.text()).includes("private-provider"), false);
  delete f.env.R2_SECRET_ACCESS_KEY;
  assert.equal((await route.POST(jsonRequest({ action: "prepare", ...valid }))).status, 503);
});

test("legacy endpoints preserve successful response contracts without real writes", async () => {
  for (const path of ["upload", "upload-r2"]) {
    const f = fixture(); const route = f.load(`app/api/admin/${path}/route.ts`);
    const result = await route.POST(multipartRequest(new File(["small-image"], "unsafe.html", { type: "image/png" }), "photos"));
    assert.equal(result.status, 200);
    const body = await result.json(); assert.match(body[path === "upload" ? "path" : "url"], /^https:\/\/media.example.test\/photos\/.*\.png$/);
    assert.equal(f.calls.filter(call => call.kind === "PutObjectCommand").length, 1);
    assert.equal((await route.POST(multipartRequest("not-a-file"))).status, 400);
    assert.equal((await route.POST(multipartRequest(new File([], "empty.png", { type: "image/png" })))).status, 400);
    assert.equal((await route.POST(multipartRequest(new File(["x"], "file.png", { type: "image/png" }), "../bad"))).status, 400);
    assert.equal((await route.POST(multipartRequest(new File([new Uint8Array(4 * 1024 * 1024)], "big.png", { type: "image/png" })))).status, 413);
  }
});

test("body reader enforces streamed bytes without trusting Content-Length", async () => {
  const { r2 } = fixture();
  const request = new Request("https://app.example.test", { method: "POST", body: new Uint8Array(100), headers: { "content-length": "1" } });
  await assert.rejects(r2.readUploadBody(request, 99), error => error.status === 413);
  const declared = new Request("https://app.example.test", { method: "POST", body: "a", headers: { "content-length": "100" } });
  await assert.rejects(r2.readUploadBody(declared, 99), error => error.status === 413);
});

function browserFixture({ mode = "success", completionFailures = 0 } = {}) {
  const calls = [], xhrs = [];
  let failRemaining = completionFailures;
  class XHR {
    upload = {}; status = mode === "forbidden" ? 403 : 200; headers = {};
    constructor() { xhrs.push(this); }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(file) {
      this.file = file;
      queueMicrotask(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: file.size / 2, total: file.size });
        if (mode === "network") this.onerror();
        else if (mode === "timeout") this.ontimeout();
        else if (mode === "abort") this.onabort();
        else this.onload();
      });
    }
  }
  const loadedModule = { exports: {} };
  vm.runInNewContext(compile(resolve(root, "components/admin/upload.ts")), {
    module: loadedModule, exports: loadedModule.exports, XMLHttpRequest: XHR, FormData, Date,
    require(specifier) {
      assert.equal(specifier, "./api");
      return { adminRequest: async (url, init) => {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        calls.push({ url, body });
        if (body.action === "prepare") return { uploadUrl: "https://storage.example.test/put", token: "receipt", headers: { "Content-Type": "image/png" }, expiresIn: 600 };
        if (body.action === "complete" && failRemaining-- > 0) throw new Error("Session expired");
        return { url: "https://media.example.test/confirmed.png" };
      } };
    },
  });
  return { ...loadedModule.exports, calls, xhrs };
}

test("browser sends raw File, reports progress, and gets public URL only after confirmation", async () => {
  const f = browserFixture(); const messages = [];
  const file = new File(["image"], "pic.png", { type: "image/png" });
  assert.equal(await f.uploadFileDirect(file, "photos", value => messages.push(value)), "https://media.example.test/confirmed.png");
  assert.deepEqual(f.calls.map(call => call.body.action), ["prepare", "complete"]);
  assert.equal(f.xhrs[0].method, "PUT"); assert.equal(f.xhrs[0].file, file);
  assert.deepEqual(f.xhrs[0].headers, { "Content-Type": "image/png" });
  assert.ok(messages.includes("Uploading 50%")); assert.equal(messages.at(-1), "Confirming upload…");
});

test("failed confirmation retries HEAD confirmation without another PUT", async () => {
  const f = browserFixture({ completionFailures: 1 }); const file = new File(["image"], "pic.png", { type: "image/png" });
  await assert.rejects(f.uploadFileDirect(file, "photos", () => {}), /Session expired/);
  assert.equal(f.calls.length, 2);
  await f.uploadFileDirect(file, "photos", () => {});
  assert.equal(f.xhrs.length, 1);
  assert.deepEqual(f.calls.map(call => call.body.action), ["prepare", "complete", "complete"]);
});

test("CORS/network failure falls back only for small files; larger files explain configuration requirement", async () => {
  for (const mode of ["network", "forbidden"]) {
    const f = browserFixture({ mode }); const messages = [];
    await f.uploadFileDirect(new File(["small"], "pic.png", { type: "image/png" }), "photos", value => messages.push(value));
    assert.equal(f.calls.at(-1).url, "/api/admin/upload-r2");
    assert.equal(f.calls.at(-1).body.get("subdir"), "photos");
    assert.ok(messages.at(-1).includes("fallback"));
    const large = browserFixture({ mode });
    await assert.rejects(large.uploadFileDirect(new File([new Uint8Array(5 * 1024 * 1024)], "pic.png", { type: "image/png" }), "", () => {}), /too large.*bucket CORS/);
    assert.equal(large.calls.length, 1);
  }
});

test("timeout and abort never claim success or trigger an ambiguous fallback", async () => {
  for (const mode of ["timeout", "abort"]) {
    const f = browserFixture({ mode });
    await assert.rejects(f.uploadFileDirect(new File(["image"], "pic.png", { type: "image/png" }), "", () => {}), /timed out|interrupted/);
    assert.equal(f.calls.length, 1);
  }
});


test("CORS setup check is read-only; configuration appends the exact origin without modifying existing rules", async () => {
  const f = fixture();
  const existing = { AllowedOrigins: ["https://reader.example.test"], AllowedMethods: ["GET", "HEAD"], AllowedHeaders: ["Range"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 600, ID: "existing-media-readers" };
  f.setCorsRules([existing]);
  const status = await f.r2.configureR2UploadCors("https://app.example.test");
  assert.equal(status.configured, false);
  assert.equal(f.calls.filter(call => call.kind === "PutBucketCorsCommand").length, 0);
  const configured = await f.r2.configureR2UploadCors("https://app.example.test", true);
  assert.equal(configured.configured, true); assert.equal(configured.changed, true);
  const write = f.calls.find(call => call.kind === "PutBucketCorsCommand");
  const rules = JSON.parse(JSON.stringify(write.input.CORSConfiguration.CORSRules));
  assert.deepEqual(rules[0], existing);
  assert.deepEqual(rules[1], { AllowedOrigins: ["https://app.example.test"], AllowedMethods: ["PUT"], AllowedHeaders: ["Content-Type"], MaxAgeSeconds: 3600 });
  assert.equal((await f.r2.configureR2UploadCors("https://app.example.test", true)).changed, false);
  assert.equal(f.calls.filter(call => call.kind === "PutBucketCorsCommand").length, 1);
});

test("an existing compatible CORS rule is preserved without a write", async () => {
  for (const origin of ["https://app.example.test", "*"]) {
    const f = fixture(); f.setCorsRules([{ AllowedOrigins: [origin], AllowedMethods: ["GET", "PUT"], AllowedHeaders: ["content-type"] }]);
    const result = await f.r2.configureR2UploadCors("https://app.example.test", true);
    assert.equal(result.configured, true); assert.equal(result.changed, false);
    assert.equal(f.calls.filter(call => call.kind === "PutBucketCorsCommand").length, 0);
  }
});

test("unreadable CORS is never overwritten; denied writes explain setup boundary", async () => {
  const f = fixture(); f.setProviderError({ name: "AccessDenied" });
  await assert.rejects(f.r2.configureR2UploadCors("https://app.example.test", true), error => error.status === 503 && /Small files.*larger files/.test(error.message));
  assert.equal(f.calls.filter(call => call.kind === "PutBucketCorsCommand").length, 0);
  const writeDenied = fixture(); writeDenied.denyCorsWrite();
  await assert.rejects(writeDenied.r2.configureR2UploadCors("https://app.example.test", true), error => error.status === 503);
  assert.equal(writeDenied.calls.filter(call => call.kind === "PutBucketCorsCommand").length, 1);
});

test("CORS actions require shared auth/origin guards and ignore body-supplied origins", async () => {
  for (const action of ["cors-status", "cors-configure"]) {
    const f = fixture(); const route = f.load("app/api/admin/upload-presign/route.ts");
    f.setAuth(false); assert.equal((await route.POST(jsonRequest({ action }))).status, 401);
    f.setAuth(true); assert.equal((await route.POST(jsonRequest({ action }, { origin: "https://attacker.example.test" }))).status, 403);
    assert.equal(f.calls.length, 0);
    const response = await route.POST(jsonRequest({ action, origin: "https://body-ignored.example.test" }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).origin, "https://app.example.test");
    assert.equal(JSON.stringify(f.calls).includes("body-ignored"), false);
  }
});
