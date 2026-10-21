#pragma once

#define WIFI_SSID "Claro_MORGAN"
#define WIFI_PASS "098087916312122008"

#define TERMINAL_ID "ESP32-AULA-1"
#define PN532_UART 1

#if __has_include("servidor.h")
#include "servidor.h"
#else
#define SERVER_HOST "192.168.1.100"
#define SERVER_PORT 3000
#define TERMINAL_KEY "ABRE_INICIAR_NAVI_PARA_CREAR_SERVIDOR_H"
#endif

#define USE_PRESENCE_SENSOR 0
#define PRESENCE_MM 650

#define PIN_SDA 21
#define PIN_SCL 22
#define PIN_PN532_IRQ 26
#define PIN_PN532_RESET 27
#define PIN_BUZZER 4
#define PIN_LED_GREEN 18
#define PIN_LED_YELLOW 5
#define PIN_LED_RED 19
#define PIN_CAM_TRIGGER 25
