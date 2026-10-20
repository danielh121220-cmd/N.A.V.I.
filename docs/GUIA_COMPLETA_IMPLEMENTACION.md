# Guía completa de implementación

Esta guía se dividió en documentos más cortos:

1. **Probar la app sin hardware:** `README.md` (sección "Probarlo ya").
2. **Instalar la app en la PC o el celular:** `docs/INSTALAR_APP.md`.
3. **Qué comprar:** `docs/LISTA_DE_MATERIALES.md`.
4. **Cablear y subir los firmwares:** `docs/CONEXIONES_Y_ESQUEMATICO.md`.
5. **Avisos por correo, Telegram y WhatsApp:** `docs/CONFIGURACION_WHATSAPP_Y_EMAIL.md`.
6. **Qué se corrigió:** `docs/ERRORES_CORREGIDOS.md`.
7. **Pitch y defensa:** `docs/GUIA_DE_COMPETENCIA_PITCH.md`.

## Orden recomendado

1. `INICIAR_NAVI.bat` → crea tu cuenta de administrador.
2. **Ajustes → Cursos y horarios:** crea tus cursos y horas de entrada.
3. **Estudiantes → Nuevo:** registra a cada estudiante; con el lector conectado, "Leer" llena el UID.
4. Configura `config.h` de ambos firmwares con los datos de **Terminal → Configuración del firmware** y súbelos.
5. Comprueba en **Terminal → Hardware conectado** que ambos están "En línea".
6. Opcional: configura correo o Telegram en `backend/.env`.
