# Guía de exposición y defensa · N.A.V.I

**Categoría:** Innovación Tecnológica · Ateneo Robotics League (2.ª edición)
**Idea en una frase:** una sola tarjeta NFC que marca asistencia en un segundo, avisa a la familia el mismo día, protege contra la suplantación y puede salvar una vida con su ficha médica.

## 1. Requisitos del reglamento (verificación inicial)

| Requisito | Cómo lo cumple N.A.V.I |
| --- | --- |
| Tecnología Arduino | ESP32 programado con el núcleo Arduino de Espressif |
| Programación en C++ con Arduino IDE | `firmware/navi_esp32_pn532/navi_esp32_pn532.ino` y `firmware/navi_esp32_cam/navi_esp32_cam.ino` |
| Componentes con función específica | Cada módulo tiene un propósito (tabla del capítulo 5 del reporte) |
| Prototipo terminado y operativo | Lector armado + servidor en la laptop + app en el celular |
| Reporte técnico en PDF | `docs/REPORTE_TECNICO_NAVI.pdf` (completa los espacios en naranja) |
| Reconocer recursos de terceros | Sección "Software y librerías de terceros" del reporte |
| Máximo 2 estudiantes que conocen todo el proyecto | Los dos deben poder explicar el circuito, el código y el servidor |

## 2. Cómo sumar en cada uno de los 10 criterios

| Criterio | Qué mostrar o decir |
| --- | --- |
| **Originalidad** | La misma tarjeta sirve para tres cosas: asistencia, ficha médica de emergencia e inicio de sesión del estudiante. Mascota única por estudiante. Revisión con evidencia en lugar de acusación automática. |
| **Funcionalidad** | Demo en vivo (sección 3): puntual, atraso, tarjeta copiada, pase de lista, ficha médica. Ten el video de respaldo listo. |
| **Innovación tecnológica** | Credencial firmada con HMAC-SHA256 ligada al número de la tarjeta; el lector la lee de la memoria NDEF. App Android con NFC nativo. Modo sin conexión con cola local. |
| **Estética y diseño** | Carcasa ordenada, cables cortos y etiquetados, lector a la altura del pecho. App con diseño cuidado, modo oscuro y mascotas. |
| **Eficiencia** | El servidor responde en 2,7 ms en promedio. El lector no se bloquea: lee, envía y responde en menos de un segundo. Consumo menor a 1 W. |
| **Aplicación del proyecto** | La LOEI obliga a registrar la asistencia y a avisar de inmediato a los representantes (arts. 169 y 170). N.A.V.I hace justo eso, y permite justificar faltas. |
| **Impacto ambiental** | Sin hojas de lista ni citaciones impresas (unas 6.000 hojas al año en un colegio de 30 cursos). Tarjetas reutilizables por años. Módulos reemplazables, no desechables. |
| **Impacto social** | Avisar a las familias mejora la asistencia (Bergman y Chan, 2021: +12 %). Ficha médica para emergencias. Sin biometría de menores. Mascota privada que no castiga. |
| **Exposición y defensa** | Usa el guion de abajo, reparte las partes entre los dos y responde con datos. Nunca prometas "imposible de hackear". |
| **Reporte técnico** | Completa nombres, fotos del prototipo y la tabla de mediciones en el aula (capítulo 7.2). Revisa que todas las citas estén en las referencias. |

## 3. Demostración en vivo (7 pasos, unos 4 minutos)

Antes de empezar: abre la app en la laptop, entra con la cuenta del docente, ve a **Terminal → Entrada = ahora** y ten a mano dos tarjetas grabadas.

1. **Puntual.** Pasa una tarjeta por el lector: LED verde, "HOLA MATEO · A TIEMPO" y la app se actualiza al instante.
2. **Atraso y aviso.** Baja la tolerancia a 0 min en Ajustes y pasa otra tarjeta: LED amarillo. Muestra el aviso en **Inicio → Avisos** y el correo con copia al DECE.
3. **Tarjeta copiada.** En **Terminal → Casos especiales → Tarjeta copiada**: el registro aparece en **Revisión** con el motivo "puede ser una copia de la tarjeta". Explica la firma HMAC.
4. **Dos tarjetas seguidas.** Pasa dos tarjetas en menos de 1,5 s: queda en revisión con las fotos de la cámara.
5. **Pase de lista por excepción.** Abre **Pase de lista**, toca a quien no está y confirma.
6. **La mascota.** Con el celular Android y la app N.A.V.I: **Soy estudiante → Leer mi tarjeta**. Crea el PIN, nace la mascota y se ve su semana y su nivel.
7. **Ficha médica (el cierre).** Acerca cualquier celular a la tarjeta de Mateo: se abre su ficha con la alergia grave a la penicilina. En la laptop aparece "Ficha médica abierta". Frase final: *"La misma tarjeta que marca asistencia puede salvar una vida."*

**Plan B:** si falla el WiFi del evento, la demo sigue con el simulador de la app (Terminal) y con la versión de prueba de la app, que no necesita servidor. Lleva también un video de la demo grabado en casa.

## 4. Guion de 3 minutos

**Problema (40 s).** "En el Ecuador, el año pasado más de 72 mil estudiantes abandonaron el colegio, y antes de abandonar casi siempre hay faltas y atrasos. Pasar lista a mano toma minutos de cada clase, un amigo puede decir 'presente' por otro, y la familia se entera tarde. La ley dice que hay que avisar de inmediato."

**Solución (80 s).** "N.A.V.I es un lector NFC con ESP32 programado en C++. El estudiante acerca su tarjeta y en un segundo queda registrado. El servidor, que corre en la red del colegio y funciona sin internet, decide si llegó a tiempo o tarde, marca a los ausentes y avisa a la familia por correo o WhatsApp. El docente no llama lista: mira el salón y toca solo a quien no está."

**Diferencia (40 s).** "Cada tarjeta lleva una firma cifrada que solo nuestro servidor puede comprobar: si alguien copia el número de la tarjeta, el registro queda en revisión. Además, cualquier persona que acerque un celular a la tarjeta ve la ficha médica del estudiante, con permiso de sus padres. Y cada estudiante tiene una mascota única que crece cuando llega a tiempo."

**Cierre (20 s).** "Cuesta entre 30 y 65 dólares por aula, no usa huellas ni rostros de menores y ahorra papel. Una tarjeta, tres funciones: asistencia, seguridad y emergencia."

## 5. Preguntas difíciles del jurado

**¿Qué impide que un estudiante pase la tarjeta de su amigo?**
"Ningún sistema sin biometría lo elimina al 100 %, y la biometría de menores está restringida por la ley. Lo que hacemos es que deje evidencia: el docente confirma por excepción y ve quién no está sentado, dos tarjetas seguidas quedan en revisión con foto, el sensor de distancia detecta a una misma persona pasando dos tarjetas y detectamos parejas que se marcan juntas varios días."

**¿Se puede clonar la tarjeta?**
"Las MIFARE Classic se copian en segundos; por eso usamos NTAG213. Además grabamos una credencial firmada con HMAC-SHA256 ligada al número de la tarjeta y a una versión. Sin la clave del servidor no se puede fabricar una credencial, no sirve en otra tarjeta y la anulamos si se pierde. Alguien con equipo especializado podría copiar la tarjeta completa a un chip que imite el número; por eso la revisión del docente sigue siendo la capa principal, y la versión 2 usa NTAG 424 DNA, que genera un código distinto en cada toque con AES-128."

**¿Qué es exactamente esa "clave encriptada"?**
"Es una firma, no un texto cifrado. El servidor calcula un HMAC-SHA256 del código del estudiante, el número de la tarjeta y la versión, con una clave secreta que nunca sale del servidor. El lector la lee de la memoria NDEF y la envía; el servidor recalcula la firma y la compara en tiempo constante."

**¿No es peligroso que cualquiera vea datos médicos?**
"Solo se muestra si el representante lo autoriza (la LOPDP exige su consentimiento expreso para datos de salud de menores), solo lo necesario para una emergencia, cada apertura queda registrada y avisa al colegio y a la familia, y si la tarjeta se pierde el enlace se cambia en un segundo."

**¿Por qué no huella o reconocimiento facial?**
"Son datos biométricos de menores. La LOPDP los trata como sensibles y en 2026 la Superintendencia de Protección de Datos restringió su uso para identificar a menores cuando hay un medio menos invasivo. La tarjeta NFC es ese medio. La cámara no reconoce rostros: solo guarda una foto que el docente ve cuando hay una duda, y se borra sola a los 7 días."

**¿Y si se cae el internet o el WiFi?**
"El servidor está en la red del colegio, no en la nube. Si se cae el WiFi, el lector guarda cada registro con su hora en su memoria (LittleFS) y lo envía cuando vuelve la conexión. El servidor rechaza registros con más de 72 horas para evitar trampas."

**¿La mascota no presiona a los estudiantes?**
"La diseñamos con lo que dice la investigación: es privada, sin ranking público, nunca muere ni se pone triste por una falta justificada, y la meta semanal es del curso completo, no individual."

**¿Cuánto cuesta y quién lo paga?**
"Entre 30 y 45 dólares por aula sin cámara y entre 45 y 65 con cámara. Las tarjetas cuestan menos de un dólar y se reutilizan por años. El servidor corre en una computadora que el colegio ya tiene."

**¿Lo probaron?**
"Sí: pruebas automáticas de toda la app, 225 registros medidos en el servidor con un promedio de 2,7 ms, pruebas de credenciales falsificadas y copiadas, y mediciones en el aula que están en el capítulo 7 del reporte." *(Completa esa tabla antes de la competencia.)*

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
| Problema, circuito, firmware en C++ | Servidor, app, seguridad, ficha médica |
| Pasos 1 a 4 de la demo | Pasos 5 a 7 de la demo |

Los dos deben poder responder cualquier pregunta: el reglamento exige que ambos conozcan todo el proyecto.
