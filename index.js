const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para todas las rutas
app.use(cors());

// User-Agent de Chrome para evitar bloqueos
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Configuración de agentes HTTP/HTTPS para conexiones persistentes
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 0 // Sin timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 0, // Sin timeout
  rejectUnauthorized: false // Aceptar certificados auto-firmados
});

// Ruta principal - información del servicio
app.get('/', (req, res) => {
  res.json({
    service: 'Audio Relay Service',
    version: '2.0.0',
    description: 'Micro-servicio de relay para streams de audio/radio',
    usage: '/relay?url=<audio-stream-url>',
    example: '/relay?url=http://example.com:8000/stream',
    features: ['chunked streaming', 'keep-alive', 'auto-reconnect']
  });
});

// Ruta de relay para streams de audio
app.get('/relay', async (req, res) => {
  const { url: streamUrl } = req.query;

  // Validar que se proporcionó una URL
  if (!streamUrl) {
    return res.status(400).json({
      error: 'URL requerida',
      usage: '/relay?url=<audio-stream-url>'
    });
  }

  let clientClosed = false;
  let originRequest = null;

  // Manejar desconexión del cliente
  req.on('close', () => {
    console.log('[Relay] Cliente desconectado');
    clientClosed = true;
    if (originRequest) {
      originRequest.destroy();
    }
  });

  req.on('aborted', () => {
    console.log('[Relay] Request abortado');
    clientClosed = true;
    if (originRequest) {
      originRequest.destroy();
    }
  });

  // También manejar cuando res se cierra
  res.on('close', () => {
    console.log('[Relay] Response cerrado');
    clientClosed = true;
    if (originRequest) {
      originRequest.destroy();
    }
  });

  try {
    // Decodificar y parsear la URL
    const decodedUrl = decodeURIComponent(streamUrl);
    const parsedUrl = new URL(decodedUrl);
    
    console.log(`[Relay] Conectando a: ${decodedUrl}`);

    // Seleccionar el módulo y agente correcto según el protocolo
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    // Preparar opciones de la petición
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      agent: agent,
      headers: {
        'User-Agent': CHROME_USER_AGENT,
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Icy-MetaData': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    // Realizar petición al stream de origen
    originRequest = requestModule.request(options, (originResponse) => {
      // Verificar si el cliente aún está conectado
      if (clientClosed) {
        console.log('[Relay] Cliente ya desconectado, cerrando origen');
        originResponse.destroy();
        return;
      }

      const statusCode = originResponse.statusCode;
      
      // Manejar redirecciones
      if (statusCode >= 300 && statusCode < 400 && originResponse.headers.location) {
        console.log(`[Relay] Redirección a: ${originResponse.headers.location}`);
        originResponse.destroy();
        // Recursión con la nueva URL
        req.query.url = encodeURIComponent(originResponse.headers.location);
        return app.handle(req, res, () => {});
      }

      if (statusCode !== 200) {
        console.log(`[Relay] Error de origen: ${statusCode}`);
        if (!res.headersSent) {
          res.status(statusCode).json({ error: `Error del servidor de origen: ${statusCode}` });
        }
        return;
      }

      // Detectar el Content-Type del stream
      const contentType = originResponse.headers['content-type'] || 'audio/mpeg';
      
      console.log(`[Relay] Stream conectado: ${contentType}`);

      // Configurar headers de respuesta CRÍTICOS para streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Accel-Buffering', 'no'); // Desactivar buffering en nginx/proxies
      
      // Reenviar headers ICY del stream original
      const icyHeaders = ['icy-name', 'icy-genre', 'icy-br', 'icy-url', 'icy-metaint', 'icy-pub'];
      icyHeaders.forEach(header => {
        if (originResponse.headers[header]) {
          res.setHeader(header, originResponse.headers[header]);
        }
      });

      // Pipe directo del stream de origen a la respuesta
      originResponse.pipe(res);

      // Manejar eventos del stream de origen
      originResponse.on('error', (err) => {
        console.error('[Relay] Error en stream de origen:', err.message);
        if (!res.finished) {
          res.end();
        }
      });

      originResponse.on('end', () => {
        console.log('[Relay] Stream de origen terminado');
      });

      // Log de progreso cada 30 segundos
      let bytesTransferred = 0;
      let lastLog = Date.now();
      
      originResponse.on('data', (chunk) => {
        bytesTransferred += chunk.length;
        const now = Date.now();
        if (now - lastLog >= 30000) {
          const mb = (bytesTransferred / 1024 / 1024).toFixed(2);
          console.log(`[Relay] Transferido: ${mb} MB`);
          lastLog = now;
        }
      });
    });

    // Manejar errores de conexión
    originRequest.on('error', (err) => {
      console.error('[Relay] Error de conexión:', err.message);
      if (!res.headersSent && !clientClosed) {
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
    });

    // Sin timeout en la petición - critical para streaming infinito
    originRequest.setTimeout(0);
    
    // Enviar petición
    originRequest.end();

  } catch (error) {
    console.error('[Relay] Error:', error.message);
    if (!res.headersSent && !clientClosed) {
      res.status(500).json({ error: 'Error procesando la petición', details: error.message });
    }
  }
});

// Health check para servicios de monitoreo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejadores de errores global - el servidor NUNCA debe caerse
process.on('uncaughtException', (err) => {
  console.error('[Global] Error no capturado:', err.message);
  // No hacer process.exit()
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global] Promesa rechazada:', reason);
  // No hacer process.exit()
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎙️ Audio Relay Service v2.0.0 corriendo en puerto ${PORT}`);
  console.log(`📡 Listo para retransmitir streams de audio`);
  console.log(`🔧 Usando módulos nativos HTTP/HTTPS con keep-alive`);
});

// Configurar timeouts del servidor HTTP
server.timeout = 0; // Sin timeout
server.keepAliveTimeout = 65000; // Keep-alive por 65 segundos
server.headersTimeout = 66000; // Headers timeout ligeramente mayor
