'use client';
import React, { useState } from 'react';
import { Search, Copy, CheckCheck } from 'lucide-react';

const oids = [
  { id: 'oid-sysDescr', oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', value: 'Cisco IOS Software [Bengaluru], Catalyst L3 Switch Software (CAT9K_IOSXE), Version 17.9.3a', type: 'OctetString', lastUpdate: '12s ago' },
  { id: 'oid-sysUpTime', oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', value: '411234100 (47 days, 12:34:01)', type: 'TimeTicks', lastUpdate: '12s ago' },
  { id: 'oid-ifOperStatus-1', oid: '1.3.6.1.2.1.2.2.1.8.1', name: 'ifOperStatus.1', value: '1 (up)', type: 'Integer', lastUpdate: '12s ago' },
  { id: 'oid-ifInOctets-1', oid: '1.3.6.1.2.1.2.2.1.10.1', name: 'ifInOctets.1', value: '8472938472', type: 'Counter32', lastUpdate: '12s ago' },
  { id: 'oid-ifOutOctets-1', oid: '1.3.6.1.2.1.2.2.1.16.1', name: 'ifOutOctets.1', value: '9234871234', type: 'Counter32', lastUpdate: '12s ago' },
  { id: 'oid-ifInErrors-1', oid: '1.3.6.1.2.1.2.2.1.14.1', name: 'ifInErrors.1', value: '0', type: 'Counter32', lastUpdate: '12s ago' },
  { id: 'oid-ifSpeed-1', oid: '1.3.6.1.2.1.2.2.1.5.1', name: 'ifSpeed.1', value: '1000000000 (1 Gbps)', type: 'Gauge32', lastUpdate: '12s ago' },
  { id: 'oid-cpmCPUTotal5min', oid: '1.3.6.1.4.1.9.9.109.1.1.1.1.8.1', name: 'cpmCPUTotal5minRev', value: '34', type: 'Gauge32', lastUpdate: '60s ago' },
  { id: 'oid-ciscoMemUsed', oid: '1.3.6.1.4.1.9.9.48.1.1.1.5.1', name: 'ciscoMemoryPoolUsed', value: '19825344512', type: 'Gauge32', lastUpdate: '60s ago' },
  { id: 'oid-ciscoEnvTemp', oid: '1.3.6.1.4.1.9.9.13.1.3.1.3.1', name: 'ciscoEnvMonTemperatureValue', value: '42', type: 'Integer', lastUpdate: '300s ago' },
  { id: 'oid-bgpPeerState', oid: '1.3.6.1.2.1.15.3.1.2.203.0.113.1', name: 'bgpPeerState.203.0.113.1', value: '6 (established)', type: 'Integer', lastUpdate: '60s ago' },
  { id: 'oid-ifHCInOctets-1', oid: '1.3.6.1.2.1.31.1.1.1.6.1', name: 'ifHCInOctets.1', value: '847293847293847', type: 'Counter64', lastUpdate: '12s ago' },
];

export default function SNMPOidPanel() {
  const [search, setSearch] = useState('');
  const [copiedOid, setCopiedOid] = useState<string | null>(null);

  const filtered = oids.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.oid.includes(search) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  );

  const copyOid = async (oid: string, id: string) => {
    await navigator.clipboard.writeText(oid);
    setCopiedOid(id);
    setTimeout(() => setCopiedOid(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search OID name or value..."
            className="bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-72 transition-colors"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} OIDs</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['OID', 'Name', 'Type', 'Current Value', 'Last Update', ''].map((h) => (
                  <th key={`oid-th-${h}`} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((oid) => (
                <tr key={oid.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">{oid.oid}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-primary font-medium">{oid.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                      {oid.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-xs font-mono text-foreground line-clamp-2">{oid.value}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">{oid.lastUpdate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyOid(oid.oid, oid.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy OID"
                    >
                      {copiedOid === oid.id ? <CheckCheck size={13} className="text-success" /> : <Copy size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
