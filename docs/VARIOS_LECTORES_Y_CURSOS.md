# Un colegio completo: varios lectores, cursos y docentes

## Cómo está organizado

```
            WiFi del colegio (una sola red)
                       │
   ┌───────────────┬───┴───────────┬────────────────┐
 PC servidor     Lector AULA-3B   Lector AULA-2A   Lector LAB-MEC
 (N.A.V.I)       + cámara         + cámara         + cámara
```

- **Un solo servidor para todo el colegio**: una PC con `INICIAR_NAVI.bat` encendida. Cada registro le toma milisegundos, así que puede atender todos los lectores a la vez.
- **Un lector por aula**, cada uno con su propio nombre (`TERMINAL_ID`).
- **No hay que dividir IP.** El router le da una IP distinta a cada aparato. El servidor reconoce los equipos por el **nombre del lector** y a los estudiantes por **su tarjeta**.
- **La única IP que debe quedar fija es la de la PC servidor**, porque todos los lectores la buscan. Pídele al técnico que le haga una **reserva DHCP** en el router.

## 1. Programar varios lectores

Todos los lectores usan **el mismo programa**. Solo cambia una línea de `mis_datos.h`:

```
#define TERMINAL_ID "AULA-3B"
```

| Aula | `TERMINAL_ID` del lector | `TERMINAL_ID` de su cámara |
| --- | --- | --- |
| 3ro Mecatrónica B | `AULA-3B` | `AULA-3B` |
| 2do BGU A | `AULA-2A` | `AULA-2A` |
| Laboratorio | `LAB-MEC` | `LAB-MEC` |

- La **cámara de cada aula lleva el mismo nombre que su lector**. Así el servidor sabe a qué lector pertenece cada foto y le pide la foto a la cámara correcta.
- Usa letras, números y guiones, sin espacios ni tildes.
- El WiFi (`WIFI_SSID` y `WIFI_PASS`) es el mismo en todos.
- `servidor.h` (IP del servidor y clave de terminal) es el mismo para todos: lo crea `INICIAR_NAVI.bat`.

Pasos para cada lector nuevo:

1. Abre `firmware/navi_esp32_pn532/navi_esp32_pn532.ino`.
2. Cambia `TERMINAL_ID` en `mis_datos.h` y guarda.
3. Sube el programa a ese ESP32 (placa *ESP32 Dev Module*, partición *Huge APP*).
4. Pégale una etiqueta con su nombre para no confundirlos.
5. Repite con su cámara, con el mismo nombre.

## 2. Asignar cada lector a su aula

En la app (cuenta de administrador): **Lector → Hardware conectado**, toca el lector y elige:

- **Nombre**: por ejemplo *Lector del 3B*.
- **Aula de**: el curso que estudia en esa aula.

Cualquier estudiante puede marcar en cualquier lector y la asistencia **siempre cuenta para su propio curso**. Si marca en el lector de otra aula, el registro dice **"otra aula"**, para que el docente lo vea.

## 3. Cuentas de los docentes

1. Cada docente crea su cuenta en la pantalla de inicio con **Crear cuenta**. La primera cuenta del sistema es la del administrador; las demás son de docente.
2. El administrador va a **Ajustes → Cursos y horarios → (curso) → Docentes** y marca quién da clases en ese curso. Un curso puede tener varios docentes y un docente puede tener varios cursos.
3. Desde ese momento, cuando la profesora Sánchez entra a la app, **solo ve sus cursos**: su Inicio, su pase de lista, sus estudiantes, su revisión, sus avisos y sus alertas tempranas.
4. El **administrador** (rector, inspección, DECE) ve **todo el colegio**.
5. Un docente sin cursos asignados no ve ningún estudiante hasta que el administrador le asigne uno.

## 4. Si los lectores no aparecen "En línea"

| Problema | Solución |
| --- | --- |
| La IP de la PC cambió | Reserva DHCP para la PC servidor. Mientras tanto, vuelve a abrir `INICIAR_NAVI.bat` y vuelve a subir los programas. |
| La red del colegio no deja que los aparatos se vean entre sí ("aislamiento de clientes") | Usa un router solo para N.A.V.I, o pide al técnico que lo desactive para esa red. |
| Red de 5 GHz | Los ESP32 solo funcionan en 2.4 GHz. |
| Firewall de Windows | Permite Node.js en redes privadas. |
