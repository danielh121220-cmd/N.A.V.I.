# Lista de materiales y qué conseguir

Precios aproximados en dólares para Ecuador (tiendas de electrónica locales o AliExpress). Varían bastante: tómalos como referencia y compara antes de comprar.

## 1. Imprescindible: un terminal de aula

| Componente | Cantidad | Precio aprox. | Notas |
| --- | --- | --- | --- |
| ESP32 DevKit V1 (30 o 38 pines) | 1 | $8 – $12 | Con chip USB CP2102 o CH340. |
| Módulo NFC **PN532 V3** (el rojo, con switches) | 1 | $8 – $12 | Se usa en modo I2C. |
| Pantalla OLED 0,96" I2C SSD1306 (128×64) | 1 | $5 – $8 | 4 pines: VCC, GND, SCL, SDA. |
| Buzzer **pasivo** | 1 | $0,50 | El pasivo permite tonos distintos. |
| LEDs verde, amarillo y rojo | 3 | $0,30 | |
| Resistencias 220 Ω | 3 | $0,10 | Una por LED. |
| Protoboard + cables dupont (M-M y M-H) | 1 juego | $4 – $6 | |
| Tarjetas o llaveros NFC **NTAG213 o NTAG215** | 1 por estudiante | $0,40 – $1 c/u | Las lee el PN532 y también cualquier celular, que es lo que necesita la ficha médica. Evita las MIFARE Classic: el iPhone no las lee. |
| Cable USB **de datos** + cargador 5 V 2 A | 1 | $4 – $6 | Muchos cables solo cargan: si el PC no detecta el ESP32, cambia el cable. |

**Subtotal sin cámara:** unos $30 – $45.

## 2. Recomendado: cámara

| Componente | Cantidad | Precio aprox. | Notas |
| --- | --- | --- | --- |
| ESP32-CAM AI-Thinker (OV2640) **con base programadora ESP32-CAM-MB** | 1 | $10 – $15 | Sin la base MB necesitas un adaptador FTDI. |
| Fuente 5 V 2 A para la cámara | 1 | $4 – $6 | Con fuentes débiles se reinicia sola al usar WiFi. |
| 2 cables dupont largos | 2 | — | GPIO 25 del lector → GPIO 13 de la cámara, y GND común. |

**Total con cámara:** unos $45 – $65 por aula. (El pitch viejo decía "menos de $20 por aula": no es real, corrígelo.)

## 3. Opcional: más seguridad

| Componente | Precio aprox. | Para qué |
| --- | --- | --- |
| Sensor de distancia **VL53L0X** (I2C) | $5 – $8 | Activa "una presencia = una tarjeta". Se conecta al mismo bus I2C. En `config.h` pon `USE_PRESENCE_SENSOR 1`. |
| Tarjetas **NTAG 424 DNA** | $1,50 – $3 c/u | No se pueden clonar (generan un código distinto en cada toque). El software actual aún no las usa: preséntalas como la fase 2. |
| Carcasa impresa en 3D (`hardware/cad`) | $3 – $6 de filamento | Lector de 90 × 126 × 40 mm y caja de cámara. 4 tornillos M3 × 10 mm y cinta doble faz. Ver `CARCASA_Y_LLAVEROS.md`. |
| Llaveros impresos + sticker NTAG213 de 25 mm | $0,50 – $0,80 c/u | Dos piezas con el logo y el nombre; el sticker va adentro. |

## 4. Para el día de la competencia

- **Laptop** con el servidor (`INICIAR_NAVI.bat`).
- **Un WiFi propio**: router pequeño o el hotspot de tu celular. El WiFi de los eventos suele tener página de inicio de sesión, y el ESP32 no puede pasarla.
- Extensión eléctrica y regleta.
- Tarjetas de repuesto ya registradas.

## 5. Software

1. **Arduino IDE 2**: https://www.arduino.cc/en/software
2. En *Preferencias → URLs adicionales de gestor de placas*, agrega `https://espressif.github.io/arduino-esp32/package_esp32_index.json` e instala **esp32 de Espressif** (versión 3.x).
3. En el *Gestor de librerías* instala: **Adafruit PN532**, **Adafruit SSD1306**, **Adafruit GFX Library**, **ArduinoJson** (versión 7) y, si usas el sensor, **Adafruit_VL53L0X**.
4. Driver USB si Windows no ve el ESP32: **CP210x** (Silicon Labs) o **CH340**.
5. Placas a elegir al subir el código: lector → **ESP32 Dev Module**; cámara → **AI Thinker ESP32-CAM**.

> No pude compilar los firmwares en mi entorno, así que revisé el código a mano contra las librerías. Si Arduino IDE marca algún error al compilar, cópialo tal cual y lo corregimos.
