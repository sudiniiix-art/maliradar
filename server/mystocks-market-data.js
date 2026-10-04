/* MaliRadar v2.5.2 — MyStocks Africa Sandbox market-data bridge
   DROP-IN REPLACEMENT for:
   server/mystocks-market-data.js

   IMPORTANT:
   - Keep MYSTOCKS_API_KEY in Render.
   - Do NOT put the API key in this file.
   - Do NOT put the API key in index.html.
*/

const MYSTOCKS_SANDBOX_BASE =
  'https://mystocks.africa/api/sandbox/v1/partner';

const LOCAL_TO_SUFFIX = {
  NSE: '.KE',
  NGX: '.NG',
  JSE: '.ZA',
  GSE: '.GH',
  EGX: '.EG',
  CSE: '.MA',
  DSE: '.TZ',
  USE: '.UG',
  RSE: '.RW'
};

function msNumber(v) {
  return typeof v === 'number' && Number.isFinite(v)
    ? v
    : (
        v != null &&
        v !== '' &&
        Number.isFinite(Number(v))
          ? Number(v)
          : null
      );
}

function msList(body) {
  if (Array.isArray(body)) return body;

  return (
    body?.stocks ||
    body?.data ||
    body?.results ||
    body?.items ||
    []
  );
}

function msOne(body) {
  if (!body) return {};

  if (body.stock) return body.stock;
  if (body.result) return body.result;

  if (body.data && !Array.isArray(body.data)) {
    return body.data;
  }

  return body;
}

function msQuoteList(body) {
  if (!body) return [];

  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.quotes)) return body.quotes;
  if (Array.isArray(body.results)) return body.results;
  if (Array.isArray(body.items)) return body.items;

  if (body.data && typeof body.data === 'object') {
    return Object.entries(body.data).map(([symbol, value]) => ({
      ...(value || {}),
      symbol: value?.symbol || symbol
    }));
  }

  return [];
}

function msNormalize(x) {
  const q = x?.quote || {};

  const symbol = String(
    x?.symbol ||
    x?.ticker ||
    x?.code ||
    x?.id ||
    ''
  );

  const price = msNumber(
    x?.price ??
    x?.lastPrice ??
    x?.last ??
    x?.close ??
    q?.price ??
    q?.lastPrice ??
    q?.last ??
    q?.close
  );

  const changePct = msNumber(
    x?.changePct ??
    x?.changePercent ??
    x?.percentChange ??
    q?.changePct ??
    q?.changePercent ??
    q?.percentChange
  );

  const asOf =
    x?.asOf ||
    x?.timestamp ||
    x?.lastPriceUpdate ||
    q?.asOf ||
    q?.timestamp ||
    q?.lastPriceUpdate ||
    x?.updatedAt ||
    null;

  return {
    symbol,
    localSymbol: symbol.split('.')[0],
    name:
      x?.name ||
      x?.companyName ||
      x?.company?.name ||
      symbol,
    exchange:
      x?.exchange ||
      x?.market ||
      null,
    currency:
      x?.currency ||
      q?.currency ||
      null,
    price,
    changePct,
    asOf,
    delayMinutes:
      msNumber(
        x?.delayMinutes ??
        q?.delayMinutes
      ) ?? 15,
    stale: Boolean(
      x?.stale ??
      q?.stale
    ),
    status:
      price == null
        ? 'UNAVAILABLE'
        : 'DELAYED',
    source:
      'MyStocks Africa Sandbox'
  };
}

function providerSymbol(local, exchange) {
  const s = String(local || '');

  if (s.includes('.')) {
    return s;
  }

  return (
    s +
    (LOCAL_TO_SUFFIX[exchange] || '')
  );
}

async function msFetch(path, params = {}) {
  const key =
    process.env.MYSTOCKS_API_KEY;

  if (!key) {
    const e = new Error(
      'MYSTOCKS_API_KEY is not configured'
    );

    e.code =
      'MYSTOCKS_KEY_MISSING';

    e.status = 503;

    throw e;
  }

  const u =
    new URL(
      MYSTOCKS_SANDBOX_BASE + path
    );

  for (const [k, v] of Object.entries(params)) {
    if (
      v !== undefined &&
      v !== null &&
      v !== ''
    ) {
      u.searchParams.set(
        k,
        String(v)
      );
    }
  }

  const r = await fetch(
    u,
    {
      headers: {
        Authorization:
          `Bearer ${key}`,

        'x-api-key':
          key,

        Accept:
          'application/json'
      }
    }
  );

  const text =
    await r.text();

  let body = null;

  try {
    body =
      JSON.parse(text);
  } catch {}

  if (!r.ok) {
    const e =
      new Error(
        body?.message ||
        body?.error ||
        `MyStocks HTTP ${r.status}`
      );

    e.status =
      r.status;

    e.provider =
      body;

    throw e;
  }

  return body;
}

function quoteRows(body) {
  return msQuoteList(body)
    .map(msNormalize)
    .filter(
      x => x.symbol
    );
}

function findQuote(
  body,
  requestedSymbol
) {
  const rows =
    quoteRows(body);

  const wanted =
    String(
      requestedSymbol || ''
    ).toUpperCase();

  return (
    rows.find(
      x =>
        String(
          x.symbol
        ).toUpperCase() === wanted
    ) ||

    rows.find(
      x =>
        String(
          x.localSymbol
        ).toUpperCase() ===
        wanted.split('.')[0]
    ) ||

    rows[0] ||

    null
  );
}

function normalizeQuoteResponse(
  body,
  requestedSymbol
) {
  const direct =
    msNormalize(
      msOne(body)
    );

  if (
    direct.symbol ||
    direct.price != null
  ) {
    if (!direct.symbol) {
      direct.symbol =
        String(
          requestedSymbol || ''
        );
    }

    direct.localSymbol =
      direct.symbol.split('.')[0];

    return direct;
  }

  return (
    findQuote(
      body,
      requestedSymbol
    ) ||

    msNormalize({
      symbol:
        requestedSymbol,

      status:
        'UNAVAILABLE'
    })
  );
}

function requestedSymbols(req) {
  const raw =
    String(
      req.query.symbols ||
      req.query.symbol ||
      ''
    );

  return [
    ...new Set(
      raw
        .split(',')
        .map(
          s => s.trim()
        )
        .filter(Boolean)
    )
  ].slice(0, 50);
}

function registerMaliRadarMarketDataRoutes(app) {

  /* =========================
     PROVIDER STATUS
     ========================= */

  app.get(
    '/api/market-data/status',
    (req, res) => {

      res.json({
        configured:
          Boolean(
            process.env.MYSTOCKS_API_KEY
          ),

        environment:
          'sandbox',

        state:
          process.env.MYSTOCKS_API_KEY
            ? 'READY'
            : 'DEMO',

        source:
          'MyStocks Africa Sandbox',

        delayMinutes:
          15
      });
    }
  );


  /* =========================
     MARKET DIRECTORY
     ========================= */

  app.get(
    '/api/market-data/stocks',
    async (req, res) => {

      const exchange =
        String(
          req.query.market ||
          'NSE'
        ).toUpperCase();

      try {

        const body =
          await msFetch(
            '/stocks',
            {
              limit:
                Math.min(
                  Number(
                    req.query.limit ||
                    200
                  ),
                  200
                ),

              search:
                req.query.search ||
                undefined,

              exchange
            }
          );

        const rows =
          msList(body)
            .map(msNormalize)
            .filter(
              x =>
                !x.exchange ||
                String(
                  x.exchange
                ).toUpperCase() ===
                exchange
            );

        res.set(
          'Cache-Control',
          'private, max-age=60'
        );

        res.json({
          market:
            exchange,

          state:
            rows.some(
              x =>
                x.price != null
            )
              ? 'DELAYED'
              : 'UNAVAILABLE',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes:
            15,

          asOf:
            rows.find(
              x => x.asOf
            )?.asOf ||
            null,

          stocks:
            rows
        });

      } catch (e) {

        res.status(
          e.status || 502
        ).json({

          error:
            e.message,

          code:
            e.code ||
            'MYSTOCKS_ERROR',

          source:
            'MyStocks Africa Sandbox'
        });
      }
    }
  );


  /* =========================
     BATCH QUOTES
     ========================= */

  app.get(
    '/api/market-data/quotes',
    async (req, res) => {

      const exchange =
        String(
          req.query.market ||
          'NSE'
        ).toUpperCase();

      let symbols =
        requestedSymbols(req);

      if (!symbols.length) {

        return res.status(400).json({

          error:
            'Provide symbols, e.g. ?symbols=SCOM,KCB,EQTY',

          code:
            'SYMBOLS_REQUIRED'
        });
      }

      symbols =
        symbols.map(
          s =>
            providerSymbol(
              s,
              exchange
            )
        );

      try {

        const body =
          await msFetch(
            '/market/quotes',
            {
              symbols:
                symbols.join(',')
            }
          );

        const quotes =
          quoteRows(body);

        const bySymbol = {};

        quotes.forEach(
          q => {
            bySymbol[q.symbol] =
              q;
          }
        );

        const normalized =
          symbols.map(
            s =>

              bySymbol[s] ||

              quotes.find(
                q =>
                  q.localSymbol
                    .toUpperCase() ===
                  s
                    .split('.')[0]
                    .toUpperCase()
              ) ||

              msNormalize({
                symbol:
                  s,

                exchange,

                status:
                  'UNAVAILABLE'
              })
          );

        res.set(
          'Cache-Control',
          'private, max-age=30'
        );

        res.json({

          market:
            exchange,

          state:
            normalized.some(
              x =>
                x.price != null
            )
              ? 'DELAYED'
              : 'UNAVAILABLE',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes:
            15,

          quotes:
            normalized,

          notFound:
            Array.isArray(
              body?.not_found
            )
              ? body.not_found
              : []
        });

      } catch (e) {

        res.status(
          e.status || 502
        ).json({

          error:
            e.message,

          code:
            e.code ||
            'MYSTOCKS_ERROR',

          source:
            'MyStocks Africa Sandbox'
        });
      }
    }
  );


  /* =========================
     SINGLE STOCK
     ========================= */

  app.get(
    '/api/market-data/stock/:symbol',
    async (req, res) => {

      const exchange =
        String(
          req.query.market ||
          'NSE'
        ).toUpperCase();

      const symbol =
        providerSymbol(
          req.params.symbol,
          exchange
        );

      try {

        const quoteBody =
          await msFetch(
            '/market/quotes',
            {
              symbol,
              exchange
            }
          );

        const quote =
          normalizeQuoteResponse(
            quoteBody,
            symbol
          );

        if (
          quote.price != null
        ) {

          return res.json({

            ...quote,

            symbol:
              quote.symbol ||
              symbol,

            localSymbol:
              (
                quote.symbol ||
                symbol
              ).split('.')[0],

            exchange:
              quote.exchange ||
              exchange,

            delayMinutes:
              quote.delayMinutes ||
              15,

            source:
              'MyStocks Africa Sandbox'
          });
        }

        const detailBody =
          await msFetch(
            '/stocks/' +
            encodeURIComponent(
              symbol
            )
          );

        const detail =
          msNormalize(
            msOne(detailBody)
          );

        return res.json({

          ...detail,

          symbol:
            detail.symbol ||
            symbol,

          localSymbol:
            (
              detail.symbol ||
              symbol
            ).split('.')[0],

          exchange:
            detail.exchange ||
            exchange,

          delayMinutes:
            detail.delayMinutes ||
            15,

          source:
            'MyStocks Africa Sandbox'
        });

      } catch (firstError) {

        try {

          const detailBody =
            await msFetch(
              '/stocks/' +
              encodeURIComponent(
                symbol
              )
            );

          const detail =
            msNormalize(
              msOne(detailBody)
            );

          return res.json({

            ...detail,

            symbol:
              detail.symbol ||
              symbol,

            localSymbol:
              (
                detail.symbol ||
                symbol
              ).split('.')[0],

            exchange:
              detail.exchange ||
              exchange,

            delayMinutes:
              detail.delayMinutes ||
              15,

            source:
              'MyStocks Africa Sandbox'
          });

        } catch (secondError) {

          res.status(
            secondError.status ||
            firstError.status ||
            502
          ).json({

            error:
              secondError.message ||
              firstError.message,

            code:
              secondError.code ||
              firstError.code ||
              'MYSTOCKS_ERROR',

            source:
              'MyStocks Africa Sandbox'
          });
        }
      }
    }
  );


  /* =========================
     CANDLE / CHART ENGINE
     v2.5.2
     ========================= */

  app.get(
    '/api/market-data/stock/:symbol/candles',
    async (req, res) => {

      const exchange =
        String(
          req.query.market ||
          'NSE'
        ).toUpperCase();

      const symbol =
        providerSymbol(
          req.params.symbol,
          exchange
        );

      const range =
        String(
          req.query.range ||
          '1M'
        ).toUpperCase();


      /* -------------------------
         RANGE DEFINITIONS
         ------------------------- */

      const daysMap = {

        '1D': 1,

        '1W': 7,

        '1M': 31,

        '3M': 93,

        '1Y': 365,

        'MAX': 3650

      };

      const days =
        daysMap[range] ||
        31;


      /* -------------------------
         DATE WINDOW
         ------------------------- */

      const to =
        new Date();

      const from =
        new Date(
          to.getTime() -
          days *
          86400000
        );


      const iso =
        d =>
          d.toISOString()
           .slice(0, 10);


      /* -------------------------
         INTERVAL
         ------------------------- */

      const interval =
        range === '1D'
          ? '15m'

          : range === '1W'
            ? '1h'

            : range === 'MAX'
              ? '1w'

              : '1d';


      /* -------------------------
         CANDLE TIME
         ------------------------- */

      function candleTime(c) {

        const raw =
          c?.timestamp ??
          c?.time ??
          c?.date ??
          c?.datetime ??
          c?.asOf;

        if (
          raw == null
        ) {
          return null;
        }

        const t =
          new Date(
            raw
          ).getTime();

        return Number.isFinite(t)
          ? t
          : null;
      }


      /* -------------------------
         EXTRACT CANDLES
         ------------------------- */

      function extractCandles(body) {

        const a =
          body?.candles ||
          body?.data?.candles ||
          body?.data ||
          body?.results ||
          [];

        return Array.isArray(a)
          ? a
          : [];
      }


      try {

        /* -------------------------
           ASK MYSTOCKS
           ------------------------- */

        const body =
          await msFetch(

            '/stocks/' +
            encodeURIComponent(
              symbol
            ) +
            '/candles',

            {
              from:
                iso(from),

              to:
                iso(to),

              interval
            }
          );


        /* -------------------------
           PROVIDER RESPONSE
           ------------------------- */

        const rawCandles =
          extractCandles(
            body
          );


        const fromMs =
          from.getTime();

        const toMs =
          to.getTime();


        /* -------------------------
           IMPORTANT FIX
           -------------------------

           MyStocks sandbox may return
           its available historical dataset
           even when a narrower window
           is requested.

           Therefore MaliRadar performs
           its OWN range filtering.
        */

        let candles =
          rawCandles.filter(
            c => {

              const t =
                candleTime(c);

              return (
                t != null &&
                t >= fromMs &&
                t <= toMs
              );
            }
          );


        /* -------------------------
           SORT CHRONOLOGICALLY
           ------------------------- */

        candles.sort(
          (a, b) =>
            (
              candleTime(a) ?? 0
            ) -
            (
              candleTime(b) ?? 0
            )
        );


        /* -------------------------
           RESPONSE
           ------------------------- */

        res.json({

          symbol,

          range,

          interval,

          from:
            iso(from),

          to:
            iso(to),

          source:
            'MyStocks Africa Sandbox',

          delayMinutes:
            15,

          availableCandles:
            candles.length,

          providerCandlesReturned:
            rawCandles.length,

          candles

        });

      } catch (e) {

        res.status(
          e.status || 502
        ).json({

          error:
            e.message,

          code:
            e.code ||
            'MYSTOCKS_ERROR',

          source:
            'MyStocks Africa Sandbox'
        });
      }
    }
  );
}


/* =========================
   EXPORT
   ========================= */

module.exports = {
  registerMaliRadarMarketDataRoutes
};
