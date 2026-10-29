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
#ifndef WIFI_SSID_2
#define WIFI_SSID_2 ""
#define WIFI_PASS_2 ""
#endif
#ifndef WIFI_SSID_3
#define WIFI_SSID_3 ""
#define WIFI_PASS_3 ""
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

#ifndef PN532_UART
#define PN532_UART 0
#endif

#define USE_PRESENCE_SENSOR 0
#define PRESENCE_MM 650

#define PIN_SDA 21
#define PIN_SCL 22
#define PIN_PN532_IRQ 26
#define PIN_PN532_RESET 27
#define PIN_PN532_RX 16
#define PIN_PN532_TX 17
#define PIN_BUZZER 4
#define PIN_LED_GREEN 18
#define PIN_LED_YELLOW 5
#define PIN_LED_RED 19
#define PIN_CAM_TRIGGER 25
