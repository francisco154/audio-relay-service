const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para todas las rutas
app.use(cors());

// User-Agent de Chrome para evitar bloqueos
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ============================================
// STREAMS DE PRUEBA ESTABLES (SomaFM - GRATIS)
// ============================================
const STABLE_STREAMS = {
  'groovesalad': {
    name: 'Groove Salad',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    genre: 'Ambient Chill',
    description: 'Ambient beats and grooves'
  },
  'dronezone': {
    name: 'Drone Zone',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
    genre: 'Ambient',
    description: 'Deep atmospheric drones'
  },
  'secretagent': {
    name: 'Secret Agent',
    url: 'https://ice1.somafm.com/secretagent-128-mp3',
    genre: 'Soundtracks',
    description: 'Spy movie soundtracks'
  },
  'indiepop': {
    name: 'Indie Pop Rocks',
    url: 'https://ice1.somafm.com/indiepop-128-mp3',
    genre: 'Indie Pop',
    description: 'Independent pop music'
  },
  'defcon': {
    name: 'DEF CON Radio',
    url: 'https://ice1.somafm.com/defcon-128-mp3',
    genre: 'Electronic',
    description: 'Music from DEF CON'
  }
};

// Ruta principal - información del servicio con streams de prueba
app.get('/', (req, res) => {
  res.json({
    service: 'Audio Relay Service',
    version: '3.0.0',
    description: 'Micro-servicio de relay para streams de audio/radio',
    usage: '/relay?url=<audio-stream-url>',
    example: '/relay?url=http://example.com:8000/stream',
    testStreams: STABLE_STREAMS,
    quickTest: [
      '/test/groovesalad',
      '/test/dronezone', 
      '/test/secretagent'
    ]
  });
});

// Rutas de prueba rápida con streams estables
Object.keys(STABLE_STREAMS).forEach(key => {
  app.get(`/test/${key}`, (req, res) => {
    const stream = STABLE_STREAMS[key];
    relayStream(stream.url, req, res);
  });
});

// Función principal de relay mejorada
function relayStream(streamUrl, req, res) {
  let upstreamReq = null;
  let upstreamRes = null;
  let clientDisconnected = false;
  let bytesSent = 0;

  // Manejar desconexión del cliente
  const onClientClose = () => {
    console.log('[Relay] Cliente desconectado');
    clientDisconnected = true;
    cleanup();
  };

  const cleanup = () => {
    if (upstreamReq) {
      try { upstreamReq.destroy(); } catch (e) {}
      upstreamReq = null;
    }
    if (upstreamRes) {
      try { upstreamRes.destroy(); } catch (e) {}
      upstreamRes = null;
    }
  };

  req.on('close', onClientClose);
  req.on('error', (err) => {
    console.error('[Relay] Error cliente:', err.message);
    clientDisconnected = true;
    cleanup();
  });

  try {
    const decodedUrl = decodeURIComponent(streamUrl);
    console.log(`[Relay] Conectando a: ${decodedUrl}`);

    const parsedUrl = new URL(decodedUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': CHROME_USER_AGENT,
        'Accept': 'audio/*,*/*',
        'Accept-Encoding': 'identity',
        'Connection': 'close', // IMPORTANTE: no keep-alive para streams
        'Icy-MetaData': '1'
      },
      timeout: 30000
      // SIN agent keep-alive - permite que cada conexión sea independiente
    };

    upstreamReq = lib.request(options, (proxyRes) => {
      if (clientDisconnected) {
        proxyRes.destroy();
        return;
      }

      upstreamRes = proxyRes;

      const contentType = proxyRes.headers['content-type'] || 'audio/mpeg';
      console.log(`[Relay] Status: ${proxyRes.statusCode}, Content-Type: ${contentType}`);

      if (proxyRes.statusCode !== 200) {
        if (!res.headersSent) {
          res.status(proxyRes.statusCode).json({ 
            error: 'Error del servidor de origen',
            status: proxyRes.statusCode 
          });
        }
        return;
      }

      // Headers de respuesta
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Reenviar headers ICY
      const icyHeaders = ['icy-name', 'icy-genre', 'icy-br', 'icy-url', 'icy-metaint', 'icy-pub', 'icy-notice1', 'icy-notice2'];
      icyHeaders.forEach(header => {
        if (proxyRes.headers[header]) {
          res.setHeader(header, proxyRes.headers[header]);
        }
      });

      console.log(`[Relay] Iniciando stream...`);

      // Pipe con monitoreo
      proxyRes.on('data', (chunk) => {
        bytesSent += chunk.length;
      });

      proxyRes.pipe(res);

      proxyRes.on('error', (err) => {
        console.error('[Relay] Error upstream:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Error en stream de origen' });
        }
      });

      proxyRes.on('end', () => {
        console.log(`[Relay] Stream terminado. Total: ${(bytesSent / 1024).toFixed(1)} KB`);
      });

      proxyRes.on('close', () => {
        console.log('[Relay] Conexión cerrada por origen');
        if (!res.writableEnded && !clientDisconnected) {
          res.end();
        }
      });
    });

    upstreamReq.on('error', (err) => {
      console.error('[Relay] Error conectando:', err.message);
      if (!res.headersSent && !clientDisconnected) {
        const errorMsg = err.code === 'ENOTFOUND' ? 'Host no encontrado' :
                        err.code === 'ECONNREFUSED' ? 'Conexión rechazada' :
                        err.code === 'ETIMEDOUT' ? 'Timeout' : err.message;
        res.status(502).json({ error: errorMsg });
      }
    });

    upstreamReq.on('timeout', () => {
      console.error('[Relay] Timeout');
      upstreamReq.destroy();
    });

    upstreamReq.end();

  } catch (error) {
    console.error('[Relay] Error:', error.message);
    if (!res.headersSent && !clientDisconnected) {
      res.status(500).json({ error: 'Error interno' });
    }
  }
}

// Ruta de relay genérica
app.get('/relay', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'URL requerida',
      usage: '/relay?url=<audio-stream-url>',
      quickTest: '/test/groovesalad'
    });
  }

  relayStream(url, req, res);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// Manejadores de errores globales
process.on('uncaughtException', (err) => {
  console.error('[Global] Error no capturado:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Global] Promesa rechazada:', reason);
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎙️ Audio Relay Service v3.0.0 en puerto ${PORT}`);
  console.log(`📡 Streams de prueba: /test/groovesalad, /test/dronezone, /test/secretagent`);
});

// Timeouts extendidos
server.keepAliveTimeout = 120000;
server.headersTimeout = 121000;
