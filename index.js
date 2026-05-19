addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// ==========================================
// 1. القنوات
// ==========================================
const channels = {
  'ok2': 'https://ok.ru/video/15190750600839',
  'ok': 'https://ok.ru/video/10587514609377',
  'live': 'https://ok.ru/live/7133972668012'
};

const toBase64 = (str) => {
  try {
    return btoa(str);
  } catch (e) { return str; }
};
const fromBase64 = (str) => {
  try {
    return atob(str);
  } catch (e) { return null; }
};

// ==========================================
// 2. صفحة HTML احترافية (مع أزرار الجودة)
// ==========================================
const customHTML = (activeChannel, forcedQuality) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>7seen | بث مباشر ومستمر</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap');
        :root { --bg: #0f0f12; --card: #1a1a1e; --accent: #00d2ff; --text: #e0e0e0; --btn-hover: #00a8cc; --red: #ff4757; }
        body { font-family: 'Cairo', sans-serif; background-color: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
        .container { width: 100%; max-width: 800px; text-align: center; }
        .logo { font-size: 2.5rem; font-weight: 800; color: var(--accent); margin-bottom: 10px; letter-spacing: 2px; }
        .sub { color: #888; margin-bottom: 40px; font-size: 1rem; }
        
        .player-box { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 40px; border: 1px solid #333; }
        video { width: 100%; height: 100%; object-fit: contain; }
        
        .quality-controls { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
        .q-btn { background: var(--card); border: 1px solid #333; color: var(--text); padding: 10px 25px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; }
        .q-btn:hover { background: var(--btn-hover); color: #fff; border-color: var(--btn-hover); transform: translateY(-2px); }
        .q-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        
        .channels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; width: 100%; margin-top: 20px; }
        .ch-card { background: var(--card); padding: 15px; border-radius: 8px; text-decoration: none; color: #fff; border: 1px solid #333; transition: 0.2s; cursor: pointer; }
        .ch-card:hover { background: #25252e; border-color: var(--accent); }
        
        .msg { padding: 10px 20px; border-radius: 5px; margin-bottom: 20px; background: rgba(255,255,255,0.05); border: 1px dashed #444; font-size: 0.9rem; }
        .status { font-size: 0.8rem; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">7seen</div>
        <p class="sub">خدمة البث السريع والمستمر</p>

        <div class="player-box">
            <video id="video" controls autoplay playsinline></video>
        </div>

        <!-- أزرار الجودة (تعيد تحميل الصفحة بالمعامل) -->
        <div class="quality-controls">
            <span style="width:100%; text-align:right; display:block; margin-bottom:5px; font-size:0.8rem; color:#666;">اختر الجودة:</span>
            <button class="q-btn ${forcedQuality === 'auto' ? 'active' : ''}" onclick="loadStream('auto')">🔄 Auto</button>
            <button class="q-btn ${forcedQuality === '1080p' ? 'active' : ''}" onclick="loadStream('1080p')">HD 1080</button>
            <button class="q-btn ${forcedQuality === '720p' ? 'active' : ''}" onclick="loadStream('720p')">SD 720</button>
            <button class="q-btn ${forcedQuality === '480p' ? 'active' : ''}" onclick="loadStream('480p')">MQ 480</button>
        </div>

        <div class="channels-grid" id="channel-list"></div>
        
        <div class="status">تم تفعيل الوضع المستمر (Continuous Mode)</div>
    </div>

    <script>
        const channelsData = ${JSON.stringify(channels)};
        const currentPath = window.location.pathname.split('/');
        const activeCh = currentPath[currentPath.length - 1].replace('.m3u8', '');
        
        // تشغيل القناة
        function loadStream(quality) {
            // إعادة توجيه لنفس الصفحة مع معامل الجودة ?q=
            const url = new URL(window.location);
            url.searchParams.set('q', quality);
            // إذا لم يكن اسم القناة في الرابط، استخدم القناة الافتراضية أو الأولى
            const qCh = activeCh && channelsData[activeCh] ? activeCh : 'live';
            window.location.href = qCh + '.m3u8?q=' + quality;
        }

        const listDiv = document.getElementById('channel-list');

        for (const [key, value] of Object.entries(channelsData)) {
            const card = document.createElement('div');
            card.className = 'ch-card';
            card.innerHTML = \`<h3>\${key}</h3>\`;
            card.onclick = () => { window.location.href = '/live/' + key + '.m3u8'; };
            listDiv.appendChild(card);
        }

        // تشغيل HLS.js عند التحميل
        if (Hls.isSupported()) {
            const video = document.getElementById('video');
            const hls = new Hls();
            // التحميل التلقائي للقناة الحالية
            hls.loadSource(window.location.href);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                   // إذا حدث خطأ قاتل، أعد المحاولة بعد ثانيتين
                   setTimeout(() => hls.startLoad(), 2000);
                }
            });
        }
    </script>
</body>
</html>
`;

// ==========================================
// 3. دالة المعالجة الرئيسية (Live Fetch Logic)
// ==========================================
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type'
      }
    });
  }

  const match = path.match(/^\/live\/([^\/]+)\.(\w+)$/);
  
  // عرض الصفحة الرئيسية
  if (!match) {
      return new Response(customHTML(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const channelName = match[1];
  const forcedQuality = url.searchParams.get('q') || 'auto'; // جودة مطلوبة عبر HTML
  
  // التحقق من وجود القناة
  let pageReferer = channels[channelName] || null;
  if (!pageReferer) return new Response(customHTML(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  let referer = url.searchParams.get('referer') || pageReferer;
  let clientIp = null;
  let targetUrl = url.searchParams.get('src') || url.searchParams.get('url');

  // فك التشفير
  if (targetUrl) {
      if (!targetUrl.startsWith('http')) targetUrl = fromBase64(targetUrl);
      const encReferer = url.searchParams.get('r');
      const encIp = url.searchParams.get('i');
      if (encReferer) referer = fromBase64(encReferer);
      if (encIp) clientIp = fromBase64(encIp);
  } else {
      // استخراج رابط البث (مهم: لا نستخدم الكاش هنا للبث المباشر)
      try {
        // جلب الصفحة في كل مرة لضمان المفاتيح الحالية
        const targets = await extractStreamFromPage(pageReferer, false);
        
        // ترتيب الروابط (Manifest يفضل)
        targets.sort((a, b) => {
            const aIsMaster = a.includes('manifest') || a.includes('master');
            const bIsMaster = b.includes('manifest') || b.includes('master');
            if (aIsMaster && !bIsMaster) return -1;
            if (!aIsMaster && bIsMaster) return 1;
            return b.length - a.length;
        });

        // محاولة الروابط
        let lastError = null;
        for (let i = 0; i < targets.length; i++) {
            targetUrl = targets[i];
            const ipMatch = targetUrl.match(/srcIp\/([0-9.]+)\//);
            if (ipMatch) clientIp = ipMatch[1];
            
            try {
              return await proxyRequest(targetUrl, referer, clientIp, request, url, channelName, false, i + 1, true, forcedQuality);
            } catch (err) {
              lastError = err;
              console.log(`[Fallback] Link ${i+1} failed. Trying next...`);
              continue;
            }
        }
        return new Response(`All links failed. Last Error: ${lastError ? lastError.message : 'Unknown'}`, { status: 502 });
      } catch (err) {
        return new Response(customHTML(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
  }
  
  // طلب يدوي
  try {
    return await proxyRequest(targetUrl, referer, clientIp, request, url, channelName, false, 0, false, forcedQuality);
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}

// ==========================================
// 4. دالة البروكسي (Streaming Logic)
// ==========================================
async function proxyRequest(targetUrl, referer, clientIp, originalRequest, urlObj, channelName, isDebug, linkIndex, isHardcoded, forcedQuality) {
  const headers = new Headers();
  headers.set('Referer', referer);
  try { headers.set('Origin', new URL(referer).origin); } catch(e) {}
  
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Accept', '*/*');
  headers.set('Accept-Language', 'en-US,en;q=0.9');
  headers.set('Accept-Encoding', 'gzip, deflate, br'); // السماح بالضغط للسرعة
  headers.set('Connection', 'keep-alive');

  // Range Headers
  const isTsRequest = targetUrl.includes('.ts');
  const rangeHeader = (isTsRequest) ? originalRequest.headers.get('Range') : null;
  if (rangeHeader) headers.set('Range', rangeHeader);

  // IP Injection (إذا وجد)
  if (clientIp) {
      headers.set('X-Forwarded-For', clientIp);
      headers.set('X-Real-IP', clientIp);
      headers.set('CF-Connecting-IP', clientIp);
  }

  const response = await fetch(targetUrl, { headers: headers });

  if (!response.ok && response.status !== 206) {
      const txt = await response.text();
      if (txt.includes('520')) throw new Error('Cloudflare 520: Connection Refused.');
      throw new Error(`Source error ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl')) {
    let text = await response.text();
    const workerBase = `${urlObj.protocol}//${urlObj.host}/live/${channelName}.m3u8`;
    
    // معاملات مخفية
    let stealthParams = '';
    if (!isHardcoded) {
        if (referer) stealthParams += `&r=${toBase64(referer)}`;
        if (clientIp) stealthParams += `&i=${toBase64(clientIp)}`;
    }

    const lines = text.split('\n');
    const output = [];
    
    // تصفية الجودة (Quality Filter)
    // إذا طلب المستخدم جودة معينة (مثل 1080p)، نخفي البقية
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            if (lines[i] !== '') output.push(line);
            continue;
        }

        // 1. تعديل مفاتيح التشفير
        if (line.includes('#EXT-X-KEY') && line.includes('URI=')) {
            line = line.replace(/URI="([^"]+)"/, (match, uri) => {
                let absUrl = uri;
                if (!uri.match(/^https?:\/\//)) {
                    try { absUrl = new URL(uri, targetUrl).href; } catch(e){}
                }
                return `URI="${workerBase}?src=${toBase64(absUrl)}${stealthParams}"`;
            });
            output.push(line);
        }
        // 2. تعديل روابط الفيديو والجودات الفرعية
        else if (!line.startsWith('#')) {
            let absUrl = line;
            if (!absUrl.match(/^https?:\/\//)) {
                try { absUrl = new URL(line, targetUrl).href; } catch(e){}
            }
            output.push(`${workerBase}?src=${toBase64(absUrl)}${stealthParams}`);
        }
        // 3. تسمية وتصفية الجودات
        else if (line.startsWith('#EXT-X-STREAM-INF')) {
             let shouldSkip = false;
             let name = "Auto";
             
             const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
             if (resMatch) {
                const h = parseInt(resMatch[2]);
                if (h >= 2160) name = '4K';
                else if (h >= 1080) name = '1080p';
                else if (h >= 720) name = '720p';
                else if (h >= 480) name = '480p';
                else if (h >= 360) name = '360p';
             }

             // إضافة الاسم إذا لم يكن موجوداً
             if (!line.includes('NAME=')) {
                 line = line + `,NAME="${name}"`;
             }

             // الفلترة: إذا كان المستخدم طلب جودة معينة (مثلاً 720p)
             // ونحن نقرأ سطر 1080p، نقوم بحذف هذا السطر والسطر التالي (الرابط)
             if (forcedQuality !== 'auto' && forcedQuality !== 'Auto') {
                 if (name !== forcedQuality) {
                     // تخطي هذا السطر
                     i++; // تخطي السطر التالي أيضاً (الرابط)
                     continue;
                 }
             }
             output.push(line);
        }
        else {
            output.push(line);
        }
    }

    const newHeaders = new Headers();
    newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // كاش للقائمة: 5 ثواني (قصير للبث المباشر لمنع القديم)
    newHeaders.set('Cache-Control', 'public, max-age=5');
    let streamType = text.includes('#EXT-X-STREAM-INF') ? "MASTER" : "AUTO";
    newHeaders.set('X-Stream-Type', streamType);
    newHeaders.set('X-Active-Link', `${linkIndex}`);

    if (isDebug) {
        return new Response(`
DEBUG CONTINUOUS MODE
-------------------------
Quality: ${forcedQuality || 'Auto'}
Type: ${streamType}
Target: ${targetUrl}

Preview (First 1000):
 ${output.join('\n').substring(0, 1000)}
        `, { headers: newHeaders });
    }

    return new Response(output.join('\n'), { headers: newHeaders });
  }

  // معالجة TS / KEY
  const newHeaders = new Headers();
  newHeaders.set('Content-Type', contentType);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  
  // ==========================================
  // إصلاح توقف البث (Fix Stopping)
  // كاش المقاطع: 5 ثواني. يسمح بعملية Seek (رجوع للخلف) وسلس،
  // لكن قصير جداً لضمان الحصول على مقطع جديد في البث المباشر
  // ==========================================
  newHeaders.set('Cache-Control', 'public, max-age=5');
  
  if (response.headers.get('Content-Range')) {
      newHeaders.set('Content-Range', response.headers.get('Content-Range'));
  }

  // **مهم:** لا نقوم بتعيين Content-Length يدوياً.
  // السكربت سيقوم بتدفق `response.body` تلقائياً، وهذا سيحافظ على الاستمرار الصحيحة.
  return new Response(response.body, { headers: newHeaders });
}

// ==========================================
// 5. دالة الاستخراج (Fresh Extract)
// ==========================================
async function extractStreamFromPage(pageUrl, isDebug) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://ok.ru/',
    'Accept': 'text/html'
  };

  const res = await fetch(pageUrl, { headers: headers });
  if (!res.ok) throw new Error(`Page Error (${res.status}).`);
  
  const html = await res.text();
  let foundLinks = [];

  const patterns = [
    /"(?:manifestUrl|hlsManifestUrl)":\s*"(https?:\\?\/\\?\/[^"]+)"/gi,
    /"url":\s*"(https?:\\?\/\\?\/(?:vd|vsd)\d+\.okcdn\.ru[^"]+\.m3u8[^"]*)"/gi,
    /(https?:\/\/[a-zA-Z0-9\-\.]+\.okcdn\.ru[^"'\s<>]+\.m3u8[^"'\s<>]*)/gi,
  ];

  for (const p of patterns) {
    const matches = [...html.matchAll(p)];
    if (matches) {
      matches.forEach(m => {
        if (m[1]) {
          let link = m[1];
          if (link.includes('\\')) link = link.replace(/\\(.)/g, '$1');
          if (link && !foundLinks.includes(link)) foundLinks.push(link);
        }
      });
    }
  }

  foundLinks = [...new Set(foundLinks)];

  if (isDebug) {
      throw new Error(`
DEBUG EXTRACTION (NO CACHE)
--------------------------
Found ${foundLinks.length} links.

 ${foundLinks.map((l, i) => `${i+1}. ${l}`).join('\n')}
      `);
  }

  foundLinks.sort((a, b) => {
    const aIsMaster = a.includes('manifest') || a.includes('master');
    const bIsMaster = b.includes('manifest') || b.includes('master');
    if (aIsMaster && !bIsMaster) return -1;
    if (!aIsMaster && bIsMaster) return 1;
    return b.length - a.length;
  });

  if (foundLinks.length === 0) throw new Error('No valid M3U8 link found.');
  return foundLinks;
}