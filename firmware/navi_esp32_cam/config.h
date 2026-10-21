#pragma once

#if __has_include("mis_datos.h")
#include "mis_datos.h"
#endif

#ifndef WIFI_SSID
#define WIFI_SSID "TU_RED_WIFI"
#endif
#ifndef WIFI_PASS
#define WIFI_PASS "TU_CONTRASENA_WIFI"
#endif
#ifndef TERMINAL_ID
#define TERMINAL_ID "ESP32-AULA-1"
#endif

#if __has_include("servidor.h")
#include "servidor.h"
#else
#define SERVER_HOST "192.168.1.100"
#define SERVER_PORT 3000
#define TERMINAL_KEY "ABRE_INICIAR_NAVI_PARA_CREAR_SERVIDOR_H"
#endif

#define PIN_TRIGGER 13
#define USE_FLASH 0
