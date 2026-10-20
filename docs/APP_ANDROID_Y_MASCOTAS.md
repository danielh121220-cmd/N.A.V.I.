# App de Android, inicio con tarjeta y mascotas

## 1. Instalar el APK

1. Copia `NAVI.apk` al celular (por cable, Drive o WhatsApp a ti mismo).
2. Ábrelo. Android pedirá permiso para **instalar apps desconocidas** desde esa app (Archivos, Chrome o WhatsApp): permítelo solo para esta instalación.
3. Si aparece Play Protect, toca **Instalar de todos modos**: la app no está en la Play Store, por eso avisa.
4. Abre **N.A.V.I** y escribe la dirección del servidor que muestra `INICIAR_NAVI.bat` (por ejemplo `192.168.1.50:3000`). El celular y la PC deben estar en el mismo WiFi.
5. Sin servidor, toca **Probar sin servidor**: abre la versión de prueba completa dentro del celular.

Requisitos: Android 7 o superior. Para leer y grabar tarjetas, el celular debe tener NFC activado.

> El APK se armó sin Android Studio y su firma se verificó con una herramienta independiente, pero no se pudo probar en un teléfono real desde aquí. Si al instalarlo o abrirlo aparece algún error, envía una captura y se corrige.

## 2. Compilar el APK tú mismo

**Opción A, en la nube (recomendada):** sube el proyecto a un repositorio de GitHub. El flujo `.github/workflows/android.yml` compila el APK con Gradle; descárgalo en **Actions → APK de Android → Artifacts**.

**Opción B, con Android Studio:** abre la carpeta `android` y usa **Build → Build APK(s)**.

**Opción C, sin Android Studio:** `tools/apk/build_apk.py` arma el APK con `aapt2`, `javac`, el dexer `dx` y el `android.jar` de la API 34, y lo firma con APK Signature Scheme v2. La clave de prueba está en `tools/apk/clave-de-prueba.pem`; usa siempre la misma para poder actualizar la app sin desinstalarla.

## 3. Inicio de sesión del estudiante con su tarjeta

1. El docente abre **Estudiantes → (estudiante) → Tarjeta y acceso → Grabar la tarjeta** y acerca la tarjeta del estudiante al celular. Se graban dos registros:
   - un **enlace** que cualquier celular abre para la ficha de emergencia;
   - la **credencial firmada** `NAVI1.código.versión.firma`.
2. El estudiante abre la app, toca **Soy estudiante: entrar con mi tarjeta** y acerca su tarjeta.
3. La primera vez crea un **PIN de 4 números**. Ese celular queda vinculado: las siguientes veces basta con la tarjeta. En un celular nuevo se pide el PIN.
4. Si pierde la tarjeta: **Tarjeta perdida: nueva credencial**. La anterior deja de servir al instante.
5. Si olvida el PIN: **Restablecer PIN y celulares**.

La firma es un HMAC-SHA256 calculado por el servidor sobre el código del estudiante, el número (UID) de la tarjeta y la versión. La clave nunca sale del servidor. El lector del aula también lee la credencial: si una tarjeta tiene el número correcto pero no trae una firma válida, el registro queda en **Revisión** como posible copia.

En iPhone las páginas web no pueden leer NFC, así que el inicio con tarjeta funciona con la app de Android o con Chrome en Android. La ficha de emergencia sí abre en cualquier iPhone XS o más nuevo.

## 4. Las mascotas

- Hay **40 mascotas distintas** (40 formas, colores y ojos de colores). Cada estudiante de un curso recibe una que nadie más del curso tiene. Se asigna sola al registrar al estudiante.
- La primera vez que el estudiante entra, su mascota **nace de un huevo** (toca tres veces).
- Crece con los **días puntuales**: cada 5 días sube de nivel. Hay logros (primer registro, tres días seguidos, una semana a tiempo, madrugador, 10 y 25 días puntuales, tarjeta verificada).
- La **meta del curso**: si el curso llega al 90 % de asistencia en la semana, todas las mascotas celebran.
- Es **privada**: solo su dueño la ve. No hay ranking. Nunca muere ni se pone triste por una falta **justificada** (el docente justifica desde el registro, como pide el art. 170 del Reglamento a la LOEI).
- El estudiante puede ponerle nombre.
- El docente ve las mascotas en las listas y todas en **Ajustes → Ver las 40 mascotas**. Se pueden ocultar en **Ajustes → Mostrar mascotas en las listas**.
