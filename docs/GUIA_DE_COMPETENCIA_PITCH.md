# Guía de exposición y defensa · N.A.V.I

**Concurso:** KILLTRONIC 8.0 · Carrera de Electrónica y Automatización, UPS Guayaquil
**Categoría:** Básica · Impacto Tecnológico · temáticas *Educación y aprendizaje* y *Cuidado y asistencia a personas*
**Idea en una frase:** una sola tarjeta NFC que marca asistencia en un segundo, avisa a la familia el mismo día, protege contra la suplantación y puede salvar una vida con su ficha médica.

## 1. Requisitos del reglamento

| Requisito | Cómo lo cumple N.A.V.I |
| --- | --- |
| Equipo de 2 integrantes que conocen todo el proyecto (arts. 1.1 y 4.3) | Los dos deben poder explicar el circuito, el código y el servidor (reparto en la sección 7) |
| Desarrollo propio, puede usar librerías si se explica el aporte (art. 2.2) | Librerías de Adafruit y Espressif; el firmware, el servidor, las apps y la carcasa son propios |
| Proyecto terminado y funcional (art. 2.4) | Lector armado + servidor en la laptop + app en el celular |
| Informe técnico de máximo 10 páginas con la estructura del Anexo 2 (art. 4.1) | `docs/INFORME_TECNICO_NAVI.docx` (8 páginas). Pásalo al formato oficial .doc del concurso y completa lo resaltado en amarillo |
| Homologación: que coincida con el informe y sea seguro (art. 4.2) | Fuentes de 5 V, sin cables sueltos, carcasa cerrada |
| Robótica o automatización como herramienta principal (art. 5.2) | Sensor (NFC) → controlador (ESP32 con dos núcleos) → actuadores (pantalla, LEDs, buzzer, cámara) y decisiones automáticas (ausentes, avisos, alertas) sin intervención humana |
| 10 min de exposición y demostración + 5 min de preguntas (art. 5.3) | Guion de la sección 4 |

## 2. Cómo sumar en cada criterio de la rúbrica

| Criterio (puntos) | Qué mostrar o decir |
| --- | --- |
| **Funcionalidad (30)** | Demo en vivo (sección 3): puntual, atraso con aviso, tarjeta copiada, pase de lista, mascota y ficha médica. El toque llega a la app en una décima de segundo. Funciona sin internet y en el hotspot del celular. Ten el video de respaldo listo. |
| **Originalidad (20)** | La misma tarjeta sirve para tres cosas: asistencia, ficha médica e ingreso del estudiante. Mascota única que nace en la pantalla del lector. Revisión con evidencia en lugar de acusación automática. El lector encuentra el servidor solo en cualquier red. |
| **Exposición (20)** | Usa el guion, repartan las partes y respondan con datos. Nunca prometan "imposible de hackear". |
| **Estética (10)** | Carcasa azul propia impresa en 3D, cámara blanca, llaveros con logo. App con diseño cuidado, modo oscuro, mascotas y recorrido guiado con el bot. Cables ordenados en la mesa. |
| **Aplicación del dispositivo (10)** | La LOEI obliga a registrar la asistencia y avisar de inmediato a los representantes (arts. 169 y 170). N.A.V.I hace justo eso, permite justificar faltas y da una alerta temprana al DECE. |
| **Informe técnico (10)** | Máximo 10 páginas, con las 9 secciones del Anexo 2, fotos reales del prototipo y la medición del pase de lista en el aula. |

## 3. Demostración en vivo (7 pasos, unos 4 minutos)

Antes de empezar: abre **`INICIAR_NAVI_DEMO.bat`** en la laptop (los datos de la demostración van aparte de los reales), entra con **Entrar a la cuenta de demostración**, ve a **Lector → Entrada = ahora** y ten a mano dos tarjetas grabadas. En el celular, escribe **12122008** en el campo del servidor de la app para abrir la demostración sin servidor.

1. **Puntual.** Pasa una tarjeta por el lector: LED verde, "HOLA MATEO · A TIEMPO" y la app se actualiza al instante.
2. **Atraso y aviso.** Baja la tolerancia a 0 min en Ajustes y pasa otra tarjeta: LED amarillo. Muestra el aviso en **Inicio → Avisos** y el correo con copia al DECE.
3. **Tarjeta copiada.** En **Lector → Casos especiales → Tarjeta copiada**: el registro aparece en **Revisión** con el motivo "puede ser una copia de la tarjeta". Explica la firma HMAC.
4. **Dos tarjetas seguidas.** Pasa dos tarjetas en menos de 1,5 s: queda en revisión con las fotos de la cámara.
5. **Pase de lista por excepción.** Abre **Pase de lista**, toca a quien no está y confirma.
6. **La mascota, sin celular con NFC.** Pasa por primera vez una tarjeta nueva: el lector muestra la mascota y "NACIO LUMI! · CODIGO APP". En cualquier celular (mejor un iPhone, para que se note): **Estudiante → Usar el lector del aula**, escribe el código, crea el PIN y la mascota sale del huevo. Vuelve a pasar la tarjeta: ya no sale código, porque la cuenta quedó guardada. Muestra los corazones y, en la cuenta del docente, **Inicio → Alerta temprana**. Antes de la demo, graba una tarjeta con **Grabar con el lector del aula** delante del jurado: 2 segundos.
7. **Ficha médica (el cierre).** Acerca cualquier celular a la tarjeta de Mateo: se abre su ficha con la alergia grave a la penicilina. En la laptop aparece "Ficha médica abierta". Frase final: *"La misma tarjeta que marca asistencia puede salvar una vida."*

**Plan B:** si el WiFi del evento no deja que los equipos se vean, conecta la laptop, el lector y la cámara al **hotspot de tu celular en 2.4 GHz** (el lector ya lo tiene guardado en `mis_datos.h` y encuentra el servidor solo). Si aun así falla, la demo sigue con el simulador de la app (**Lector**) y con la demostración del celular (código 12122008), que no necesita servidor. Si el jurado pregunta por el sistema real, abre `INICIAR_NAVI.bat`: está limpio, sin botones de prueba, y guía la configuración con **Primeros pasos**. Lleva también un video de la demo grabado en casa.

## 4. Exposición de 10 minutos

Reparto sugerido: problema (1 min 30 s), solución (2 min), demostración en vivo (5 min, sección 3), impacto y cierre (1 min 30 s). Después vienen 5 minutos de preguntas.

**Problema (40 s).** "En el Ecuador, el año pasado más de 72 mil estudiantes abandonaron el colegio, y antes de abandonar casi siempre hay faltas y atrasos. Pasar lista a mano toma minutos de cada clase, un amigo puede decir 'presente' por otro, y la familia se entera tarde. La ley dice que hay que avisar de inmediato."

**Solución (80 s).** "N.A.V.I es un lector NFC con ESP32 programado en C++. El estudiante acerca su tarjeta y en un segundo queda registrado. El servidor, que corre en la red del colegio y funciona sin internet, decide si llegó a tiempo o tarde, marca a los ausentes y avisa a la familia por correo o WhatsApp. El docente no llama lista: mira el salón y toca solo a quien no está."

**Diferencia (40 s).** "Cada tarjeta lleva una firma cifrada que solo nuestro servidor puede comprobar: si alguien copia el número de la tarjeta, el registro queda en revisión. Además, cualquier persona que acerque un celular a la tarjeta ve la ficha médica del estudiante, con permiso de sus padres. Y cada estudiante tiene una mascota única que crece cuando llega a tiempo."

**Cierre (20 s).** "Cuesta entre 30 y 65 dólares por aula, no usa huellas ni rostros de menores y ahorra papel. Una tarjeta, tres funciones: asistencia, seguridad y emergencia."

## 5. Preguntas difíciles del jurado

**¿Qué impide que un estudiante pase la tarjeta de su amigo?**
"Ningún sistema sin biometría lo elimina al 100 %, y la biometría de menores está restringida por la ley. Lo que hacemos es que deje evidencia: el docente confirma por excepción y ve quién no está sentado, dos tarjetas seguidas quedan en revisión con foto, el sensor de distancia detecta a una misma persona pasando dos tarjetas y detectamos parejas que se marcan juntas varios días."

**¿Se puede clonar la tarjeta?**
"Las MIFARE Classic se copian en segundos; por eso usamos NTAG213. Además grabamos una credencial firmada con HMAC-SHA256 ligada al número de la tarjeta y a una versión. Sin la clave del servidor no se puede fabricar una credencial, no sirve en otra tarjeta y la anulamos si se pierde. Alguien con equipo especializado podría copiar la tarjeta completa a un chip que imite el número; por eso la revisión del docente sigue siendo la capa principal, y la versión 2 usa NTAG 424 DNA, que genera un código distinto en cada toque con AES-128."

**¿Y los estudiantes que no tienen celular con NFC?**
"No lo necesitan. El mismo lector del aula graba la tarjeta, y al marcar muestra un código de 6 números que sirve una vez y vence en 5 minutos. Con ese código entran desde cualquier celular, incluso un iPhone. El código solo aparece cuando la tarjeta física está sobre el lector."

**¿Qué es exactamente esa "clave encriptada"?**
"Es una firma, no un texto cifrado. El servidor calcula un HMAC-SHA256 del código del estudiante, el número de la tarjeta y la versión, con una clave secreta que nunca sale del servidor. El lector la lee de la memoria NDEF y la envía; el servidor recalcula la firma y la compara en tiempo constante."

**¿No es peligroso que cualquiera vea datos médicos?**
"Solo se muestra si el representante lo autoriza (la LOPDP exige su consentimiento expreso para datos de salud de menores), solo lo necesario para una emergencia, cada apertura queda registrada y avisa al colegio y a la familia, y si la tarjeta se pierde el enlace se cambia en un segundo."

**¿Por qué no huella o reconocimiento facial?**
"Son datos biométricos de menores. La LOPDP los trata como sensibles y en 2026 la Superintendencia de Protección de Datos restringió su uso para identificar a menores cuando hay un medio menos invasivo. La tarjeta NFC es ese medio. La cámara no reconoce rostros: solo guarda una foto que el docente ve cuando hay una duda, y se borra sola a los 7 días."

**¿Y si se cae el internet o el WiFi?**
"El servidor está en la red del colegio, no en la nube. Si se cae el WiFi, el lector guarda cada registro con su hora en su memoria (LittleFS) y lo envía cuando vuelve la conexión. El servidor rechaza registros con más de 72 horas para evitar trampas."

**¿La mascota no presiona a los estudiantes? ¿Por qué se muere?**
"La mascota tiene 5 corazones y pierde uno por cada día de clase que el estudiante falta sin justificación. Con un solo día de asistencia los recupera todos. Solo se va después de una semana entera de clases sin venir, que es justo cuando el colegio debe actuar: ese mismo día se avisa al representante y al DECE. Para que no sea un castigo injusto: es privada y no hay ranking, avisa antes con los corazones, las faltas justificadas no cuentan, los feriados no cuentan, y si el docente justifica una falta después, la mascota vuelve. Si se va, el estudiante elige un huevo nuevo de inmediato y conserva sus logros."

**¿Y el código de 6 números no es inseguro?**
"Solo aparece hasta que el estudiante crea su cuenta, sirve una vez y vence en 12 horas. Solo se ve en la pantalla cuando la tarjeta física está en el lector. El servidor guarda el código cifrado (HMAC), limita los intentos por equipo y pausa el ingreso por código si hay muchos intentos fallidos. Después de crear la cuenta, el lector ya no muestra códigos."

**¿Cuánto cuesta y quién lo paga?**
"Entre 30 y 45 dólares por aula sin cámara y entre 45 y 65 con cámara. Las tarjetas cuestan menos de un dólar y se reutilizan por años. El servidor corre en una computadora que el colegio ya tiene."

**¿Dónde está la robótica o la automatización?**
"Es un sistema de automatización completo: un sensor (el lector NFC) entrega un dato, un controlador (el ESP32, con un núcleo para leer tarjetas y otro para la red) decide y acciona la pantalla, los LEDs, el buzzer y la cámara. Después el servidor toma decisiones solo: marca ausentes al pasar la hora límite, avisa a los representantes y alerta al DECE, sin que nadie tenga que hacerlo a mano."

**¿Y si la red del evento falla o es otra?**
"Funciona sin internet. El lector guarda hasta tres redes WiFi y, si la computadora cambió de dirección, la busca solo en la red y comprueba con la clave que sea la correcta. Podemos usar el hotspot de un celular. Si no hay red, guarda los toques con su hora y los envía al volver."

**¿Lo probaron?**
"Sí: pruebas automáticas de toda la app, registros medidos en el servidor en 2 a 5 ms, el toque llega a la app en una décima de segundo, pruebas de credenciales falsificadas y copiadas, y la medición del pase de lista en el aula que está en el informe." *(Completa esa medición antes de la competencia.)*

**¿Es solo una app con un lector?**
"No. El lector es un sistema embebido completo: lectura NFC sin bloqueo, lectura de la memoria NDEF, cola sin conexión, reloj sincronizado, cámara disparada por GPIO y sensor de presencia. Todo en C++ con Arduino IDE."

**¿Qué mejorarían?**
"Tarjetas NTAG 424 DNA, servidor con HTTPS para que la ficha abra con datos móviles, exportar al formato de Educar Ecuador y un piloto de un mes con encuestas."

## 6. Lo que NO debes decir

- "Es imposible de hackear" o "imposible de clonar".
- "Hace reconocimiento facial."
- "Cuesta menos de 20 dólares por aula."
- Cifras sin fuente. Si no sabes un dato, di que lo vas a medir.

## 7. Reparto entre los dos integrantes

| Integrante 1 | Integrante 2 |
| --- | --- |
| Problema, circuito, firmware en C++, red | Servidor, app, seguridad, ficha médica |
| Pasos 1 a 4 de la demo | Pasos 5 a 7 de la demo |

Los dos deben poder responder cualquier pregunta: el reglamento exige que ambos conozcan todo el proyecto.
