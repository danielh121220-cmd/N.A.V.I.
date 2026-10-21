# App de Android, inicio con tarjeta y mascotas

## 1. Instalar el APK

1. Copia `NAVI.apk` al celular (por cable, Drive o WhatsApp a ti mismo).
2. Ábrelo. Android pedirá permiso para **instalar apps desconocidas** desde esa app (Archivos, Chrome o WhatsApp): permítelo solo para esta instalación.
3. Si aparece Play Protect, toca **Instalar de todos modos**: la app no está en la Play Store, por eso avisa.
4. Abre **N.A.V.I** y escribe la dirección del servidor que muestra `INICIAR_NAVI.bat` (por ejemplo `192.168.1.50:3000`). El celular y la PC deben estar en el mismo WiFi.
5. Para la demostración sin servidor, escribe **12122008** en el campo del servidor y toca **Conectar**. Se abre la versión de demostración completa dentro del celular, con datos de ejemplo, y queda abierta aunque cierres la app. Para volver: **Ajustes → Salir de la demostración**.

Requisitos: Android 7 o superior. Para leer y grabar tarjetas, el celular debe tener NFC activado.

Versión actual: **3.6**. Si ya tenías instalada una anterior, instala esta encima: se actualiza sin borrar la dirección del servidor ni la sesión.

En la versión 3.6:

- La pantalla ya no se corre a la derecha con la letra grande de Android.
- "Tu semana" cabe completa y los días dicen Lu, Ma, Mi, Ju, Vi.

En la versión 3.5:

- La app ya no muestra botones de prueba: la demostración se abre solo con el código 12122008.
- La demostración dentro del celular ahora se ve en formato de celular y con tildes correctas.

En la versión 3.4:

- Letra Inter, parecida a la del iPhone, con texto de 17 px en el celular.
- La flecha atrás cierra primero la hoja abierta y no cierra la app.
- La barra de estado y la de navegación siguen el modo claro u oscuro.
- Vibración corta al tocar los botones.

> El APK se armó sin Android Studio y su firma se verificó con una herramienta independiente, pero no se pudo probar en un teléfono real desde aquí. Si al instalarlo o abrirlo aparece algún error, envía una captura y se corrige.

## 2. Compilar el APK tú mismo

**Opción A, en la nube (recomendada):** sube el proyecto a un repositorio de GitHub. El flujo `.github/workflows/android.yml` compila el APK con Gradle; descárgalo en **Actions → APK de Android → Artifacts**.

Todas las opciones firman con la misma clave de prueba (`android/app/navi-prueba.p12`, contraseña `navi2026`), así que un APK nuevo se instala encima del anterior sin desinstalar.

**Opción B, con Android Studio:** abre la carpeta `android` y usa **Build → Build APK(s)**.

**Opción C, sin Android Studio:** `tools/apk/build_apk.py` arma el APK con `aapt2`, `javac`, el dexer `dx` y el `android.jar` de la API 34, y lo firma con APK Signature Scheme v2. La clave de prueba está en `tools/apk/clave-de-prueba.pem`; usa siempre la misma para poder actualizar la app sin desinstalarla.

## 3. Inicio de sesión del estudiante

La pantalla de inicio tiene dos cuentas separadas: **Docente** (correo y contraseña) y **Estudiante** (tarjeta NFC, sin correo). La app recuerda la última que se usó.

### Con el lector del aula (sirve en cualquier celular)

1. El estudiante acerca su tarjeta al lector por primera vez. La pantalla muestra su mascota y un **código de 6 números**.
2. En la app: **Estudiante → Usar el lector del aula** y escribe el código. Sirve una sola vez y vence en 12 horas.
3. Crea un **PIN de 4 números**. La cuenta queda guardada y el lector **no vuelve a mostrar códigos**; la sesión dura todo el año y se renueva sola.
4. Si cambia de celular u olvida el PIN: el docente toca **Restablecer PIN y celulares** y el siguiente toque muestra un código nuevo, una sola vez.

### Con el NFC del celular

1. El docente graba la tarjeta, con el **lector del aula** (**Tarjeta y acceso → Grabar con el lector del aula**, sin celular) o con un celular Android con NFC (**Grabar con este celular**). Se graban dos registros:
   - un **enlace** que cualquier celular abre para la ficha de emergencia;
   - la **credencial firmada** `NAVI1.código.versión.firma`.
2. El estudiante abre la app, elige **Estudiante → Acercar la tarjeta a este celular** y acerca su tarjeta.
3. La primera vez crea un **PIN de 4 números**. Ese celular queda vinculado: las siguientes veces basta con la tarjeta. En un celular nuevo se pide el PIN.
4. Si pierde la tarjeta: **Tarjeta perdida: nueva credencial**. La anterior deja de servir al instante.
5. Si olvida el PIN: **Restablecer PIN y celulares**.

La firma es un HMAC-SHA256 calculado por el servidor sobre el código del estudiante, el número (UID) de la tarjeta y la versión. La clave nunca sale del servidor. El lector del aula también lee la credencial: si una tarjeta tiene el número correcto pero no trae una firma válida, el registro queda en **Revisión** como posible copia.

En iPhone las páginas web no pueden leer NFC: ahí el estudiante usa el código del lector. La ficha de emergencia sí abre en cualquier iPhone XS o más nuevo.

## 4. Las mascotas

- Hay **40 mascotas distintas** (40 formas, colores y ojos de colores). Cada estudiante de un curso recibe una que nadie más del curso tiene. Se asigna sola al registrar al estudiante.
- La mascota se despierta con el **primer toque en el lector del aula**: aparece en la pantalla del lector. Antes de eso, en la app se ve un huevo dormido.
- Al entrar a la app, la mascota **nace del huevo** (toca tres veces).
- Crece con los **días puntuales**: cada 5 días sube de nivel. Hay logros (primer registro, tres días seguidos, una semana a tiempo, madrugador, 10 y 25 días puntuales, tarjeta verificada).
- La **meta del curso**: si el curso llega al 90 % de asistencia en la semana, todas las mascotas celebran.
- Es **privada**: solo su dueño la ve. No hay ranking.
- El estudiante puede ponerle nombre.
- El docente ve las mascotas en las listas y todas en **Ajustes → Ver las 40 mascotas**. Se pueden ocultar en **Ajustes → Mostrar mascotas en las listas**.

### Corazones: la mascota necesita que vengas

| Faltas seguidas sin justificar | Corazones | Estado |
| :---: | :---: | --- |
| 0 | 5 | Con energía |
| 1 | 4 | Te extraña |
| 2 | 3 | Triste |
| 3 | 2 | Enferma |
| 4 | 1 | Muy débil (último aviso) |
| 5 (una semana de clases) | 0 | **Se fue** |

- **Un solo día de asistencia** (a tiempo o con atraso) le devuelve los 5 corazones. En el lector aparece `ME SALVASTE!`.
- Las **faltas justificadas** no quitan corazones ni cortan la cuenta (art. 170 del Reglamento a la LOEI). Los fines de semana y feriados no cuentan: solo cuentan los días en que el curso tuvo clases.
- Cuando se va, el estudiante ve una despedida con los días que estuvieron juntos y **elige uno de tres huevos nuevos**, de las mascotas libres de su curso. La nueva empieza en el nivel 1; los logros se quedan.
- Si después el docente **justifica** una de esas faltas, la mascota **vuelve** (si el estudiante aún no eligió otra).
- Las mascotas anteriores quedan en **Mascotas que te acompañaron**.

### Alerta temprana para el docente y el DECE

- En **Inicio → Alerta temprana** aparecen los estudiantes con 3 o más faltas seguidas sin justificar, con sus corazones.
- Al llegar a 5, el docente recibe un aviso en la app y el representante recibe un correo o WhatsApp "Varios días seguidos sin asistir", con copia al DECE. Se envía una sola vez por semana por estudiante.
- Así la mascota no es solo un juego: es la misma señal que usa el colegio para actuar antes de que un estudiante abandone.
