# CiscoNetWatch — GO LIVE (producción)

URL pública: https://cisconetwatch-cisco-7ce5.vercel.app  
Login: https://cisconetwatch-cisco-7ce5.vercel.app/sign-up-login

Código en `main` no es producción hasta que **Vercel = Ready** y los puntos de abajo estén hechos.

---

## A) Vercel — variables de entorno (Production)

Project → Settings → Environment Variables → **Production** only.

| Nombre | Tipo | Notas |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | **Sin** prefijo `NEXT_PUBLIC_`. Obligatoria para `/api/collector/*` y admin |
| `COLLECTOR_API_KEY` | **Secret** | Mismo valor que usarás en el PC como `CNW_COLLECTOR_KEY`. Largo, aleatorio |

Después de guardar: **Redeploy** del último deployment (o un push vacío) para que las env entren en runtime.

Generar clave de colector (ejemplo):

```bash
openssl rand -hex 32
```

---

## B) Vercel — deploy Ready

1. Deployments → último commit de `main`.
2. Estado debe ser **Ready** (no Error / Building).
3. Si Error: Build Logs → buscar `Failed to compile` y corregir antes de seguir.

---

## C) Supabase — migración SNMP (05) + clave de cifrado

**Orden obligatorio:** staging primero, luego producción. No ejecutar DDL a ciegas en prod.

### C1. Clave de cifrado (una vez, guardar en vault)

```sql
-- Genera fuera: openssl rand -hex 32
ALTER DATABASE postgres SET app.snmp_encryption_key = 'PEGA_AQUI_CLAVE_MIN_32_CHARS';
```

Verificar (nueva sesión SQL):

```sql
SELECT length(current_setting('app.snmp_encryption_key', true));
-- debe ser >= 16 (recomendado >= 32)
```

### C2. Aplicar migración del repo

Archivo: `supabase/migrations/20261103000005_encrypt_snmp_secrets.sql`

En Supabase SQL Editor: pegar el contenido **completo** del archivo y ejecutar.

Verificar funciones:

```sql
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'get_snmp_config',
    'upsert_snmp_config',
    'get_snmp_secrets_for_collector',
    'encrypt_snmp_secret',
    'decrypt_snmp_secret'
  )
ORDER BY 1;
-- deben aparecer las 5
```

**No reaplicar** migraciones 07, 09, 10, 11, 12, 13 si ya están en prod.

---

## D) Colector Windows (LAN)

En el PC de la red (PowerShell):

```powershell
$env:CNW_API_URL = "https://cisconetwatch-cisco-7ce5.vercel.app"
$env:CNW_COLLECTOR_KEY = "<mismo valor que COLLECTOR_API_KEY en Vercel>"
$env:CNW_ORG_ID = "<uuid de public.organizations>"
$env:CNW_COLLECTOR_NAME = "ICMP-LAN-01"
$env:CNW_COLLECTOR_HOST = "10.0.0.10"   # IP del PC colector
# opcional poll de inventario:
# $env:CNW_DEVICE_IPS = "192.168.1.1,192.168.1.2"

pip install requests
python collector/poll_inventory.py
```

Esperado:
- heartbeat → **200** o **201**
- sin key → **401**
- orgId inventado → **403**

Discovery (colas pending del wizard):

```powershell
python collector/discover.py
```

Programar `poll_inventory.py` cada 1–5 min (Task Scheduler).

---

## E) Smoke test (después de A–D)

| Prueba | OK si |
|--------|--------|
| Login | Entra a dashboard |
| Inventario | Lista devices (aunque sea poca) |
| `/ip-scan` | Página carga |
| Device Config | Protocolo ICMP en el select |
| Topología | Nodos; unknown en gris si aplica |
| SNMP panel | Carga sin error de función inexistente |
| Heartbeat | Fila en `collectors` con `last_heartbeat_at` reciente |
| Vercel logs | Sin 5xx sostenidos en `/api/collector/*` |

---

## F) Backups

- Supabase → Database → Backups / PITR (Pro+).
- Guardar `app.snmp_encryption_key` y `COLLECTOR_API_KEY` en un vault aparte (no solo en Vercel).

---

## Criterio “listo para producción”

Marcar listo **solo** si:

1. [ ] Deploy `main` = **Ready**
2. [ ] Env A configuradas y redeploy hecho
3. [ ] Migración 05 aplicada + encryption key verificada
4. [ ] Login + roles OK
5. [ ] Heartbeat 200/201 con org real
6. [ ] Smoke E pasado
7. [ ] Backups F revisados

Hasta entonces: pre-prod / demo operativa, no go-live cerrado.
