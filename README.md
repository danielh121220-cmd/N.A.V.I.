# N.A.V.I · NFC Attendance & Verification Intelligence 🥀

Pase de lista con tarjetas NFC, avisos automáticos a los representantes y verificación del docente **por excepción**: el profesor solo mira el salón y toca a quien no está.

## Probarlo ya (Windows)

1. Instala **Node.js LTS** si no lo tienes: https://nodejs.org/es
2. Elige cómo abrirlo:
   - **`INICIAR_NAVI.bat`**: el sistema real del colegio. Empieza vacío: la primera cuenta que crees es la del administrador, y la app te guía con **Primeros pasos** (curso, estudiantes, lector y tarjetas).
   - **`INICIAR_NAVI_DEMO.bat`**: la demostración, con estudiantes de ejemplo, la cuenta demo y el simulador del lector. Usa su propia base de datos (`backend/data-demo`), así que nunca se mezcla con la real.
3. La primera vez instala lo necesario y abre el navegador en `http://localhost:3000`.

En la app de Android, escribe **12122008** en el campo del servidor y toca **Conectar**: se abre la demostración completa dentro del celular, sin servidor.

Para instalarla como app en la PC o en el celular, lee [`docs/INSTALAR_APP.md`](docs/INSTALAR_APP.md).

## Qué hace

| Parte | Qué hace |
| --- | --- |
| Lector (ESP32 + PN532 + OLED) | Lee la tarjeta, avisa a la cámara y muestra el resultado en ~1 segundo. Si se cae el WiFi guarda los registros con su hora y los envía después. |
| Cámara (ESP32-CAM) | Toma una foto en el momento del toque. Si la foto sale negra (cámara tapada) el registro queda para revisión. |
| Servidor (Node.js + SQLite) | Clasifica puntual / atraso, marca ausentes al pasar el límite, detecta señales raras y avisa a los representantes. |
| Ficha médica de emergencia | Alergias, condiciones, medicamentos y contactos. Cualquier persona que acerque su celular a la tarjeta del estudiante ve qué hacer; el colegio y el representante reciben un aviso. |
| App web instalable | Diseño estilo iOS (claro y oscuro), panel en vivo con anillos tipo Apple Fitness, pase de lista por excepción, revisión con fotos, estudiantes, simulador de terminal, reportes CSV y ajustes. |

### Cómo enfrenta el "amigo que pasa la tarjeta"

Ningún sistema barato lo impide al 100 %. N.A.V.I lo vuelve **detectable** y **arriesgado**:

1. **El docente confirma la lista por excepción.** Si una tarjeta marcó pero el alumno no está sentado, el registro pasa a revisión. Es la señal más fuerte y toma unos 20 segundos.
2. **Una presencia = una tarjeta** (con el sensor VL53L0X opcional). Dos tarjetas distintas mientras la misma persona está frente al lector quedan marcadas. Sin el sensor, se marca a quien pasa dos tarjetas en menos de 1,5 s.
3. **Cámara obligatoria.** Sin foto o con la cámara tapada, el registro queda para revisión.
4. **Patrones.** Si las mismas dos tarjetas se marcan juntas varios días, se avisa.

Los registros sospechosos **nunca** mandan alertas de "fraude" a los padres. El docente o inspector revisa y decide; solo si confirma la suplantación se avisa al representante que el estudiante no estaba en el aula.

## Estructura

```
proyecto con pn532/
├── INICIAR_NAVI.bat            Inicia el servidor y abre la app
├── COMPARTIR_EN_CELULAR.bat    Enlace HTTPS temporal para instalar la app en el celular
├── backend/
│   ├── server.js               API REST + WebSocket
│   ├── attendance.js           Lógica de asistencia, ausencias, revisión y cámara
│   ├── auth.js                 Contraseñas cifradas (scrypt), sesiones firmadas, clave de terminal
│   ├── notifier.js             Correo, Telegram y enlaces de WhatsApp
│   ├── database.js             Esquema SQLite y datos de ejemplo
│   ├── config.js / time.js     Configuración y fechas en hora local
│   ├── .env.example            Plantilla de configuración opcional
│   ├── data/                   Base de datos, fotos y claves (se crea sola)
│   └── public/                 App web instalable (PWA) con los 6 bots
├── firmware/
│   ├── navi_esp32_pn532/       Lector: config.h + .ino
│   └── navi_esp32_cam/         Cámara: config.h + .ino
└── docs/
    ├── INSTALAR_APP.md
    ├── FICHA_MEDICA.md
    ├── LISTA_DE_MATERIALES.md
    ├── CONEXIONES_Y_ESQUEMATICO.md
    ├── CONFIGURACION_WHATSAPP_Y_EMAIL.md
    ├── ERRORES_CORREGIDOS.md
    ├── NAVI_timelapse.mp4      Time-lapse de cómo se construyó
    └── GUIA_DE_COMPETENCIA_PITCH.md
```

## Notas

- La base de datos nueva está en `backend/data/navi.sqlite`. La antigua (`backend/navi_database.sqlite`) quedó intacta como respaldo, pero ya no se usa.
- La clave de terminal se genera sola y aparece en la ventana del servidor y en **Lector → Configuración del firmware** (solo para el administrador). Es la misma en el modo real y en la demostración, así que el lector funciona con los dos.
- El modo demostración también se activa con `NAVI_DEMO=1` en `backend/.env`.
