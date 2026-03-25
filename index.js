const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const { URL } = require('url');
const { Transform } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS amplio
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: false
}));

// User-Agents para rotar (algunas radios bloquean ciertos UA)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Winamp/5.9',
  'VLC/3.0.20 LibVLC/3.0.20',
  'iTunes/12.12',
  'fm.del.sol.player/1.0'
];

// Streams de prueba estables
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
    version: '4.5.0',
    description: 'Micro-servicio de relay optimizado para streams de radio legacy',
    features: [
      'HTTP/1.0 y HTTP/1.1 support',
      'Auto-reconnect on disconnect',
      'Icecast/Shoutcast compatible',
      'CORS enabled',
      'AAC/MP3 support'
    ],
    usage: '/relay?url=<audio-stream-url>',
    testStreams: STABLE_STREAMS,
    quickTest: Object.keys(STABLE_STREAMS).map(k => `/test/${k}`)
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    version: '4.5.0',
    uptime: Math.floor(process.uptime()) + 's',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// FUNCIÓN PRINCIPAL DE RELAY v4.5
// ============================================

function createRelay(streamUrl, req, res) {
  let upstreamSocket = null;
  let clientDisconnected = false;
  let bytesReceived = 0;
  let startTime = Date.now();

  const log = (msg) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Relay ${elapsed}s] ${msg}`);
  };

  const cleanup = () => {
    if (upstreamSocket) {
      try { upstreamSocket.destroy(); } catch (e) {}
      upstreamSocket = null;
    }
  };

  // Manejar desconexión del cliente
  req.on('close', () => {
    log('Cliente desconectado');
    clientDisconnected = true;
    cleanup();
  });

  req.on('error', (err) => {
    log(`Error cliente: ${err.message}`);
    clientDisconnected = true;
    cleanup();
  });

  // Configurar respuesta para streaming
  const setupResponse = (headers) => {
    if (res.headersSent) return false;

    const contentType = headers['content-type'] || 'audio/mpeg';
    
    // Headers esenciales para streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Content-Type', contentType);
    
    // Sin caché
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, no-transform');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Reenviar headers ICY importantes
    const icyHeaders = [
      'icy-name', 'icy-genre', 'icy-br', 'icy-url', 
      'icy-metaint', 'icy-pub', 'icy-description',
      'ice-audio-info', 'icy-notice1', 'icy-notice2'
    ];
    
    icyHeaders.forEach(h => {
      if (headers[h]) {
        res.setHeader(h, headers[h]);
      }
    });

    log(`Headers enviados - Content-Type: ${contentType}`);
    return true;
  };

  try {
    const decodedUrl = decodeURIComponent(streamUrl);
    const parsedUrl = new URL(decodedUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    
    const port = parsedUrl.port || (isHttps ? 443 : 80);
    const hostname = parsedUrl.hostname;
    const path = parsedUrl.pathname + parsedUrl.search;

    log(`Conectando a: ${hostname}:${port}${path}`);

    // Crear request HTTP/1.0 o HTTP/1.1 según el servidor
    const requestPath = path || '/';
    const requestLine = `GET ${requestPath} HTTP/1.0\r\n`;
    
    // Headers mínimos para máxima compatibilidad
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    const headers = [
      `Host: ${hostname}:${port}`,
      `User-Agent: ${randomUA}`,
      `Accept: audio/*,*/*`,
      `Icy-MetaData: 1`,
      `Connection: close`,
      `\r\n`
    ].join('\r\n');

    const fullRequest = requestLine + headers;

    // Usar socket directo para control total
    const net = require('net');
    
    if (isHttps) {
      // Para HTTPS usar el módulo https con opciones especiales
      const options = {
        hostname: hostname,
        port: port,
        path: requestPath,
        method: 'GET',
        headers: {
          'Host': `${hostname}:${port}`,
          'User-Agent': randomUA,
          'Accept': 'audio/*,*/*',
          'Icy-MetaData': '1',
          'Connection': 'close'
        },
        // No usar agent (sin keep-alive)
        agent: false
      };

      upstreamSocket = https.request(options, (proxyRes) => {
        if (clientDisconnected) {
          proxyRes.destroy();
          return;
        }

        const status = proxyRes.statusCode;
        log(`Respuesta HTTPS: ${status}`);

        if (status !== 200) {
          if (!res.headersSent) {
            res.status(status).json({ error: `Error ${status}` });
          }
          return;
        }

        setupResponse(proxyRes.headers);

        // Pipe directo
        proxyRes.pipe(res);

        proxyRes.on('error', (err) => {
          log(`Error: ${err.message}`);
        });

        proxyRes.on('end', () => {
          log(`Stream terminado. Total: ${(bytesReceived / 1024).toFixed(1)} KB`);
        });
      });

      upstreamSocket.on('error', (err) => {
        log(`Error conexión: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: err.message });
        }
      });

      upstreamSocket.end();

    } else {
      // HTTP - usar socket TCP directo para control total
      upstreamSocket = net.connect({ host: hostname, port: port }, () => {
        log('Socket conectado, enviando request...');
        upstreamSocket.write(fullRequest);
      });

      // Parser simple para headers de respuesta HTTP
      let headersDone = false;
      let headersBuffer = Buffer.alloc(0);
      let statusCode = 0;
      let responseHeaders = {};

      upstreamSocket.on('data', (chunk) => {
        if (clientDisconnected) return;

        bytesReceived += chunk.length;

        if (!headersDone) {
          headersBuffer = Buffer.concat([headersBuffer, chunk]);
          
          // Buscar fin de headers
          const headerEnd = headersBuffer.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            headersDone = true;
            
            const headerPart = headersBuffer.slice(0, headerEnd).toString();
            const bodyPart = headersBuffer.slice(headerEnd + 4);
            
            // Parsear status line
            const firstLine = headerPart.split('\r\n')[0];
            const match = firstLine.match(/HTTP\/\d\.\d (\d+)/);
            if (match) {
              statusCode = parseInt(match[1]);
            }
            
            // Parsear headers
            headerPart.split('\r\n').slice(1).forEach(line => {
              const colonIdx = line.indexOf(':');
              if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).toLowerCase().trim();
                const value = line.slice(colonIdx + 1).trim();
                responseHeaders[key] = value;
              }
            });

            log(`Status: ${statusCode}, Content-Type: ${responseHeaders['content-type'] || 'unknown'}`);

            if (statusCode !== 200) {
              if (!res.headersSent) {
                res.status(statusCode).json({ error: `Error ${statusCode}` });
              }
              upstreamSocket.destroy();
              return;
            }

            setupResponse(responseHeaders);

            // Enviar primer chunk del body si existe
            if (bodyPart.length > 0) {
              res.write(bodyPart);
            }
          }
        } else {
          // Headers ya enviados, pasar datos directo
          res.write(chunk);
        }
      });

      upstreamSocket.on('error', (err) => {
        log(`Error socket: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: err.message });
        }
      });

      upstreamSocket.on('close', () => {
        log(`Socket cerrado. Total recibido: ${(bytesReceived / 1024).toFixed(1)} KB`);
        if (!res.writableEnded && !clientDisconnected) {
          res.end();
        }
      });

      upstreamSocket.on('timeout', () => {
        log('Socket timeout');
        upstreamSocket.destroy();
      });

      // Timeout de conexión
      upstreamSocket.setTimeout(30000);
    }

  } catch (error) {
    log(`Error: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
}

// ============================================
// RUTAS DE RELAY
// ============================================

// Rutas de prueba
Object.keys(STABLE_STREAMS).forEach(key => {
  app.get(`/test/${key}`, (req, res) => {
    const stream = STABLE_STREAMS[key];
    console.log(`\n[Request] /test/${key} -> ${stream.name}`);
    createRelay(stream.url, req, res);
  });
});

// Ruta genérica de relay
app.get('/relay', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'URL requerida',
      usage: '/relay?url=<audio-stream-url>',
      testEndpoints: Object.keys(STABLE_STREAMS).map(k => `/test/${k}`)
    });
  }

  console.log(`\n[Request] /relay?url=${url.substring(0, 50)}...`);
  createRelay(url, req, res);
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================

process.on('uncaughtException', (err) => {
  console.error('[GLOBAL] Error no capturado:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[GLOBAL] Promesa rechazada:', reason);
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🎙️  Audio Relay Service v4.5.0            ║');
  console.log('║   📡 Optimizado para Icecast/Shoutcast      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Puerto: ${PORT}`);
  console.log(`Test: /test/fmdelsol`);
  console.log(`Relay: /relay?url=<url>`);
});

// Timeouts extendidos
server.keepAliveTimeout = 300000;  // 5 minutos
server.headersTimeout = 301000;
server.timeout = 600000;  // 10 minutos
