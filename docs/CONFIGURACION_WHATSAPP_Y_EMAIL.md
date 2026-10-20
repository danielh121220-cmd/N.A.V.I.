# Avisos a representantes: correo, WhatsApp y Telegram

Por defecto N.A.V.I avisa solo cuando hay **atraso** o **ausencia** (se cambia en **Ajustes → Avisos a representantes**). Todo se configura desde la app, en **Ajustes → Canales**, sin tocar archivos.

| Canal | Cómo llega | Qué necesitas |
| --- | --- | --- |
| Correo | Automático, con diseño, foto del estudiante y copia al DECE | Una cuenta de Gmail con contraseña de aplicación |
| WhatsApp un toque | La app prepara el mensaje y tú tocas "Enviar" | Nada, funciona desde hoy |
| WhatsApp automático | Sale solo desde el número del colegio | Cuenta de Meta Business y una plantilla aprobada |
| Telegram | Automático y gratis | Un bot de @BotFather (en `backend/.env`) |

## Correo

1. En la cuenta de Google que enviará los correos activa la **verificación en 2 pasos**.
2. Entra a https://myaccount.google.com/apppasswords, crea una contraseña llamada `NAVI` y copia las 16 letras.
3. En la app: **Ajustes → Canales → Correo**, elige **Gmail**, escribe el correo y pega la contraseña. Toca **Guardar**: N.A.V.I comprueba la conexión al instante y te dice si algo está mal.
4. En **Probar** escribe tu correo y toca **Probar**. Te llega un aviso de ejemplo igual al que verá el representante.

Si el colegio tiene correo propio (`@colegio.edu.ec`), elige **Otro** y pon el servidor SMTP y el puerto que te dé el técnico. Outlook también funciona, pero Microsoft a veces bloquea el envío desde programas: si falla, usa Gmail.

### Copia a la institución

En la misma pantalla, en **Institución**:

- **Correo DECE**: inspección, DECE o el tutor. Puedes poner varios separados por coma.
- **Con copia**: *Ausencias y emergencias* (recomendado), *Todos los avisos* o *Nunca*.
- **Teléfono**: aparece en los avisos urgentes para que el representante llame.
- **Firma**: por ejemplo *Inspección General*.

Cuando un representante responde un correo, la respuesta llega al correo del DECE, no a la cuenta que envía.

### Varios correos por estudiante

En la ficha del estudiante, el campo **Correo** acepta dos correos separados por coma (por ejemplo el del papá y el de la mamá). Los dos reciben el aviso.

## WhatsApp

### Un toque (sin configurar nada)

Cada aviso aparece en **Inicio → Avisos** con un botón verde **Enviar**. Al tocarlo se abre WhatsApp con el mensaje ya escrito; solo presionas enviar y vuelves. Si hay varios, toca **N por enviar** arriba de la lista para mandarlos uno tras otro. Cada uno queda marcado como enviado.

Con **También en lo urgente** activado, las ausencias y emergencias se preparan por WhatsApp aunque el correo haya llegado, porque es lo que más leen los padres.

El celular se puede escribir como `0991234567`, `991234567` o `+593 99 123 4567`. Si está mal escrito, la app no te deja guardarlo.

### Automático (API oficial de Meta)

WhatsApp no permite que un programa escriba solo a cualquier número sin su API oficial. Para activarla:

1. Entra a https://developers.facebook.com/apps, crea una app de tipo **Empresa** y agrega **WhatsApp**.
2. Copia el **Phone number ID** y crea un **token permanente** (usuario del sistema en Meta Business).
3. Crea una plantilla de categoría **Utilidad** llamada `navi_aviso` con este texto:
   ```
   Hola {{1}}, {{2}}
   ```
4. Cuando Meta la apruebe, en **Ajustes → Canales → WhatsApp** elige **Automático**, pega los datos, guarda y usa **Probar**.

Si el envío automático falla (token vencido, número fuera de la lista de prueba), el aviso no se pierde: queda como enlace de un toque y la app te explica el motivo.

## Mensajes escritos por el docente

En **Estudiantes → (estudiante) → Enviar mensaje al representante** puedes escribir un mensaje propio o usar una plantilla: citación a reunión, atrasos frecuentes, recordatorio o felicitación. Eliges por dónde enviarlo y ves la vista previa antes.

## Si un aviso falla

Toca el aviso en **Inicio → Avisos** para ver el mensaje completo, a quién se envió y el motivo del error en palabras simples. Los correos fallidos se pueden **reintentar** desde ahí. Si el servidor de correo no responde, N.A.V.I reintenta solo dos veces antes de marcarlo como fallido.

## Telegram

1. En Telegram habla con **@BotFather**, escribe `/newbot` y sigue los pasos.
2. Copia el token en `backend/.env`: `TELEGRAM_BOT_TOKEN=123456:ABC...` y reinicia `INICIAR_NAVI.bat`.
3. En **Estudiantes → (estudiante) → Copiar enlace de Telegram** obtienes un enlace único para ese representante. Cuando lo abra y toque **Iniciar**, queda vinculado.

## Configuración por archivo (opcional)

Si prefieres, el correo también se puede poner en `backend/.env` con `SMTP_USER` y `SMTP_PASS`. Lo que configures en la app tiene prioridad.
