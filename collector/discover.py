#!/usr/bin/env python3
"""CiscoNetWatch LAN Discovery Collector — runs on your network (Windows/Linux/Mac)."""

from __future__ import annotations

import ipaddress
import os
import platform
import re
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
CIDR = os.environ.get("CNW_CIDR", "")
COLLECTOR_ID = os.environ.get("CNW_COLLECTOR_ID", platform.node() or "lan-collector")
WORKERS = int(os.environ.get("CNW_WORKERS", "40"))
TIMEOUT = float(os.environ.get("CNW_PING_TIMEOUT", "1.0"))
MAX_HOSTS = 4096


def headers() -> dict[str, str]:
    return {"Content-Type": "application/json", "X-Collector-Key": COLLECTOR_KEY}


def api_get(path: str, params: dict[str, str] | None = None) -> dict[str, Any]:
    r = requests.get(f"{API_URL}{path}", headers=headers(), params=params or {}, timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"API GET {r.status_code}: {r.text[:300]}")
    return r.json()


def api_post(payload: dict[str, Any]) -> dict[str, Any]:
    r = requests.post(f"{API_URL}/api/collector/discovery", json=payload, headers=headers(), timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"API POST {r.status_code}: {r.text[:300]}")
    return r.json()


def ping_one(ip: str, timeout_s: float = TIMEOUT) -> dict[str, Any]:
    system = platform.system().lower()
    if system == "windows":
        cmd = ["ping", "-n", "1", "-w", str(int(timeout_s * 1000)), ip]
    elif system == "darwin":
        cmd = ["ping", "-c", "1", "-W", str(int(timeout_s * 1000)), ip]
    else:
        cmd = ["ping", "-c", "1", "-W", str(max(1, int(timeout_s))), ip]
    t0 = time.perf_counter()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s + 2)
        out = (proc.stdout or "") + (proc.stderr or "")
        if system == "windows":
            ok = "TTL=" in out.upper() or "ttl=" in out
        else:
            ok = proc.returncode == 0
    except Exception:
        ok = False
    rtt = round((time.perf_counter() - t0) * 1000, 2) if ok else None
    return {"ip": ip, "isUp": ok, "rttMs": rtt}


def expand_targets(cidr_field: str, private_only: bool = True) -> list[str]:
    targets: list[str] = []
    for item in re.split(r"[\n,;]+", cidr_field):
        item = item.strip()
        if not item:
            continue
        if "/" in item:
            net = ipaddress.ip_network(item, strict=False)
            hosts = [str(h) for h in net.hosts()]
            if len(hosts) > MAX_HOSTS:
                raise RuntimeError(f"CIDR {item} too large ({len(hosts)}). Max {MAX_HOSTS}.")
            targets.extend(hosts)
        elif "-" in item:
            parts = [p.strip() for p in item.split("-", 1)]
            start = ipaddress.IPv4Address(parts[0])
            if parts[1].isdigit():
                end = ipaddress.IPv4Address((int(start) & 0xFFFFFF00) + int(parts[1]))
            else:
                end = ipaddress.IPv4Address(parts[1])
            if int(end) < int(start):
                raise ValueError("end < start")
            for n in range(int(start), int(end) + 1):
                targets.append(str(ipaddress.IPv4Address(n)))
        else:
            targets.append(str(ipaddress.IPv4Address(item)))
    seen: set[str] = set()
    out: list[str] = []
    for t in targets:
        if t in seen:
            continue
        if private_only and not ipaddress.IPv4Address(t).is_private:
            continue
        seen.add(t)
        out.append(t)
    if len(out) > MAX_HOSTS:
        raise RuntimeError(f"Too many hosts ({len(out)}). Max {MAX_HOSTS}.")
    return out


def run_scan(scan_id: str, cidr_field: str, config: dict[str, Any] | None) -> None:
    cfg = config or {}
    limits = cfg.get("limits") or {}
    options = cfg.get("options") or {}
    private_only = bool(limits.get("private_only", True))
    exclusions = set(limits.get("exclusions") or [])
    workers = int(options.get("max_threads") or WORKERS)
    timeout_ms = float(options.get("ping_timeout_ms") or (TIMEOUT * 1000))
    timeout_s = max(0.2, timeout_ms / 1000.0)
    retries = int(options.get("ping_retries") or 1)
    targets = [t for t in expand_targets(cidr_field, private_only=private_only) if t not in exclusions]
    print(f"Scan {scan_id}: {len(targets)} targets, workers={workers}")
    batch: list[dict[str, Any]] = []
    up = 0

    def probe(ip: str) -> dict[str, Any]:
        last = {"ip": ip, "isUp": False, "rttMs": None}
        for _ in range(max(1, retries + 1)):
            last = ping_one(ip, timeout_s)
            if last.get("isUp"):
                break
        return last

    with ThreadPoolExecutor(max_workers=max(1, workers)) as ex:
        futs = {ex.submit(probe, ip): ip for ip in targets}
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
    print(f"Done scan {scan_id}. {up} hosts up.")


def main() -> int:
    if not API_URL or not COLLECTOR_KEY:
        print("Set CNW_API_URL and CNW_COLLECTOR_KEY", file=sys.stderr)
        print('PowerShell: $env:CNW_API_URL="https://your-app.vercel.app"; $env:CNW_COLLECTOR_KEY="..."', file=sys.stderr)
        return 1
    if CIDR:
        if not ORG_ID:
            print("CNW_ORG_ID required with CNW_CIDR", file=sys.stderr)
            return 1
        start = api_post({"action": "start", "orgId": ORG_ID, "cidr": CIDR, "name": f"Discovery {CIDR}", "collectorId": COLLECTOR_ID})
        scan_id = start["scan"]["id"]
        try:
            run_scan(scan_id, CIDR, None)
            return 0
        except Exception as e:
            try:
                api_post({"action": "fail", "scanId": scan_id, "errorMessage": str(e)})
            except Exception:
                pass
            print(f"Failed: {e}", file=sys.stderr)
            return 1
    print(f"Polling pending scans from {API_URL} ...")
    try:
        data = api_get("/api/collector/discovery", {"pending": "1"})
    except Exception as e:
        print(f"Cannot list pending: {e}", file=sys.stderr)
        return 1
    scans = data.get("scans") or []
    if not scans:
        print("No pending scans.")
        return 0
    failed = 0
    for scan in scans:
        scan_id = scan["id"]
        if ORG_ID and scan.get("org_id") and scan["org_id"] != ORG_ID:
            print(f"Skip scan {scan_id}: org mismatch")
            continue
        try:
            claimed = api_post({"action": "claim", "scanId": scan_id, "collectorId": COLLECTOR_ID})
            scan = claimed.get("scan") or scan
        except Exception as e:
            print(f"Claim failed {scan_id}: {e}")
            failed += 1
            continue
        cidr_field = scan.get("cidr") or ""
        config = scan.get("config") if isinstance(scan.get("config"), dict) else {}
        try:
            run_scan(scan_id, cidr_field, config)
        except Exception as e:
            failed += 1
            try:
                api_post({"action": "fail", "scanId": scan_id, "errorMessage": str(e)})
            except Exception:
                pass
            print(f"Failed scan {scan_id}: {e}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
