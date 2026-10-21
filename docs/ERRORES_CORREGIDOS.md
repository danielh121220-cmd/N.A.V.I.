# Errores encontrados y cómo se corrigieron

## Fallos que rompían la app

| Error | Efecto | Corrección |
| --- | --- | --- |
| La pantalla de login quedó a medias: `index.html` llamaba a `setBotCharacter()`, que no existía en `app.js`. | Los bots no se dibujaban (solo ojos flotando) y tocar un personaje daba error. | Login nuevo con los 6 bots completos y reacciones a cada acción. |
| El servidor guardaba avisos en una columna `recipient_phone` que la tabla nueva no tenía. | En una instalación limpia cada toque de tarjeta daba error 500. | Esquema nuevo y consistente en `backend/data/navi.sqlite`. |
| La ESP32-CAM enviaba JPEG crudo y el servidor esperaba JSON en base64. | Todas las fotos se rechazaban (error 400). | El servidor acepta JPEG directo y une la foto con el registro (±6 s). |
| El lector nunca activaba el pin de disparo de la cámara. | La cámara no tomaba fotos al marcar. | El lector envía un pulso por GPIO 25 en el momento del toque. |
| `Adafruit_PN532 nfc(Wire)` no corresponde a ningún constructor de la librería. | El firmware del lector no compilaba. | `Adafruit_PN532 nfc(IRQ, RESET, &Wire)`. |
| El estado del hardware estaba fijo en el código (`esp32_connected: true`). | La app decía "conectado" aunque no hubiera nada. | Los ESP32 envían un latido cada 30 s; la app muestra el estado real. |

## Huecos de seguridad

| Problema | Corrección |
| --- | --- |
| Contraseñas guardadas en texto plano. | Cifrado scrypt con sal. |
| El "token" era texto adivinable y `/api/auth/me` confiaba en un encabezado con el id. | Sesiones firmadas con HMAC que vencen a los 30 días. |
| Cualquiera podía registrarse como Administrador y editar el perfil de otro. | La primera cuenta es administradora; las demás son docentes. Cada usuario solo edita su perfil. |
| Cualquiera en el WiFi podía marcar asistencia con un `POST` y cualquier UID. | Los ESP32 deben enviar la **clave de terminal**; el simulador exige sesión iniciada. |
| La API de estudiantes, fotos y asistencias no pedía sesión. | Toda la API y el WebSocket exigen sesión. |
| Sin límite de intentos de login. | Bloqueo temporal tras 12 intentos fallidos en 5 minutos. |
| Correos de ejemplo que parecían reales (`fcastro@hogar.net`). | Datos de ejemplo con `@example.com` y teléfonos ficticios. |

## Errores de lógica

| Problema | Corrección |
| --- | --- |
| No existía el estado **AUSENTE** (`absent_limit_min` nunca se usaba). Se avisaba cuando el alumno llegaba, pero no cuando faltaba. | Al pasar el límite de cada curso se marcan ausentes y se avisa al representante. Si llega después, pasa a atraso. |
| El "burst lock" marcaba como fraude al **segundo alumno inocente** de una fila y le mandaba "ALERTA DE SEGURIDAD" a su papá. | Ahora es "Revisión", nunca alerta a los padres. Con el sensor VL53L0X se compara por presencia, no por tiempo. |
| El registro offline guardaba `millis()` (tiempo desde que se encendió) y nunca se reenviaba. | Se guarda la hora real y se reenvía por lotes al volver el WiFi. |
| La fecha usaba UTC: después de las 19:00 en Ecuador los registros caían en el día siguiente. | Fecha y hora locales. |
| Se esperaba a que salieran los correos antes de responder al ESP32. | El servidor responde de inmediato y avisa en segundo plano. |
| El lector tardaba unos 4 segundos por alumno (tonos + pausas de 2,5 s + 0,8 s). | Respuesta en ~1 s y lectura sin bloqueos: la fila avanza el doble de rápido. |
| CallMeBot solo envía WhatsApp a tu propio número, no a los padres. | Correo y Telegram automáticos + enlace de WhatsApp de un toque. |
| `face_matched` siempre era `true`: no había reconocimiento facial real. | Se quitó la promesa. La foto sirve para que el docente compare en la revisión. |
| Datos de ejemplo de Colombia (+57, "acudiente", "grado"). | Datos de Ecuador (+593, "representante", cursos de bachillerato). |
| Dependencias de internet (Tailwind, Lucide, Google Fonts, fotos de Unsplash). | Todo local: la app funciona sin internet en la red del colegio. |
| Las fotos se guardaban sin fecha de borrado. | Se borran solas a los 7 días (configurable). |

## Ronda 2

| Problema | Corrección |
| --- | --- |
| Al cambiar la hora de entrada de un curso quedaban "ausentes" automáticos falsos del mismo día. | Se borran y se recalculan con el horario nuevo. |
| Los encabezados de letra en Estudiantes se encimaban sobre las filas (sticky dentro de un contenedor recortado). | Contenedores con `overflow: clip`. |
| La animación de los ojos de los bots corría a la frecuencia de la pantalla (hasta 120 fps) aunque estuvieran quietos. | El bucle se detiene cuando nada se mueve y despierta con el cursor o con un cambio de humor. |
| Cada consulta SQL se preparaba de nuevo en cada petición. | Caché de consultas preparadas (89 consultas la usan). |
| Sin cabeceras de seguridad. | Content-Security-Policy, `no-store` en la API y bloqueo de iframes. |
| Si el servidor reiniciaba con la sesión vencida, el WebSocket reintentaba para siempre. | Al tercer intento se verifica la sesión y, si venció, vuelve al login. |
| En la cuenta demo no se podían probar los ajustes de avisos. | Permitido en modo demo. |
| En iPhone los campos de menos de 16 px hacían zoom al tocarlos. | Todos los campos usan 16 px. |
| No había forma de sacar un reporte. | Exportación CSV (abre en Excel) desde Ajustes → Reportes. |

## Ronda 3

| Problema | Corrección |
| --- | --- |
| Los formularios de lista de la ficha médica heredaban el estilo del contenedor principal (clase `main`) y se deformaban. | Clase propia `li-main`. |
| En el panel de Inicio quedaba un hueco en la cuadrícula de indicadores. | Cuatro indicadores iguales en 2×2. |
| Cada aviso aparecía repetido (correo + WhatsApp del mismo evento). | Se agrupan por estudiante y evento, mostrando los canales usados. |
| Si se tocaba la tarjeta para asistencia y enseguida en modo emergencia, el segundo toque se ignoraba como "tarjeta sostenida". | En modo emergencia no se aplica ese filtro. |

## Ronda 4

| Problema | Corrección |
| --- | --- |
| El correo solo se podía configurar editando `.env` y reiniciando. | Se configura en Ajustes → Canales → Correo, con comprobación de conexión y correo de prueba. |
| Si la contraseña de Gmail estaba mal, el error decía "535 Invalid login". | Mensajes en español que dicen qué hacer (por ejemplo, usar la contraseña de aplicación). |
| Un corte de internet hacía fallar el correo para siempre. | Dos reintentos automáticos antes de marcarlo como fallido, y botón **Reintentar**. |
| El correo era un texto plano con un encabezado de color. | Diseño nuevo con foto del estudiante, datos del curso, recuadro de acción y teléfono del colegio. |
| No había forma de avisar al DECE o a inspección. | Copia institucional configurable y respuestas dirigidas al correo del DECE. |
| WhatsApp solo aparecía si no había llegado ningún otro aviso. | Las ausencias y emergencias también se preparan por WhatsApp. Opción de envío automático con la API oficial de Meta. |
| Los enlaces de WhatsApp se quedaban "por enviar" aunque ya se hubieran mandado. | Al tocar **Enviar** se marca como enviado, y hay una lista para enviar todos los pendientes. |
| Un celular mal escrito generaba un enlace de WhatsApp roto. | Se valida al guardar el estudiante (`09…`, `9…` o `+593…`). |
| El campo de correo del representante aceptaba solo uno. | Acepta varios separados por coma. |
| El docente no podía escribir un mensaje propio al representante. | Mensajes con plantillas y vista previa desde la ficha del estudiante. |

## Ronda 5

| Problema | Corrección |
| --- | --- |
| Copiar solo el número (UID) de una tarjeta bastaba para marcar asistencia por otro. | Cada tarjeta lleva una credencial firmada con HMAC-SHA256; el lector la lee y el servidor marca para revisión las tarjetas sin firma válida. |
| Los estudiantes no tenían forma de entrar a la app. | Inicio con su tarjeta NFC, PIN de 4 números la primera vez y celular vinculado. |
| Las faltas no se podían justificar, aunque el art. 170 del Reglamento a la LOEI lo exige. | Botón **Justificar** en el registro; la falta justificada no afecta la racha ni la mascota. |
| Grabar la ficha médica en la tarjeta borraba cualquier otro dato. | Se graban juntos el enlace de emergencia y la credencial. |
| Las listas usaban iniciales cuando no había foto. | Cada estudiante tiene una de 40 mascotas únicas en su curso. |
| La app solo se podía usar desde el navegador. | App de Android con NFC nativo para leer y grabar tarjetas. |
| Un correo de prueba con el servidor caído tardaba 19 s en responder por los reintentos. | La prueba no reintenta; los avisos reales sí. |

## Ronda 6

| Problema | Corrección |
| --- | --- |
| Grabar la credencial exigía un celular con NFC, y muchos estudiantes y docentes no tienen. | El lector del aula (PN532) graba la tarjeta: el docente lo activa desde la app y el estudiante deja la tarjeta quieta hasta oír dos bips. El lector relee lo grabado antes de confirmar. |
| Un estudiante sin celular con NFC no podía entrar a la app. | Al marcar en el lector aparece un código de 6 números que vence en 5 minutos y sirve una sola vez. Funciona en cualquier celular, también en iPhone. |
| La mascota aparecía solo en la app. | El primer toque en el lector muestra la mascota en la pantalla OLED: "NACIO LUMI!". |
| La cuenta del estudiante se mezclaba con la del docente en la misma pantalla. | La pantalla de inicio tiene dos cuentas separadas, Docente y Estudiante, y recuerda la última que se usó. |
| Mientras se esperaba una grabación, el resto del curso no podía marcar. | Solo la tarjeta del estudiante elegido se graba; las demás marcan asistencia normal. |
| Una tarjeta MIFARE Classic dejaba la grabación a medias. | El lector la detecta y pide una NTAG213 o NTAG215. |
| El lector mostraba un código nuevo en cada toque, aunque el estudiante ya tuviera cuenta. | El código aparece solo hasta que el estudiante crea su cuenta. Se guarda cifrado en la base de datos (sobrevive a un reinicio del servidor) y la sesión dura todo el año. |
| Faltar no tenía ninguna consecuencia en la mascota ni avisaba de un posible abandono. | La mascota tiene 5 corazones; con 5 faltas seguidas sin justificar se va, el estudiante elige otra y se avisa al representante y al DECE. El docente ve una alerta temprana desde 3 faltas. |
| Un feriado con el servidor encendido marcaba a todos como ausentes y habría quitado corazones. | Un día solo cuenta si al menos un estudiante del curso asistió. |

## Ronda 7 (app de Android y medidas reales)

| Problema | Corrección |
| --- | --- |
| En Android el texto no se parecía al de un iPhone: Android no trae la letra San Francisco y usaba Roboto. | La app incluye la letra Inter (libre, licencia OFL), la más cercana a San Francisco. Inter Display para títulos y Inter para el texto. |
| En el celular el texto era pequeño (15 px). | En celulares el texto sube a 17 px, el tamaño de iOS, con el mismo espaciado entre letras. |
| La flecha atrás de Android cerraba la app aunque hubiera una hoja abierta. | Primero cierra la hoja; después vuelve a la pantalla anterior; si no hay más, deja la app en segundo plano sin cerrarla. |
| La barra de estado y la de navegación quedaban de otro color al cambiar entre modo claro y oscuro. | Las dos barras toman el color del fondo (#F2F2F7 o negro) y cambian al instante con el tema. |
| Al abrir la app se veía un destello blanco en modo oscuro. | Tema de Android propio, claro y oscuro, con el fondo correcto desde el primer cuadro. |
| La vibración no funcionaba en la app de Android. | Vibración nativa corta en cada botón. |
| Con letra grande en el sistema, la app se desarmaba; también se podía hacer zoom por error. | El tamaño de letra del sistema se respeta hasta 118 % y el zoom con dos dedos está desactivado. |
| En Ajustes, "Cursos y horarios" quedaba encima del nombre del curso. | Se corrigió el margen negativo. |
| En pantallas de 360 px los días de la semana tapaban la palabra "Días" y varios textos se cortaban con "…". | Botones de días más pequeños en pantallas angostas y los subtítulos pasan a dos líneas, como en Ajustes de iPhone. |
| Las medidas de los módulos en la carcasa eran aproximadas. | Se usaron las medidas de las hojas de datos (PN532 43 × 41 mm, ESP32 52 × 28,3 mm, ESP32-CAM 27 × 40,5 mm…) y se comprobó en Fusion que no chocan: 0 interferencias. |
