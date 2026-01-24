import 'piccolore';
import { l as decodeKey } from './chunks/astro/server_DxBlT-CF.mjs';
import 'clsx';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_CG78KGwc.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///home/bryce/projects/PersonalWebsite/","cacheDir":"file:///home/bryce/projects/PersonalWebsite/node_modules/.astro/","outDir":"file:///home/bryce/projects/PersonalWebsite/dist/","srcDir":"file:///home/bryce/projects/PersonalWebsite/src/","publicDir":"file:///home/bryce/projects/PersonalWebsite/public/","buildClientDir":"file:///home/bryce/projects/PersonalWebsite/dist/client/","buildServerDir":"file:///home/bryce/projects/PersonalWebsite/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"404.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"blog/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/blog","isIndex":false,"type":"page","pattern":"^\\/blog\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/blog.astro","pathname":"/blog","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"resume/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/resume","isIndex":false,"type":"page","pattern":"^\\/resume\\/?$","segments":[[{"content":"resume","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resume.astro","pathname":"/resume","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"rss.xml","links":[],"scripts":[],"styles":[],"routeData":{"route":"/rss.xml","isIndex":false,"type":"endpoint","pattern":"^\\/rss\\.xml\\/?$","segments":[[{"content":"rss.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/rss.xml.ts","pathname":"/rss.xml","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"TradingBot/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/tradingbot","isIndex":false,"type":"page","pattern":"^\\/TradingBot\\/?$","segments":[[{"content":"TradingBot","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/TradingBot.astro","pathname":"/TradingBot","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"traditional/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/traditional","isIndex":false,"type":"page","pattern":"^\\/traditional\\/?$","segments":[[{"content":"traditional","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/traditional.astro","pathname":"/traditional","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/trading/cron","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/trading\\/cron\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"trading","dynamic":false,"spread":false}],[{"content":"cron","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/trading/cron.ts","pathname":"/api/trading/cron","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/trading/data","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/trading\\/data\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"trading","dynamic":false,"spread":false}],[{"content":"data","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/trading/data.ts","pathname":"/api/trading/data","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/yahoo/[...path]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/yahoo(?:\\/(.*?))?\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"yahoo","dynamic":false,"spread":false}],[{"content":"...path","dynamic":true,"spread":true}]],"params":["...path"],"component":"src/pages/api/yahoo/[...path].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"site":"https://brycekeeler.com","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["/home/bryce/projects/PersonalWebsite/src/pages/blog.astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astrojs-ssr-virtual-entry",{"propagation":"in-tree","containsHead":false}],["/home/bryce/projects/PersonalWebsite/src/pages/blog/[...slug].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/blog/[...slug]@_@astro",{"propagation":"in-tree","containsHead":false}],["/home/bryce/projects/PersonalWebsite/src/pages/rss.xml.ts",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/rss.xml@_@ts",{"propagation":"in-tree","containsHead":false}],["/home/bryce/projects/PersonalWebsite/src/pages/404.astro",{"propagation":"none","containsHead":true}],["/home/bryce/projects/PersonalWebsite/src/pages/TradingBot.astro",{"propagation":"none","containsHead":true}],["/home/bryce/projects/PersonalWebsite/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/home/bryce/projects/PersonalWebsite/src/pages/resume.astro",{"propagation":"none","containsHead":true}],["/home/bryce/projects/PersonalWebsite/src/pages/traditional.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:src/pages/api/trading/cron@_@ts":"pages/api/trading/cron.astro.mjs","\u0000@astro-page:src/pages/api/trading/data@_@ts":"pages/api/trading/data.astro.mjs","\u0000@astro-page:src/pages/api/yahoo/[...path]@_@ts":"pages/api/yahoo/_---path_.astro.mjs","\u0000@astro-page:src/pages/blog@_@astro":"pages/blog.astro.mjs","\u0000@astro-page:src/pages/blog/[...slug]@_@astro":"pages/blog/_---slug_.astro.mjs","\u0000@astro-page:src/pages/resume@_@astro":"pages/resume.astro.mjs","\u0000@astro-page:src/pages/rss.xml@_@ts":"pages/rss.xml.astro.mjs","\u0000@astro-page:src/pages/TradingBot@_@astro":"pages/tradingbot.astro.mjs","\u0000@astro-page:src/pages/traditional@_@astro":"pages/traditional.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_DolH6OSc.mjs","/home/bryce/projects/PersonalWebsite/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_Bufwsyc8.mjs","/home/bryce/projects/PersonalWebsite/.astro/content-assets.mjs":"chunks/content-assets_DleWbedO.mjs","/home/bryce/projects/PersonalWebsite/.astro/content-modules.mjs":"chunks/content-modules_Dz-S_Wwv.mjs","\u0000astro:data-layer-content":"chunks/_astro_data-layer-content_CJ76N3UT.mjs","/home/bryce/projects/PersonalWebsite/src/components/trading/TradingBot.tsx":"_astro/TradingBot.zHwSKMEm.js","@astrojs/react/client.js":"_astro/client.9unXo8s5.js","/home/bryce/projects/PersonalWebsite/src/components/blog/BlogNavbar.astro?astro&type=script&index=0&lang.ts":"_astro/BlogNavbar.astro_astro_type_script_index_0_lang.4cUMQH0j.js","/home/bryce/projects/PersonalWebsite/src/components/traditional/Navbar.astro?astro&type=script&index=0&lang.ts":"_astro/Navbar.astro_astro_type_script_index_0_lang.Dv6Fpk6h.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/navmesh.js":"_astro/navmesh.B1pUQaZh.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/physics.js":"_astro/physics.ChHD2_fM.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/process.js":"_astro/process.VPR0TfJD.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/boolean.js":"_astro/boolean.DnW06Vcs.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/opentype.js":"_astro/opentype.U-0Y99ve.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/ui.js":"_astro/ui.TxDVmkgT.js","/home/bryce/projects/PersonalWebsite/node_modules/@splinetool/runtime/build/gaussian-splat-compression.js":"_astro/gaussian-splat-compression.CH16aANn.js","/home/bryce/projects/PersonalWebsite/src/components/room/InteractiveRoom":"_astro/InteractiveRoom.O5Shs46-.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/home/bryce/projects/PersonalWebsite/src/components/blog/BlogNavbar.astro?astro&type=script&index=0&lang.ts","const e=document.querySelector(\".mobile-menu-btn\"),t=document.querySelector(\".mobile-backdrop\"),d=document.querySelector(\".mobile-menu\");function i(){e?.setAttribute(\"aria-expanded\",\"true\"),t?.classList.add(\"open\"),d?.classList.add(\"open\"),document.body.style.overflow=\"hidden\"}function o(){e?.setAttribute(\"aria-expanded\",\"false\"),t?.classList.remove(\"open\"),d?.classList.remove(\"open\"),document.body.style.overflow=\"\"}e?.addEventListener(\"click\",()=>{e.getAttribute(\"aria-expanded\")===\"true\"?o():i()});t?.addEventListener(\"click\",o);document.querySelectorAll(\".mobile-menu a\").forEach(n=>{n.addEventListener(\"click\",o)});"],["/home/bryce/projects/PersonalWebsite/src/components/traditional/Navbar.astro?astro&type=script&index=0&lang.ts","const t=document.querySelector(\".mobile-menu-btn\"),o=document.querySelector(\".mobile-backdrop\"),s=document.querySelector(\".mobile-menu\"),l=document.querySelector(\".navbar\");function i(){t?.setAttribute(\"aria-expanded\",\"true\"),o?.classList.add(\"open\"),s?.classList.add(\"open\"),document.body.style.overflow=\"hidden\"}function n(){t?.setAttribute(\"aria-expanded\",\"false\"),o?.classList.remove(\"open\"),s?.classList.remove(\"open\"),document.body.style.overflow=\"\"}t?.addEventListener(\"click\",()=>{t.getAttribute(\"aria-expanded\")===\"true\"?n():i()});o?.addEventListener(\"click\",n);document.querySelectorAll(\".mobile-menu a\").forEach(e=>{e.addEventListener(\"click\",n)});document.querySelectorAll('a[href^=\"#\"]').forEach(e=>{e.addEventListener(\"click\",d=>{d.preventDefault();const r=e.getAttribute(\"href\");if(r){const c=document.querySelector(r);c&&c.scrollIntoView({behavior:\"smooth\",block:\"start\"})}})});window.addEventListener(\"scroll\",()=>{window.pageYOffset>100?l?.classList.add(\"scrolled\"):l?.classList.remove(\"scrolled\")});"]],"assets":["/_astro/TradingBot.CnpN25KF.css","/_astro/blog.8aTXjgMK.css","/_astro/blog.BEkDp7UY.css","/_astro/index.DlziWDTU.css","/_astro/resume.e2XzqHc_.css","/_astro/traditional.Cq_TotC0.css","/Bryce_Keeler_Resume_2026_DS.pdf","/Bryce_Keeler_Resume_2026_SWE.pdf","/favicon.svg","/_astro/InteractiveRoom.O5Shs46-.js","/_astro/InteractiveRoom.m_tOJ2nY.js","/_astro/TradingBot.D-heTXzA.css","/_astro/TradingBot.zHwSKMEm.js","/_astro/boolean.DnW06Vcs.js","/_astro/client.9unXo8s5.js","/_astro/gaussian-splat-compression.CH16aANn.js","/_astro/howler.DVv3X0Fr.js","/_astro/index.BHe4C1Zf.css","/_astro/index.WFquGv8Z.js","/_astro/jsx-runtime.D_zvdyIk.js","/_astro/navmesh.B1pUQaZh.js","/_astro/opentype.U-0Y99ve.js","/_astro/physics.ChHD2_fM.js","/_astro/process.VPR0TfJD.js","/_astro/ui.TxDVmkgT.js","/icons/mouse.png","/icons/pinch.png","/404.html","/blog/index.html","/resume/index.html","/rss.xml","/TradingBot/index.html","/traditional/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"deWByTYem3A0tXsN2QswJeGsXphfNR+tyMIGmrIVb38="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
