// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Function consumed by Playwright CLI.
async (page) => {
  const base = new URL(page.url()).origin
  const browser = page.context().browser()
  const results = []
  const check = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const context = await browser.newContext({
    serviceWorkers: "block",
    viewport: { width: 1440, height: 1100 },
  })
  const p = await context.newPage()
  const errors = []
  const requests = []
  p.on("pageerror", (error) => errors.push(error.message))
  p.on("request",request=>requests.push(request.url()))
  async function ready() {
    await p.waitForFunction(
      () => document.querySelectorAll(".glyph-stage .glyph").length === 4,
    )
  }
  async function search(query) {
    await p.getByRole("textbox").fill(query)
    await p.getByRole("button", { name: "查询", exact: true }).click()
    await p.waitForFunction(
      () => !document.querySelector("button[type=submit]").disabled,
    )
  }
  await p.goto(base)
  await ready()
  check(requests.every(url=>url.startsWith(base)),"Unexpected external request")
  check(
    (await p.locator(".glyph-card").count()) === 4,
    "Four independent cards expected",
  )
  check(
    (await p.locator(".glyph-stage .glyph").allTextContents()).every(
      (x) => x === "骨",
    ),
    "Default must preserve code point",
  )
  await p.screenshot({ path: ".playwright-cli/desktop.png", fullPage: true })
  results.push(
    "desktop default: 4 real regional fonts, no external font requests",
  )
  await p.getByRole("button", { name: "歡迎來到東京", exact: true }).click()
  check(
    (await p.locator(".character-strip button").count()) === 6,
    "Text lost after navigation",
  )
  await p
    .getByRole("group", { name: "逐字查看" })
    .getByRole("button", { name: "京", exact: true })
    .click()
  await ready()
  await p.reload()
  await ready()
  check(
    (await p.locator("#compare-title").innerText()).startsWith("京"),
    "Index lost after refresh",
  )
  await p.getByRole("button", { name: "宋体", exact: true }).click()
  await ready()
  await p.getByLabel("最大字号", { exact: true }).selectOption("192")
  await p.getByRole("button", { name: "主题：跟随系统" }).click()
  await p.getByRole("button", { name: "主题：浅色" }).click()
  await p.reload()
  await ready()
  check(
    (await p
      .getByRole("button", { name: "宋体", exact: true })
      .getAttribute("aria-pressed")) === "true",
    "Font preference lost",
  )
  check(
    (await p.getByLabel("最大字号", { exact: true }).inputValue()) === "192",
    "Size preference lost",
  )
  check(
    (await p.locator("html").getAttribute("data-theme")) === "dark",
    "Theme preference lost",
  )
  await p.screenshot({ path: ".playwright-cli/dark.png", fullPage: true })
  results.push("text, selected index, font, size and theme survive refresh")
  await p.getByRole("button", { name: "主题：深色" }).click()
  await p.getByRole("button", { name: "黑体", exact: true }).click()
  await search("𠮷")
  await ready()
  check(
    (await p.locator("#compare-title").innerText()).startsWith("𠮷"),
    "Supplementary input rejected",
  )
  await search("U+20BB7")
  await ready()
  await search("U+D800")
  check(
    (await p.locator(".notice").innerText()).includes("有效"),
    "Invalid scalar accepted",
  )
  await p.goto(base + "/char/%25")
  await ready()
  check(
    (await p.locator(".notice").innerText()).includes("无效"),
    "Malformed route not explained",
  )
  results.push(
    "supplementary input, Unicode query and malformed links handled without blank screens",
  )
  await search("gu1")
  const first = await p.locator(".candidate-grid button").allTextContents()
  check(!first.includes("古"), "Tone ignored")
  await search("gu3")
  check(
    (await p.locator(".candidate-grid button").allTextContents()).includes(
      "古",
    ),
    "Tone 3 missing",
  )
  await search("lǜ")
  const composed = await p.locator(".candidate-grid button").allTextContents()
  await search("lǜ")
  check(
    JSON.stringify(composed) ===
      JSON.stringify(
        await p.locator(".candidate-grid button").allTextContents(),
      ),
    "Decomposed umlaut changed meaning",
  )
  await search("gu")
  const before = await p.locator(".candidate-grid button").count()
  await p.getByRole("button", { name: /显示更多/ }).click()
  check(
    (await p.locator(".candidate-grid button").count()) > before,
    "Candidates truncated",
  )
  await search("コク")
  check(
    (await p.locator(".candidate-grid button").allTextContents()).includes(
      "國",
    ),
    "Japanese kana search failed",
  )
  await p.getByLabel("读音查询类型").selectOption("japanese")
  await search("koku")
  check(
    (await p.locator(".candidate-grid button").allTextContents()).includes(
      "國",
    ),
    "Japanese romaji search failed",
  )
  results.push(
    "toned pinyin, canonical equivalent ü, complete candidates, kana and romaji search",
  )
  await search("发")
  await ready()
  await p.getByRole("button", { name: "用字转换", exact: true }).click()
  await p.locator(".ambiguity").waitFor()
  check(
    (await p.locator(".glyph-stage .glyph").count()) === 0,
    "Ambiguous result guessed",
  )
  await p
    .locator(".ambiguity")
    .getByRole("button", { name: "髮", exact: true })
    .click()
  await ready()
  check(
    (await p.locator(".glyph-stage .glyph").allTextContents()).join("") ===
      "发髮髮髪",
    "Hair meaning corrupted",
  )
  await p.getByRole("button", { name: "发", exact: true }).last().click()
  check(
    decodeURIComponent(new URL(p.url()).pathname).endsWith("/发"),
    "Variant URL not updated",
  )
  results.push(
    "one-to-many conversion requires choice; hair mapping and variant URL stay correct",
  )
  await p.getByRole("button", { name: "同字字形", exact: true }).click()
  await ready()
  await p.getByRole("button", { name: "放大中国字形" }).click()
  check((await p.locator("dialog[open]").count()) === 1, "Modal not opened")
  for (let i = 0; i < 4; i++) {
    await p.keyboard.press("Tab")
    check(
      await p.evaluate(() => !!document.activeElement.closest("dialog")),
      "Focus escaped modal",
    )
  }
  await p.keyboard.press("Escape")
  check((await p.locator("dialog[open]").count()) === 0, "Escape failed")
  check(
    await p
      .getByRole("button", { name: "放大中国字形" })
      .evaluate((element) => element === document.activeElement),
    "Focus not restored",
  )
  await p.getByRole("button", { name: "叠加比较", exact: true }).click()
  await p.getByLabel("上层地区").selectOption("jp")
  await p.getByLabel("上层透明度").fill("70")
  await p.screenshot({ path: ".playwright-cli/overlay.png" })
  await p.keyboard.press("Escape")
  results.push(
    "native modal focus trap, focus restoration, Escape and overlay controls",
  )
  await p.setViewportSize({ width: 390, height: 844 })
  await p.goto(base)
  await ready()
  check(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile horizontal overflow",
  )
  await p.screenshot({ path: ".playwright-cli/mobile.png", fullPage: true })
  await p.setViewportSize({ width: 320, height: 740 })
  check(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "320px overflow",
  )
  results.push(
    "390px and 320px layouts fit; all region cards visible without horizontal carousel",
  )
  await p.getByRole("link", { name: "资料与说明" }).first().click()
  check(
    (await p.getByRole("heading", { name: "数据来源与版本" }).count()) === 1,
    "Sources page failed",
  )
  await p.getByRole("link", { name: /返回字形/ }).click()
  await ready()
  check(errors.length === 0, `Unhandled page errors: ${errors}`)
  results.push("sources navigation and zero unhandled errors in normal use")
  await context.close()

  const offlineContext = await browser.newContext()
  const off = await offlineContext.newPage()
  await off.goto(base)
  await off.waitForFunction(
    () => document.querySelectorAll(".glyph-stage .glyph").length === 4,
  )
  await off.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      )
  })
  await off.waitForFunction(async () => {
    const cache = await caches.open("hanglyph-fonts-v1")
    return (await cache.keys()).length >= 4
  })
  await offlineContext.setOffline(true)
  await off.reload()
  await off.waitForFunction(
    () => document.querySelectorAll(".glyph-stage .glyph").length === 4,
  )
  await off.getByRole("textbox").fill("gu3")
  await off.getByRole("button", { name: "查询", exact: true }).click()
  await off.locator(".candidate-grid").waitFor()
  await off.getByRole("link", { name: "资料与说明" }).first().click()
  await off.reload()
  check(
    (await off.getByRole("heading", { name: "数据来源与版本" }).count()) === 1,
    "Offline deep link failed",
  )
  results.push(
    "first cached visit: offline reload, pinyin index and about deep link work",
  )
  await offlineContext.setOffline(false)
  await off.goto(base)
  await off.waitForFunction(
    () => document.querySelectorAll(".glyph-stage .glyph").length === 4,
  )
  await off.evaluate(async () => {
    const key = (await caches.keys()).find((key) =>
      key.startsWith("hanglyph-app-"),
    )
    await (
      await caches.open(key)
    ).put(
      "/index.html",
      new Response("<title>old-build-sentinel</title>", {
        headers: { "Content-Type": "text/html" },
      }),
    )
  })
  await off.goto(base)
  check(
    (await off.title()) !== "old-build-sentinel",
    "Online navigation returned stale cached shell",
  )
  results.push("online navigation ignores simulated stale HTML")
  await offlineContext.close()

  const failureContext = await browser.newContext({ serviceWorkers: "block" })
  await failureContext.route("**/fonts/*.woff2", (route) => route.abort())
  const fail = await failureContext.newPage()
  await fail.goto(base)
  await fail.getByText("字体加载失败", { exact: false }).first().waitFor()
  check(
    (await fail.locator(".glyph-stage .glyph").count()) === 0,
    "System fallback presented as regional font",
  )
  await failureContext.unroute("**/fonts/*.woff2")
  for (let i = 0; i < 4; i++)
    await fail
      .locator(".glyph-card")
      .nth(i)
      .getByRole("button", { name: "重试", exact: true })
      .click()
  await fail.waitForFunction(
    () => document.querySelectorAll(".glyph-stage .glyph").length === 4,
  )
  results.push("font failure is explicit; retry recovers real glyphs")
  await failureContext.close()

  const blockedContext = await browser.newContext({ serviceWorkers: "block" })
  await blockedContext.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError")
      },
    })
  })
  const blocked = await blockedContext.newPage()
  await blocked.goto(base)
  await blocked.waitForFunction(
    () => document.querySelectorAll(".glyph-stage .glyph").length === 4,
  )
  results.push("blocked localStorage does not break page")
  await blockedContext.close()
  return results
}
