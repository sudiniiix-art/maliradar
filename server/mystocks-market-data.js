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
    x?.localPrice ??
    x?.currentPrice ??
    x?.marketPrice ??
    x?.ltp ??
    x?.lastPrice ??
    x?.last ??
    x?.close ??
    q?.price ??
    q?.localPrice ??
    q?.currentPrice ??
    q?.marketPrice ??
    q?.ltp ??
    q?.lastPrice ??
    q?.last ??
    q?.close
  );

  const previousClose =
    n(
      x?.previousClose ??
      x?.prevClose ??
      x?.previous_close ??
      q?.previousClose ??
      q?.prevClose
    );

  // Some provider rows omit changePct. Derive it from the authoritative
  // delayed price and previous close rather than displaying 0.00%.
  const reportedChangePct =
    n(
      x?.changePct ??
      x?.changePercent ??
      x?.percentChange ??
      x?.change_percentage ??
      q?.changePct ??
      q?.changePercent ??
      q?.percentChange ??
      q?.change_percentage
    );

  const changePct =
    price != null && previousClose != null && previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : reportedChangePct;

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

    changePct,

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

    previousClose,

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
      x?.quoteTime ||
      q?.asOf ||
      q?.timestamp ||
      q?.quoteTime ||
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

const detailQuoteCache = new Map();

async function msStockDetail(symbol) {
  const key = String(symbol || '').toUpperCase();
  const cached = detailQuoteCache.get(key);
  if (cached && (Date.now() - cached.time) < 60000) return cached.value;

  const value = normalize(
    one(
      await msFetch(
        '/stocks/' + encodeURIComponent(symbol)
      )
    )
  );

  detailQuoteCache.set(key, { time: Date.now(), value });
  return value;
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

        // MyStocks /stocks is cursor-paginated. Fetch provider pages here
        // so the directory does not silently stop at the first page.
        const requestedLimit = Math.min(Math.max(Number(req.query.limit || 1000), 1), 1000);
        const pageSize = Math.min(requestedLimit, 200);
        const allRows = [];
        let cursor;
        let pages = 0;
        let hasMore = true;

        while (hasMore && allRows.length < requestedLimit && pages < 10) {
          const body = await msFetch('/stocks', {
            limit: pageSize,
            search: req.query.search || undefined,
            exchange,
            cursor: cursor || undefined
          });

          allRows.push(...list(body));
          const nextCursor = body?.nextCursor || body?.next_cursor || body?.pagination?.nextCursor || null;
          hasMore = Boolean(body?.hasMore ?? body?.has_more ?? nextCursor);
          cursor = nextCursor || undefined;
          pages += 1;
          if (!cursor) break;
        }

        const rows = allRows
          .slice(0, requestedLimit)
          .map(normalize)
          .filter(x => !x.exchange || String(x.exchange).toUpperCase() === exchange);

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

        const providerNotFound = Array.isArray(body?.not_found)
          ? body.not_found.map(x => String(x?.symbol || x?.ticker || x || '').toUpperCase())
          : [];

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

        // Batch quotes are the fast path. Some provider-listed instruments
        // can still arrive without a usable price, so verify only those
        // missing prices through the authoritative single-stock endpoint.
        out.forEach((q, i) => {
          if (q.price != null) {
            q.verificationMethod = 'BATCH_QUOTE';
            q.verificationStatus = 'VERIFIED';
          } else if (providerNotFound.includes(providerSymbols[i].toUpperCase())) {
            q.verificationMethod = 'NONE';
            q.verificationStatus = 'NOT_FOUND_BY_PROVIDER';
            q.availabilityReason = 'Provider could not resolve this symbol in the batch quote endpoint.';
          }
        });

        const missing = out
          .map((q, i) => ({ q, i }))
          .filter(({q}) => q.price == null);

        if (missing.length) {
          // Second verification path: the provider's market snapshot bundles
          // quote + daily-bar data and can resolve instruments that do not
          // arrive with a usable value in the batch quote response.
          try {
            const snapshotBody = await msFetch('/market/snapshot', {
              symbols: missing.map(({i}) => providerSymbols[i]).join(',')
            });
            const snapshotData = snapshotBody?.data || {};
            missing.forEach(({i}) => {
              const s = providerSymbols[i];
              const raw = snapshotData[s] ||
                snapshotData[s.toUpperCase()] ||
                snapshotData[s.toLowerCase()];
              const snap = normalize(raw?.quote || raw);
              if (snap?.price != null) {
                out[i] = {
                  ...out[i],
                  ...snap,
                  symbol: snap.symbol || s,
                  localSymbol: (snap.symbol || s).split('.')[0],
                  exchange: snap.exchange || exchange,
                  status: 'DELAYED',
                  verificationMethod: 'MARKET_SNAPSHOT',
                  verificationStatus: 'VERIFIED',
                  source: 'MyStocks Africa Sandbox'
                };
              }
            });
          } catch {
            // Continue to the individual detail fallback below.
          }
        }

        const stillMissing = out
          .map((q, i) => ({ q, i }))
          .filter(({q}) => q.price == null);

        if (stillMissing.length) {
          const concurrency = 5;
          let cursor = 0;

          const worker = async () => {
            while (cursor < stillMissing.length) {
              const item = stillMissing[cursor++];
              try {
                const detail = await msStockDetail(providerSymbols[item.i]);

                if (detail && detail.price != null) {
                  out[item.i] = {
                    ...out[item.i],
                    ...detail,
                    symbol: detail.symbol || providerSymbols[item.i],
                    localSymbol:
                      (detail.symbol || providerSymbols[item.i]).split('.')[0],
                    exchange: detail.exchange || exchange,
                    status: 'DELAYED',
                    verificationMethod: 'SINGLE_STOCK_DETAIL',
                    verificationStatus: 'VERIFIED',
                    source: 'MyStocks Africa Sandbox'
                  };
                }
              } catch {
                // Keep the honest UNAVAILABLE result if the provider
                // cannot verify a price for this instrument.
              }
            }
          };

          await Promise.all(
            Array.from(
              {length: Math.min(concurrency, stillMissing.length)},
              worker
            )
          );
        }

        out.forEach((q) => {
          if (q.price == null && !q.availabilityReason) {
            q.verificationMethod = 'NONE';
            q.verificationStatus = 'NO_VERIFIED_PRICE';
            q.availabilityReason = 'Provider resolved no usable price from batch or single-stock detail.';
          }
        });

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
  // QUOTE COVERAGE DIAGNOSTIC
  // =====================================

  app.get(
    '/api/market-data/coverage',
    async (req, res) => {
      const exchange = String(req.query.market || 'NSE').toUpperCase();
      const symbols = [...new Set(
        String(req.query.symbols || '')
          .split(',')
          .map(x => x.trim())
          .filter(Boolean)
      )].slice(0, 50);

      if (!symbols.length) {
        return res.status(400).json({
          error: 'Provide symbols, e.g. ?symbols=SCOM,KCB,EQTY',
          code: 'SYMBOLS_REQUIRED'
        });
      }

      const providerSymbols = symbols.map(x => providerSymbol(x, exchange));

      try {
        const body = await msFetch('/market/quotes', {
          symbols: providerSymbols.join(',')
        });
        const rows = quoteList(body).map(normalize);
        const notFound = new Set(
          Array.isArray(body?.not_found)
            ? body.not_found.map(x => String(x?.symbol || x?.ticker || x || '').toUpperCase())
            : []
        );

        const coverage = [];
        const concurrency = 5;
        let cursor = 0;

        const worker = async () => {
          while (cursor < providerSymbols.length) {
            const i = cursor++;
            const symbol = providerSymbols[i];
            const batch = rows.find(x =>
              x.symbol.toUpperCase() === symbol.toUpperCase()
            ) || rows.find(x =>
              x.localSymbol.toUpperCase() === symbol.split('.')[0].toUpperCase()
            );

            if (batch?.price != null) {
              coverage[i] = {
                symbol,
                exchange,
                status: 'VERIFIED',
                method: 'BATCH_QUOTE',
                price: batch.price,
                asOf: batch.asOf || null
              };
              continue;
            }

            try {
              const detail = await msStockDetail(symbol);
              if (detail?.price != null) {
                coverage[i] = {
                  symbol,
                  exchange,
                  status: 'VERIFIED',
                  method: 'SINGLE_STOCK_DETAIL',
                  price: detail.price,
                  asOf: detail.asOf || null
                };
              } else {
                coverage[i] = {
                  symbol,
                  exchange,
                  status: notFound.has(symbol.toUpperCase()) ? 'NOT_FOUND_BY_PROVIDER' : 'NO_VERIFIED_PRICE',
                  method: 'NONE',
                  reason: notFound.has(symbol.toUpperCase())
                    ? 'Provider did not resolve this symbol.'
                    : 'Provider resolved the instrument but returned no usable price.'
                };
              }
            } catch (e) {
              coverage[i] = {
                symbol,
                exchange,
                status: notFound.has(symbol.toUpperCase()) ? 'NOT_FOUND_BY_PROVIDER' : 'DETAIL_REQUEST_FAILED',
                method: 'NONE',
                reason: e.message || 'Single-stock detail request failed.'
              };
            }
          }
        };

        await Promise.all(
          Array.from({length: Math.min(concurrency, providerSymbols.length)}, worker)
        );

        const verified = coverage.filter(x => x?.status === 'VERIFIED').length;
        res.json({
          market: exchange,
          source: 'MyStocks Africa Sandbox',
          delayMinutes: 15,
          total: coverage.length,
          verified,
          unavailable: coverage.length - verified,
          coveragePct: coverage.length ? Number((verified / coverage.length * 100).toFixed(1)) : 0,
          instruments: coverage
        });
      } catch (e) {
        res.status(e.status || 502).json({
          error: e.message,
          code: e.code || 'MYSTOCKS_ERROR',
          source: 'MyStocks Africa Sandbox'
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
      const exchange = String(req.query.market || 'NSE').toUpperCase();
      const symbol = providerSymbol(req.params.symbol, exchange);

      // The provider's single-stock endpoint is the authoritative detail path.
      // Use it first so Stock Detail is independent of the batch quote API's
      // parameter/shape and always requests the exact provider symbol.
      try {
        const detail = await msStockDetail(symbol);

        if (detail && detail.price != null) {
          return res.json({
            ...detail,
            symbol: detail.symbol || symbol,
            localSymbol: (detail.symbol || symbol).split('.')[0],
            exchange: detail.exchange || exchange,
            verificationMethod: 'SINGLE_STOCK_DETAIL',
            verificationStatus: 'VERIFIED',
            source: 'MyStocks Africa Sandbox'
          });
        }

        // If the detail catalogue entry exists but has no usable price,
        // fall back to the documented batch quote path with symbols=.
        const body = await msFetch('/market/quotes', {
          symbols: symbol
        });

        const rows = quoteList(body).map(normalize);
        const q = rows.find(x => String(x.symbol || '').toUpperCase() === symbol.toUpperCase()) ||
                  rows.find(x => String(x.localSymbol || '').toUpperCase() === symbol.split('.')[0].toUpperCase());

        if (q && q.price != null) {
          return res.json({
            ...q,
            symbol: q.symbol || symbol,
            localSymbol: (q.symbol || symbol).split('.')[0],
            exchange: q.exchange || exchange,
            verificationMethod: 'BATCH_QUOTE',
            verificationStatus: 'VERIFIED',
            source: 'MyStocks Africa Sandbox'
          });
        }

        return res.status(502).json({
          error: 'Provider returned no verified price for ' + symbol,
          code: 'NO_VERIFIED_PRICE',
          source: 'MyStocks Africa Sandbox'
        });
      } catch (e) {
        return res.status(e.status || 502).json({
          error: e.message || 'MyStocks request failed',
          code: e.code || 'MYSTOCKS_ERROR',
          source: 'MyStocks Africa Sandbox'
        });
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
          // Intraday history is session-based, not calendar-day based.
          // A weekend/holiday can have no candles in the last 24 hours.
          // Request a wider window and select the latest available trading
          // session below so 1D remains truthful without fabricating data.
          days: 7,
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

        if (range === '1D') {
          // Use the most recent trading session returned by the provider.
          // This handles weekends/holidays while keeping the chart provider-only.
          if (candles.length) {
            const latestTime = new Date(candles[candles.length - 1].time);
            const latestDay = latestTime.toISOString().slice(0, 10);
            candles = candles.filter(c =>
              new Date(c.time).toISOString().slice(0, 10) === latestDay
            );
          }
        } else if (policy.days != null) {

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
