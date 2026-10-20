# Ficha médica de emergencia

Cada estudiante puede tener una ficha con lo que alguien necesita saber para atenderlo bien en una emergencia: alergias (con gravedad y reacción), condiciones médicas, medicamentos, qué hacer, tipo de sangre y contactos.

## Tres formas de abrirla

| Quién | Cómo | Qué pasa |
| --- | --- | --- |
| **Cualquier persona** (otro estudiante, un guardia, un paramédico) | Acerca su celular a la tarjeta NFC del estudiante | Se abre la ficha en el navegador, sin instalar nada ni iniciar sesión. |
| **Un docente con la app** | Toca **Emergencia** (en Inicio o Estudiantes) → **Usar el lector del aula** y acerca la tarjeta al lector | Ese toque no marca asistencia: abre la ficha en la app. |
| **Un docente con Android** | **Emergencia** → **Leer con este celular** | Lee la tarjeta con el NFC del teléfono y abre la ficha. |

También se puede buscar al estudiante por nombre en la misma pantalla.

## Seguridad y privacidad

- Solo funciona si el representante lo autorizó (interruptor **El representante lo autorizó** y su nombre).
- Cada vez que alguien abre la ficha queda registrado (hora, IP, por dónde) y se ve en **Últimos accesos**.
- Cuando se abre desde un celular, **el colegio recibe un aviso al instante** en la app y **el representante recibe un mensaje** (como máximo uno cada 10 minutos).
- Si el estudiante pierde la tarjeta: **Cambiar enlace**. El enlace viejo deja de funcionar de inmediato.
- Son datos de salud de menores, que la Ley Orgánica de Protección de Datos Personales del Ecuador trata con especial cuidado: guarda solo lo necesario para una emergencia.

## Cómo grabar la tarjeta

1. Abre la ficha del estudiante: **Estudiantes → (estudiante) → Ficha médica**, completa los datos, activa la autorización y guarda.
2. Vuelve a abrirla: aparece el **Enlace de emergencia** con su código QR.
3. Grábalo en la tarjeta:
   - **Android con Chrome** (abriendo la app con HTTPS): botón **Grabar en la tarjeta**.
   - **Cualquier celular**: app gratuita **NFC Tools** → Escribir → Agregar registro → URL → pega el enlace → Escribir.
4. Prueba con otro celular: al acercarlo debe aparecer la notificación para abrir el enlace.
5. Imprime el QR en el carnet como respaldo.

### Qué tarjetas usar

Usa **NTAG213** o **NTAG215** (tarjetas, llaveros o stickers). Las leen iPhone (XS o más nuevo) y Android sin instalar nada, y el PN532 del aula también las lee para la asistencia. Las MIFARE Classic sirven para la asistencia, pero el iPhone no las lee.

## Importante: el enlace tiene que abrir desde cualquier celular

Quien encuentre al estudiante probablemente use datos móviles, no el WiFi del colegio. Por eso el enlace grabado debe apuntar a una dirección **pública y fija**:

| Opción | Funciona fuera del colegio | Notas |
| --- | --- | --- |
| IP local (`http://192.168.x.x:3000`) | No, solo en el WiFi del colegio | Sirve para la demo. |
| `COMPARTIR_EN_CELULAR.bat` | Sí, pero la dirección cambia cada vez | Sirve para probar, no para grabar tarjetas definitivas. |
| Túnel de Cloudflare con nombre y dominio propio, o un servidor en internet | Sí, siempre | Lo recomendado para un colegio real. |

Configura la dirección definitiva en `backend/.env`:

```
NAVI_PUBLIC_URL=https://navi.tucolegio.edu.ec
```

Si cambias la dirección después, hay que volver a grabar las tarjetas.
