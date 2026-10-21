#pragma once

#define WIFI_SSID "Claro_MORGAN"
#define WIFI_PASS "098087916312122008"

#define TERMINAL_ID "ESP32-AULA-1"

#if __has_include("servidor.h")
#include "servidor.h"
#else
#define SERVER_HOST "192.168.1.100"
#define SERVER_PORT 3000
#define TERMINAL_KEY "ABRE_INICIAR_NAVI_PARA_CREAR_SERVIDOR_H"
#endif

#define PIN_TRIGGER 13
#define USE_FLASH 0
