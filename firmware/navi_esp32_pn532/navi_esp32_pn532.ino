#include "config.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <sys/time.h>
#if USE_PRESENCE_SENSOR
#include <Adafruit_VL53L0X.h>
Adafruit_VL53L0X lox;
#endif

#define FIRMWARE "lector-3.4"
#define QUEUE_FILE "/cola.csv"

Adafruit_SSD1306 display(128, 64, &Wire, -1);
#ifndef PN532_UART
#define PN532_UART 0
#endif
#ifndef PIN_PN532_RX
#define PIN_PN532_RX 16
#endif
#ifndef PIN_PN532_TX
#define PIN_PN532_TX 17
#endif
#if PN532_UART
Adafruit_PN532 nfc(PIN_PN532_RESET, &Serial2);
#else
Adafruit_PN532 nfc(PIN_PN532_IRQ, PIN_PN532_RESET, &Wire);
#endif

bool oledOk = false;
bool nfcOk = false;
uint32_t sessionId = 0;
String lastUid = "";
unsigned long lastUidAt = 0;
unsigned long feedbackUntil = 0;
unsigned long lastPing = 0;
unsigned long lastWifiTry = 0;
unsigned long lastSync = 0;
unsigned long lastIdleDraw = 0;
uint32_t presenceCounter = 0;
bool personHere = false;
unsigned long lastSeenPerson = 0;
bool wifiWasUp = false;
unsigned long lastNfcTry = 0;
unsigned long lastNfcCheck = 0;
int lastPingCode = 0;

String baseUrl();
bool timeValid();
void setClock(uint32_t epoch);
void leds(bool g, bool y, bool r);
void beepOk();
void beepWarn();
void beepBad();
void oled(const String &a, const String &b, const String &c);
void drawIdle();
void feedback(const String &status, bool review, const String &l1, const String &l2);
int hexNibble(char c);
int hexToBytes(const char *hex, uint8_t *out, int maxLen);
void alertFor(const String &status, bool review);
bool showMascot(const char *bmpHex, const String &l1, const String &l2, const String &l3);
String writeNdef(const char *hex);
void reportWrite(const String &job, const String &uid, const String &err);
void handleWrite(JsonDocument &r, const String &uid, bool ntag);
bool ndefComplete(const uint8_t *m, uint16_t n);
String parseCredential(const uint8_t *m, uint16_t n);
String readCredential(uint8_t uidLen);
void triggerCamera();
void queueOffline(const String &uid, const String &cred, bool ntag);
void syncQueue();
void scanI2C();
void nfcFlush();
bool startNfc();
void ping();
void sendScan(const String &uid, const String &cred, bool ntag);
void ensureWifi();
void updatePresence();

String baseUrl() {
  return String("http://") + SERVER_HOST + ":" + String(SERVER_PORT);
}

bool timeValid() {
  return time(nullptr) > 1700000000;
}

void setClock(uint32_t epoch) {
  if (epoch < 1700000000) return;
  struct timeval tv = { (time_t)epoch, 0 };
  settimeofday(&tv, nullptr);
}

void leds(bool g, bool y, bool r) {
  digitalWrite(PIN_LED_GREEN, g);
  digitalWrite(PIN_LED_YELLOW, y);
  digitalWrite(PIN_LED_RED, r);
}

void beepOk() {
  tone(PIN_BUZZER, 1760, 70);
}

void beepWarn() {
  tone(PIN_BUZZER, 880, 160);
}

void beepBad() {
  tone(PIN_BUZZER, 220, 350);
}

void oled(const String &a, const String &b, const String &c) {
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("N.A.V.I"));
  display.setCursor(80, 0);
  display.print(WiFi.status() == WL_CONNECTED ? F(" WiFi") : F(" SIN RED"));
  display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
  display.setTextSize(a.length() <= 10 ? 2 : 1);
  display.setCursor(0, 18);
  display.println(a);
  display.setTextSize(1);
  display.setCursor(0, 42);
  display.println(b);
  display.setCursor(0, 54);
  display.print(c);
  display.display();
}

void drawIdle() {
  char hhmm[6] = "--:--";
  if (timeValid()) {
    time_t now = time(nullptr);
    struct tm t;
    localtime_r(&now, &t);
    strftime(hhmm, sizeof(hhmm), "%H:%M", &t);
  }
  int pending = 0;
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (f) {
    while (f.available()) if (f.read() == '\n') pending++;
    f.close();
  }
  oled(nfcOk ? "ACERQUE" : "SIN LECTOR", nfcOk ? "SU TARJETA" : "REVISE PN532", String(hhmm) + (pending ? "  cola: " + String(pending) : ""));
}

void feedback(const String &status, bool review, const String &l1, const String &l2) {
  alertFor(status, review);
  oled(l1, l2, "");
  feedbackUntil = millis() + 1300;
}

int hexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return -1;
}

int hexToBytes(const char *hex, uint8_t *out, int maxLen) {
  int n = 0;
  for (int i = 0; hex[i] && hex[i + 1] && n < maxLen; i += 2) {
    int hi = hexNibble(hex[i]);
    int lo = hexNibble(hex[i + 1]);
    if (hi < 0 || lo < 0) return -1;
    out[n++] = (hi << 4) | lo;
  }
  return n;
}

void alertFor(const String &status, bool review) {
  if ((status == "A_TIEMPO" && !review) || status == "GRABADO") {
    leds(true, false, false);
    beepOk();
  } else if (status == "A_TIEMPO" || status == "TARDE" || status == "DUPLICADO" || status == "OFFLINE") {
    leds(false, true, false);
    beepWarn();
  } else {
    leds(false, false, true);
    beepBad();
  }
}

bool showMascot(const char *bmpHex, const String &l1, const String &l2, const String &l3) {
  if (!oledOk || strlen(bmpHex) != 256 || l1.length() > 15 || l2.length() > 15 || l3.length() > 7) return false;
  uint8_t bmp[128];
  if (hexToBytes(bmpHex, bmp, sizeof(bmp)) != 128) return false;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("N.A.V.I"));
  display.setCursor(80, 0);
  display.print(WiFi.status() == WL_CONNECTED ? F(" WiFi") : F(" SIN RED"));
  display.drawFastHLine(0, 11, 128, SSD1306_WHITE);
  display.drawBitmap(0, 22, bmp, 32, 32, SSD1306_WHITE);
  display.setCursor(38, 18);
  display.print(l1);
  display.setCursor(38, 30);
  display.print(l2);
  if (l3.length()) {
    display.setTextSize(2);
    display.setCursor(38, 44);
    display.print(l3);
  }
  display.display();
  return true;
}

String writeNdef(const char *hex) {
  uint8_t data[144];
  int n = hexToBytes(hex, data, sizeof(data));
  if (n <= 0) return "DATOS";
  while (n % 4) data[n++] = 0x00;
  for (int i = 0; i < n; i += 4) {
    uint8_t page = 4 + i / 4;
    if (page > 39) return "MUY GRANDE";
    nfcFlush();
    if (!nfc.ntag2xx_WritePage(page, data + i)) return "SE MOVIO";
  }
  return "";
}

void reportWrite(const String &job, const String &uid, const String &err) {
  if (WiFi.status() != WL_CONNECTED) return;
  JsonDocument doc;
  doc["job"] = job;
  doc["uid"] = uid;
  doc["ok"] = err.length() == 0;
  if (err.length()) doc["error"] = err;
  doc["terminal_id"] = TERMINAL_ID;
  String body;
  serializeJson(doc, body);
  HTTPClient http;
  http.begin(baseUrl() + "/api/terminal/written");
  http.setTimeout(2500);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  http.POST(body);
  http.end();
}

void handleWrite(JsonDocument &r, const String &uid, bool ntag) {
  String job = r["job"] | "";
  const char *ndef = r["ndef"] | "";
  String expected = r["cred"] | "";
  oled("GRABANDO", "NO RETIRE", "LA TARJETA");
  String err = ntag ? writeNdef(ndef) : String("NO ES NTAG");
  if (!err.length() && readCredential(7) != expected) err = "VERIFICACION";
  reportWrite(job, uid, err);
  if (err.length()) {
    leds(false, false, true);
    beepBad();
    oled("NO GRABO", err, "VUELVA A ACERCARLA");
  } else {
    leds(true, false, false);
    beepOk();
    delay(90);
    beepOk();
    oled("GRABADA", "TARJETA LISTA", "");
  }
  lastUid = "";
  feedbackUntil = millis() + 2200;
}

bool ndefComplete(const uint8_t *m, uint16_t n) {
  uint16_t i = 0;
  while (i < n) {
    uint8_t t = m[i];
    if (t == 0x00) {
      i++;
      continue;
    }
    if (t == 0xFE) return true;
    if (i + 1 >= n) return false;
    uint16_t len = m[i + 1];
    uint16_t hdr = 2;
    if (len == 0xFF) {
      if (i + 3 >= n) return false;
      len = ((uint16_t)m[i + 2] << 8) | m[i + 3];
      hdr = 4;
    }
    if (t == 0x03) return i + hdr + len <= n;
    i += hdr + len;
  }
  return false;
}

String parseCredential(const uint8_t *m, uint16_t n) {
  uint16_t i = 0;
  while (i < n) {
    uint8_t t = m[i++];
    if (t == 0x00) continue;
    if (t == 0xFE || i >= n) break;
    uint16_t len = m[i++];
    if (len == 0xFF) {
      if (i + 1 >= n) break;
      len = ((uint16_t)m[i] << 8) | m[i + 1];
      i += 2;
    }
    if (t != 0x03) {
      i += len;
      continue;
    }
    uint16_t end = i + len;
    if (end > n) end = n;
    while (i + 2 < end) {
      uint8_t h = m[i++];
      uint8_t typeLen = m[i++];
      uint32_t payLen = 0;
      if (h & 0x10) {
        payLen = m[i++];
      } else {
        if (i + 3 >= end) break;
        payLen = ((uint32_t)m[i] << 24) | ((uint32_t)m[i + 1] << 16) | ((uint32_t)m[i + 2] << 8) | m[i + 3];
        i += 4;
      }
      uint8_t idLen = (h & 0x08) ? m[i++] : 0;
      if ((uint32_t)i + typeLen + idLen + payLen > end) break;
      bool isText = (h & 0x07) == 0x01 && typeLen == 1 && m[i] == 'T';
      i += typeLen + idLen;
      if (isText && payLen > 1) {
        uint8_t langLen = m[i] & 0x3F;
        String txt = "";
        for (uint32_t k = 1 + langLen; k < payLen; k++) txt += (char)m[i + k];
        if (txt.startsWith("NAVI1.")) return txt;
      }
      i += payLen;
      if (h & 0x40) break;
    }
    break;
  }
  return "";
}

String readCredential(uint8_t uidLen) {
  if (uidLen != 7) return "";
  uint8_t mem[144];
  uint8_t page[4];
  uint16_t n = 0;
  for (uint8_t p = 4; p < 40 && n + 4 <= sizeof(mem); p++) {
    nfcFlush();
    if (!nfc.ntag2xx_ReadPage(p, page)) break;
    memcpy(mem + n, page, 4);
    n += 4;
    if (ndefComplete(mem, n)) break;
  }
  return parseCredential(mem, n);
}

void triggerCamera() {
  digitalWrite(PIN_CAM_TRIGGER, HIGH);
  delayMicroseconds(800);
  digitalWrite(PIN_CAM_TRIGGER, LOW);
}

void queueOffline(const String &uid, const String &cred, bool ntag) {
  File f = LittleFS.open(QUEUE_FILE, "a");
  if (!f) return;
  uint32_t epoch = timeValid() ? (uint32_t)time(nullptr) : 0;
  f.printf("%s,%lu,%lu,%lu,%s,%d\n", uid.c_str(), (unsigned long)epoch, (unsigned long)sessionId, (unsigned long)millis(), cred.c_str(), ntag ? 1 : 0);
  f.close();
}

void syncQueue() {
  if (WiFi.status() != WL_CONNECTED || !LittleFS.exists(QUEUE_FILE)) return;
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (!f) return;
  JsonDocument doc;
  doc["terminal_id"] = TERMINAL_ID;
  JsonArray recs = doc["records"].to<JsonArray>();
  String rest = "";
  int count = 0;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (!line.length()) continue;
    if (count >= 50) {
      rest += line + "\n";
      continue;
    }
    int c1 = line.indexOf(','), c2 = line.indexOf(',', c1 + 1), c3 = line.indexOf(',', c2 + 1);
    if (c1 < 0 || c2 < 0 || c3 < 0) continue;
    int c4 = line.indexOf(',', c3 + 1);
    int c5 = c4 < 0 ? -1 : line.indexOf(',', c4 + 1);
    String uid = line.substring(0, c1);
    uint32_t epoch = line.substring(c1 + 1, c2).toInt();
    uint32_t sess = line.substring(c2 + 1, c3).toInt();
    uint32_t ms = line.substring(c3 + 1, c4 < 0 ? line.length() : c4).toInt();
    String cred = c4 < 0 ? "" : line.substring(c4 + 1, c5 < 0 ? line.length() : c5);
    bool ntag = c5 >= 0 && line.substring(c5 + 1).toInt() == 1;
    if (!epoch && sess == sessionId && timeValid()) epoch = (uint32_t)time(nullptr) - (millis() - ms) / 1000;
    if (!epoch) {
      if (sess == sessionId) rest += line + "\n";
      continue;
    }
    JsonObject r = recs.add<JsonObject>();
    r["uid"] = uid;
    r["ts"] = epoch;
    if (cred.length()) r["cred"] = cred;
    if (ntag) r["ntag"] = true;
    count++;
  }
  f.close();
  if (!count) return;
  String body;
  serializeJson(doc, body);
  HTTPClient http;
  http.begin(baseUrl() + "/api/attendance/batch");
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  int code = http.POST(body);
  http.end();
  if (code == 200) {
    if (rest.length()) {
      File w = LittleFS.open(QUEUE_FILE, "w");
      w.print(rest);
      w.close();
    } else {
      LittleFS.remove(QUEUE_FILE);
    }
    Serial.printf("Cola sincronizada: %d registros\n", count);
  }
}

void ping() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(baseUrl() + "/api/terminal/ping");
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  String body = String("{\"terminal_id\":\"") + TERMINAL_ID + "\",\"kind\":\"LECTOR\",\"firmware\":\"" + FIRMWARE + "\",\"rssi\":" + String(WiFi.RSSI()) + "}";
  int code = http.POST(body);
  if (code != lastPingCode) {
    if (code == 200) Serial.println("Servidor conectado. En la app: Lector -> Hardware conectado -> En linea");
    else if (code < 0) Serial.println("No llego al servidor " + baseUrl() + ": revisa que INICIAR_NAVI este abierto, que la PC y el ESP32 esten en el mismo WiFi y el Firewall de Windows");
    else if (code != 401) Serial.printf("El servidor respondio %d\n", code);
    lastPingCode = code;
  }
  if (code == 200) {
    JsonDocument doc;
    if (!deserializeJson(doc, http.getString())) setClock(doc["server_time"] | 0);
  } else if (code == 401) {
    Serial.println("Clave de terminal incorrecta: abre INICIAR_NAVI en la PC y vuelve a subir el programa");
    oled("CLAVE", "INCORRECTA", "ABRA INICIAR_NAVI");
  }
  http.end();
}

void sendScan(const String &uid, const String &cred, bool ntag) {
  if (WiFi.status() != WL_CONNECTED) {
    queueOffline(uid, cred, ntag);
    feedback("OFFLINE", false, "GUARDADO", "SIN RED");
    return;
  }
  JsonDocument doc;
  doc["uid"] = uid;
  doc["terminal_id"] = TERMINAL_ID;
  if (cred.length()) doc["cred"] = cred;
  if (ntag) doc["ntag"] = true;
#if USE_PRESENCE_SENSOR
  doc["presence_id"] = String(sessionId) + "-" + String(presenceCounter);
#endif
  String body;
  serializeJson(doc, body);
  HTTPClient http;
  http.begin(baseUrl() + "/api/attendance/scan");
  http.setTimeout(2500);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  int code = http.POST(body);
  if (code <= 0) {
    http.end();
    queueOffline(uid, cred, ntag);
    feedback("OFFLINE", false, "GUARDADO", "SERVIDOR NO RESP.");
    return;
  }
  String resp = http.getString();
  http.end();
  if (code == 401) {
    feedback("ERROR", false, "CLAVE", "INCORRECTA");
    return;
  }
  JsonDocument r;
  if (deserializeJson(r, resp)) {
    feedback("ERROR", false, "ERROR", "RESPUESTA");
    return;
  }
  String status = r["status"] | "ERROR";
  if (status == "REPETIDO") return;
  if (status == "GRABAR") {
    handleWrite(r, uid, ntag);
    return;
  }
  bool review = r["review"] | false;
  String l1 = r["display"]["line1"] | "";
  String l2 = r["display"]["line2"] | "";
  String l3 = r["display"]["line3"] | "";
  const char *bmp = r["mascot"] | "";
  if (showMascot(bmp, l1, l2, l3)) {
    alertFor(status, review);
    feedbackUntil = millis() + (l3.length() ? 7000 : 1800);
    return;
  }
  if (l3.length()) {
    alertFor(status, review);
    oled(l1, l2, String("CODIGO ") + l3);
    feedbackUntil = millis() + 7000;
    return;
  }
  feedback(status, review, l1, l2);
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasUp) {
      wifiWasUp = true;
      Serial.print("WiFi OK, IP del lector: ");
      Serial.println(WiFi.localIP());
    }
    return;
  }
  wifiWasUp = false;
  if (millis() - lastWifiTry < 10000) return;
  lastWifiTry = millis();
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

#if USE_PRESENCE_SENSOR
void updatePresence() {
  static unsigned long lastRead = 0;
  if (millis() - lastRead < 40) return;
  lastRead = millis();
  if (!lox.isRangeComplete()) return;
  uint16_t mm = lox.readRange();
  bool near = mm > 30 && mm < PRESENCE_MM;
  if (near) {
    if (!personHere) presenceCounter++;
    personHere = true;
    lastSeenPerson = millis();
  } else if (personHere && millis() - lastSeenPerson > 700) {
    personHere = false;
  }
}
#endif

void scanI2C() {
  String found = "";
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      char b[8];
      snprintf(b, sizeof(b), " 0x%02X", a);
      found += b;
      if (a == 0x24) found += " (PN532)";
      if (a == 0x3C || a == 0x3D) found += " (OLED)";
      if (a == 0x29) found += " (VL53L0X)";
    }
  }
  Serial.println("Modulos I2C encontrados:" + (found.length() ? found : String(" ninguno")));
  if (!PN532_UART && !nfcOk && found.indexOf("0x24") < 0) Serial.println("El PN532 no responde en I2C (0x24): switch 1 en ON, switch 2 en OFF, cables SDA y SCL, y desconecta y conecta el USB");
}

void nfcFlush() {
#if PN532_UART
  delay(2);
  while (Serial2.available()) Serial2.read();
#endif
}

bool startNfc() {
#if PN532_UART
  Serial2.begin(115200, SERIAL_8N1, PIN_PN532_RX, PIN_PN532_TX);
#endif
  nfc.begin();
#if PN532_UART
  Serial2.setTimeout(80);
#endif
  uint32_t v = 0;
  for (int i = 0; i < 3 && !v; i++) {
    delay(100);
    nfcFlush();
    v = nfc.getFirmwareVersion();
  }
  nfcOk = v != 0;
  if (nfcOk) {
    nfcFlush();
    nfc.SAMConfig();
    nfc.setPassiveActivationRetries(PN532_UART ? 0x02 : 0x10);
    Serial.printf("PN532 v%d.%d listo\n", (v >> 16) & 0xFF, (v >> 8) & 0xFF);
  }
  return nfcOk;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("N.A.V.I lector " FIRMWARE " iniciando");
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_CAM_TRIGGER, OUTPUT);
  digitalWrite(PIN_CAM_TRIGGER, LOW);
  leds(true, true, true);
  sessionId = esp_random() % 100000;
  Serial.println("Preparando la memoria (la primera vez tarda hasta 30 s)...");
  LittleFS.begin(true);
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000);
  Wire.setTimeOut(250);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  Serial.println(oledOk ? "Pantalla OLED lista" : "Pantalla OLED no detectada: revisa VCC a 3.3V, SDA 21 y SCL 22");
  oled("N.A.V.I", "INICIANDO...", FIRMWARE);
  startNfc();
  scanI2C();
  if (!nfcOk) {
#if PN532_UART
    Serial.println("PN532 no detectado (modo UART): switch 1 y 2 en OFF, pin SDA/TXD del PN532 al GPIO 16, pin SCL/RXD al GPIO 17. Luego desconecta y conecta el USB.");
#else
    Serial.println("PN532 no detectado (modo I2C): switch 1 en ON y switch 2 en OFF, SDA al GPIO 21, SCL al GPIO 22. Si no aparece, prueba el modo UART: PN532_UART 1 en config.h.");
#endif
  }
#if USE_PRESENCE_SENSOR
  if (lox.begin()) {
    lox.startRangeContinuous(40);
  } else {
    Serial.println("VL53L0X no detectado");
  }
#endif
  configTime(-5 * 3600, 0, "pool.ntp.org", "time.google.com");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  Serial.printf("Conectando al WiFi \"%s\"...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  lastWifiTry = millis();
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) delay(200);
  if (WiFi.status() == WL_CONNECTED) {
    wifiWasUp = true;
    Serial.print("WiFi OK, IP del lector: ");
    Serial.println(WiFi.localIP());
    Serial.println("Servidor: " + baseUrl());
    ping();
    lastPing = millis();
  } else {
    Serial.println("WiFi no conectado: revisa WIFI_SSID y WIFI_PASS en config.h. El ESP32 solo usa redes de 2.4 GHz.");
  }
  leds(false, false, false);
  beepOk();
  drawIdle();
}

void loop() {
  ensureWifi();
#if USE_PRESENCE_SENSOR
  updatePresence();
#endif
  if (feedbackUntil && millis() > feedbackUntil) {
    feedbackUntil = 0;
    leds(false, false, false);
    drawIdle();
  }
  if (!feedbackUntil && millis() - lastIdleDraw > 20000) {
    lastIdleDraw = millis();
    drawIdle();
  }
  if (millis() - lastPing > 30000) {
    lastPing = millis();
    ping();
  }
  if (millis() - lastSync > 15000) {
    lastSync = millis();
    syncQueue();
  }
  if (!nfcOk) {
    if (millis() - lastNfcTry > 5000) {
      lastNfcTry = millis();
      if (startNfc()) {
        lastNfcCheck = millis();
        leds(false, false, false);
        beepOk();
        drawIdle();
      }
    }
    return;
  }
  if (!feedbackUntil && millis() - lastNfcCheck > 20000) {
    lastNfcCheck = millis();
    nfcFlush();
    if (!nfc.getFirmwareVersion() && (nfcFlush(), !nfc.getFirmwareVersion())) {
      nfcOk = false;
      lastNfcTry = millis();
      Serial.println("Se perdio la conexion con el PN532: revisa los cables. Lo sigo buscando cada 5 s.");
      leds(false, false, true);
      beepBad();
      drawIdle();
      return;
    }
  }
  uint8_t uid[7];
  uint8_t len = 0;
  nfcFlush();
  if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &len, PN532_UART ? 150 : 60)) {
    String hex = "";
    for (uint8_t i = 0; i < len; i++) {
      if (uid[i] < 0x10) hex += "0";
      hex += String(uid[i], HEX);
    }
    hex.toUpperCase();
    if (hex == lastUid && millis() - lastUidAt < 3000) {
      lastUidAt = millis();
      return;
    }
    lastUid = hex;
    lastUidAt = millis();
    triggerCamera();
    Serial.println("Tarjeta: " + hex);
    oled("LEYENDO", hex, "");
    String cred = readCredential(len);
    if (cred.length()) Serial.println("Credencial firmada encontrada");
    sendScan(hex, cred, len == 7);
  }
}
