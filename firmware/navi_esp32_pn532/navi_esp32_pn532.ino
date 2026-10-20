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

#define FIRMWARE "lector-3.1"
#define QUEUE_FILE "/cola.csv"

Adafruit_SSD1306 display(128, 64, &Wire, -1);
Adafruit_PN532 nfc(PIN_PN532_IRQ, PIN_PN532_RESET, &Wire);

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
  oled(nfcOk ? "ACERQUE" : "ERROR NFC", nfcOk ? "SU TARJETA" : "REVISE CABLES", String(hhmm) + (pending ? "  cola: " + String(pending) : ""));
}

void feedback(const String &status, bool review, const String &l1, const String &l2) {
  if (status == "A_TIEMPO" && !review) {
    leds(true, false, false);
    beepOk();
  } else if (status == "A_TIEMPO" || status == "TARDE" || status == "DUPLICADO" || status == "OFFLINE") {
    leds(false, true, false);
    beepWarn();
  } else {
    leds(false, false, true);
    beepBad();
  }
  oled(l1, l2, "");
  feedbackUntil = millis() + 1300;
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
  if (code == 200) {
    JsonDocument doc;
    if (!deserializeJson(doc, http.getString())) setClock(doc["server_time"] | 0);
  } else if (code == 401) {
    Serial.println("Clave de terminal incorrecta: revisa TERMINAL_KEY en config.h");
    oled("CLAVE", "INCORRECTA", "revise config.h");
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
  bool review = r["review"] | false;
  String l1 = r["display"]["line1"] | "";
  String l2 = r["display"]["line2"] | "";
  feedback(status, review, l1, l2);
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
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

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_CAM_TRIGGER, OUTPUT);
  digitalWrite(PIN_CAM_TRIGGER, LOW);
  leds(true, true, true);
  sessionId = esp_random() % 100000;
  LittleFS.begin(true);
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  oled("N.A.V.I", "INICIANDO...", FIRMWARE);
  nfc.begin();
  uint32_t v = nfc.getFirmwareVersion();
  nfcOk = v != 0;
  if (nfcOk) {
    nfc.SAMConfig();
    nfc.setPassiveActivationRetries(0x10);
    Serial.printf("PN532 v%d.%d listo\n", (v >> 16) & 0xFF, (v >> 8) & 0xFF);
  } else {
    Serial.println("PN532 no detectado: revisa SDA/SCL y los switches (I2C)");
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
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  lastWifiTry = millis();
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) delay(200);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi OK, IP: ");
    Serial.println(WiFi.localIP());
    ping();
    lastPing = millis();
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
  if (!nfcOk) return;
  uint8_t uid[7];
  uint8_t len = 0;
  if (nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &len, 60)) {
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
