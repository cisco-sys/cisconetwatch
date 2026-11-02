import React from 'react';

type Protocol = 'SNMP' | 'NETCONF' | 'SSH' | 'RESTCONF' | 'TELEMETRY' | 'ICMP';

interface ProtocolBadgeProps {
  protocol: Protocol;
  active?: boolean;
}

const protocolConfig: Record<Protocol, { cls: string; label: string }> = {
  SNMP: { cls: 'protocol-snmp', label: 'SNMP' },
  NETCONF: { cls: 'protocol-netconf', label: 'NETCONF' },
  SSH: { cls: 'protocol-ssh', label: 'SSH' },
  RESTCONF: { cls: 'protocol-restconf', label: 'RESTCONF' },
  TELEMETRY: { cls: 'protocol-telemetry', label: 'Telemetry' },
  ICMP: { cls: 'protocol-icmp', label: 'ICMP PING' },
};

export default function ProtocolBadge({ protocol, active = true }: ProtocolBadgeProps) {
  const config = protocolConfig[protocol];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border ${config.cls} ${!active ? 'opacity-40' : ''}`}
    >
      {active && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {config.label}
    </span>
  );
}
