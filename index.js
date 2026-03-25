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

// Ruta principal - información del servicio
app.get('/', (req, res) => {
  res.json({
    service: 'Audio Relay Service',
    version: '2.0.0',
    description: 'Micro-servicio de relay para streams de audio/radio',
    usage: '/relay?url=<audio-stream-url>',
    example: '/relay?url=http://example.com:8000/stream',
    features: ['chunked streaming', 'keep-alive', 'CORS enabled']
  });
});

// Función para hacer el request de streaming usando http/https nativo
function createStreamRequest(streamUrl, onResponse, onError) {
  const parsedUrl = new URL(streamUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const lib = isHttps ? https : http;

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {
      'User-Agent': CHROME_USER_AGENT,
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      'Connection': 'keep-alive',
      'Icy-MetaData': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    timeout: 30000,
    // Keep-alive settings
    agent: new lib.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 100,
      maxFreeSockets: 10
    })
  };

  const req = lib.request(options, onResponse);
  
  req.on('error', onError);
  
  req.on('timeout', () => {
    console.error('[Stream] Timeout en request');
    req.destroy();
  });

  req.end();
  
  return req;
}

// Ruta de relay para streams de audio
app.get('/relay', async (req, res) => {
  const { url } = req.query;

  // Validar que se proporcionó una URL
  if (!url) {
    return res.status(400).json({
      error: 'URL requerida',
      usage: '/relay?url=<audio-stream-url>'
    });
  }

  let upstreamReq = null;
  let upstreamRes = null;
  let clientDisconnected = false;

  // Manejar desconexión del cliente
  req.on('close', () => {
    console.log('[Relay] Cliente desconectado');
    clientDisconnected = true;
    if (upstreamReq) {
      upstreamReq.destroy();
    }
  });

  req.on('error', (err) => {
    console.error('[Relay] Error en request del cliente:', err.message);
    clientDisconnected = true;
  });

  try {
    // Decodificar la URL si viene codificada
    const decodedUrl = decodeURIComponent(url);
    console.log(`[Relay] Conectando a: ${decodedUrl}`);

    upstreamReq = createStreamRequest(
      decodedUrl,
      (proxyRes) => {
        if (clientDisconnected) {
          proxyRes.destroy();
          return;
        }

        upstreamRes = proxyRes;
        
        // Detectar el Content-Type del stream
        const contentType = proxyRes.headers['content-type'] || 'audio/mpeg';
        
        console.log(`[Relay] Stream conectado - Status: ${proxyRes.statusCode}, Content-Type: ${contentType}`);

        // Verificar status OK
        if (proxyRes.statusCode !== 200) {
          if (!res.headersSent) {
            res.status(proxyRes.statusCode).json({ 
              error: 'Error del servidor de origen',
              status: proxyRes.statusCode 
            });
          }
          return;
        }

        // Configurar headers de respuesta CRÍTICOS para streaming real
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Type', contentType);
        
        // CRITICAL: Desactivar cache completamente
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Reenviar headers ICY del stream original
        const icyHeaders = ['icy-name', 'icy-genre', 'icy-br', 'icy-url', 'icy-metaint', 'icy-pub'];
        icyHeaders.forEach(header => {
          if (proxyRes.headers[header]) {
            res.setHeader(header, proxyRes.headers[header]);
          }
        });

        console.log(`[Relay] Iniciando pipe del stream`);

        // Pipe directo sin buffering
        proxyRes.pipe(res);

        // Manejar eventos del stream
        proxyRes.on('error', (err) => {
          console.error('[Relay] Error en upstream:', err.message);
          if (!res.headersSent) {
            res.status(502).json({ error: 'Error en stream de origen' });
          }
        });

        proxyRes.on('end', () => {
          console.log('[Relay] Stream finalizado por origen');
        });

        proxyRes.on('close', () => {
          console.log('[Relay] Conexión cerrada por origen');
        });
      },
      (err) => {
        console.error('[Relay] Error conectando:', err.message);
        if (!res.headersSent && !clientDisconnected) {
          if (err.code === 'ENOTFOUND') {
            res.status(502).json({ error: 'No se pudo resolver el host de origen' });
          } else if (err.code === 'ECONNREFUSED') {
            res.status(502).json({ error: 'Conexión rechazada por el servidor de origen' });
          } else if (err.code === 'ETIMEDOUT') {
            res.status(504).json({ error: 'Timeout conectando al servidor de origen' });
          } else {
            res.status(502).json({ error: 'Error conectando al stream de origen', details: err.message });
          }
        }
      }
    );

  } catch (error) {
    console.error('[Relay] Error general:', error.message);
    if (!res.headersSent && !clientDisconnected) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

// Health check para servicios de monitoreo
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manejador de errores global - el servidor NUNCA debe caerse
process.on('uncaughtException', (err) => {
  console.error('[Global] Error no capturado:', err.message);
  // No hacer process.exit() - mantener el servidor vivo
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global] Promesa rechazada:', reason);
  // No hacer process.exit() - mantener el servidor vivo
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🎙️ Audio Relay Service corriendo en puerto ${PORT}`);
  console.log(`📡 Listo para retransmitir streams de audio`);
  console.log(`🔧 Version 2.0.0 - Streaming con http nativo`);
});

// Configurar timeouts del servidor
server.keepAliveTimeout = 65000; // Más tiempo que el load balancer
server.headersTimeout = 66000; // Un poco más que keepAliveTimeout
