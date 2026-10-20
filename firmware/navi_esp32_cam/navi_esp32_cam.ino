#include "config.h"
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

#define FIRMWARE "camara-3.0"
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

void IRAM_ATTR onTrigger() {
  triggered = true;
}

String baseUrl() {
  return String("http://") + SERVER_HOST + ":" + String(SERVER_PORT);
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
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiTry < 10000) return;
  lastWifiTry = millis();
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void ping() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(baseUrl() + "/api/terminal/ping");
  http.setTimeout(3000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Terminal-Key", TERMINAL_KEY);
  int code = http.POST(String("{\"terminal_id\":\"") + TERMINAL_ID + "\",\"kind\":\"CAMARA\",\"firmware\":\"" + FIRMWARE + "\",\"rssi\":" + String(WiFi.RSSI()) + "}");
  if (code == 401) Serial.println("Clave de terminal incorrecta: revisa TERMINAL_KEY en config.h");
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

void setup() {
  Serial.begin(115200);
  pinMode(PIN_FLASH, OUTPUT);
  digitalWrite(PIN_FLASH, LOW);
  pinMode(PIN_TRIGGER, INPUT_PULLDOWN);
  attachInterrupt(digitalPinToInterrupt(PIN_TRIGGER), onTrigger, RISING);
  cameraOk = initCamera();
  Serial.println(cameraOk ? "Camara lista" : "Error al iniciar la camara");
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
}

void loop() {
  ensureWifi();
  if (triggered) {
    triggered = false;
    if (millis() - lastShot > 400) {
      lastShot = millis();
      captureAndSend();
    }
  }
  if (millis() - lastPing > 30000) {
    lastPing = millis();
    ping();
  }
  delay(2);
}
