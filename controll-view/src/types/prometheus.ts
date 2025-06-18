export interface PrometheusMetric {
  metric: {
    __name__: string;
    instance: string;
    job: string;
    [key: string]: string;
  };
  value: [number, string];
}

export interface PrometheusQueryResult {
  status: string;
  data: {
    resultType: string;
    result: PrometheusMetric[];
  };
}

export interface PrometheusRangeResult {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: {
        [key: string]: string;
      };
      values: Array<[number, string]>;
    }>;
  };
}

export interface ServerMetrics {
  hostname: string;
  alias?: string;
  status: 'online' | 'offline' | 'warning';
  cpu: number;
  memory: number;
  memoryTotal?: number;
  memoryUsed?: number;
  disk: number;
  diskTotal?: number;
  diskUsed?: number;
  network: {
    in: number;
    out: number;
  };
  uptime: number;
  lastUpdate: Date;
}