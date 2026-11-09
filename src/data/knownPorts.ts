export interface KnownPort {
  name: string
  note?: string
}

/**
 * 1024 ~ 49151 注册端口 / 用户端口中的常见服务，
 * 命中的端口会在结果卡片上额外标注用途（仅作提示，不影响随机性）。
 */
export const KNOWN_PORTS: Record<number, KnownPort> = {
  1080: { name: 'SOCKS 代理' },
  1433: { name: 'Microsoft SQL Server' },
  1521: { name: 'Oracle Database' },
  1723: { name: 'PPTP VPN' },
  1883: { name: 'MQTT' },
  2049: { name: 'NFS' },
  2181: { name: 'ZooKeeper' },
  2375: { name: 'Docker API（明文）', note: '请勿公网暴露' },
  2376: { name: 'Docker API（TLS）' },
  3000: { name: 'Node / Grafana / Next.js' },
  3128: { name: 'Squid 代理' },
  3306: { name: 'MySQL / MariaDB' },
  3389: { name: 'Windows 远程桌面' },
  4000: { name: '开发服务器常用' },
  4369: { name: 'Erlang EPMD' },
  5000: { name: 'Flask / 开发服务器' },
  5173: { name: 'Vite 开发服务器' },
  5432: { name: 'PostgreSQL' },
  5601: { name: 'Kibana' },
  5672: { name: 'RabbitMQ' },
  5900: { name: 'VNC' },
  5984: { name: 'CouchDB' },
  6000: { name: 'X11' },
  6379: { name: 'Redis' },
  6443: { name: 'Kubernetes API' },
  7000: { name: '开发服务器常用' },
  7077: { name: 'Apache Spark' },
  8000: { name: '开发服务器常用' },
  8008: { name: '备用 HTTP' },
  8080: { name: 'HTTP 备用端口' },
  8081: { name: 'HTTP 备用端口' },
  8088: { name: 'YARN ResourceManager' },
  8443: { name: 'HTTPS 备用端口' },
  8888: { name: 'Jupyter Notebook' },
  9000: { name: 'PHP-FPM / Portainer' },
  9001: { name: 'Supervisor' },
  9042: { name: 'Cassandra' },
  9090: { name: 'Prometheus' },
  9092: { name: 'Apache Kafka' },
  9200: { name: 'Elasticsearch' },
  9300: { name: 'Elasticsearch 集群' },
  9418: { name: 'Git 协议' },
  10000: { name: 'Webmin' },
  11211: { name: 'Memcached' },
  15672: { name: 'RabbitMQ 管理台' },
  16379: { name: 'Redis 集群' },
  25565: { name: 'Minecraft 服务器' },
  27017: { name: 'MongoDB' },
  27018: { name: 'MongoDB（分片）' },
  28017: { name: 'MongoDB Web 状态' },
  50000: { name: 'SAP' },
  50070: { name: 'Hadoop NameNode' },
  61616: { name: 'ActiveMQ' },
}

export function lookupKnownPort(port: number): KnownPort | undefined {
  return KNOWN_PORTS[port]
}

/** 注册端口 / 用户端口的官方范围 */
export const PORT_MIN = 1024
export const PORT_MAX = 49151
