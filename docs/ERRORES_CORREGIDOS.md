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
