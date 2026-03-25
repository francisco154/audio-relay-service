const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const { URL } = require('url');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS amplio
app.use(cors({ origin: '*', methods: ['GET', 'HEAD', 'OPTIONS'] }));

// Streams de prueba
const STABLE_STREAMS = {
  'groovesalad': { name: 'Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3', genre: 'Ambient' },
  'dronezone': { name: 'Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3', genre: 'Ambient' },
  'secretagent': { name: 'Secret Agent', url: 'https://ice1.somafm.com/secretagent-128-mp3', genre: 'Soundtracks' },
  'fmdelsol': { name: 'FM Del Sol 104.3', url: 'http://streaming2.locucionar.com:8179/stream', genre: 'Various' }
};

// ============================================
// RUTAS DE INFORMACIÓN
// ============================================

app.get('/', (req, res) => {
  res.json({
    service: 'Audio Relay Service',
    version: '5.0.0',
    description: 'Relay optimizado para streams de bajo bitrate - Buffer constante 128kbps',
    features: [
      'Buffer inteligente para streams lentos',
      'Flush constante cada 100ms',
      'HTTP/1.0 legacy support',
      'Keep-alive extendido',
      'Sin dependencia de FFmpeg'
    ],
    usage: '/relay?url=<audio-stream-url>',
    testStreams: STABLE_STREAMS
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '5.0.0', uptime: Math.floor(process.uptime()) + 's' });
});

// ============================================
// FUNCIÓN PRINCIPAL DE RELAY v5.0
// ============================================

function createRelay(streamUrl, req, res) {
  let activeConnection = null;
  let clientGone = false;
  let bytesSent = 0;
  let flushInterval = null;
  let buffer = [];
  let totalBuffered = 0;

  const log = (msg) => console.log(`[${new Date().toISOString().substr(11, 12)}] ${msg}`);

  const cleanup = () => {
    if (flushInterval) {
      clearInterval(flushInterval);
      flushInterval = null;
    }
    if (activeConnection) {
      try { activeConnection.destroy(); } catch (e) {}
      activeConnection = null;
    }
  };

  // Cliente se desconecta
  req.on('close', () => {
    log('Cliente desconectado');
    clientGone = true;
    cleanup();
  });

  req.on('error', (err) => {
    log(`Error cliente: ${err.message}`);
    clientGone = true;
    cleanup();
  });

  // Función para flush constante del buffer
  const flushBuffer = () => {
    if (clientGone || res.writableEnded) return;
    
    if (buffer.length > 0) {
      const chunk = Buffer.concat(buffer);
      buffer = [];
      totalBuffered = 0;
      
      try {
        res.write(chunk);
        bytesSent += chunk.length;
      } catch (e) {
        log(`Error escribiendo: ${e.message}`);
        cleanup();
      }
    }
  };

  try {
    const decodedUrl = decodeURIComponent(streamUrl);
    const parsedUrl = new URL(decodedUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const port = parsedUrl.port || (isHttps ? 443 : 80);
    const hostname = parsedUrl.hostname;
    const path = parsedUrl.pathname + parsedUrl.search || '/';

    log(`Conectando a: ${hostname}:${port}${path}`);

    // Headers optimizados para Icecast/Shoutcast legacy
    const requestHeaders = {
      'Host': `${hostname}:${port}`,
      'User-Agent': 'Winamp/5.9',
      'Accept': 'audio/*,*/*',
      'Icy-MetaData': '1',
      'Connection': 'close',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    };

    if (isHttps) {
      // HTTPS request
      const options = {
        hostname,
        port,
        path,
        method: 'GET',
        headers: requestHeaders,
        agent: false,
        timeout: 30000
      };

      activeConnection = https.request(options, (proxyRes) => {
        log(`HTTPS Status: ${proxyRes.statusCode}`);

        if (proxyRes.statusCode !== 200) {
          if (!res.headersSent) {
            res.status(proxyRes.statusCode).json({ error: `HTTP ${proxyRes.statusCode}` });
          }
          cleanup();
          return;
        }

        setupResponse(proxyRes.headers);

        // IMPORTANTE: Flush cada 100ms para mantener flujo constante
        // Esto simula un bitrate más alto enviando datos frecuentemente
        flushInterval = setInterval(flushBuffer, 100);

        proxyRes.on('data', (chunk) => {
          if (clientGone) return;
          buffer.push(chunk);
          totalBuffered += chunk.length;
          
          // Flush inmediato si tenemos suficiente data
          if (totalBuffered >= 8192) {
            flushBuffer();
          }
        });

        proxyRes.on('end', () => {
          log(`Stream terminado. Total: ${(bytesSent / 1024).toFixed(1)} KB`);
          flushBuffer();
          if (!res.writableEnded) res.end();
          cleanup();
        });

        proxyRes.on('error', (err) => {
          log(`Error proxy: ${err.message}`);
          flushBuffer();
          cleanup();
        });
      });

      activeConnection.on('error', (err) => {
        log(`Error conexión: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: err.message });
        }
        cleanup();
      });

      activeConnection.setTimeout(30000, () => {
        log('Timeout conexión');
        activeConnection.destroy();
        cleanup();
      });

      activeConnection.end();

    } else {
      // HTTP directo con socket TCP (para máximo control)
      activeConnection = net.connect({ host: hostname, port }, () => {
        log('Socket conectado');

        const request = [
          `GET ${path} HTTP/1.0`,
          `Host: ${hostname}:${port}`,
          'User-Agent: Winamp/5.9',
          'Accept: audio/*,*/*',
          'Icy-MetaData: 1',
          'Connection: close',
          'Pragma: no-cache',
          '',
          ''
        ].join('\r\n');

        activeConnection.write(request);
      });

      let headersDone = false;
      let headersBuffer = Buffer.alloc(0);
      let responseHeaders = {};

      activeConnection.on('data', (chunk) => {
        if (clientGone) return;

        if (!headersDone) {
          headersBuffer = Buffer.concat([headersBuffer, chunk]);
          const headerEnd = headersBuffer.indexOf('\r\n\r\n');

          if (headerEnd !== -1) {
            headersDone = true;
            const headerPart = headersBuffer.slice(0, headerEnd).toString();
            const bodyPart = headersBuffer.slice(headerEnd + 4);

            // Parse status
            const firstLine = headerPart.split('\r\n')[0];
            const match = firstLine.match(/HTTP\/\d\.\d (\d+)/);
            const statusCode = match ? parseInt(match[1]) : 0;

            log(`HTTP Status: ${statusCode}`);

            // Parse headers
            headerPart.split('\r\n').slice(1).forEach(line => {
              const colonIdx = line.indexOf(':');
              if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).toLowerCase().trim();
                const value = line.slice(colonIdx + 1).trim();
                responseHeaders[key] = value;
              }
            });

            if (statusCode !== 200) {
              if (!res.headersSent) {
                res.status(statusCode).json({ error: `HTTP ${statusCode}` });
              }
              cleanup();
              return;
            }

            setupResponse(responseHeaders);

            // Flush cada 100ms
            flushInterval = setInterval(flushBuffer, 100);

            // Enviar primer chunk del body
            if (bodyPart.length > 0) {
              buffer.push(bodyPart);
              totalBuffered += bodyPart.length;
            }
          }
        } else {
          // Headers ya procesados, agregar al buffer
          buffer.push(chunk);
          totalBuffered += chunk.length;

          // Flush inmediato si tenemos suficiente data
          if (totalBuffered >= 8192) {
            flushBuffer();
          }
        }
      });

      activeConnection.on('close', () => {
        log(`Socket cerrado. Total: ${(bytesSent / 1024).toFixed(1)} KB`);
        flushBuffer();
        if (!res.writableEnded && !clientGone) {
          res.end();
        }
        cleanup();
      });

      activeConnection.on('error', (err) => {
        log(`Error socket: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: err.message });
        }
        cleanup();
      });

      activeConnection.setTimeout(60000, () => {
        log('Socket timeout');
        activeConnection.destroy();
        cleanup();
      });
    }

    // Función para configurar respuesta
    function setupResponse(headers) {
      if (res.headersSent) return;

      const contentType = headers['content-type'] || 'audio/mpeg';
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Headers ICY
      ['icy-name', 'icy-genre', 'icy-br', 'icy-url', 'icy-description', 'icy-pub'].forEach(h => {
        if (headers[h]) res.setHeader(h, headers[h]);
      });

      log(`Headers enviados - Content-Type: ${contentType}`);
    }

  } catch (error) {
    log(`Error: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
    cleanup();
  }
}

// ============================================
// RUTAS DE RELAY
// ============================================

Object.keys(STABLE_STREAMS).forEach(key => {
  app.get(`/test/${key}`, (req, res) => {
    const stream = STABLE_STREAMS[key];
    console.log(`\n=== /test/${key} -> ${stream.name} ===`);
    createRelay(stream.url, req, res);
  });
});

app.get('/relay', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'URL requerida',
      usage: '/relay?url=<audio-stream-url>',
      testEndpoints: Object.keys(STABLE_STREAMS).map(k => `/test/${k}`)
    });
  }

  console.log(`\n=== /relay -> ${url.substring(0, 60)}... ===`);
  createRelay(url, req, res);
});

// ============================================
// ERRORES GLOBALES
// ============================================

process.on('uncaughtException', (err) => console.error('[GLOBAL]', err.message));
process.on('unhandledRejection', (reason) => console.error('[GLOBAL]', reason));

// ============================================
// INICIAR SERVIDOR
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🎙️  Audio Relay Service v5.0.0              ║');
  console.log('║   📡 Buffer constante 100ms flush             ║');
  console.log('║   🔧 Sin FFmpeg - Puro Node.js                ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`Puerto: ${PORT}`);
});

// Timeouts muy extendidos
server.keepAliveTimeout = 600000;   // 10 min
server.headersTimeout = 601000;
server.timeout = 900000;            // 15 min
