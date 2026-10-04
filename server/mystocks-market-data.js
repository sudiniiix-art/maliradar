const BASE = 'https://mystocks.africa/api/sandbox/v1/partner';
const SUFFIX = {NSE:'.KE',NGX:'.NG',JSE:'.ZA',GSE:'.GH',EGX:'.EG',CSE:'.MA',DSE:'.TZ',USE:'.UG',RSE:'.RW'};

function num(v){
  if(v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rows(body){
  if(Array.isArray(body)) return body;
  if(Array.isArray(body?.stocks)) return body.stocks;
  if(Array.isArray(body?.quotes)) return body.quotes;
  if(Array.isArray(body?.data)) return body.data;
  if(Array.isArray(body?.results)) return body.results;
  if(Array.isArray(body?.items)) return body.items;

  if(body?.data && typeof body.data === 'object'){
    return Object.entries(body.data).map(([symbol,v]) => ({
      ...(v || {}),
      symbol: v?.symbol || symbol
    }));
  }

  return [];
}

function norm(x){
  const q = x?.quote || {};

  const symbol = String(
    x?.symbol ||
    x?.ticker ||
    x?.code ||
    ''
  );

  const price = num(
    x?.price ??
    x?.lastPrice ??
    x?.last ??
    x?.close ??
    q?.price ??
    q?.lastPrice ??
    q?.last ??
    q?.close
  );

  const changePct = num(
    x?.changePct ??
    x?.changePercent ??
    x?.percentChange ??
    q?.changePct ??
    q?.changePercent ??
    q?.percentChange
  );

  return {
    symbol,
    localSymbol: symbol.split('.')[0],
    name: x?.name || x?.companyName || symbol,
    exchange: x?.exchange || x?.market || null,
    currency: x?.currency || q?.currency || null,
    price,
    changePct,
    asOf:
      x?.asOf ||
      x?.timestamp ||
      x?.updatedAt ||
      q?.asOf ||
      q?.timestamp ||
      null,
    delayMinutes: 15,
    stale: Boolean(x?.stale ?? q?.stale),
    status: price === null ? 'UNAVAILABLE' : 'DELAYED',
    source: 'MyStocks Africa Sandbox'
  };
}

function qualified(symbol, exchange){
  const s = String(symbol || '').trim().toUpperCase();

  return s.includes('.')
    ? s
    : s + (SUFFIX[exchange] || '');
}

async function fetchMS(path, params = {}){
  const key = process.env.MYSTOCKS_API_KEY;

  if(!key){
    const e = new Error(
      'MYSTOCKS_API_KEY is not configured'
    );

    e.status = 503;
    throw e;
  }

  const u = new URL(BASE + path);

  Object.entries(params).forEach(([k,v]) => {
    if(
      v !== undefined &&
      v !== null &&
      v !== ''
    ){
      u.searchParams.set(k, String(v));
    }
  });

  const r = await fetch(u, {
    headers: {
      Authorization: `Bearer ${key}`,
      'x-api-key': key,
      Accept: 'application/json'
    }
  });

  const text = await r.text();

  let body = {};

  try{
    body = JSON.parse(text);
  }catch{}

  if(!r.ok){
    const e = new Error(
      body?.message ||
      body?.error ||
      `MyStocks HTTP ${r.status}`
    );

    e.status = r.status;
    throw e;
  }

  return body;
}

function find(body, symbol){
  const want = String(symbol).toUpperCase();

  const converted = rows(body).map(norm);

  return (
    converted.find(
      x =>
        String(x.symbol).toUpperCase() === want
    ) ||
    converted.find(
      x =>
        String(x.localSymbol).toUpperCase() ===
        want.split('.')[0]
    ) ||
    null
  );
}

function registerMaliRadarMarketDataRoutes(app){

  app.get(
    '/api/market-data/status',
    (req,res) => res.json({
      configured:
        Boolean(process.env.MYSTOCKS_API_KEY),

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
    })
  );


  app.get(
    '/api/market-data/stocks',
    async(req,res) => {

      const exchange =
        String(
          req.query.market || 'NSE'
        ).toUpperCase();

      try{

        const body =
          await fetchMS(
            '/stocks',
            {
              limit:
                Math.min(
                  Number(
                    req.query.limit || 200
                  ),
                  200
                ),

              search:
                req.query.search ||
                undefined,

              exchange
            }
          );

        const stocks =
          rows(body)
            .map(norm)
            .filter(
              x =>
                !x.exchange ||
                String(
                  x.exchange
                ).toUpperCase() === exchange
            );

        res.json({
          market: exchange,

          state:
            stocks.some(
              x => x.price !== null
            )
              ? 'DELAYED'
              : 'UNAVAILABLE',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes: 15,

          asOf:
            stocks.find(
              x => x.asOf
            )?.asOf || null,

          stocks
        });

      }catch(e){

        res.status(
          e.status || 502
        ).json({
          error: e.message,
          source:
            'MyStocks Africa Sandbox'
        });
      }
    }
  );


  app.get(
    '/api/market-data/quotes',
    async(req,res) => {

      const exchange =
        String(
          req.query.market || 'NSE'
        ).toUpperCase();

      const list =
        String(
          req.query.symbols || ''
        )
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
        .slice(0,50);

      if(!list.length){
        return res.status(400).json({
          error:
            'symbols is required'
        });
      }

      try{

        const symbols =
          list.map(
            x => qualified(x,exchange)
          );

        const body =
          await fetchMS(
            '/market/quotes',
            {
              symbols:
                symbols.join(',')
            }
          );

        const got =
          rows(body).map(norm);

        const quotes =
          symbols.map(
            s =>
              got.find(
                x =>
                  x.symbol.toUpperCase() ===
                  s.toUpperCase()
              ) ||

              got.find(
                x =>
                  x.localSymbol.toUpperCase() ===
                  s.split('.')[0].toUpperCase()
              ) ||

              norm({
                symbol: s
              })
          );

        res.json({
          market: exchange,

          state:
            quotes.some(
              x => x.price !== null
            )
              ? 'DELAYED'
              : 'UNAVAILABLE',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes: 15,

          quotes
        });

      }catch(e){

        res.status(
          e.status || 502
        ).json({
          error: e.message,
          source:
            'MyStocks Africa Sandbox'
        });
      }
    }
  );


  app.get(
    '/api/market-data/stock/:symbol',
    async(req,res) => {

      const exchange =
        String(
          req.query.market || 'NSE'
        ).toUpperCase();

      const symbol =
        qualified(
          req.params.symbol,
          exchange
        );

      try{

        try{

          const body =
            await fetchMS(
              '/market/quotes',
              {
                symbols: symbol
              }
            );

          const quote =
            find(body,symbol);

          if(
            quote &&
            quote.price !== null
          ){
            return res.json(quote);
          }

        }catch(_e){
          // Try the compatibility endpoint below.
        }


        const body =
          await fetchMS(
            '/stocks/' +
            encodeURIComponent(symbol)
          );

        const stock =
          norm(
            body?.stock ||
            body?.data ||
            body?.result ||
            body
          );

        stock.symbol =
          stock.symbol || symbol;

        stock.localSymbol =
          stock.localSymbol ||
          symbol.split('.')[0];

        stock.exchange =
          stock.exchange ||
          exchange;

        res.json(stock);

      }catch(e){

        res.status(
          e.status || 502
        ).json({

          symbol,

          localSymbol:
            symbol.split('.')[0],

          exchange,

          price: null,

          changePct: null,

          asOf: null,

          delayMinutes: 15,

          stale: false,

          status:
            'UNAVAILABLE',

          source:
            'MyStocks Africa Sandbox',

          error:
            e.message
        });
      }
    }
  );


  app.get(
    '/api/market-data/stock/:symbol/candles',
    async(req,res) => {

      const exchange =
        String(
          req.query.market || 'NSE'
        ).toUpperCase();

      const symbol =
        qualified(
          req.params.symbol,
          exchange
        );

      try{

        const body =
          await fetchMS(
            '/stocks/' +
            encodeURIComponent(symbol) +
            '/candles',
            {
              range:
                req.query.range || '1M'
            }
          );

        res.json({

          symbol,

          range:
            req.query.range || '1M',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes: 15,

          candles:
            body?.candles ||
            body?.data ||
            body?.results ||
            []
        });

      }catch(e){

        res.status(
          e.status || 502
        ).json({

          symbol,

          range:
            req.query.range || '1M',

          source:
            'MyStocks Africa Sandbox',

          delayMinutes: 15,

          candles: [],

          unavailable: true,

          error:
            e.message
        });
      }
    }
  );
}

module.exports = {
  registerMaliRadarMarketDataRoutes
};
