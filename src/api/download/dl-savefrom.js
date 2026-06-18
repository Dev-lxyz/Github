module.exports = function (app) {

  const vm = require("vm")
  const nodeCrypto = require("crypto")
  const { JSDOM } = require("jsdom")

  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0"
  const base = "https://en1.savefrom.net"
  const worker = "https://worker.savefrom.net"
  const _ts = 1781179117174
  const sha256 = s => nodeCrypto.createHash("sha256").update(s, "utf8").digest("hex")
  const headers = { "user-agent": ua, accept: "*/*", referer: base + "/", origin: base }

  let cache = { secret: null, at: 0 }

  async function text(url) {
    const r = await fetch(url, { headers })
    return r.text()
  }

  async function getChunks() {
    const home = await text(base + "/")
    const runHit = home.match(/\/build\/js\/runtime\.js\?h=[0-9a-f]+\.js/)
    const runtime = await text(base + (runHit ? runHit[0] : "/build/js/runtime.js"))
    const hVendor = (runtime.match(/4121:"([0-9a-f]{6,})"/) || [])[1]
    const hWrb = (runtime.match(/5229:"([0-9a-f]{6,})"/) || [])[1]
    if (!hVendor || !hWrb) throw new Error("chunk hash not found in runtime")
    const vendor = await text(base + "/build/js/vendor.js?h=" + hVendor + ".js")
    const wrb = await text(base + "/build/js/workerRequestBuilder.js?h=" + hWrb + ".js")
    return { vendor, wrb }
  }

  async function extractSecret(vendor, wrb) {
    const patched = wrb
      .split("for(let W in P[U][A])").join("for(let W in ((P[U]||{})[A]||{}))")
      .split("const C=P[U][t],a=!!P[U][A]&&P[U][A][m]").join("const C=(P[U]||{})[t],a=!!(P[U]&&P[U][A])&&P[U][A][m]")
      .split("if(!new Function(").join("if(!1&&!new Function(")

    const digests = []
    const realSubtle = nodeCrypto.webcrypto.subtle
    const hookedSubtle = new Proxy(realSubtle, {
      get(t, p) {
        if (p === "digest") return async (algo, data) => {
          let s = ""
          try { s = new TextDecoder().decode(data) } catch {}
          digests.push(s)
          return realSubtle.digest(algo, data)
        }
        const v = t[p]
        return typeof v === "function" ? v.bind(t) : v
      }
    })

    const reals = {}
    for (const k of ["Object", "Array", "Function", "Boolean", "Number", "String", "Symbol", "Math", "JSON", "Date", "RegExp", "Error", "TypeError", "RangeError", "SyntaxError", "Promise", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI", "Map", "Set", "WeakMap", "WeakSet", "ArrayBuffer", "Uint8Array", "Uint16Array", "Uint32Array", "Int8Array", "Int16Array", "Int32Array", "Float32Array", "Float64Array", "DataView", "TextEncoder", "TextDecoder", "Reflect", "Proxy", "BigInt", "escape", "unescape", "Intl"]) reals[k] = global[k]
    reals.crypto = { subtle: hookedSubtle, getRandomValues: a => nodeCrypto.webcrypto.getRandomValues(a), randomUUID: () => nodeCrypto.webcrypto.randomUUID() }
    reals.console = { log() {}, warn() {}, error() {}, info() {} }
    reals.performance = global.performance
    reals.atob = global.atob
    reals.btoa = global.btoa
    reals.setTimeout = (f, d) => typeof f === "function" ? global.setTimeout(f, Math.min(d || 0, 30)) : 0
    reals.clearTimeout = t => global.clearTimeout(t)
    reals.setInterval = () => 0
    reals.clearInterval = () => {}
    reals.queueMicrotask = f => Promise.resolve().then(f)
    reals.URL = global.URL
    reals.URLSearchParams = global.URLSearchParams
    reals.Blob = global.Blob
    reals.fetch = u => {
      const url = String(u)
      if (url.includes("/msec")) return Promise.resolve(new global.Response(JSON.stringify({ msec: Date.now() / 1000 }), { headers: { "content-type": "application/json" } }))
      if (url.startsWith("/")) return Promise.resolve(new global.Response("{}", { headers: { "content-type": "application/json" } }))
      return Promise.resolve(new global.Response("{}"))
    }
    reals.AbortController = global.AbortController
    reals.AbortSignal = global.AbortSignal
    reals.TextEncoder = global.TextEncoder
    reals.TextDecoder = global.TextDecoder
    const storage = () => {
      const m = new Map()
      return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size } }
    }
    reals.localStorage = storage()
    reals.sessionStorage = storage()
    reals.navigator = { userAgent: ua, language: "en-US", languages: ["en-US", "en"], platform: "Win32", webdriver: false, vendor: "Google Inc." }
    reals.location = { href: base + "/", origin: base, protocol: "https:", host: "en1.savefrom.net", hostname: "en1.savefrom.net", pathname: "/", search: "", hash: "", reload() {}, toString() { return this.href } }
    const el = () => ({ setAttribute() {}, getAttribute() { return null }, appendChild(x) { return x }, addEventListener() {}, style: {}, dataset: {}, getContext() { return null } })
    reals.document = { createElement: () => el(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [], addEventListener() {}, head: el(), body: el(), documentElement: el(), cookie: "", currentScript: null }

    const safe = new Proxy(function () {}, {
      get(t, p) { if (p === Symbol.toPrimitive) return () => 0; if (p === Symbol.iterator) return undefined; if (p === "toString" || p === "valueOf") return () => ""; return safe },
      set() { return true }, apply() { return safe }, construct() { return safe }, has() { return false }
    })
    const captured = []
    const handler = {
      get(t, p, r) {
        if (p in t) return t[p]
        if (["self", "window", "globalThis", "global", "top", "parent", "frames"].includes(p)) return r
        if (typeof p === "string" && p.includes("webpackChunk")) return undefined
        return safe
      },
      set(t, p, v) { t[p] = v; if (Array.isArray(v)) captured.push(v); return true }
    }
    const ctx = new Proxy(reals, handler)
    reals.self = ctx; reals.window = ctx; reals.globalThis = ctx; reals.global = ctx; reals.top = ctx; reals.parent = ctx; reals.frames = ctx; reals.document.defaultView = ctx

    vm.createContext(ctx)
    try { vm.runInContext(vendor, ctx, { filename: "vendor.js" }) } catch {}
    try { vm.runInContext(patched, ctx, { filename: "wrb.js" }) } catch {}

    const modules = {}
    for (const arr of captured) for (const e of arr) if (Array.isArray(e) && Array.isArray(e[0]) && e[1] && typeof e[1] === "object") Object.assign(modules, e[1])

    const store = {}
    function req(id) {
      if (store[id]) return store[id].exports
      const m = store[id] = { exports: {} }
      if (!modules[id]) { m.exports = safe; return m.exports }
      try { modules[id].call(ctx, m, m.exports, req) } catch {}
      return m.exports
    }
    req.d = (e, defs) => { for (const k in defs) if (Object.prototype.hasOwnProperty.call(defs, k) && !Object.prototype.hasOwnProperty.call(e, k)) Object.defineProperty(e, k, { enumerable: true, get: defs[k] }) }
    req.o = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
    req.r = e => { try { Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }) } catch {} Object.defineProperty(e, "__esModule", { value: true }) }
    req.n = m => { const g = m && m.__esModule ? () => m.default : () => m; req.d(g, { a: g }); return g }
    req.e = () => Promise.resolve()
    req.g = ctx; req.p = "/build/js/"; req.u = () => ""; req.f = {}; req.m = modules; req.c = store; req.O = () => {}; req.l = () => {}; req.b = base + "/"

    const sleep = ms => new Promise(r => global.setTimeout(r, ms))
    const sample = "https://vt.tiktok.com/ZSQaQuXkh/"
    for (const mid of [3245, 1299]) {
      let ex
      try { ex = req(mid) } catch { continue }
      await sleep(400)
      let builder = null
      for (let tries = 0; tries < 20 && !builder; tries++) {
        for (const k of Reflect.ownKeys(ex)) {
          let v
          try { v = ex[k] } catch { continue }
          if (typeof v === "function") builder = v
          if (v && typeof v.then === "function") {
            try { const aw = await Promise.race([v, sleep(1200).then(() => "TO")]); if (typeof aw === "function") builder = aw } catch {}
          }
        }
        if (!builder) await sleep(180)
      }
      if (typeof builder === "function") {
        for (const arg of [sample, { url: sample }]) {
          try {
            let r = builder(arg)
            r = await Promise.race([Promise.resolve(r), sleep(5000).then(() => null)])
            if (typeof r === "function") await Promise.race([Promise.resolve(r(arg)), sleep(5000).then(() => null)])
          } catch {}
        }
      }
      if (digests.length) break
    }
    if (!digests.length) throw new Error("secret extraction failed (no digest)")
    return digests[0].slice(-64)
  }

  function decodeBlob(blob) {
    const code = blob.includes("/*js-response*/") ? blob.split("/*js-response*/").join("") : blob
    const raw = []
    const recProxy = path => new Proxy(function () {}, {
      get(t, p) {
        if (p === Symbol.toPrimitive || p === "toString" || p === Symbol.toStringTag) return () => ""
        if (p === "then") return undefined
        return recProxy(path + "." + String(p))
      },
      apply(t, thisArg, args) { raw.push(args); return recProxy(path) },
      set() { return true }
    })

    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="sf_result">pending</div></body></html>', {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      url: base + "/18CX/",
      referrer: base + "/"
    })
    const w = dom.window
    Object.defineProperty(w, "frameElement", { value: w.document.createElement("iframe"), configurable: true })
    w.sf = recProxy("sf")
    w.console = { log() {}, warn() {}, error() {}, info() {} }
    try { w.eval(code) } catch {}

    let result = null
    for (const args of raw) for (const a of args) if (a && typeof a === "object" && (Array.isArray(a.url) || a.id || a.title || a.success === false || a.html)) result = a
    dom.window.close()
    return result
  }

  async function convert(url, force) {
    if (force || !cache.secret || Date.now() - cache.at > 25 * 60 * 1000) {
      const { vendor, wrb } = await getChunks()
      cache = { secret: await extractSecret(vendor, wrb), at: Date.now() }
    }
    const ts = Date.now()
    const body = new URLSearchParams({
      sf_url: url, sf_submit: "", new: "2", lang: "en", app: "", country: "id",
      os: "Windows", browser: "Edge", channel: "main", "sf-nomad": "1",
      url, ts: String(ts), _ts: String(_ts), _tsc: "0", _s: sha256(url + ts + cache.secret), _x: "1"
    })
    const r = await fetch(worker + "/savefrom.php", {
      method: "POST",
      headers: { ...headers, "content-type": "application/x-www-form-urlencoded", accept: "application/json, text/plain, */*" },
      body: body.toString()
    })
    return r.text()
  }

  function normalize(result) {
    if (!result) return null
    const list = Array.isArray(result.url) ? result.url : []
    const media = list.map(m => ({
      url: m.url,
      quality: m.subname || m.quality || null,
      ext: m.ext || null,
      type: m.type || null,
      label: m.name || null
    }))
    const data = {
      id: result.id || null,
      title: (result.meta && result.meta.title) || result.title || null,
      duration: (result.meta && result.meta.duration) || result.duration || null,
      thumb: result.thumb || (result.meta && result.meta.thumb) || null,
      media
    }
    if (!media.length) return { ok: false, error: "no direct links returned (source throttled for this IP — common for VEVO/music YouTube on a datacenter/VPS IP)", ...data }
    return { ok: true, ...data }
  }

  function interpret(result) {
    if (!result) return null
    if (result.success === false || (!Array.isArray(result.url) && result.html)) {
      return { ok: false, error: String(result.html || result.response_type || "link not found").replace(/<[^>]+>/g, "").trim(), hosting: result.hosting || null, source: result.source_url || null }
    }
    return normalize(result)
  }

  async function savefrom(url) {
    let blob = await convert(url)
    if (blob.includes("#json#")) {
      const j = JSON.parse(blob.match(/#json#([\s\S]+?)#json#/)[1])
      return interpret(j)
    }
    let result = decodeBlob(blob)
    if (!result) {
      blob = await convert(url, true)
      result = decodeBlob(blob)
    }
    return interpret(result)
  }

  app.get('/download/savefrom', async (req, res) => {
    try {
      const { url } = req.query
      if (!url) {
        return res.json({
          status: false,
          error: 'Falta parametro ?url='
        })
      }

      const result = await savefrom(url)

      if (!result || result.ok === false) {
        return res.json({
          status: false,
          error: result?.error || 'No se pudo procesar el enlace',
          hosting: result?.hosting || null
        })
      }

      res.json({
        status: true,
        data: result
      })

    } catch (err) {
      res.json({
        status: false,
        error: err.message
      })
    }
  })

}
