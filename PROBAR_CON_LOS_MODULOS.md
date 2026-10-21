# Probar N.A.V.I con los módulos reales

Guía corta para pasar de la app al lector de verdad: ESP32 + PN532 + pantalla OLED + LEDs + buzzer, y la cámara ESP32-CAM si la tienes.

La IP de tu PC y la **clave de terminal** (la que firma la comunicación entre el lector y el servidor) se ponen solas en el firmware. Solo tienes que escribir el nombre y la clave de tu WiFi.

![Conexiones](docs/conexiones.png)

## 1. Conecta los módulos

Con el ESP32 **desconectado** del USB:

| Módulo | Pin del módulo | Pin del ESP32 |
| --- | --- | --- |
| PN532 (switches: 1 en ON, 2 en OFF) | VCC · GND · SDA · SCL · IRQ · RSTO | 5V · GND · GPIO 21 · GPIO 22 · GPIO 26 · GPIO 27 |
| OLED 0,96" | VCC · GND · SDA · SCL | 3.3V · GND · GPIO 21 · GPIO 22 |
| LED verde | + (pata larga) | GPIO 18, con resistencia de 220 Ω a GND |
| LED amarillo | + | GPIO 5, con resistencia de 220 Ω a GND |
| LED rojo | + | GPIO 19, con resistencia de 220 Ω a GND |
| Buzzer | + · − | GPIO 4 · GND |
| ESP32-CAM (opcional) | GPIO 13 · GND | GPIO 25 · GND (tierra común obligatoria) |
| VL53L0X (opcional) | VIN · GND · SDA · SCL | 3.3V · GND · GPIO 21 · GPIO 22 |

La explicación completa, con fotos de qué revisar, está en [`docs/CONEXIONES_Y_ESQUEMATICO.md`](docs/CONEXIONES_Y_ESQUEMATICO.md).

## 2. Enciende el servidor

1. La PC y el ESP32 deben estar en el **mismo WiFi**. En el colegio, si los equipos no se ven entre sí, usa el hotspot de tu celular para los dos.
2. Doble clic en **`INICIAR_NAVI.bat`** (o `INICIAR_NAVI_DEMO.bat` para probar con los estudiantes de ejemplo).
3. En la ventana negra debe salir:

   ```
   Firmware listo: la IP 192.168.x.x y la clave ya están en firmware/navi_esp32_pn532/servidor.h ...
   ```

   Ese archivo `servidor.h` tiene la IP de tu PC, el puerto y la clave de terminal. No lo subas a GitHub: ya está excluido.

Si la IP de tu PC cambia (otro WiFi, otro día), vuelve a abrir `INICIAR_NAVI.bat` y vuelve a subir el programa al ESP32.

## 3. Prepara Arduino IDE (una sola vez)

1. **Archivo → Preferencias → URLs adicionales de gestor de placas:** pega
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. **Herramientas → Placa → Gestor de placas:** instala **esp32 de Espressif** (versión 3.x).
3. **Herramientas → Administrar bibliotecas:** instala
   - Adafruit PN532
   - Adafruit SSD1306
   - Adafruit GFX Library
   - ArduinoJson
   - Adafruit VL53L0X (solo si usas el sensor)

## 4. Sube el programa del lector

1. Abre `firmware/navi_esp32_pn532/navi_esp32_pn532.ino`.
2. En la pestaña **config.h** cambia solo estas dos líneas:

   ```
   #define WIFI_SSID "NOMBRE_DE_TU_WIFI"
   #define WIFI_PASS "CLAVE_DE_TU_WIFI"
   ```

3. Placa: **ESP32 Dev Module**. Puerto: el COM que aparece al conectar el ESP32.
   En **Herramientas → Partition Scheme** elige **Huge APP (3MB No OTA/1MB SPIFFS)**. Con la opción por defecto el programa no cabe ("Sketch too big").
4. Clic en **Subir**. Si se queda en "Connecting…", mantén presionado el botón **BOOT** del ESP32 hasta que empiece a subir.
5. Abre el **Monitor serie** a **115200**. Debe decir `PN532 v1.6 listo` y luego la IP del ESP32.

## 5. La cámara ESP32-CAM (opcional)

La cámara toma una foto en el momento en que el estudiante acerca la tarjeta. Si la foto sale negra (cámara tapada) o hay algo raro, el registro queda en **Revisión** con la foto para que el docente compare.

**Conexiones**

| Desde | Hacia |
| --- | --- |
| GPIO 25 del lector (ESP32) | GPIO 13 del ESP32-CAM |
| GND del lector | GND del ESP32-CAM (tierra común, obligatoria) |
| Fuente de 5 V y 2 A | 5V y GND del ESP32-CAM |

No pongas tarjeta microSD en el ESP32-CAM: el GPIO 13 también lo usa la ranura SD.

**Subir el programa**

1. Abre `firmware/navi_esp32_cam/navi_esp32_cam.ino` y escribe tu WiFi en su `config.h` (la IP y la clave ya están en `servidor.h`).
2. Placa: **AI Thinker ESP32-CAM** (grupo *esp32*). Revisa que **PSRAM** esté en *Enabled* y la partición en *Huge APP*.
3. Para subir:
   - **Con la placa base ESP32-CAM-MB** (la que trae USB): conéctala y sube. Si se queda en "Connecting…", mantén presionado **IO0** y toca **RST**.
   - **Con un adaptador FTDI**: une **GPIO 0 con GND**, presiona **RST**, sube, quita el puente y presiona **RST** otra vez.
4. En el Monitor serie (115200) debe salir `Camara lista (con PSRAM, fotos VGA)`, `WiFi OK` y `Servidor conectado`.
5. Escribe **f** y presiona Enter: toma una foto de prueba y dice `Foto 18000 bytes -> HTTP 200`.
6. En la app, **Lector → Hardware conectado** muestra la cámara **En línea**. Al acercar una tarjeta, la foto aparece en el registro del estudiante.

## 6. Prueba en la app

| Prueba | Qué debe pasar |
| --- | --- |
| Abre **Lector → Hardware conectado** | `ESP32-AULA-1` aparece **En línea** |
| Acerca una tarjeta que no está registrada | El lector suena con LED rojo y dice `TARJETA NO REGISTRADA`. En la app sale un aviso con el botón **Registrar**, que ya trae el número de la tarjeta |
| Registra al estudiante y vuelve a acercar la tarjeta | Nace su mascota en la pantalla y aparece un código de 6 números para su cuenta |
| En un celular: **Estudiante → Usar el lector del aula** y escribe el código | Se crea su PIN y ve su mascota |
| En la ficha del estudiante: **Tarjeta y acceso → Grabar con el lector del aula** | Deja la tarjeta quieta hasta oír dos bips: queda grabada con su credencial firmada |
| Acerca la misma tarjeta otra vez | Dice `YA MARCO` con la hora del primer toque |

## Si algo no funciona

| Mensaje o síntoma | Qué hacer |
| --- | --- |
| `Sketch too big` o `text section exceeds available space` | **Herramientas → Partition Scheme → Huge APP (3MB No OTA/1MB SPIFFS)** y vuelve a subir. |
| `PN532 no detectado` | Pon el switch 1 en ON y el switch 2 en OFF (modo I2C) y revisa SDA y SCL. Desconecta y vuelve a conectar la alimentación. |
| Sigue `PN532 no detectado` y `Modulos I2C encontrados: ninguno` | Usa el **modo UART**: switches 1 y 2 en OFF, el pin SDA/TXD del PN532 al GPIO 16, el pin SCL/RXD al GPIO 17, y en `config.h` pon `#define PN532_UART 1` (si no está esa línea, agrégala). |
| La OLED no enciende | Revisa que esté en 3.3V y no en 5V. Su dirección debe ser 0x3C. |
| `Clave de terminal incorrecta` | Abre `INICIAR_NAVI.bat` en la PC y vuelve a subir el programa, para que tome el `servidor.h` nuevo. |
| El lector no aparece **En línea** | La PC y el ESP32 no están en la misma red, o el Firewall de Windows bloquea Node.js: permite el acceso en redes privadas. |
| LED amarillo con `SIN RED` | El ESP32 guarda los toques y los envía cuando vuelve el WiFi. Revisa el nombre y la clave del WiFi. |
| `USE TARJETA · NTAG213 O NTAG215` | Esa tarjeta no se puede grabar. Sirve para marcar, pero para la credencial usa NTAG213 o NTAG215. |
