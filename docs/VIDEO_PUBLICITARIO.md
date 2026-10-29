# Video publicitario de N.A.V.I

Archivo final: `docs/NAVI_anuncio.mp4` (1920×1080, 30 fps, 79 s, con música y efectos). Cierra con "Impacto Tecnológico · KILLTRONIC 8.0".

El lector (azul), la cámara (blanca) y el llavero que aparecen son los modelos 3D reales de `hardware/cad/salida`, los mismos que se imprimen.

## Guion (títulos grandes, casi sin texto)

| Tiempo | Escena | Título |
| --- | --- | --- |
| 0:00 | Negro | 6:58 a. m. |
| 0:03 | Luz de la mañana entrando por la persiana sobre el lector en la pared | Empieza el día. |
| 0:07 | Lista de nombres pasando | Pasar lista toma minutos. |
| 0:10 | Negro | Ahora, un segundo. |
| 0:12 | El llavero toca el lector: bip, luz verde, la mascota aparece en la pantalla | Toca. Listo. |
| 0:17 | El lector girando sobre fondo negro | N.A.V.I · Asistencia con NFC. |
| 0:21 | Panel del docente | El docente lo ve al instante. |
| 0:25 | Notificación en el celular de la mamá, con correo, WhatsApp y SMS | Y su familia, también. |
| 0:30 | Negro | ¿Faltó? Lo saben hoy. |
| 0:33 | El lector azul y la cámara blanca: toque, luz verde y flash | Un lector. Una cámara. |
| 0:37 | Cuatro aulas conectadas a un solo servidor | Todo el colegio. Una sola red. |
| 0:42 | Las 40 mascotas | 40 mascotas. Una distinta para cada estudiante. |
| 0:46 | Huevo que nace | Nace con tu primer toque. |
| 0:51 | Corazones | Crece si llegas a tiempo. Y te extraña si faltas. |
| 0:56 | El llavero se abre y muestra su chip NFC | Cada llavero, firmado. |
| 0:59 | Ficha médica | En una emergencia, puede salvar una vida. |
| 1:03 | Alerta temprana | Nadie se queda atrás. |
| 1:07 | Recorrido guiado en el celular | Tu bot te enseña. En un minuto. |
| 1:11 | Tres palabras | Sin papel. Sin huellas. Sin filas. |
| 1:14 | Logo | N.A.V.I · Asistencia que cuida. |

## Fotos reales de Higgsfield

Se generaron tres fotos en Higgsfield (están en tu biblioteca de Higgsfield):

1. Estudiantes entrando al colegio al amanecer → guárdala como `gate.png`.
2. Mano acercando la tarjeta al lector → `tap.png`.
3. Mamá viendo el aviso en su celular → `mother.png`.

Descárgalas y ponlas en `tools/video/assets/`. El video las usa automáticamente en las escenas 0:03, 0:12 y 0:25 en lugar de las ilustraciones.

## Volver a generar el video

Necesita Node.js, Python con numpy y scipy, y ffmpeg.

1. En `tools/video`: `npm install` y `npx playwright install chromium`.
2. En `tools/video/assets/photos.js` marca las fotos que agregaste, por ejemplo: `window.PHOTOS={gate:true,tap:true,mother:true};`
3. `python music.py` crea la música y los efectos (`audio.wav`).
4. `node render.js NAVI_anuncio.mp4` dibuja el video cuadro por cuadro (las escenas 3D tardan unos segundos por cuadro) y lo une con el audio.

Para ver un cuadro suelto: `node preview.js 15.8` lo guarda en la carpeta `prev`.
