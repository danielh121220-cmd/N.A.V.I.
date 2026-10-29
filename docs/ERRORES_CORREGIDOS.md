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

## Ronda 8 (sistema real y demostración separados)

| Problema | Corrección |
| --- | --- |
| La app real mostraba botones de prueba ("Probar con la cuenta demo", estudiantes de ejemplo, simulador del lector), que no deberían verse en un colegio. | El servidor arranca en modo real por defecto. La demostración se abre con `INICIAR_NAVI_DEMO.bat` o, en el celular, con el código 12122008 en el campo del servidor. |
| Los datos de prueba podían quedar mezclados con los reales. | La demostración usa su propia base de datos (`backend/data-demo`). Una sesión de la demostración no sirve en el sistema real: las firmas son distintas. |
| Un colegio nuevo empezaba con 9 estudiantes inventados. | El sistema real empieza vacío. La primera pantalla pide crear la cuenta del administrador y el Inicio muestra **Primeros pasos**: curso, estudiantes, lector y tarjetas. |
| Sin cursos, el pase de lista mostraba un cronómetro y "Este curso no tiene estudiantes". | Muestra "Aún no hay cursos" y dónde crearlos. |
| La pestaña Terminal era un simulador. | En el sistema real se llama **Lector**: muestra en vivo lo que ve el estudiante en el lector, el hardware conectado y la configuración del firmware. El simulador queda solo en la demostración. |
| La demostración dentro del APK se abría en formato de computadora, con letra diminuta, y las tildes podían verse como "RevisiÃ³n". | El archivo de la demostración ahora es una página completa, con la codificación UTF-8 y el tamaño de pantalla del celular declarados al inicio. |

## Ronda 9 (pruebas en un celular real)

| Problema | Corrección |
| --- | --- |
| En Windows con Node.js 24, `INICIAR_NAVI.bat` fallaba con "gyp ERR! … Visual Studio": la base de datos (better-sqlite3) necesitaba compilarse y no había versión lista para ese Node. | El servidor usa la base de datos SQLite que ya viene dentro de Node.js (`node:sqlite`). Ya no se compila nada: la instalación baja 77 paquetes de JavaScript en segundos. El `.bat` revisa que Node sea 22.13 o más nuevo y avisa si no. |
| En el celular, la pantalla de inicio se corría a la derecha y el formulario quedaba cortado. | Con la letra grande de Android, un elemento empujaba el ancho de la pantalla. La columna ahora nunca pasa del ancho del celular. Se probó todo con la letra al 118 %. |
| En "Tu semana" el último círculo se salía de la tarjeta. | Los cinco días se reparten el ancho disponible. Los días ahora dicen Lu, Ma, Mi, Ju, Vi (antes "X" para miércoles) y abajo dice cuántos días llegaste a tiempo. |
| El botón del huevo en la versión de demostración se salía en pantallas angostas. | El texto pasa a dos líneas. |
| Al tocar la mascota o cualquier tarjeta, Android pintaba un recuadro azul encima. | Se quitó el resaltado de toque de Android en toda la app; cada botón ya tiene su propia animación al tocarlo. |
| Para probar con el lector había que copiar a mano la IP y la clave de terminal en dos archivos del firmware, y era fácil equivocarse. | Al iniciar, el servidor escribe `servidor.h` en las dos carpetas del firmware con la IP, el puerto y la clave. Solo se escribe el WiFi en `config.h`. Guía nueva: `PROBAR_CON_LOS_MODULOS.md`. |
| Arduino IDE 2 con el núcleo ESP32 3.3.11 no compilaba el lector: "'alertFor' was not declared in this scope". | Arduino no generó la declaración automática de esa función. Los dos programas ahora declaran todas sus funciones al inicio. Se compilaron con el mismo núcleo 3.3.11 y las librerías actuales (con y sin el sensor VL53L0X) sin errores. |
| Las guías decían que el PN532 va en I2C con "CH1 OFF y CH2 ON", pero esa posición es SPI. Con eso el ESP32 mostraba "PN532 no detectado". | Corregido en todas las guías, el diagrama y el reporte: **switch 1 en ON y switch 2 en OFF** es I2C (según el manual del módulo V3). El Monitor serie ahora lo dice al fallar. |
| Con algunos PN532, el ESP32 no los encontraba por I2C y además el bus dejaba de responder (ni la pantalla aparecía en la búsqueda). | El lector puede usar el PN532 por UART (`#define PN532_UART 1`, GPIO 16 y 17, switches en OFF) y deja el I2C solo para la pantalla. Al arrancar, el Monitor serie lista los módulos I2C que encuentra. |
| Con el PN532 por UART el lector lo detectaba, pero nunca leía una tarjeta. | Cuando no había tarjeta, la respuesta del PN532 llegaba tarde y se quedaba en el buffer del puerto serie, y desordenaba todas las lecturas siguientes. Ahora el lector limpia el buffer antes de cada orden, espera un poco más la respuesta y hace menos reintentos por lectura (lector-3.4). |

## Ronda 10 (SMS y cámara)

| Problema | Corrección |
| --- | --- |
| Los avisos al número del representante solo podían salir por WhatsApp de un toque (manual) o con la API de Meta (pagada y con aprobación). | Nuevo canal **SMS**: un celular Android con chip y la app N.A.V.I envía los SMS solo, desde su propio plan. Si el celular se desconecta, los SMS esperan y salen al volver. Cada SMS muestra su estado en Avisos. |
| La cámara no explicaba qué fallaba y solo se podía probar con el lector conectado. | El Monitor serie de la cámara indica PSRAM, WiFi y servidor, y con la letra **f** toma una foto de prueba (camara-3.1). |
| Para disparar la foto había que llevar un cable del lector a la cámara, y con la placa ESP32-CAM-MB los pines de la cámara quedan tapados. | En cada toque el servidor le pide la foto a la cámara por WiFi (camara-3.2), con la misma clave de terminal. El cable de disparo queda como opción. |

## Ronda 11 (colegio completo)

| Problema | Corrección |
| --- | --- |
| En el celular, la lista de Avisos se veía encimada: los textos de una fila se montaban sobre la siguiente. | Las filas usaban por error el estilo de los botones del simulador (altura fija). Ahora cada fila crece con su texto. |
| Todos los docentes veían todos los cursos y estudiantes del colegio. | El administrador asigna los docentes de cada curso. Cada docente ve solo sus cursos, estudiantes, registros, avisos, alertas y estadísticas, también en vivo. No puede editar estudiantes ni pasar lista de cursos ajenos. |
| No se sabía a qué aula pertenecía cada lector. | Cada lector se asigna a un aula desde la pestaña Lector, con un nombre visible. Si un estudiante marca en el lector de otra aula, el registro dice "otra aula". |
| El saludo decía "Buenas tardes, Prof." | Se saltan los títulos (Prof., Lic., Ing., Dr.) y saluda con el nombre. |

## Ronda 12 (velocidad en otras redes)

| Problema | Corrección |
| --- | --- |
| En la red de otro colegio, el lector leía la tarjeta pero el registro tardaba mucho en llegar al servidor y a la app. | El lector abría una conexión nueva para cada toque. En una red WiFi cargada cada conexión nueva tarda y a veces se pierde: se agotaba el tiempo, el toque iba a la cola y la cola se enviaba recién a los 15 s. Ahora (lector-3.6) mantiene **una sola conexión abierta** con el servidor, envía cada toque en un solo paquete y, si algo falla, reintenta al instante con una conexión nueva sin duplicar el registro. La cola se envía a los 2 s de volver la conexión. |
| Mientras el lector hablaba con el servidor (avisar que sigue conectado, enviar la cola), dejaba de leer tarjetas durante varios segundos. | Toda la comunicación corre aparte, en el otro núcleo del ESP32. La lectura de tarjetas y la pantalla nunca se detienen. |
| En colegios con varias antenas WiFi del mismo nombre, el ESP32 se conectaba a la primera que encontraba, aunque estuviera lejos. | El lector y la cámara buscan en todos los canales y se conectan a la antena con mejor señal. |
| El servidor guardaba el estado del lector y le pedía la foto a la cámara antes de responder. | Responde primero al lector y hace el resto después. |
| Si la conexión en vivo de la app se cortaba sin avisar (cambio de antena, celular que se duerme), la app se quedaba esperando sin recibir los toques. | La app comprueba la conexión cada 10 s y se reconecta sola. Si la red del colegio bloquea la conexión en vivo, la app consulta los registros cada 4 s. |
| La app tardaba en abrir en redes lentas. | El servidor comprime la app y los datos (unas 3,5 veces menos), y el celular abre la app desde su memoria sin esperar a la red. Cuando la app cambia, se actualiza sola. |
| Windows marca las redes de otros lugares como "Pública" y su Firewall frena a los lectores. | `INICIAR_NAVI.bat` avisa al arrancar si la red es Pública y explica cómo cambiarla a Privada. |

## Ronda 13 (cualquier red)

| Problema | Corrección |
| --- | --- |
| Al cambiar de red (otro colegio, hotspot del celular) la PC tenía otra IP y había que volver a programar el lector y la cámara. | El lector (lector-3.7) y la cámara (camara-3.4) buscan el servidor solos en la red cuando no lo encuentran, comprueban con la clave de terminal que sea el servidor correcto y guardan su dirección. El servidor responde a esa búsqueda. |
| El lector solo conocía una red WiFi. | Se pueden guardar hasta tres redes en `mis_datos.h`; se conecta a la que encuentre con mejor señal y cambia sola si una se cae. La reconexión corre aparte y no frena la lectura de tarjetas. |
| En el celular había que escribir la IP del servidor. | La app de Android (3.12) tiene **Buscar en esta red** y busca sola cuando no puede conectarse. |

## Ronda 14 (PN532 por UART)

| Problema | Corrección |
| --- | --- |
| Con la carpeta nueva el lector no encontraba el PN532, aunque con la anterior sí. | El PN532 estaba cableado por UART, pero el `mis_datos.h` nuevo que crea el servidor venía con `PN532_UART 0` (I2C). Ahora (lector-3.8) el lector prueba UART e I2C al encender, usa el que responda y lo recuerda para el siguiente arranque. Ya no depende de `PN532_UART`. |

## Ronda 15 (foto de la cámara en cualquier red)

| Problema | Corrección |
| --- | --- |
| La cámara salía En línea, pero ningún registro tenía foto ("La cámara no envió foto de este registro"). | El servidor pedía la foto llamando a la IP desde la que veía llegar a la cámara. En algunas redes (repetidores, hotspot de Windows o programas que redirigen conexiones) esa IP era la de la misma PC, así que el pedido nunca llegaba. Ahora (camara-3.5) la cámara deja abierta una conexión con el servidor y el servidor le responde "toma la foto" en el mismo instante del toque (unos milisegundos). Si un toque cae justo mientras la cámara se reconecta, la foto se toma al volver. La cámara también informa su propia IP. Las cámaras con camara-3.4 siguen funcionando como antes. |
