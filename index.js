const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar CORS para todas las rutas
app.use(cors());

// Ruta principal - información del servicio
app.get('/', (req, res) => {
  res.json({
    service: 'Audio Relay Service',
    version: '1.0.0',
    description: 'Micro-servicio de relay para streams de audio/radio',
    usage: '/relay?url=<audio-stream-url>',
    example: '/relay?url=http://example.com:8000/stream'
  });
});

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

  try {
    // Decodificar la URL si viene codificada
    const decodedUrl = decodeURIComponent(url);

    console.log(`[Relay] Conectando a: ${decodedUrl}`);

    // Realizar petición al stream de origen con streaming activado
    const response = await axios({
      method: 'get',
      url: decodedUrl,
      responseType: 'stream',
      timeout: 30000, // Timeout de conexión
      headers: {
        'User-Agent': 'AudioRelayService/1.0',
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Icy-MetaData': '1' // Solicitar metadata de streams Icecast
      }
    });

    // Detectar el Content-Type del stream
    const contentType = response.headers['content-type'] || 'audio/mpeg';
    
    // Configurar headers de respuesta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Content-Type', contentType);
    
    // Reenviar headers relevantes del stream original
    if (response.headers['icy-name']) {
      res.setHeader('icy-name', response.headers['icy-name']);
    }
    if (response.headers['icy-genre']) {
      res.setHeader('icy-genre', response.headers['icy-genre']);
    }
    if (response.headers['icy-br']) {
      res.setHeader('icy-br', response.headers['icy-br']);
    }
    if (response.headers['icy-url']) {
      res.setHeader('icy-url', response.headers['icy-url']);
    }

    console.log(`[Relay] Stream iniciado: ${contentType}`);

    // Hacer pipe del stream de origen directamente a la respuesta
    response.data.pipe(res);

    // Manejar desconexión del cliente
    req.on('close', () => {
      console.log('[Relay] Cliente desconectado');
      response.data.destroy();
    });

    // Manejar errores del stream de origen durante la transmisión
    response.data.on('error', (err) => {
      console.error('[Relay] Error en stream de origen:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error en stream de origen' });
      }
    });

  } catch (error) {
    console.error('[Relay] Error:', error.message);
    
    // No enviar respuesta si ya se enviaron headers
    if (!res.headersSent) {
      if (error.code === 'ENOTFOUND') {
        res.status(502).json({ error: 'No se pudo resolver el host de origen' });
      } else if (error.code === 'ECONNREFUSED') {
        res.status(502).json({ error: 'Conexión rechazada por el servidor de origen' });
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        res.status(504).json({ error: 'Timeout conectando al servidor de origen' });
      } else {
        res.status(502).json({ error: 'Error conectando al stream de origen', details: error.message });
      }
    }
  }
});

// Health check para servicios de monitoreo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manejador de errores global
process.on('uncaughtException', (err) => {
  console.error('[Global] Error no capturado:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Global] Promesa rechazada:', reason);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎙️ Audio Relay Service corriendo en puerto ${PORT}`);
  console.log(`📡 Listo para retransmitir streams de audio`);
});
