#include "config.h"
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <mbedtls/md.h>
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

#define FIRMWARE "lector-3.8"
#define DISCOVERY_PORT 41234
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
Adafruit_PN532 nfcSer(PIN_PN532_RESET, &Serial2);
Adafruit_PN532 nfcI2c(PIN_PN532_IRQ, PIN_PN532_RESET, &Wire);
bool nfcUart = PN532_UART;
Adafruit_PN532 *nfc = PN532_UART ? &nfcSer : &nfcI2c;

bool oledOk = false;
bool nfcOk = false;
uint32_t sessionId = 0;
String lastUid = "";
unsigned long lastUidAt = 0;
unsigned long feedbackUntil = 0;
unsigned long lastWifiTry = 0;
unsigned long lastPingFailAt = 0;
unsigned long lastIdleDraw = 0;
uint32_t presenceCounter = 0;
bool personHere = false;
unsigned long lastSeenPerson = 0;
bool wifiWasUp = false;
unsigned long lastNfcTry = 0;
unsigned long lastNfcCheck = 0;
int lastPingCode = 0;
unsigned long waitingSince = 0;
uint32_t tapCounter = 0;

#define JOB_SCAN 1
#define JOB_WRITTEN 2

struct NetJob {
  uint8_t kind;
  bool ntag;
  uint32_t tap;
  uint32_t presence;
  char uid[24];
  char data[280];
};

struct NetResult {
  int code;
  uint32_t ms;
  bool ntag;
  char uid[24];
  char body[1400];
};

WiFiMulti wifiMulti;
Preferences prefs;
char serverHost[48] = SERVER_HOST;
uint16_t serverPort = SERVER_PORT;
int pingFails = 0;
unsigned long lastDiscoverAt = 0;
volatile bool netWifiUp = false;

QueueHandle_t jobQ = nullptr;
QueueHandle_t resQ = nullptr;
WiFiClient net;
volatile int queueCount = 0;
volatile bool keyBad = false;
bool keyBadShown = false;

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
bool nfcAlive();
bool startNfc();
void ping();
void sendScan(const String &uid, const String &cred, bool ntag);
void handleResult(NetResult &r);
int netPost(const char *path, const String &body, String &out, uint32_t timeoutMs, int tries = 2);
void netTask(void *arg);
int countQueue();
bool discoverServer();
void loadServer();
void addNetworks();
void ensureWifi();
void updatePresence();

String baseUrl() {
  return String("http://") + serverHost + ":" + String(serverPort);
}

void addNetworks() {
  wifiMulti.addAP(WIFI_SSID, WIFI_PASS);
  if (strlen(WIFI_SSID_2)) wifiMulti.addAP(WIFI_SSID_2, WIFI_PASS_2);
  if (strlen(WIFI_SSID_3)) wifiMulti.addAP(WIFI_SSID_3, WIFI_PASS_3);
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
        JsonDocument d;
        if (deserializeJson(d, buf)) continue;
        const char *p = d["proof"] | "";
        uint16_t port = d["port"] | 0;
        if (!proof.length() || proof != p || !port) continue;
        String ip = udp.remoteIP().toString();
        udp.stop();
        bool changed = ip != serverHost || port != serverPort;
        strncpy(serverHost, ip.c_str(), sizeof(serverHost) - 1);
        serverHost[sizeof(serverHost) - 1] = 0;
        serverPort = port;
        prefs.putString("fwhost", SERVER_HOST);
        prefs.putString("host", ip);
        prefs.putUShort("port", port);
        if (changed) Serial.println("Servidor encontrado en la red: " + baseUrl());
        return true;
      }
      delay(10);
    }
  }
  udp.stop();
  return false;
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
  int pending = queueCount;
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
    if (!nfc->ntag2xx_WritePage(page, data + i)) return "SE MOVIO";
  }
  return "";
}

void reportWrite(const String &job, const String &uid, const String &err) {
  JsonDocument doc;
  doc["job"] = job;
  doc["uid"] = uid;
  doc["ok"] = err.length() == 0;
  if (err.length()) doc["error"] = err;
  doc["terminal_id"] = TERMINAL_ID;
  NetJob j = {};
  j.kind = JOB_WRITTEN;
  serializeJson(doc, j.data, sizeof(j.data));
  if (jobQ) xQueueSend(jobQ, &j, pdMS_TO_TICKS(50));
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
    if (!nfc->ntag2xx_ReadPage(p, page)) break;
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
  queueCount = queueCount + 1;
}

int countQueue() {
  int n = 0;
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (!f) return 0;
  while (f.available()) if (f.read() == '\n') n++;
  f.close();
  return n;
}

void syncQueue() {
  if (WiFi.status() != WL_CONNECTED || queueCount <= 0 || !LittleFS.exists(QUEUE_FILE)) return;
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
  if (!count) {
    queueCount = countQueue();
    return;
  }
  String body;
  serializeJson(doc, body);
  String out;
  int code = netPost("/api/attendance/batch", body, out, 6000);
  if (code == 200) {
    if (rest.length()) {
      File w = LittleFS.open(QUEUE_FILE, "w");
      w.print(rest);
      w.close();
    } else {
      LittleFS.remove(QUEUE_FILE);
    }
    queueCount = countQueue();
    Serial.printf("Cola sincronizada: %d registros\n", count);
  }
}

void ping() {
  if (WiFi.status() != WL_CONNECTED) return;
  String body = String("{\"terminal_id\":\"") + TERMINAL_ID + "\",\"kind\":\"LECTOR\",\"firmware\":\"" + FIRMWARE + "\",\"rssi\":" + String(WiFi.RSSI()) + "}";
  String out;
  uint32_t t0 = millis();
  int code = netPost("/api/terminal/ping", body, out, 2500, 1);
  if (code <= 0) {
    lastPingFailAt = millis();
    pingFails++;
  } else {
    pingFails = 0;
  }
  if (code != lastPingCode) {
    if (code == 200) Serial.printf("Servidor conectado (%lu ms). En la app: Lector -> Hardware conectado -> En linea\n", (unsigned long)(millis() - t0));
    else if (code < 0) Serial.println("No llego al servidor " + baseUrl() + ": revisa que INICIAR_NAVI este abierto, que la PC y el ESP32 esten en el mismo WiFi y el Firewall de Windows");
    else if (code != 401) Serial.printf("El servidor respondio %d\n", code);
    lastPingCode = code;
  }
  if (code == 200) {
    keyBad = false;
    JsonDocument doc;
    if (!deserializeJson(doc, out)) setClock(doc["server_time"] | 0);
  } else if (code == 401) {
    if (!keyBad) Serial.println("Clave de terminal incorrecta: abre INICIAR_NAVI en la PC y vuelve a subir el programa");
    keyBad = true;
  }
}

bool netOpen(uint32_t timeoutMs) {
  if (net.connected()) return true;
  net.stop();
  if (!net.connect(serverHost, serverPort, (int32_t)timeoutMs)) return false;
  net.setNoDelay(true);
  return true;
}

int netReadByte(uint32_t start, uint32_t timeoutMs) {
  while (!net.available()) {
    if (!net.connected()) return -1;
    if (millis() - start > timeoutMs) return -2;
    delay(1);
  }
  return net.read();
}

bool netReadLine(String &line, uint32_t start, uint32_t timeoutMs) {
  line = "";
  for (;;) {
    int c = netReadByte(start, timeoutMs);
    if (c < 0) return false;
    if (c == '\r') continue;
    if (c == '\n') return true;
    if (line.length() < 400) line += (char)c;
  }
}

int netRead(String &out, uint32_t timeoutMs) {
  uint32_t start = millis();
  String line;
  if (!netReadLine(line, start, timeoutMs)) return -2;
  int sp = line.indexOf(' ');
  int code = sp > 0 ? line.substring(sp + 1).toInt() : 0;
  if (code <= 0) return -4;
  long len = -1;
  bool chunked = false;
  bool close = false;
  for (;;) {
    if (!netReadLine(line, start, timeoutMs)) return -2;
    if (!line.length()) break;
    line.toLowerCase();
    if (line.startsWith("content-length:")) len = line.substring(15).toInt();
    else if (line.startsWith("transfer-encoding:") && line.indexOf("chunked") > 0) chunked = true;
    else if (line.startsWith("connection:") && line.indexOf("close") > 0) close = true;
  }
  out = "";
  if (chunked) {
    for (;;) {
      if (!netReadLine(line, start, timeoutMs)) return -2;
      long n = strtol(line.c_str(), nullptr, 16);
      if (n <= 0) {
        netReadLine(line, start, timeoutMs);
        break;
      }
      for (long i = 0; i < n; i++) {
        int c = netReadByte(start, timeoutMs);
        if (c < 0) return -2;
        if (out.length() < 4000) out += (char)c;
      }
      netReadLine(line, start, timeoutMs);
    }
  } else if (len >= 0) {
    out.reserve(len);
    for (long i = 0; i < len; i++) {
      int c = netReadByte(start, timeoutMs);
      if (c < 0) return -2;
      out += (char)c;
    }
  } else {
    close = true;
    for (;;) {
      int c = netReadByte(start, timeoutMs);
      if (c < 0) break;
      if (out.length() < 4000) out += (char)c;
    }
  }
  if (close) net.stop();
  return code;
}

int netPost(const char *path, const String &body, String &out, uint32_t timeoutMs, int tries) {
  for (int attempt = 0; attempt < tries; attempt++) {
    if (WiFi.status() != WL_CONNECTED) return -1;
    bool reused = net.connected();
    if (!netOpen(attempt ? 2500 : 1500)) {
      net.stop();
      continue;
    }
    while (net.available()) net.read();
    String req;
    req.reserve(body.length() + 240);
    req += "POST ";
    req += path;
    req += " HTTP/1.1\r\nHost: ";
    req += serverHost;
    req += ":";
    req += String(serverPort);
    req += "\r\nX-Terminal-Key: ";
    req += TERMINAL_KEY;
    req += "\r\nContent-Type: application/json\r\nConnection: keep-alive\r\nContent-Length: ";
    req += String(body.length());
    req += "\r\n\r\n";
    req += body;
    if (net.write((const uint8_t *)req.c_str(), req.length()) != req.length()) {
      net.stop();
      continue;
    }
    int code = netRead(out, timeoutMs);
    if (code > 0) return code;
    net.stop();
    if (!reused) return -1;
  }
  return -1;
}

void sendScan(const String &uid, const String &cred, bool ntag) {
  NetJob j = {};
  j.kind = JOB_SCAN;
  j.ntag = ntag;
  j.tap = ++tapCounter;
#if USE_PRESENCE_SENSOR
  j.presence = presenceCounter;
#endif
  strncpy(j.uid, uid.c_str(), sizeof(j.uid) - 1);
  strncpy(j.data, cred.c_str(), sizeof(j.data) - 1);
  if (!jobQ || xQueueSend(jobQ, &j, 0) != pdTRUE) {
    feedback("ERROR", false, "OCUPADO", "ACERQUE OTRA VEZ");
    lastUid = "";
    return;
  }
  waitingSince = millis();
}

void netScan(NetJob &j) {
  static NetResult r;
  memset(&r, 0, sizeof(r));
  strncpy(r.uid, j.uid, sizeof(r.uid) - 1);
  r.ntag = j.ntag;
  if (WiFi.status() != WL_CONNECTED) {
    queueOffline(String(j.uid), String(j.data), j.ntag);
    r.code = -2;
    xQueueSend(resQ, &r, pdMS_TO_TICKS(200));
    return;
  }
  if (lastPingCode < 0 && millis() - lastPingFailAt < 6000) {
    queueOffline(String(j.uid), String(j.data), j.ntag);
    r.code = -1;
    xQueueSend(resQ, &r, pdMS_TO_TICKS(200));
    return;
  }
  JsonDocument doc;
  doc["uid"] = j.uid;
  doc["terminal_id"] = TERMINAL_ID;
  doc["tap"] = String(sessionId) + "-" + String(j.tap);
  if (j.data[0]) doc["cred"] = j.data;
  if (j.ntag) doc["ntag"] = true;
#if USE_PRESENCE_SENSOR
  doc["presence_id"] = String(sessionId) + "-" + String(j.presence);
#endif
  String body;
  serializeJson(doc, body);
  String out;
  uint32_t t0 = millis();
  int code = netPost("/api/attendance/scan", body, out, 3500);
  r.ms = millis() - t0;
  if (code <= 0) {
    queueOffline(String(j.uid), String(j.data), j.ntag);
    r.code = -1;
    Serial.printf("Servidor no respondio en %lu ms: guardado en la cola\n", (unsigned long)r.ms);
  } else {
    r.code = code;
    strncpy(r.body, out.c_str(), sizeof(r.body) - 1);
    Serial.printf("Servidor respondio en %lu ms\n", (unsigned long)r.ms);
  }
  xQueueSend(resQ, &r, pdMS_TO_TICKS(200));
}

void netTask(void *arg) {
  unsigned long lastPingAt = 0;
  unsigned long lastSyncAt = 0;
  bool wasUp = false;
  queueCount = countQueue();
  NetJob j;
  for (;;) {
    if (xQueueReceive(jobQ, &j, pdMS_TO_TICKS(150)) == pdTRUE) {
      if (j.kind == JOB_SCAN) netScan(j);
      else if (j.kind == JOB_WRITTEN && WiFi.status() == WL_CONNECTED) {
        String out;
        netPost("/api/terminal/written", String(j.data), out, 2500);
      }
      continue;
    }
    bool up = WiFi.status() == WL_CONNECTED;
    netWifiUp = up;
    if (!up) {
      if (wasUp) net.stop();
      wasUp = false;
      if (millis() - lastWifiTry > 12000) {
        while (xQueueReceive(jobQ, &j, 0) == pdTRUE) {
          if (j.kind == JOB_SCAN) netScan(j);
        }
        lastWifiTry = millis();
        if (wifiMulti.run(5000) == WL_CONNECTED) {
          WiFi.setSleep(false);
          Serial.printf("WiFi OK (%s), IP del lector: %s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
        }
      }
      continue;
    }
    unsigned long now = millis();
    if (!wasUp) {
      wasUp = true;
      lastPingAt = 0;
      lastSyncAt = 0;
      pingFails = 0;
    }
    if (pingFails >= 2 && (!lastDiscoverAt || now - lastDiscoverAt > 8000)) {
      lastDiscoverAt = now ? now : 1;
      if (discoverServer()) {
        net.stop();
        pingFails = 0;
        lastPingAt = 0;
      } else {
        pingFails = 2;
      }
      continue;
    }
    if (!lastPingAt || now - lastPingAt > (lastPingCode == 200 ? 20000UL : 5000UL)) {
      lastPingAt = now ? now : 1;
      ping();
      continue;
    }
    if (queueCount > 0 && lastPingCode == 200 && (!lastSyncAt || now - lastSyncAt > 2000)) {
      lastSyncAt = now ? now : 1;
      syncQueue();
    }
  }
}

void handleResult(NetResult &r) {
  waitingSince = 0;
  String uid = String(r.uid);
  if (r.code == -2) {
    feedback("OFFLINE", false, "GUARDADO", "SIN RED");
    return;
  }
  if (r.code <= 0) {
    feedback("OFFLINE", false, "GUARDADO", "SERVIDOR NO RESP.");
    return;
  }
  if (r.code == 401) {
    feedback("ERROR", false, "CLAVE", "INCORRECTA");
    return;
  }
  JsonDocument doc;
  if (deserializeJson(doc, r.body)) {
    feedback("ERROR", false, "ERROR", "RESPUESTA");
    return;
  }
  String status = doc["status"] | "ERROR";
  if (status == "REPETIDO") return;
  if (status == "GRABAR") {
    handleWrite(doc, uid, r.ntag);
    return;
  }
  bool review = doc["review"] | false;
  String l1 = doc["display"]["line1"] | "";
  String l2 = doc["display"]["line2"] | "";
  String l3 = doc["display"]["line3"] | "";
  const char *bmp = doc["mascot"] | "";
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
  bool up = netWifiUp;
  if (up != wifiWasUp) {
    wifiWasUp = up;
    if (!feedbackUntil && !waitingSince) drawIdle();
  }
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
  if (!nfcUart && !nfcOk && found.indexOf("0x24") < 0) Serial.println("El PN532 no responde en I2C (0x24): switch 1 en ON, switch 2 en OFF, cables SDA y SCL, y desconecta y conecta el USB");
}

void nfcFlush() {
  if (!nfcUart) return;
  delay(2);
  while (Serial2.available()) Serial2.read();
}

bool nfcAlive() {
  for (int i = 0; i < 4; i++) {
    delay(i ? 250 : 120);
    nfcFlush();
    if (nfc->getFirmwareVersion()) return true;
  }
  return false;
}

uint32_t tryNfc(bool uart) {
  nfcUart = uart;
  nfc = uart ? &nfcSer : &nfcI2c;
  if (uart) Serial2.begin(115200, SERIAL_8N1, PIN_PN532_RX, PIN_PN532_TX);
  nfc->begin();
  if (uart) Serial2.setTimeout(80);
  uint32_t v = 0;
  for (int i = 0; i < 3 && !v; i++) {
    delay(100);
    nfcFlush();
    v = nfc->getFirmwareVersion();
  }
  return v;
}

bool startNfc() {
  Preferences np;
  np.begin("navi-nfc", false);
  bool first = np.getBool("uart", PN532_UART);
  uint32_t v = tryNfc(first);
  if (!v) v = tryNfc(!first);
  nfcOk = v != 0;
  if (nfcOk) {
    if (nfcUart != first) np.putBool("uart", nfcUart);
    nfcFlush();
    nfc->SAMConfig();
    nfc->setPassiveActivationRetries(nfcUart ? 0x02 : 0x10);
    Serial.printf("PN532 v%d.%d listo por %s\n", (v >> 16) & 0xFF, (v >> 8) & 0xFF, nfcUart ? "UART (GPIO 16 y 17)" : "I2C (GPIO 21 y 22)");
  } else {
    nfcUart = first;
    nfc = first ? &nfcSer : &nfcI2c;
  }
  np.end();
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
    Serial.println("PN532 no detectado ni por UART ni por I2C. UART: switches 1 y 2 en OFF, TXD del PN532 al GPIO 16 y RXD al GPIO 17. I2C: switch 1 en ON y 2 en OFF, SDA al GPIO 21 y SCL al GPIO 22. Revisa VCC a 5V y GND, y desconecta y conecta el USB.");
  }
#if USE_PRESENCE_SENSOR
  if (lox.begin()) {
    lox.startRangeContinuous(40);
  } else {
    Serial.println("VL53L0X no detectado");
  }
#endif
  configTime(-5 * 3600, 0, "pool.ntp.org", "time.google.com");
  loadServer();
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  addNetworks();
  Serial.printf("Conectando al WiFi \"%s\"%s...\n", WIFI_SSID, strlen(WIFI_SSID_2) ? " (o a las otras redes guardadas)" : "");
  wifiMulti.run(12000);
  lastWifiTry = millis();
  if (WiFi.status() == WL_CONNECTED) {
    wifiWasUp = true;
    netWifiUp = true;
    Serial.printf("WiFi OK (%s), IP del lector: %s\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
    Serial.println("Servidor: " + baseUrl());
    WiFi.setSleep(false);
  } else {
    Serial.println("WiFi no conectado: revisa WIFI_SSID y WIFI_PASS en mis_datos.h. El ESP32 solo usa redes de 2.4 GHz.");
  }
  jobQ = xQueueCreate(8, sizeof(NetJob));
  resQ = xQueueCreate(3, sizeof(NetResult));
  xTaskCreatePinnedToCore(netTask, "navi-red", 10240, nullptr, 1, nullptr, 0);
  leds(false, false, false);
  beepOk();
  drawIdle();
}

void loop() {
  ensureWifi();
#if USE_PRESENCE_SENSOR
  updatePresence();
#endif
  if (resQ) {
    static NetResult res;
    if (xQueueReceive(resQ, &res, 0) == pdTRUE) handleResult(res);
  }
  if (waitingSince && millis() - waitingSince > 9000) {
    waitingSince = 0;
    feedback("OFFLINE", false, "GUARDADO", "SERVIDOR NO RESP.");
  }
  if (keyBad != keyBadShown) {
    keyBadShown = keyBad;
    if (keyBadShown) {
      oled("CLAVE", "INCORRECTA", "ABRA INICIAR_NAVI");
      feedbackUntil = millis() + 4000;
    }
  }
  if (feedbackUntil && millis() > feedbackUntil) {
    feedbackUntil = 0;
    leds(false, false, false);
    drawIdle();
  }
  if (!feedbackUntil && !waitingSince && millis() - lastIdleDraw > 20000) {
    lastIdleDraw = millis();
    drawIdle();
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
  if (!feedbackUntil && millis() - lastNfcCheck > 30000) {
    lastNfcCheck = millis();
    if (!nfcAlive()) {
      nfcOk = false;
      lastNfcTry = millis();
      Serial.println("El PN532 dejo de responder (cable flojo o le falta corriente). Lo sigo buscando cada 5 s.");
      leds(false, false, true);
      beepBad();
      drawIdle();
      return;
    }
  }
  uint8_t uid[7];
  uint8_t len = 0;
  nfcFlush();
  if (nfc->readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &len, nfcUart ? 150 : 60)) {
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
