# CiscoNetWatch LAN Collector

Arquitectura tipo **Zabbix proxy / WhatsUp Gold poller**: el descubrimiento corre **en tu red**, no en el navegador ni en Vercel.

```
[PC/Servidor LAN]  --ICMP-->  equipos 192.168.x.x
        |
        | HTTPS + X-Collector-Key
        v
[Vercel /api/collector/discovery] --> Supabase discovery_scans / discovery_hosts
        |
        v
[UI Descubre] --> promover a devices (status unknown)
```

## Variables en Vercel

| Variable | Uso |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | API escribe scans/hosts |
| `COLLECTOR_API_KEY` | Secreto compartido con el script |

## SQL

Aplica `supabase/migrations/20261120000010_discovery.sql` en Supabase.

## Ejecutar

```bash
pip install requests

export CNW_API_URL=https://cisconetwatch-cisco-7ce5.vercel.app
export CNW_COLLECTOR_KEY='mismo-que-COLLECTOR_API_KEY'
export CNW_ORG_ID='00000000-0000-4000-8000-000000000001'
export CNW_CIDR=192.168.10.0/24

python3 discover.py
```

Luego en la app: **Descubre** → scan → hosts UP → **Anadir al inventario**.
