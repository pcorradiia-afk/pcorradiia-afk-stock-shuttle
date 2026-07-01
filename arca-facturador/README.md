# ARCA Facturador (uso personal · Monotributo)

Genera tus **Facturas C** mensuales conectándose a los web services de **ARCA
(ex-AFIP)**: autentica con **WSAA**, solicita el **CAE** con **WSFEv1**, produce
el **PDF oficial con QR** y (en la Fase 5) los envía por email desde Microsoft 365.

> **Sistema personal e independiente.** Vive en la carpeta `arca-facturador/`,
> tiene su propio `package.json`, su propia base **SQLite** local y **no toca ni
> importa** nada del resto del repositorio (Grupo Fiorasi). Corre en tu máquina.

> ⚠️ **Arranca SIEMPRE en HOMOLOGACIÓN.** Producción está bloqueada salvo doble
> confirmación (`ARCA_ENV=prod` **y** `ARCA_ALLOW_PROD=si`).

---

## 1. Requisitos

- **Node.js 20+** (recomendado 20 LTS o superior).
- Tu **certificado digital** de ARCA (`.crt`) y su **clave privada** (`.key`).
- Un **punto de venta electrónico** habilitado en ARCA.

## 2. Instalación

```bash
cd arca-facturador
npm install
cp .env.example .env      # completá tus datos
```

Editá `.env`:
- `EMISOR_CUIT`, `EMISOR_RAZON_SOCIAL`, `EMISOR_PUNTO_VENTA`.
- `ARCA_CERT_PATH` y `ARCA_KEY_PATH` (por defecto `certs/certificado.crt` y `certs/clave-privada.key`).
- Dejá `ARCA_ENV=homo` para empezar.

Copiá tu certificado y tu clave a la carpeta `certs/` (no se commitean).

## 3. Correr

```bash
npm run dev      # servidor + formulario en http://localhost:8787
```

Abrí <http://localhost:8787>. Vas a ver el badge **🟢 HOMOLOGACIÓN**.

---

## 4. Generar el certificado en ARCA

El WSAA firma un ticket con tu certificado. Para obtenerlo:

1. **Generá la clave privada y el CSR** (pedido de certificado) con OpenSSL:
   ```bash
   openssl genrsa -out certs/clave-privada.key 2048
   openssl req -new -key certs/clave-privada.key -subj "/C=AR/O=TU NOMBRE/CN=facturador/serialNumber=CUIT 20123456789" -out certs/pedido.csr
   ```
2. En **ARCA** (con Clave Fiscal):
   - Para **homologación**: entrá a **WSASS** (Autogestión de Certificados
     Homologación) → *Nuevo certificado* → subí el `pedido.csr` → descargá el `.crt`.
   - Para **producción**: **Administración de Certificados Digitales** →
     creá un alias, subí el CSR y descargá el certificado.
3. Guardá el `.crt` descargado en `certs/certificado.crt`.
4. **Asociá el certificado al web service `wsfe`** (Facturación Electrónica):
   - Homologación: dentro de WSASS, *Adherir/autorizar* el servicio **wsfe**.
   - Producción: **Administrador de Relaciones de Clave Fiscal** →
     *Nueva relación* → Servicio **Facturación Electrónica** → representante = tu certificado.

Verificá que quedó bien:
```bash
npm run cli ta        # debe traer un Token/Sign de WSAA
npm run cli estado    # FEDummy: appserver/dbserver/authserver = OK
```

## 5. Dar de alta el punto de venta

En ARCA (Clave Fiscal) → **Comprobantes en línea** o **Regímenes de Facturación
y Registración (REAR/RECE/RCEL)** → **ABM de Puntos de Venta** → creá un punto de
venta de tipo **Factura Electrónica – Monotributo / Web Services**. Anotá el número
y ponelo en `EMISOR_PUNTO_VENTA`. En homologación el punto de venta se da de alta
en el ambiente de homologación.

---

## 6. Probar en homologación (caso de ejemplo)

```bash
# 1) Verificar conectividad y credenciales
npm run cli estado        # FEDummy
npm run cli ultimo        # último Factura C autorizado en tu PV

# 2) Cargar un cliente de ejemplo en la libreta
npm run cli seed

# 3) DRY-RUN: simula la emisión SIN pedir CAE (genera PDF de prueba)
npm run cli dry 1

# 4) Emisión REAL en homologación (pide CAE de verdad, sin validez fiscal)
npm run cli emitir 1
```

O todo desde la web (<http://localhost:8787>):
1. **Libreta de clientes** → cargá tus clientes e ítems con su precio actual.
2. **Ajuste de precios** → aplicá un % (global o por selección), mirá el
   *antes → después* y confirmá (guardando en libreta o solo para este mes).
3. **Emitir facturas** → elegí los clientes del mes. Dejá **Dry-run** tildado
   para probar; destildalo para emitir de verdad en homologación.
4. **Comprobantes** → descargá los PDF generados (con QR).

Los PDF se guardan en `data/comprobantes/` y cada emisión queda registrada en
`data/logs/` y en la base `data/facturador-homo.db`.

---

## 7. Ajuste de precios por inflación

- **Global**: un % a todos los ítems.
- **Por selección**: elegís clientes/ítems y le ponés un % distinto a cada selección.
- Siempre ves la **vista previa antes → después** por cliente.
- Al confirmar podés:
  - **Guardar en la libreta** (acumulativo: el mes que viene parte del valor nuevo), o
  - **Solo este mes** (no toca la libreta).
- **Redondeo** configurable: al peso, decena, centena o sin redondeo.
- Todo queda en el **historial de ajustes** (fecha, %, a quién, precio anterior y nuevo).

---

## 8. Envío por Microsoft 365 (Fase 5)

Está preparado con una **interfaz abstracta** (`src/email/mailer.ts`). Hoy el
proveedor por defecto es `log` (registra el envío sin mandar nada real, ideal
para pruebas). Cuando lo definas, se completa:

- **Microsoft Graph API** (`EMAIL_PROVIDER=graph`) — *recomendado*:
  1. En **Azure/Entra** → *App registrations* → nueva app.
  2. **API permissions** → Microsoft Graph → *Application* → **Mail.Send** → *Grant admin consent*.
  3. **Certificates & secrets** → nuevo *client secret*.
  4. Completá `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET` y `EMAIL_FROM`.
- **SMTP Office 365** (`EMAIL_PROVIDER=smtp`): `smtp.office365.com:587` (STARTTLS).
  Requiere **OAuth2** (la auth básica está deshabilitada por Microsoft).

Cada envío se registra en la tabla `envios_email` (a quién, cuándo, estado) y los
fallidos se pueden reintentar.

---

## 9. Pasar a producción

Solo cuando estés listo:
1. Generá y asociá el certificado de **producción** (paso 4, rama producción).
2. En `.env`: `ARCA_ENV=prod` **y** `ARCA_ALLOW_PROD=si`.
3. Reiniciá. El badge pasa a **🔴 PRODUCCIÓN** y los CAE son reales.

---

## 10. Notas técnicas

- **Factura C (Monotributo)**: no se discrimina IVA. Se informa
  `ImpTotal = ImpNeto`, `ImpIVA = 0` y sin alícuotas.
- **CondicionIVAReceptorId** es obligatorio (RG 5616) y se toma de cada cliente.
- **Correlatividad**: antes de emitir se consulta `FECompUltimoAutorizado` y se usa
  el número siguiente, sin saltos.
- **Reintentos**: solo ante fallas transitorias (red, HTTP 5xx, timeouts) con backoff
  exponencial. Ante un **rechazo de negocio de ARCA no se reintenta** (se informa).
- **Dry-run**: prueba todo el flujo (incluye consulta de correlatividad y PDF) sin
  solicitar CAE.
- **Almacenamiento legal**: los comprobantes quedan en SQLite + PDF en disco.

## 11. Estructura

```
arca-facturador/
  src/
    config.ts            Carga/valida .env, guarda producción tras doble confirmación
    logger.ts            Logging a consola + archivo (trazabilidad de emisiones)
    arca/
      endpoints.ts       URLs homo/prod
      types.ts           Tipos y tablas (tipos cbte, condición IVA, errores)
      soap.ts            Helper SOAP + reintentos transitorios
      wsaa.ts            Autenticación: firma CMS del TRA y cacheo del TA
      wsfev1.ts          FEDummy, FECompUltimoAutorizado, FECAESolicitar, FEParamGet*
    db/                  SQLite: schema, clientes, comprobantes, ajustes
    facturacion/
      precios.ts         Motor de ajuste por inflación + redondeo + preview
      emisor.ts          Orquestación: correlatividad → CAE → PDF → guardado → email
    pdf/
      qr.ts              URL/imagen del QR de ARCA
      factura-pdf.ts     PDF de la Factura C con QR
    email/
      mailer.ts          Interfaz de envío (log | graph | smtp)
      templates.ts       Plantilla de asunto y cuerpo
    server/app.ts        API + formulario web
    index.ts             Entrypoint (servidor)
    cli.ts               Utilidades de prueba en homologación
  public/                Formulario web (HTML/CSS/JS)
  certs/                 Certificado y clave (NO se commitean)
  data/                  Base SQLite, PDFs y logs (NO se commitean)
```
