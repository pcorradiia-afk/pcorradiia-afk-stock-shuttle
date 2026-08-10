-- =====================================================================
--  Esquema del puente de WhatsApp · Grupo Fiorasi
--  Tablas operativas del bot, con prefijo wsp_ para no chocar con el
--  esquema del frontend (empresas, importaciones, perfiles...).
--
--  Cómo aplicarlo:
--    Supabase → SQL Editor → New query → pegar TODO → Run.
--  Es seguro correrlo más de una vez (usa IF NOT EXISTS).
--
--  Seguridad: el backend usa la SERVICE_ROLE key, que ignora RLS. Activamos
--  RLS sin políticas públicas, así estas tablas quedan cerradas a la anon key.
-- =====================================================================

-- Rate limiting de campañas (no reenviar la misma campaña en 24 hs por empresa).
create table if not exists wsp_campania_envios (
    id          bigint generated always as identity primary key,
    id_empresa  text        not null,
    campania    text        not null,
    telefono    text        not null,
    enviado_at  timestamptz not null default now()
);
create index if not exists wsp_campania_envios_lookup
    on wsp_campania_envios (id_empresa, campania, telefono, enviado_at desc);

-- Sesión: línea elegida por (número de cuenta + teléfono del cliente).
create table if not exists wsp_sesiones (
    numero_cuenta  text        not null,
    telefono       text        not null,
    linea          text        not null,
    actualizado_at timestamptz not null default now(),
    primary key (numero_cuenta, telefono)
);

-- Derivación: números con el bot pausado (hay un asesor humano a cargo).
create table if not exists wsp_bot_pausado (
    telefono   text        primary key,
    pausado_at timestamptz not null default now()
);

-- Encuestas: dedupe de envío (no reenviar la encuesta del mismo evento).
create table if not exists wsp_encuesta_envios (
    id           bigint generated always as identity primary key,
    id_empresa   text        not null,
    telefono     text        not null,
    fecha_evento text        not null,
    enviado_at   timestamptz not null default now(),
    unique (id_empresa, telefono, fecha_evento)
);

-- Encuestas: encuesta abierta esperando las respuestas del cliente.
-- Guarda el PROGRESO del cuestionario: en qué pregunta va (paso) y los puntajes
-- acumulados (respuestas, como JSON) para encuestas de varias preguntas.
create table if not exists wsp_encuestas_abiertas (
    numero_cuenta text        not null,
    telefono      text        not null,
    id_empresa    text        not null,
    tipo          text        not null,
    referencia    text,
    nombre        text,
    paso          int         not null default 0,
    respuestas    jsonb       not null default '{}'::jsonb,
    id_externo    text,
    sucursal      text,
    abierta_at    timestamptz not null default now(),
    primary key (numero_cuenta, telefono)
);
-- Columnas nuevas (por si la tabla ya existía de una versión anterior).
alter table wsp_encuestas_abiertas add column if not exists nombre     text;
alter table wsp_encuestas_abiertas add column if not exists paso       int   not null default 0;
alter table wsp_encuestas_abiertas add column if not exists respuestas jsonb not null default '{}'::jsonb;
alter table wsp_encuestas_abiertas add column if not exists id_externo text;
alter table wsp_encuestas_abiertas add column if not exists sucursal   text;
alter table wsp_encuestas_abiertas add column if not exists iniciada   boolean not null default true;

-- Encuestas: resultados (el tablero por empresa). Una fila por pregunta
-- respondida (con su clave en `pregunta`), más una fila por comentario final
-- (pregunta = 'comentario', valor = 0, texto en `comentario`).
create table if not exists wsp_encuesta_resultados (
    id         bigint generated always as identity primary key,
    id_empresa text not null,
    telefono   text not null,
    tipo       text not null,
    referencia text,
    pregunta   text,
    valor      int  not null check (valor between 0 and 5),
    comentario text,
    fecha      text not null
);
-- Columnas nuevas (por si la tabla ya existía de una versión anterior).
alter table wsp_encuesta_resultados add column if not exists pregunta   text;
alter table wsp_encuesta_resultados add column if not exists comentario text;
alter table wsp_encuesta_resultados add column if not exists nombre     text;
create index if not exists wsp_encuesta_resultados_empresa
    on wsp_encuesta_resultados (id_empresa);

-- Encuestas: cuestionario editable por empresa (preguntas de taller y ventas).
-- `datos` guarda el JSON con encabezado + lista de preguntas de cada tipo.
create table if not exists wsp_config_encuestas (
    id_empresa     text        primary key,
    datos          jsonb       not null,
    actualizado_at timestamptz not null default now()
);

-- Conversaciones: área asignada a cada chat (Ventas / Taller / Repuestos / Planes),
-- para el buzón del equipo (derivación por área).
create table if not exists wsp_conversacion_area (
    numero_cuenta  text        not null,
    telefono       text        not null,
    area           text        not null,
    actualizado_at timestamptz not null default now(),
    primary key (numero_cuenta, telefono)
);

-- Memoria conversacional: historial de la charla con la IA por cliente.
create table if not exists wsp_historial (
    id            bigint generated always as identity primary key,
    numero_cuenta text        not null,
    telefono      text        not null,
    rol           text        not null,  -- 'user' | 'assistant'
    contenido     text        not null,
    creado_at     timestamptz not null default now()
);
create index if not exists wsp_historial_lookup
    on wsp_historial (numero_cuenta, telefono, id);

-- RLS activado sin políticas públicas: sólo el backend (service_role) accede.
alter table wsp_historial           enable row level security;
alter table wsp_campania_envios     enable row level security;
alter table wsp_sesiones            enable row level security;
alter table wsp_bot_pausado         enable row level security;
alter table wsp_encuesta_envios     enable row level security;
alter table wsp_encuestas_abiertas  enable row level security;
alter table wsp_encuesta_resultados enable row level security;
alter table wsp_config_encuestas    enable row level security;
alter table wsp_conversacion_area   enable row level security;
