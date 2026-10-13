// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Function consumed by Playwright CLI.
async page => {
 const browser=page.context().browser(),base=new URL(page.url()).origin,results=[];
 const check=(condition,message)=>{if(!condition)throw new Error(message);};
 const c=await browser.newContext({serviceWorkers:"block"});const p=await c.newPage();const errors=[];p.on("pageerror",e=>errors.push(e.message));
 await c.route("**/data/unihan/9.json",route=>route.abort());await p.goto(base);await p.locator(".character-info [role=alert]").waitFor();
 await c.unroute("**/data/unihan/9.json");await p.getByRole("button",{name:"重试",exact:true}).click();await p.waitForFunction(()=>document.querySelector(".character-info").textContent.includes("コツ"));results.push("character data failure and retry recover");
 await c.route("**/assets/regional-*.js",route=>route.abort());await p.getByRole("button",{name:"用字转换",exact:true}).click();await p.getByText("用字转换暂时无法加载，请重试。",{exact:false}).waitFor();
 await c.unroute("**/assets/regional-*.js");await p.getByRole("button",{name:"重试",exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll(".glyph-stage .glyph").length===4);results.push("conversion chunk failure and retry recover");
 await c.route("**/index/readings.json",route=>route.abort());await p.getByRole("textbox").fill("gu3");await p.getByRole("button",{name:"查询",exact:true}).click();await p.getByText("读音索引加载失败，请检查网络后重试。",{exact:true}).waitFor();
 await c.unroute("**/index/readings.json");await p.getByRole("button",{name:"查询",exact:true}).click();await p.locator(".candidate-grid").waitFor();results.push("reading index failure and retry recover");
 await p.evaluate(()=>{Object.defineProperty(navigator,"share",{configurable:true,value:()=>Promise.reject(new DOMException("cancelled","AbortError"))});});
 await p.getByRole("button",{name:"分享这个字 ↗"}).click();check(!await p.getByText("链接已复制",{exact:true}).count(),"Cancelled share misreported");
 await p.evaluate(()=>{Object.defineProperty(navigator,"share",{configurable:true,value:()=>Promise.reject(new Error("denied"))});});await p.getByRole("button",{name:"分享这个字 ↗"}).click();await p.getByRole("link",{name:"链接地址",exact:true}).waitFor();results.push("cancelled and failed sharing do not claim success");
 await p.getByRole("textbox").fill("U+33479");await p.getByRole("button",{name:"查询",exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll(".glyph-stage").length===4&&document.querySelectorAll(".glyph-stage .glyph").length===0&&document.querySelectorAll(".glyph-stage .glyph-status").length===4);
 check((await p.locator(".glyph-stage").allTextContents()).every(x=>x.includes("未收录")),"Unsupported font silently substituted");results.push("Unicode 17 extension J accepted, unsupported font reported accurately");
 check(errors.length===0,`Unhandled errors: ${errors}`);await c.close();
 const race=await browser.newContext({serviceWorkers:"block"});const r=await race.newPage();await race.route("**/index/readings.json",async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});await r.goto(base);
 await r.getByRole("textbox").fill("gu3");await r.getByRole("button",{name:"查询",exact:true}).click();await r.getByRole("button",{name:"令",exact:true}).click();await r.waitForTimeout(1000);
 check((await r.locator("#compare-title").innerText()).startsWith("令"),"Late query replaced selection");check(await r.locator(".candidate-grid").count()===0,"Late candidates resurfaced");check(!await r.getByRole("button",{name:"查询",exact:true}).isDisabled(),"Loading never cleared");results.push("late search response cannot overwrite newer direct selection");await race.close();return results;
}

