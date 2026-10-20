# Conexiones del terminal N.A.V.I

Todos los pines están en `firmware/navi_esp32_pn532/config.h` por si necesitas cambiarlos.

## 1. Switches del PN532 (modo I2C)

| Switch | Posición |
| :---: | :---: |
| CH1 | OFF |
| CH2 | ON |

## 2. Lector: ESP32 + PN532 + OLED + LEDs + buzzer

| Componente | Pin del componente | Pin del ESP32 | Notas |
| --- | --- | --- | --- |
| PN532 | VCC | 5V (VIN) | |
| PN532 | GND | GND | |
| PN532 | SDA | GPIO 21 | Bus I2C compartido |
| PN532 | SCL | GPIO 22 | Bus I2C compartido |
| PN532 | IRQ | GPIO 26 | Recomendado |
| PN532 | RSTO | GPIO 27 | Recomendado |
| OLED SSD1306 | VCC | 3.3V | |
| OLED SSD1306 | GND | GND | |
| OLED SSD1306 | SDA | GPIO 21 | |
| OLED SSD1306 | SCL | GPIO 22 | |
| LED verde (puntual) | ánodo (+) | GPIO 18 | Resistencia 220 Ω a GND |
| LED amarillo (atraso, revisión, sin red) | ánodo (+) | GPIO 5 | Resistencia 220 Ω a GND |
| LED rojo (tarjeta no registrada, error) | ánodo (+) | GPIO 19 | Resistencia 220 Ω a GND |
| Buzzer pasivo | + | GPIO 4 | – a GND |
| Disparo de cámara | cable | GPIO 25 | Va al GPIO 13 del ESP32-CAM |

## 3. Cámara: ESP32-CAM

| Desde | Hacia | Notas |
| --- | --- | --- |
| GPIO 25 del lector | GPIO 13 del ESP32-CAM | Pulso de disparo en el momento del toque |
| GND del lector | GND del ESP32-CAM | **Obligatorio**: sin tierra común el disparo no funciona |
| Fuente 5 V 2 A | 5V y GND del ESP32-CAM | Fuente propia y estable |

No uses tarjeta microSD en el ESP32-CAM: el GPIO 13 también es un pin de la SD.

## 4. Sensor de presencia VL53L0X (opcional)

| VL53L0X | ESP32 |
| --- | --- |
| VIN | 3.3V |
| GND | GND |
| SDA | GPIO 21 |
| SCL | GPIO 22 |

Después pon `#define USE_PRESENCE_SENSOR 1` en `config.h`. Ajusta `PRESENCE_MM` (650 mm por defecto) a la distancia a la que se para la persona frente al lector.

## 5. Direcciones I2C esperadas

Si cargas el ejemplo *I2C Scanner* deberías ver:

- `0x24`: PN532
- `0x3C`: OLED
- `0x29`: VL53L0X (si lo conectaste)

## 6. Configurar y subir el firmware

1. Arranca el servidor con `INICIAR_NAVI.bat` y entra como administrador.
2. En la app ve a **Terminal → Configuración del firmware** y copia los datos.
3. En **ambas** carpetas del firmware abre `config.h` y llena `WIFI_SSID`, `WIFI_PASS`, `SERVER_HOST` (la IP de tu PC), `SERVER_PORT` y `TERMINAL_KEY`. Usa el mismo `TERMINAL_ID` en el lector y en la cámara: así el servidor sabe que van juntos.
4. Sube `navi_esp32_pn532.ino` al ESP32 (placa *ESP32 Dev Module*) y `navi_esp32_cam.ino` al ESP32-CAM (placa *AI Thinker ESP32-CAM*).
5. En **Terminal → Hardware conectado** deben aparecer el lector y la cámara como "En línea".

## 7. Qué significa cada señal del lector

| LED y sonido | Pantalla | Significado |
| --- | --- | --- |
| Verde, bip agudo | HOLA MATEO · A TIEMPO | Registrado puntual |
| Amarillo, bip medio | HOLA MATEO · ATRASO | Registrado con atraso |
| Amarillo | REGISTRO EN REVISION | Registrado, pero el docente debe revisarlo |
| Amarillo | YA MARCO 07:02 | Ya había marcado hoy |
| Amarillo | GUARDADO · SIN RED | Sin WiFi: se guardó y se enviará solo |
| Rojo, tono grave | TARJETA NO REGISTRADA | Tarjeta desconocida (aparece en la app para registrarla) |
| Rojo | CLAVE INCORRECTA | `TERMINAL_KEY` no coincide con el servidor |
