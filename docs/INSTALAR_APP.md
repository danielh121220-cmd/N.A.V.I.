# Instalar N.A.V.I como app

La app es una PWA: se instala desde el navegador y queda con su propio ícono, a pantalla completa y sin barra del navegador. El servidor siempre corre en tu PC (`INICIAR_NAVI.bat`); el celular solo se conecta a él.

## 0. Probarla sin PC (versión de prueba)

`docs/NAVI_prueba_navegador.html` es la app completa en un solo archivo: el servidor corre dentro del navegador, con los mismos datos de ejemplo, el simulador de tarjetas, la ficha médica y los avisos. Sirve para mostrarla o probarla cuando no tienes la PC a mano.

- Lo que hagas se guarda solo en ese navegador. **Ajustes → Empezar de cero** lo borra.
- Los enlaces de WhatsApp sí abren WhatsApp. Los correos reales, las descargas y el lector NFC físico solo funcionan con `INICIAR_NAVI.bat`.
- Si cambias el código, se regenera con `npm install` y `npm run build` dentro de `tools/demo`.

## 1. En tu PC (lo más rápido)

1. Abre `INICIAR_NAVI.bat`.
2. En Chrome o Edge entra a `http://localhost:3000`.
3. Toca el ícono de instalar en la barra de direcciones (un monitor con una flecha) o ve a **Ajustes → App en este dispositivo → Instalar**.

## 2. En tu celular, desde cualquier lugar (HTTPS)

Los navegadores solo permiten instalar apps y usar la cámara si la página llega por **HTTPS**. Para eso está `COMPARTIR_EN_CELULAR.bat`:

1. Deja abierto `INICIAR_NAVI.bat` en la PC.
2. Abre `COMPARTIR_EN_CELULAR.bat`. La primera vez instala `cloudflared` (gratis, de Cloudflare).
3. Aparecerá una dirección como `https://palabras-al-azar.trycloudflare.com`. Ábrela en el celular.
4. **Android (Chrome):** menú ⋮ → **Instalar app**. **iPhone (Safari):** botón Compartir → **Agregar a inicio**.

Mientras la PC y las dos ventanas estén encendidas, la app funciona desde cualquier red. La dirección cambia cada vez que abres el `.bat`; si cambia, vuelve a instalar desde la nueva dirección.

> La dirección es pública mientras esté abierta. La app pide usuario y contraseña, pero ciérrala cuando no la uses.

## 3. En tu celular, en la misma red WiFi (sin internet)

Sirve para la competencia si el lugar no tiene internet.

1. En la ventana del servidor busca la línea **"En tu red WiFi: http://192.168.x.x:3000"**.
2. Ábrela en el celular conectado al mismo WiFi. La app funciona completa.
3. Para **instalarla** sin HTTPS en Android: en Chrome abre `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, escribe `http://192.168.x.x:3000`, actívalo y reinicia Chrome. Después aparece **Instalar app**.

En iPhone, sin HTTPS se puede usar desde Safari pero no se instala con todas las funciones; usa la opción 2.

## Si algo falla

| Problema | Solución |
| --- | --- |
| "No puedo conectarme con el servidor" | La ventana `INICIAR_NAVI` debe estar abierta. Revisa que la PC no esté suspendida. |
| El celular no abre la IP local | PC y celular en la misma red. Permite Node.js en el Firewall de Windows (redes privadas). |
| No aparece "Instalar app" | Necesitas HTTPS (opción 2) o el flag de Chrome (opción 3). |
| La cámara del simulador no abre | Solo funciona en `localhost` o HTTPS. |
| Error con `better-sqlite3` al iniciar | Borra `backend\node_modules` y vuelve a abrir `INICIAR_NAVI.bat`. |
