# Arquitectura de colector — modelo Zabbix + flujo WhatsUp Gold

## Mapa de conceptos

| Zabbix | WhatsUp Gold | CiscoNetWatch |
|--------|--------------|---------------|
| Zabbix Server | Central NmConsole | Supabase + Vercel API |
| Zabbix Proxy | Poller / scanner en LAN | `collector/*.py` + `X-Collector-Key` |
| Host / Item | Device + monitor | `devices` + poll ICMP |
| Network discovery | Descubre / scan | `discovery_scans` + `discovery_hosts` |
| Frontend | Maps / My Network | `/discover`, Dashboard, Topology |
| Trigger (futuro) | Alert center | `alerts` / `events` |

## Flujo WUG soportado

1. **Descubrir** — `discover.py` → `/api/collector/discovery`
2. **Ver resultados** — UI `/discover`
3. **Inventariar** — promover hosts → `devices` (`status=unknown`)
4. **Monitorizar** — `poll_inventory.py` → `/api/collector/poll` (`up`/`down`)
5. **Salud del proxy** — `/api/collector/heartbeat` → tabla `collectors`

## APIs del colector

| Endpoint | Rol Zabbix/WUG |
|----------|----------------|
| `POST /api/collector/discovery` | Network discovery |
| `POST /api/collector/heartbeat` | Proxy availability |
| `POST /api/collector/poll` | Item poll (ICMP reachability) |
| `POST /api/collector/promote` | Add to monitored inventory (UI) |

## Variables Vercel

- `SUPABASE_SERVICE_ROLE_KEY`
- `COLLECTOR_API_KEY`

## Variables del PC colector

```bash
export CNW_API_URL=https://tu-app.vercel.app
export CNW_COLLECTOR_KEY='...'
export CNW_ORG_ID='uuid'
export CNW_CIDR=192.168.10.0/24
export CNW_DEVICE_IPS=192.168.10.1,192.168.10.50
export CNW_COLLECTOR_HOST=192.168.10.5
```

## Roadmap hacia paridad mayor

- SNMP items (interfaces, CPU) como Zabbix templates
- Triggers y escalado de alertas
- Buffer offline del proxy
- Topologia L2 (LLDP/CDP) tipo WUG
- Credenciales SNMP via RPC cifrado existente
