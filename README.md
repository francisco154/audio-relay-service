# 🎙️ Audio Relay Service

Micro-servicio de relay para retransmitir streams de audio/radio que tienen problemas de timeout, protocolos antiguos o restricciones CORS.

## 🚀 Características

- **Streaming en tiempo real**: Usa pipe para transmitir datos sin almacenarlos en memoria
- **Soporte CORS**: Headers `Access-Control-Allow-Origin: *` incluidos
- **Conexión persistente**: Headers `Connection: keep-alive`
- **Detección automática de Content-Type**: Soporta `audio/mpeg`, `audio/aacp`, y más
- **Resiliente**: No se cae si el stream de origen falla
- **Soporte Icecast/Shoutcast**: Reenvía metadata ICY

## 📡 Uso

### Ruta de Relay

```
GET /relay?url=<audio-stream-url>
```

**Ejemplo:**
```
https://tu-servicio.onrender.com/relay?url=http://stream.fmdelsol.com:8179/stream
```

### Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `/` | Información del servicio |
| `/relay?url=` | Retransmite el stream de audio |
| `/health` | Health check para monitoreo |

## 🏗️ Despliegue en Render.com

### Opción 1: Desde GitHub (Recomendado)

1. **Fork o clona este repositorio** a tu cuenta de GitHub

2. **Ve a [Render.com](https://render.com)** e inicia sesión

3. **Crea un nuevo Web Service:**
   - Click en "New" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio `audio-relay-service`

4. **Configura el servicio:**
   - **Name:** `audio-relay-service` (o el que prefieras)
   - **Region:** Elige la más cercana a tus usuarios
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (o según necesidad)

5. **Click en "Create Web Service"**

6. **Espera el despliegue** (aproximadamente 1-2 minutos)

7. **Obtén tu URL:** `https://audio-relay-service-xxxx.onrender.com`

### Opción 2: Usando render.yaml

Crea un archivo `render.yaml` en la raíz:

```yaml
services:
  - type: web
    name: audio-relay-service
    env: node
    buildCommand: npm install
    startCommand: npm start
    plan: free
```

## 🔧 Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/audio-relay-service.git
cd audio-relay-service

# Instalar dependencias
npm install

# Iniciar servidor
npm start

# El servidor corre en http://localhost:3000
```

## 📋 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |

## ⚠️ Notas Importantes

- **Timeout en Render Free Tier**: Los servicios gratuitos tienen un timeout de 15 minutos de inactividad. El primer request puede tardar ~30 segundos en "despertar" el servicio.
- **Uso de ancho de banda**: El streaming consume ancho de banda. Monitorea el uso en Render.
- **Streams SSL**: Algunos streams HTTPS pueden tener problemas de certificados.

## 🛠️ Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **Axios** - Cliente HTTP con soporte de streaming
- **CORS** - Middleware de CORS

## 📄 Licencia

MIT
