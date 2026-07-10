-- ============================================================================
-- 0003 — Seguridad de alta_usuario()
-- ============================================================================
-- Problema: 0001 revocó alta_usuario() solo para "anon", pero cualquier usuario
-- LOGUEADO (rol "authenticated") todavía podía ejecutarla y, por ejemplo,
-- auto-asignarse el rol super_admin (escalada de privilegios).
--
-- Solución: la función queda reservada al servidor (service_role). El alta de
-- usuarios desde la app pasa por la ruta /api/usuarios, que primero verifica
-- que quien pide sea super admin y recién entonces llama a la función con la
-- SERVICE ROLE KEY (que nunca llega al navegador).
--
-- Correr una sola vez en el SQL Editor de Supabase. Ejecutarla de nuevo no rompe nada.
-- ============================================================================

revoke execute on function alta_usuario(text, text, text, text[], text, text, text[]) from authenticated, anon, public;
grant execute on function alta_usuario(text, text, text, text[], text, text, text[]) to service_role;
