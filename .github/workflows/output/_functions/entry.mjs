import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_F5t5uDl-.mjs';
import { manifest } from './manifest_DolH6OSc.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/api/trading/cron.astro.mjs');
const _page3 = () => import('./pages/api/trading/data.astro.mjs');
const _page4 = () => import('./pages/api/yahoo/_---path_.astro.mjs');
const _page5 = () => import('./pages/blog.astro.mjs');
const _page6 = () => import('./pages/blog/_---slug_.astro.mjs');
const _page7 = () => import('./pages/resume.astro.mjs');
const _page8 = () => import('./pages/rss.xml.astro.mjs');
const _page9 = () => import('./pages/tradingbot.astro.mjs');
const _page10 = () => import('./pages/traditional.astro.mjs');
const _page11 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/api/trading/cron.ts", _page2],
    ["src/pages/api/trading/data.ts", _page3],
    ["src/pages/api/yahoo/[...path].ts", _page4],
    ["src/pages/blog.astro", _page5],
    ["src/pages/blog/[...slug].astro", _page6],
    ["src/pages/resume.astro", _page7],
    ["src/pages/rss.xml.ts", _page8],
    ["src/pages/TradingBot.astro", _page9],
    ["src/pages/traditional.astro", _page10],
    ["src/pages/index.astro", _page11]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "0f3a57d2-40af-4e4f-89bb-2565d8d2e197",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
