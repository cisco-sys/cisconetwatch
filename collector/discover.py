#!/usr/bin/env python3
"""CiscoNetWatch LAN Discovery Collector — runs on your network, not in the browser."""

from __future__ import annotations

import ipaddress
import os
import platform
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

API_URL = os.environ.get("CNW_API_URL", "").rstrip("/")
COLLECTOR_KEY = os.environ.get("CNW_COLLECTOR_KEY", "")
ORG_ID = os.environ.get("CNW_ORG_ID", "")
CIDR = os.environ.get("CNW_CIDR", "192.168.10.0/24")
COLLECTOR_ID = os.environ.get("CNW_COLLECTOR_ID", platform.node() or "lan-collector")
WORKERS = int(os.environ.get("CNW_WORKERS", "64"))
TIMEOUT = float(os.environ.get("CNW_PING_TIMEOUT", "1.0"))


def headers() -> dict[str, str]:
    return {"Content-Type": "application/json", "X-Collector-Key": COLLECTOR_KEY}


def api_post(payload: dict[str, Any]) -> dict[str, Any]:
    r = requests.post(f"{API_URL}/api/collector/discovery", json=payload, headers=headers(), timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"API {r.status_code}: {r.text}")
    return r.json()


def ping_one(ip: str) -> dict[str, Any]:
    system = platform.system().lower()
    if system == "windows":
        cmd = ["ping", "-n", "1", "-w", str(int(TIMEOUT * 1000)), ip]
    elif system == "darwin":
        cmd = ["ping", "-c", "1", "-W", str(int(TIMEOUT * 1000)), ip]
    else:
        cmd = ["ping", "-c", "1", "-W", str(max(1, int(TIMEOUT))), ip]

    t0 = time.perf_counter()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT + 2)
        ok = proc.returncode == 0
    except Exception:
        ok = False
    rtt = round((time.perf_counter() - t0) * 1000, 2) if ok else None
    return {"ip": ip, "isUp": ok, "rttMs": rtt}


def main() -> int:
    if not API_URL or not COLLECTOR_KEY or not ORG_ID:
        print("Set CNW_API_URL, CNW_COLLECTOR_KEY, CNW_ORG_ID", file=sys.stderr)
        return 1

    network = ipaddress.ip_network(CIDR, strict=False)
    targets = [str(ip) for ip in network.hosts()]
    if len(targets) > 4096:
        print(f"CIDR too large ({len(targets)} hosts). Max 4096.", file=sys.stderr)
        return 1

    print(f"Starting scan {CIDR} ({len(targets)} hosts) -> {API_URL}")
    start = api_post(
        {
            "action": "start",
            "orgId": ORG_ID,
            "cidr": CIDR,
            "name": f"Discovery {CIDR}",
            "collectorId": COLLECTOR_ID,
        }
    )
    scan_id = start["scan"]["id"]
    print(f"Scan id: {scan_id}")

    batch: list[dict[str, Any]] = []
    up = 0
    try:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(ping_one, ip): ip for ip in targets}
            for fut in as_completed(futs):
                host = fut.result()
                if host.get("isUp"):
                    up += 1
                    print(f"  UP {host['ip']}  {host.get('rttMs')} ms")
                batch.append(host)
                if len(batch) >= 50:
                    api_post({"action": "hosts", "scanId": scan_id, "hosts": batch})
                    batch = []

        if batch:
            api_post({"action": "hosts", "scanId": scan_id, "hosts": batch})

        api_post({"action": "complete", "scanId": scan_id})
        print(f"Done. {up} hosts up. Open Descubre in CiscoNetWatch to promote to inventory.")
        return 0
    except Exception as e:
        try:
            api_post({"action": "fail", "scanId": scan_id, "errorMessage": str(e)})
        except Exception:
            pass
        print(f"Failed: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
