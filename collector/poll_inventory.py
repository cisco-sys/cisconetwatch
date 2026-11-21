#!/usr/bin/env python3
"""ICMP poll of inventory + collector heartbeat (Zabbix proxy / WUG monitor)."""

from __future__ import annotations

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
    print("pip install requests", file=sys.stderr)
    sys.exit(1)

API_URL = os.environ.get("CNW_API_URL", "").rstrip("/")
KEY = os.environ.get("CNW_COLLECTOR_KEY", "")
ORG_ID = os.environ.get("CNW_ORG_ID", "")
IPS = [x.strip() for x in os.environ.get("CNW_DEVICE_IPS", "").split(",") if x.strip()]
TIMEOUT = float(os.environ.get("CNW_PING_TIMEOUT", "1.0"))
NAME = os.environ.get("CNW_COLLECTOR_NAME", f"ICMP-{platform.node()}")
HOST = os.environ.get("CNW_COLLECTOR_HOST", "127.0.0.1")


def hdr() -> dict[str, str]:
    return {"Content-Type": "application/json", "X-Collector-Key": KEY}


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
        ok = subprocess.run(cmd, capture_output=True, timeout=TIMEOUT + 2).returncode == 0
    except Exception:
        ok = False
    rtt = round((time.perf_counter() - t0) * 1000, 2) if ok else None
    return {"ip": ip, "isUp": ok, "rttMs": rtt}


def main() -> int:
    if not API_URL or not KEY or not ORG_ID:
        print("Set CNW_API_URL, CNW_COLLECTOR_KEY, CNW_ORG_ID", file=sys.stderr)
        return 1

    results: list[dict[str, Any]] = []
    if IPS:
        with ThreadPoolExecutor(max_workers=32) as ex:
            futs = [ex.submit(ping_one, ip) for ip in IPS]
            for f in as_completed(futs):
                r = f.result()
                results.append(r)
                print(f"{'UP' if r['isUp'] else 'DOWN'} {r['ip']} {r.get('rttMs')}")

        poll = requests.post(
            f"{API_URL}/api/collector/poll",
            headers=hdr(),
            json={"orgId": ORG_ID, "results": results},
            timeout=60,
        )
        print("poll:", poll.status_code, poll.text[:200])

    up = sum(1 for r in results if r.get("isUp"))
    total = len(results) or 1
    rate = round(100.0 * up / total, 1) if results else 100.0

    hb = requests.post(
        f"{API_URL}/api/collector/heartbeat",
        headers=hdr(),
        json={
            "name": NAME,
            "host": HOST,
            "protocol": "ICMP",
            "orgId": ORG_ID,
            "version": "cnw-collector/1.0",
            "devicesCount": len(results),
            "successRate": rate,
            "status": "active" if not results or up > 0 else "degraded",
        },
        timeout=30,
    )
    print("heartbeat:", hb.status_code, hb.text[:200])
    return 0 if hb.ok else 1


if __name__ == "__main__":
    sys.exit(main())
