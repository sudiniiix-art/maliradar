// MaliRadar v2.7 — MyStocks Africa Sandbox market-data bridge

const BASE =
  'https://mystocks.africa/api/sandbox/v1/partner';

const SUFFIX = {
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

const n = v => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const list = b => {
  if (Array.isArray(b)) return b;
  return b?.stocks || b?.data || b?.results || b?.items || [];
};

const quoteList = b => {
  if (Array.isArray(b)) return b;

  if (Array.isArray(b?.data))
    return b.data;

  if (Array.isArray(b?.quotes))
    return b.quotes;

  if (Array.isArray(b?.results))
    return b.results;

  if (Array.isArray(b?.items))
    return b.items;

  if (b?.data && typeof b.data === 'object') {
    return Object.entries(b.data).map(
      ([symbol, v]) => ({
        ...v,
        symbol: v?.symbol || symbol
      })
    );
  }

  return [];
};

const one = b => {
  if (!b) return {};
  if (b.stock) return b.stock;
  if (b.result) return b.result;

  if (b.data && !Array.isArray(b.data))
    return b.data;

  return b;
};

function providerSymbol(symbol, exchange) {
  symbol = String(symbol || '');

  if (symbol.includes('.'))
    return symbol;

  return symbol + (SUFFIX[exchange] || '');
}

function normalize(x) {

  const q = x?.quote || {};

  const symbol = String(
    x?.symbol ||
    x?.ticker ||
    x?.code ||
    ''
  );

  const price = n(
    x?.price ??
    x?.lastPrice ??
    x?.last ??
    x?.close ??
    q?.price ??
    q?.lastPrice ??
    q?.last ??
    q?.close
  );

  return {

    symbol,

    localSymbol:
      symbol.split('.')[0],

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

    changePct:
      n(
        x?.changePct ??
        x?.changePercent ??
        x?.percentChange ??
        q?.changePct ??
        q?.changePercent ??
        q?.percentChange
      ),

    open:
      n(
        x?.open ??
        x?.dayOpen ??
        q?.open
      ),

    high:
      n(
        x?.high ??
        x?.dayHigh ??
        q?.high
      ),

    low:
      n(
        x?.low ??
        x?.dayLow ??
        q?.low
      ),

    previousClose:
      n(
        x?.previousClose ??
        x?.prevClose ??
        x?.previous_close ??
        q?.previousClose ??
        q?.prevClose
      ),

    volume:
      n(
        x?.volume ??
        x?.dayVolume ??
        q?.volume
      ),

    asOf:
      x?.asOf ||
      x?.timestamp ||
      x?.updatedAt ||
      q?.asOf ||
      q?.timestamp ||
      null,

    delayMinutes:
      n(
        x?.delayMinutes ??
        q?.delayMinutes
      ) || 15,

    stale:
      Boolean(
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

async function msFetch(path, params = {}) {

  const key =
    process.env.MYSTOCKS_API_KEY;

  if (!key) {

    const e = new Error(
      'MYSTOCKS_API_KEY is not configured'
    );

    e.status = 503;
    e.code = 'MYSTOCKS_KEY_MISSING';

    throw e;
  }

  const u =
    new URL(BASE + path);

  for (
    const [k, v]
    of Object.entries(params)
  ) {

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

  const r =
    await fetch(
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

  const txt =
    await r.text();

  let body = null;

  try {
    body = JSON.parse(txt);
  } catch {}

  if (!r.ok) {

    const e =
      new Error(
        body?.message ||
        body?.error ||
        `MyStocks HTTP ${r.status}`
      );

    e.status = r.status;
    e.provider = body;

    throw e;
  }

  return body;
}


// =====================================
// CANDLE HELPERS
// =====================================

function candlesFrom(body) {

  const a =
    body?.candles ||
    body?.data?.candles ||
    body?.data ||
    body?.results ||
    body?.bars ||
    body?.history;

  return Array.isArray(a)
    ? a
    : (
      Array.isArray(body)
        ? body
        : []
    );
}

function candleTime(c) {

  const raw =
    c?.timestamp ||
    c?.time ||
    c?.date ||
    c?.datetime ||
    c?.asOf;

  const t =
    raw == null
      ? NaN
      : new Date(raw).getTime();

  return Number.isFinite(t)
    ? t
    : null;
}

function normalizeCandle(c) {

  const t =
    candleTime(c);

  const close =
    n(
      c?.close ||
      c?.price ||
      c?.c
    );

  if (
    t == null ||
    close == null
  ) {
    return null;
  }

  return {

    time:
      new Date(t).toISOString(),

    open:
      n(
        c?.open ??
        c?.o
      ),

    high:
      n(
        c?.high ??
        c?.h
      ),

    low:
      n(
        c?.low ??
        c?.l
      ),

    close,

    volume:
      n(
        c?.volume ??
        c?.v
      )
  };
}


// =====================================
// ROUTES
// =====================================

function registerMaliRadarMarketDataRoutes(app) {


  // =====================================
  // PROVIDER STATUS
  // =====================================

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


  // =====================================
  // STOCK DIRECTORY
  // =====================================

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
          list(body)
            .map(normalize)
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
          'private,max-age=60'
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
          e.status ||
          502
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


  // =====================================
  // BATCH QUOTES
  // =====================================

  app.get(
    '/api/market-data/quotes',
    async (req, res) => {

      const exchange =
        String(
          req.query.market ||
          'NSE'
        ).toUpperCase();

      let symbols =
        String(
          req.query.symbols ||
          ''
        )
          .split(',')
          .map(
            x => x.trim()
          )
          .filter(Boolean);

      symbols =
        [
          ...new Set(symbols)
        ].slice(0, 50);

      if (!symbols.length) {

        return res.status(400).json({

          error:
            'Provide symbols, e.g. ?symbols=SCOM,KCB,EQTY',

          code:
            'SYMBOLS_REQUIRED'
        });
      }

      const providerSymbols =
        symbols.map(
          x =>
            providerSymbol(
              x,
              exchange
            )
        );

      try {

        const body =
          await msFetch(
            '/market/quotes',
            {

              symbols:
                providerSymbols.join(',')
            }
          );

        const rows =
          quoteList(body)
            .map(normalize);

        const out =
          providerSymbols.map(
            s =>

              rows.find(
                x =>
                  x.symbol.toUpperCase() ===
                  s.toUpperCase()
              ) ||

              rows.find(
                x =>
                  x.localSymbol.toUpperCase() ===
                  s.split('.')[0].toUpperCase()
              ) ||

              normalize({
                symbol: s,
                exchange
              })
          );

        res.set(
          'Cache-Control',
          'private,max-age=30'
        );

        res.json({

          market:
            exchange,

          state:
            out.some(
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
            out
        });

      } catch (e) {

        res.status(
          e.status ||
          502
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


  // =====================================
  // SINGLE STOCK
  // =====================================

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

        const body =
          await msFetch(
            '/market/quotes',
            {
              symbol,
              exchange
            }
          );

        const rows =
          quoteList(body)
            .map(normalize);

        let q =
          rows.find(
            x =>
              x.symbol.toUpperCase() ===
              symbol.toUpperCase()
          ) ||
          rows[0];

        if (
          q?.price != null
        ) {

          return res.json({

            ...q,

            symbol:
              q.symbol ||
              symbol,

            localSymbol:
              (
                q.symbol ||
                symbol
              ).split('.')[0],

            exchange:
              q.exchange ||
              exchange
          });
        }

        const detail =
          normalize(
            one(
              await msFetch(
                '/stocks/' +
                encodeURIComponent(
                  symbol
                )
              )
            )
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
            exchange
        });

      } catch (first) {

        try {

          const detail =
            normalize(
              one(
                await msFetch(
                  '/stocks/' +
                  encodeURIComponent(
                    symbol
                  )
                )
              )
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
              exchange
          });

        } catch (second) {

          res.status(
            second.status ||
            first.status ||
            502
          ).json({

            error:
              second.message ||
              first.message,

            code:
              second.code ||
              first.code ||
              'MYSTOCKS_ERROR',

            source:
              'MyStocks Africa Sandbox'
          });
        }
      }
    }
  );


  // =====================================
  // HISTORICAL CANDLES
  // =====================================

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

      const policy = {

        '1D': {
          days: 1,
          interval: '15m'
        },

        '1W': {
          days: 7,
          interval: '1h'
        },

        '1M': {
          days: 31,
          interval: '1d'
        },

        '3M': {
          days: 93,
          interval: '1d'
        },

        '1Y': {
          days: 365,
          interval: '1d'
        },

        'MAX': {
          days: null,
          interval: '1w'
        }

      }[range] || {

        days: 31,
        interval: '1d'

      };

      try {

        const params = {

          interval:
            policy.interval

        };

        if (
          policy.days != null
        ) {

          const to =
            new Date();

          const from =
            new Date(
              to.getTime() -
              policy.days *
              86400000
            );

          params.from =
            from
              .toISOString()
              .slice(0, 10);

          params.to =
            to
              .toISOString()
              .slice(0, 10);
        }

        const body =
          await msFetch(
            '/stocks/' +
            encodeURIComponent(
              symbol
            ) +
            '/candles',
            params
          );

        let candles =
          candlesFrom(body)
            .map(
              normalizeCandle
            )
            .filter(Boolean)
            .sort(
              (a, b) =>
                new Date(a.time) -
                new Date(b.time)
            );

        if (
          policy.days != null
        ) {

          const cutoff =
            Date.now() -
            policy.days *
            86400000;

          candles =
            candles.filter(
              c =>
                new Date(
                  c.time
                ).getTime() >=
                cutoff
            );
        }

        if (
          !candles.length
        ) {

          return res.json({

            symbol,

            exchange,

            range,

            interval:
              policy.interval,

            candles: [],

            count: 0,

            status:
              'UNAVAILABLE',

            delayMinutes:
              15,

            source:
              'MyStocks Africa Sandbox',

            message:
              'No provider candles were returned for this period. MaliRadar will not invent missing history.'
          });
        }

        res.json({

          symbol,

          exchange,

          range,

          interval:
            policy.interval,

          candles,

          count:
            candles.length,

          status:
            'DELAYED',

          delayMinutes:
            15,

          source:
            'MyStocks Africa Sandbox',

          asOf:
            candles[
              candles.length - 1
            ].time,

          historyPolicy:
            'PROVIDER_ONLY'
        });

      } catch (e) {

        res.status(
          e.status ||
          502
        ).json({

          error:
            e.message ||
            'Provider candle request failed',

          code:
            e.code ||
            'MYSTOCKS_CANDLES_ERROR',

          symbol,

          exchange,

          range,

          status:
            'UNAVAILABLE',

          delayMinutes:
            15,

          source:
            'MyStocks Africa Sandbox',

          message:
            'Provider history could not be loaded. MaliRadar will not substitute static or fabricated candles.'
        });
      }
    }
  );


  // =====================================
  // AUTHORITATIVE MARKET STATUS
  // =====================================

  app.get(
    '/api/market-data/market-status',
    async (req, res) => {

      const exchange =
        String(
          req.query.market ||
          'NSE'
        ).toUpperCase();

      try {

        const body =
          await msFetch(
            '/market/status',
            {
              exchange
            }
          );

        const d =
          body?.data ||
          body?.status ||
          body ||
          {};

        const open =
          d.open ??
          d.isOpen ??
          d.marketOpen ??
          null;

        res.json({

          market:
            exchange,

          open:
            open == null
              ? null
              : Boolean(open),

          state:
            open == null
              ? 'UNKNOWN'
              : (
                open
                  ? 'OPEN'
                  : 'CLOSED'
              ),

          nextSession:
            d.nextSession ||
            d.next_open ||
            d.nextOpen ||
            null,

          tradingHours:
            d.tradingHours ||
            d.trading_hours ||
            null,

          timezone:
            d.timezone ||
            'Africa/Nairobi',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes:
            15,

          providerStatus:
            'AUTHORITATIVE_PROVIDER_STATUS'

        });

      } catch (e) {

        res.status(
          e.status ||
          502
        ).json({

          market:
            exchange,

          open:
            null,

          state:
            'UNKNOWN',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes:
            15,

          error:
            e.message ||
            'Market status unavailable',

          message:
            'Provider market status could not be loaded. MaliRadar will not guess whether the market is open.'
        });
      }
    }
  );

}


// =====================================
// EXPORT
// =====================================

module.exports = {
  registerMaliRadarMarketDataRoutes
};
