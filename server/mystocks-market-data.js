/* MaliRadar v2.3 — MyStocks Africa Sandbox market-data routes
   Add this module to the existing Express server. It does NOT replace your existing routes.
   Required Render environment variable: MYSTOCKS_API_KEY=sk_sandbox_...
   Keep the key server-side. Never put it in index.html or GitHub.
*/
const MYSTOCKS_SANDBOX_BASE = 'https://mystocks.africa/api/sandbox/v1/partner';
const REGION_TO_EXCHANGE = {ke:'NSE',ng:'NGX',za:'JSE',gh:'GSE',eg:'EGX',ma:'CSE',tz:'DSE',ug:'USE',rw:'RSE',us:'US'};
const LOCAL_TO_SUFFIX = {NSE:'.KE',NGX:'.NG',JSE:'.ZA',GSE:'.GH',EGX:'.EG',CSE:'.MA',DSE:'.TZ',USE:'.UG',RSE:'.RW'};

function msNumber(v){
  return typeof v === 'number' && Number.isFinite(v)
    ? v
    : (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
}

function msList(body){
  if(Array.isArray(body)) return body;
  return body?.stocks || body?.data || body?.results || body?.items || [];
}

function msOne(body){
  return body?.stock || body?.data || body?.result || body;
}

function msNormalize(x){
  const symbol = String(x?.symbol || x?.ticker || x?.code || '');
  const price = msNumber(
    x?.price ?? x?.lastPrice ?? x?.last ?? x?.close ?? x?.quote?.price
  );
  const changePct = msNumber(
    x?.changePct ??
    x?.changePercent ??
    x?.percentChange ??
    x?.quote?.changePct ??
    x?.quote?.changePercent
  );
  const asOf =
    x?.asOf ||
    x?.timestamp ||
    x?.quote?.asOf ||
    x?.updatedAt ||
    null;

  return {
    symbol,
    localSymbol: symbol.split('.')[0],
    name: x?.name || x?.companyName || x?.company?.name || symbol,
    exchange: x?.exchange || x?.market || null,
    currency: x?.currency || null,
    price,
    changePct,
    asOf,
    delayMinutes:
      msNumber(x?.delayMinutes ?? x?.quote?.delayMinutes) ?? 15,
    stale: Boolean(x?.stale ?? x?.quote?.stale),
    status: price == null ? 'UNAVAILABLE' : 'DELAYED',
    source: 'MyStocks Africa Sandbox'
  };
}

async function msFetch(path, params = {}){
  const key = process.env.MYSTOCKS_API_KEY;

  if(!key){
    const e = new Error('MYSTOCKS_API_KEY is not configured');
    e.code = 'MYSTOCKS_KEY_MISSING';
    e.status = 503;
    throw e;
  }

  const u = new URL(MYSTOCKS_SANDBOX_BASE + path);

  for(const [k,v] of Object.entries(params)){
    if(v !== undefined && v !== null && v !== ''){
      u.searchParams.set(k, String(v));
    }
  }

  const r = await fetch(u,{
    headers:{
      Authorization:`Bearer ${key}`,
      Accept:'application/json'
    }
  });

  const text = await r.text();
  let body = null;

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
    e.provider = body;
    throw e;
  }

  return body;
}

function providerSymbol(local,exchange){
  const s = String(local || '');

  if(s.includes('.')) return s;

  return s + (LOCAL_TO_SUFFIX[exchange] || '');
}

function registerMaliRadarMarketDataRoutes(app){

  app.get('/api/market-data/status',(req,res)=>
    res.json({
      configured:Boolean(process.env.MYSTOCKS_API_KEY),
      environment:'sandbox',
      state:process.env.MYSTOCKS_API_KEY ? 'READY' : 'DEMO',
      source:'MyStocks Africa Sandbox',
      delayMinutes:15
    })
  );

  app.get('/api/market-data/stocks',async(req,res)=>{
    const exchange =
      String(req.query.market || 'NSE').toUpperCase();

    try{
      const body = await msFetch('/stocks',{
        limit:req.query.limit || 1000,
        search:req.query.search || undefined
      });

      const rows = msList(body)
        .map(msNormalize)
        .filter(
          x =>
            !x.exchange ||
            String(x.exchange).toUpperCase() === exchange
        );

      res.set('Cache-Control','private, max-age=60');

      res.json({
        market:exchange,
        state:rows.some(x => x.price != null)
          ? 'DELAYED'
          : 'UNAVAILABLE',
        source:'MyStocks Africa Sandbox',
        delayMinutes:15,
        asOf:rows.find(x => x.asOf)?.asOf || null,
        stocks:rows
      });

    }catch(e){
      res.status(e.status || 502).json({
        error:e.message,
        code:e.code || 'MYSTOCKS_ERROR',
        source:'MyStocks Africa Sandbox'
      });
    }
  });

  app.get('/api/market-data/stock/:symbol',async(req,res)=>{
    const exchange =
      String(req.query.market || 'NSE').toUpperCase();

    const symbol =
      providerSymbol(req.params.symbol,exchange);

    try{
      const body =
        await msFetch('/stocks/' + encodeURIComponent(symbol));

      res.json(msNormalize(msOne(body)));

    }catch(e){
      res.status(e.status || 502).json({
        error:e.message,
        code:e.code || 'MYSTOCKS_ERROR'
      });
    }
  });

  app.get('/api/market-data/stock/:symbol/candles',async(req,res)=>{
    const exchange =
      String(req.query.market || 'NSE').toUpperCase();

    const symbol =
      providerSymbol(req.params.symbol,exchange);

    try{
      const body =
        await msFetch(
          '/stocks/' +
          encodeURIComponent(symbol) +
          '/candles',
          {
            range:req.query.range || '1M'
          }
        );

      const candles =
        body?.candles ||
        body?.data?.candles ||
        body?.data ||
        body?.results ||
        [];

      res.json({
        symbol,
        range:req.query.range || '1M',
        source:'MyStocks Africa Sandbox',
        delayMinutes:15,
        candles
      });

    }catch(e){
      res.status(e.status || 502).json({
        error:e.message,
        code:e.code || 'MYSTOCKS_ERROR'
      });
    }
  });
}

module.exports = {
  registerMaliRadarMarketDataRoutes
};  // Individual stock quote route.
  // The frontend can keep using this route for Stock Detail.
  // It now uses /market/quotes first, which is the important fix.

  app.get('/api/market-data/stock/:symbol', async (req,res) => {
    const exchange = String(
      req.query.market || 'NSE'
    ).toUpperCase();

    const local = String(
      req.params.symbol || ''
    ).trim().toUpperCase();

    if(!local){
      return res.status(400).json({
        error: 'Missing stock symbol'
      });
    }

    const qualified = providerSymbol(
      local,
      exchange
    );

    try{
      // Preferred quote endpoint.
      try{
        const body = await msFetch('/market/quotes', {
          symbols: qualified
        });

        const quote = findQuote(
          body,
          qualified
        );

        if(quote && quote.price != null){
          return res.json({
            ...quote,
            symbol: quote.symbol || qualified,
            localSymbol: quote.localSymbol || local,
            exchange: quote.exchange || exchange,
            delayMinutes: 15,
            status: 'DELAYED',
            source: 'MyStocks Africa Sandbox'
          });
        }
      }catch(quoteError){
        // Continue to compatibility fallback below.
      }

      // Compatibility fallback.
      const body = await msFetch(
        '/stocks/' + encodeURIComponent(qualified)
      );

      const stock = normalizeQuoteResponse(
        body,
        qualified
      );

      stock.localSymbol =
        stock.localSymbol || local;

      stock.exchange =
        stock.exchange || exchange;

      stock.delayMinutes = 15;
      stock.source = 'MyStocks Africa Sandbox';

      if(stock.price == null){
        stock.status = 'UNAVAILABLE';
      }else{
        stock.status = 'DELAYED';
      }

      return res.json(stock);

    }catch(e){
      return res.status(e.status || 502).json({
        symbol: qualified,
        localSymbol: local,
        exchange,
        currency: null,
        price: null,
        changePct: null,
        asOf: null,
        delayMinutes: 15,
        stale: false,
        status: 'UNAVAILABLE',
        source: 'MyStocks Africa Sandbox',
        error: e.message,
        code: e.code || 'MYSTOCKS_STOCK_ERROR'
      });
    }
  });


  // Candle/history route.
  // This route is deliberately isolated from the quote route.
  // A candle failure must NEVER make a valid quote disappear.

  app.get(
    '/api/market-data/stock/:symbol/candles',
    async (req,res) => {
      const exchange = String(
        req.query.market || 'NSE'
      ).toUpperCase();

      const local = String(
        req.params.symbol || ''
      ).trim().toUpperCase();

      const qualified = providerSymbol(
        local,
        exchange
      );

      try{
        const range = String(
          req.query.range || '1M'
        ).toUpperCase();

        const now = new Date();
        let days = 30;

        if(range === '1D') days = 1;
        else if(range === '1W') days = 7;
        else if(range === '1M') days = 30;
        else if(range === '3M') days = 90;
        else if(range === '1Y') days = 365;
        else if(range === 'MAX') days = 1825;

        const from = new Date(
          now.getTime() -
          days * 24 * 60 * 60 * 1000
        );

        const body = await msFetch(
          '/stocks/' +
          encodeURIComponent(qualified) +
          '/candles',
          {
            from: from.toISOString(),
            to: now.toISOString(),
            interval:
              range === '1D'
                ? '5m'
                : range === '1W'
                  ? '15m'
                  : '1d'
          }
        );

        res.json({
          symbol: qualified,
          localSymbol: local,
          market: exchange,
          range,
          source: 'MyStocks Africa Sandbox',
          delayMinutes: 15,
          candles:
            body?.candles ||
            body?.data ||
            body?.results ||
            body?.items ||
            (Array.isArray(body) ? body : [])
        });

      }catch(e){
        // Chart data can be unavailable without
        // invalidating the stock quote.
        res.status(e.status || 502).json({
          symbol: qualified,
          localSymbol: local,
          market: exchange,
          range: String(
            req.query.range || '1M'
          ).toUpperCase(),
          source: 'MyStocks Africa Sandbox',
          delayMinutes: 15,
          candles: [],
          unavailable: true,
          error: e.message
        });
      }
    }
  );
}

module.exports = {
  registerMaliRadarMarketDataRoutes
};
                                                  
