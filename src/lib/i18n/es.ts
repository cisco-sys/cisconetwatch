// Diccionario central en español. Importa desde aquí en vez de escribir textos sueltos en los componentes.

export type AppRole = 'admin' | 'noc_operator' | 'network_engineer' | 'it_management' | 'read_only';

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administrador',
  noc_operator: 'Operador NOC',
  network_engineer: 'Ingeniero de red',
  it_management: 'Gestión de TI',
  read_only: 'Solo lectura',
};

export const ROLE_DESCRIPTION: Record<AppRole, string> = {
  admin: 'Acceso total: usuarios, dispositivos, alertas y configuración.',
  noc_operator: 'Opera el panel, las alertas, la topología y el detalle de equipos.',
  network_engineer: 'Configura dispositivos y SNMP, y genera informes.',
  it_management: 'Ve el panel, los informes y las alertas en modo lectura.',
  read_only: 'Solo consulta el panel y la topología.',
};

export const STATUS_LABEL: Record<string, string> = {
  up: 'Activo',
  degraded: 'Degradado',
  down: 'Caído',
  unknown: 'Sin verificar',
};

export const PROTOCOL_LABEL: Record<string, string> = {
  SNMP: 'SNMP',
  NETCONF: 'NETCONF',
  SSH: 'SSH',
  RESTCONF: 'RESTCONF',
  TELEMETRY: 'Telemetría (gRPC)',
  ICMP: 'ICMP (ping)',
};

export const VENDOR_LABEL: Record<string, string> = {
  cisco: 'Cisco',
  aruba: 'Aruba',
  omada: 'Omada',
  juniper: 'Juniper',
  fortinet: 'Fortinet',
  ubiquiti: 'Ubiquiti',
  mikrotik: 'MikroTik',
  huawei: 'Huawei',
};

export const LINK_TYPE_LABEL: Record<string, string> = {
  ethernet: 'Ethernet',
  fibra: 'Fibra',
  wan: 'WAN',
  inalambrico: 'Inalámbrico',
};

export const DISCOVERED_VIA_LABEL: Record<string, string> = {
  manual: 'Manual',
  cdp: 'CDP',
  lldp: 'LLDP',
  snmp: 'SNMP',
};

export const T = {
  common: {
    refresh: 'Actualizar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    loading: 'Cargando…',
    noPermission: 'No tienes permiso para realizar esta acción.',
    unexpected: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    noDatabase: 'La conexión con la base de datos no está configurada. Contacta al administrador.',
  },
  topology: {
    title: 'Topología de red',
    subtitle: 'Equipos registrados y las conexiones entre ellos',
    emptyTitle: 'Aún no hay equipos en la topología',
    emptyBody:
      'Agrega dispositivos en Configuración de dispositivos. Las conexiones aparecerán aquí cuando las registres o las descubra el colector.',
    selectPrompt: 'Selecciona un equipo del diagrama para ver sus datos y conexiones.',
    unnamedTitle: 'Este equipo no tiene nombre',
    unnamedBody: 'Ahora se identifica por su IP. Asígnale un nombre para reconocerlo fácilmente.',
    namePlaceholder: 'Ej. SW-CORE-01',
    rename: 'Cambiar nombre',
    renamed: 'Nombre actualizado',
    ip: 'IP de gestión',
    model: 'Modelo',
    vendor: 'Fabricante',
    site: 'Sitio',
    status: 'Estado',
    protocol: 'Protocolo',
    connections: 'Conexiones',
    noConnections: 'Este equipo todavía no tiene conexiones registradas.',
    addConnection: 'Agregar conexión',
    connectTo: 'Conectar con',
    chooseDevice: 'Elige un equipo…',
    localPort: 'Puerto local',
    remotePort: 'Puerto remoto',
    linkType: 'Tipo de enlace',
    connect: 'Crear conexión',
    linkCreated: 'Conexión creada',
    linkExists: 'Esa conexión ya existe.',
    linkDeleted: 'Conexión eliminada',
    noOtherDevices: 'Necesitas al menos otro equipo para crear una conexión.',
    legendUp: 'Activo',
    legendDegraded: 'Degradado',
    legendDown: 'Caído',
    legendUnknown: 'Sin verificar',
    devicesCount: (n: number) => `${n} ${n === 1 ? 'equipo' : 'equipos'}`,
    linksCount: (n: number) => `${n} ${n === 1 ? 'conexión' : 'conexiones'}`,
    loadError: 'No se pudo cargar la topología. Actualiza e inténtalo de nuevo.',
  },
  users: {
    createButton: 'Crear usuario',
    createTitle: 'Crear usuario',
    fullName: 'Nombre completo',
    email: 'Correo electrónico',
    role: 'Rol',
    password: 'Contraseña inicial',
    generate: 'Generar',
    show: 'Mostrar',
    hide: 'Ocultar',
    copy: 'Copiar',
    copied: 'Copiado',
    required: 'Obligatorio',
    invalidEmail: 'Ingresa un correo válido',
    passwordMin: 'Mínimo 12 caracteres',
    submit: 'Crear usuario',
    creating: 'Creando…',
    createdTitle: 'Usuario creado',
    createdBody:
      'Entrega esta contraseña al usuario por un canal seguro. No se volverá a mostrar y debe cambiarla al entrar.',
    close: 'Cerrar',
    exists: 'Ya existe un usuario con ese correo.',
    forbidden: 'Solo un administrador puede crear usuarios.',
    createError: 'No se pudo crear el usuario.',
  },
  session: {
    guest: 'Sin sesión',
    signingIn: 'Cargando sesión…',
  },
};
