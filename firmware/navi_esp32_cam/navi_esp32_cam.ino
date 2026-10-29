#include "config.h"
#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <mbedtls/md.h>
#include <HTTPClient.h>
#include <WebServer.h>

#define FIRMWARE "camara-3.4"
#define DISCOVERY_PORT 41234
#define PIN_FLASH 4

#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

volatile bool triggered = false;
unsigned long lastPing = 0;
unsigned long lastWifiTry = 0;
unsigned long lastShot = 0;
bool cameraOk = false;
bool wifiWasUp = false;
bool webStarted = false;
WebServer web(80);
int lastPingCode = 0;
int pingFails = 0;
unsigned long lastDiscoverAt = 0;
WiFiMulti wifiMulti;
Preferences prefs;
char serverHost[48] = SERVER_HOST;
uint16_t serverPort = SERVER_PORT;

void IRAM_ATTR onTrigger();
String baseUrl();
bool initCamera();
void ensureWifi();
void ping();
void captureAndSend();
void startWeb();
bool discoverServer();

void IRAM_ATTR onTrigger() {
  triggered = true;
}

String baseUrl() {
  return String("http://") + serverHost + ":" + String(serverPort);
}

void loadServer() {
  prefs.begin("navi", false);
  String fw = prefs.getString("fwhost", "");
  String host = prefs.getString("host", "");
  uint16_t port = prefs.getUShort("port", 0);
  if (fw == SERVER_HOST && host.length() && host.length() < sizeof(serverHost) && port) {
    strncpy(serverHost, host.c_str(), sizeof(serverHost) - 1);
    serverPort = port;
  }
}

String hmacHex(const char *msg) {
  uint8_t out[32];
  const mbedtls_md_info_t *info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  if (!info || mbedtls_md_hmac(info, (const unsigned char *)TERMINAL_KEY, strlen(TERMINAL_KEY), (const unsigned char *)msg, strlen(msg), out) != 0) return "";
  char hex[65];
  for (int i = 0; i < 32; i++) snprintf(hex + i * 2, 3, "%02x", out[i]);
  return String(hex);
}

bool discoverServer() {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiUDP udp;
  if (!udp.begin(0)) return false;
  char nonce[24];
  snprintf(nonce, sizeof(nonce), "%08lx%08lx", (unsigned long)esp_random(), (unsigned long)esp_random());
  String query = String("NAVI?") + nonce;
  String proof = hmacHex(nonce);
  IPAddress targets[2] = { IPAddress(255, 255, 255, 255), WiFi.broadcastIP() };
  for (int round = 0; round < 3; round++) {
    for (int t = 0; t < 2; t++) {
      udp.beginPacket(targets[t], DISCOVERY_PORT);
      udp.print(query);
      udp.endPacket();
    }
    uint32_t start = millis();
    while (millis() - start < 700) {
      int n = udp.parsePacket();
      if (n > 0) {
        char buf[320];
        int len = udp.read(buf, sizeof(buf) - 1);
        if (len <= 0) continue;
        buf[len] = 0;
        String r(buf);
        int pi = r.indexOf("\"proof\":\"");
        int po = r.indexOf("\"port\":");
        if (pi < 0 || po < 0) continue;
        String p = r.substring(pi + 9, r.indexOf('"', pi + 9));
        uint16_t port = r.substring(po + 7).toInt();
        if (!proof.length() || proof != p || !port) continue;
        String ip = udp.remoteIP().toString();
        udp.stop();
        strncpy(serverHost, ip.c_str(), sizeof(serverHost) - 1);
        serverHost[sizeof(serverHost) - 1] = 0;
        serverPort = port;
        prefs.putString("fwhost", SERVER_HOST);
        prefs.putString("host", ip);
        prefs.putUShort("port", port);
        Serial.println("Servidor encontrado en la red: " + baseUrl());
        return true;
      }
      delay(10);
    }
  }
  udp.stop();
  return false;
}

bool initCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;
  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM;
  c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.grab_mode = CAMERA_GRAB_LATEST;
  if (psramFound()) {
    c.frame_size = FRAMESIZE_VGA;
    c.jpeg_quality = 12;
    c.fb_count = 2;
    c.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    c.frame_size = FRAMESIZE_QVGA;
    c.jpeg_quality = 14;
    c.fb_count = 1;
    c.fb_location = CAMERA_FB_IN_DRAM;
  }
  if (esp_camera_init(&c) != ESP_OK) return false;
  sensor_t *s = esp_camera_sensor_get();
  s->set_whitebal(s, 1);
  s->set_exposure_ctrl(s, 1);
  s->set_gain_ctrl(s, 1);
  return true;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasUp) {
      wifiWasUp = true;
      Serial.print("WiFi OK, IP de la camara: ");
      Serial.println(WiFi.localIP());
      startWeb();
    }
    return;
  }
  wifiWasUp = false;
  if (millis() - lastWifiTry < 10000) return;
  lastWifiTry = millis();
  if (wifiMulti.run(6000) == WL_CONNECTED) WiFi.setSleep(false);
}

void ping() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(baseUrl() + "/api/terminal/ping");
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  int code = http.POST(String("{\"terminal_id\":\"") + TERMINAL_ID + "\",\"kind\":\"CAMARA\",\"firmware\":\"" + FIRMWARE + "\",\"rssi\":" + String(WiFi.RSSI()) + "}");
  pingFails = code > 0 ? 0 : pingFails + 1;
  if (code != lastPingCode) {
    if (code == 200) Serial.println("Servidor conectado. En la app: Lector -> Hardware conectado -> camara En linea");
    else if (code < 0) Serial.println("No llego al servidor " + baseUrl() + ": revisa que INICIAR_NAVI este abierto y el mismo WiFi");
    lastPingCode = code;
  }
  if (code == 401) Serial.println("Clave de terminal incorrecta: abre INICIAR_NAVI en la PC y vuelve a subir el programa");
  http.end();
}

void captureAndSend() {
  if (!cameraOk || WiFi.status() != WL_CONNECTED) return;
#if USE_FLASH
  digitalWrite(PIN_FLASH, HIGH);
  delay(60);
#endif
  camera_fb_t *fb = esp_camera_fb_get();
#if USE_FLASH
  digitalWrite(PIN_FLASH, LOW);
#endif
  if (!fb) {
    Serial.println("No se pudo capturar la foto");
    return;
  }
  HTTPClient http;
  http.begin(baseUrl() + "/api/camera/snapshot");
  http.setTimeout(5000);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  http.addHeader("X-Terminal-Id", TERMINAL_ID);
  int code = http.POST(fb->buf, fb->len);
  Serial.printf("Foto %u bytes -> HTTP %d\n", fb->len, code);
  http.end();
  esp_camera_fb_return(fb);
}

void startWeb() {
  if (webStarted) return;
  static const char *keys[] = {"X-Terminal-Key"};
  web.collectHeaders(keys, 1);
  web.on("/foto", []() {
    if (web.header("X-Terminal-Key") != TERMINAL_KEY) {
      web.send(401, "text/plain", "clave");
      return;
    }
    triggered = true;
    web.send(200, "text/plain", "ok");
  });
  web.begin();
  webStarted = true;
  Serial.println("Disparo por WiFi listo: el servidor pide la foto en cada toque, sin cable");
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("N.A.V.I " FIRMWARE " iniciando");
  pinMode(PIN_FLASH, OUTPUT);
  digitalWrite(PIN_FLASH, LOW);
  pinMode(PIN_TRIGGER, INPUT_PULLDOWN);
  attachInterrupt(digitalPinToInterrupt(PIN_TRIGGER), onTrigger, RISING);
  cameraOk = initCamera();
  Serial.println(cameraOk ? (psramFound() ? "Camara lista (con PSRAM, fotos VGA)" : "Camara lista (sin PSRAM, fotos pequenas: activa PSRAM en Herramientas)") : "Error al iniciar la camara: revisa que el cable plano de la camara este bien encajado y que la placa sea AI Thinker ESP32-CAM");
  loadServer();
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASS);
  if (strlen(WIFI_SSID_2)) wifiMulti.addAP(WIFI_SSID_2, WIFI_PASS_2);
  if (strlen(WIFI_SSID_3)) wifiMulti.addAP(WIFI_SSID_3, WIFI_PASS_3);
  Serial.printf("Conectando al WiFi \"%s\"%s...\n", WIFI_SSID, strlen(WIFI_SSID_2) ? " (o a las otras redes guardadas)" : "");
  wifiMulti.run(12000);
  lastWifiTry = millis();
  if (WiFi.status() == WL_CONNECTED) {
    wifiWasUp = true;
    Serial.print("WiFi OK, IP de la camara: ");
    Serial.println(WiFi.localIP());
    Serial.println("Servidor: " + baseUrl());
    startWeb();
    ping();
    lastPing = millis();
  } else {
    Serial.println("WiFi no conectado: revisa WIFI_SSID y WIFI_PASS en mis_datos.h. Solo redes de 2.4 GHz.");
  }
  Serial.println("Para probar sin el lector, escribe f en el Monitor serie y presiona Enter: toma una foto.");
}

void loop() {
  ensureWifi();
  if (webStarted) web.handleClient();
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == 'f' || ch == 'F') {
      Serial.println("Foto de prueba");
      triggered = true;
    }
  }
  if (triggered) {
    triggered = false;
    Serial.println("Disparo recibido");
    if (millis() - lastShot > 1500) {
      lastShot = millis();
      captureAndSend();
    }
  }
  if (millis() - lastPing > (lastPingCode == 200 ? 30000UL : 10000UL)) {
    lastPing = millis();
    ping();
    if (pingFails >= 2 && WiFi.status() == WL_CONNECTED && millis() - lastDiscoverAt > 8000) {
      lastDiscoverAt = millis();
      if (discoverServer()) {
        pingFails = 0;
        ping();
      }
    }
  }
  delay(2);
}
