import { g as getPortfolio, e as getTrades, f as getSignals, h as getLastRun, i as getPortfolioHistory } from '../../../chunks/serverStorage_BnY9VIjj.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async () => {
  try {
    const [portfolio, trades, signals, lastRun, history] = await Promise.all([
      getPortfolio(),
      getTrades(),
      getSignals(),
      getLastRun(),
      getPortfolioHistory()
    ]);
    return new Response(
      JSON.stringify({
        portfolio,
        trades,
        signals,
        lastRun,
        history,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60"
          // Cache for 1 minute
        }
      }
    );
  } catch (error) {
    console.error("Error fetching trading data:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch trading data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
const prerender = false;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
