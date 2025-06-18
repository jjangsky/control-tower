import { useQuery } from '@tanstack/react-query';
import { queryPrometheus, queryRangePrometheus, getServerList } from '../utils/prometheus';
import { ServerMetrics } from '../types/prometheus';

export const useServerList = () => {
  return useQuery({
    queryKey: ['serverList'],
    queryFn: async () => {
      const instances = await getServerList();
      return instances;
    },
    refetchInterval: 30000, // 30초마다 갱신
  });
};

export const useServerMetrics = (instance: string) => {
  return useQuery({
    queryKey: ['serverMetrics', instance],
    queryFn: async (): Promise<ServerMetrics> => {
      // 먼저 alias 정보를 가져옴
      const upResult = await queryPrometheus(`up{instance="${instance}"}`);
      const alias = upResult.data.result[0]?.metric?.alias;
      // 주요 파티션들의 합계를 계산 (tmpfs 제외)
      const diskQuery = `
        (sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"} - node_filesystem_avail_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"}) / 
         sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"}) * 100)
      `;
      
      const [cpuResult, memResult, diskResult, uptimeResult, networkInResult, networkOutResult, 
             memTotalResult, memAvailResult, diskSizeResult, diskUsedResult] = await Promise.all([
        queryPrometheus(`100 - (avg(irate(node_cpu_seconds_total{instance="${instance}",mode="idle"}[5m])) * 100)`),
        queryPrometheus(`(1 - (node_memory_MemAvailable_bytes{instance="${instance}"} / node_memory_MemTotal_bytes{instance="${instance}"})) * 100`),
        queryPrometheus(diskQuery),
        queryPrometheus(`node_time_seconds{instance="${instance}"} - node_boot_time_seconds{instance="${instance}"}`),
        queryPrometheus(`rate(node_network_receive_bytes_total{instance="${instance}",device!="lo"}[5m])`),
        queryPrometheus(`rate(node_network_transmit_bytes_total{instance="${instance}",device!="lo"}[5m])`),
        queryPrometheus(`node_memory_MemTotal_bytes{instance="${instance}"}`),
        queryPrometheus(`node_memory_MemAvailable_bytes{instance="${instance}"}`),
        queryPrometheus(`sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"})`),
        queryPrometheus(`sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"} - node_filesystem_avail_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"})`),
      ]);

      const cpu = cpuResult.data.result[0]?.value[1] ? parseFloat(cpuResult.data.result[0].value[1]) : 0;
      const memory = memResult.data.result[0]?.value[1] ? parseFloat(memResult.data.result[0].value[1]) : 0;
      const disk = diskResult.data.result[0]?.value[1] ? parseFloat(diskResult.data.result[0].value[1]) : 0;
      const uptime = uptimeResult.data.result[0]?.value[1] ? parseFloat(uptimeResult.data.result[0].value[1]) : 0;
      const networkIn = networkInResult.data.result[0]?.value[1] ? parseFloat(networkInResult.data.result[0].value[1]) : 0;
      const networkOut = networkOutResult.data.result[0]?.value[1] ? parseFloat(networkOutResult.data.result[0].value[1]) : 0;
      
      const memoryTotal = memTotalResult.data.result[0]?.value[1] ? parseFloat(memTotalResult.data.result[0].value[1]) : 0;
      const memoryAvail = memAvailResult.data.result[0]?.value[1] ? parseFloat(memAvailResult.data.result[0].value[1]) : 0;
      const memoryUsed = memoryTotal - memoryAvail;
      
      const diskTotal = diskSizeResult.data.result[0]?.value[1] ? parseFloat(diskSizeResult.data.result[0].value[1]) : 0;
      const diskUsed = diskUsedResult.data.result[0]?.value[1] ? parseFloat(diskUsedResult.data.result[0].value[1]) : 0;

      let status: 'online' | 'offline' | 'warning' = 'online';
      if (cpu > 90 || memory > 90 || disk > 90) {
        status = 'warning';
      }

      return {
        hostname: instance,
        alias,
        status,
        cpu,
        memory,
        memoryTotal,
        memoryUsed,
        disk,
        diskTotal,
        diskUsed,
        network: {
          in: networkIn,
          out: networkOut,
        },
        uptime,
        lastUpdate: new Date(),
      };
    },
    refetchInterval: 5000, // 5초마다 갱신
  });
};

export const useMetricHistory = (instance: string, metric: string, duration: string = '1h') => {
  const now = Math.floor(Date.now() / 1000);
  const durationSeconds = {
    '1h': 3600,
    '6h': 21600,
    '24h': 86400,
    '7d': 604800,
  }[duration] || 3600;
  
  const start = now - durationSeconds;
  const step = Math.max(15, Math.floor(durationSeconds / 300)); // 최대 300개 데이터 포인트

  return useQuery({
    queryKey: ['metricHistory', instance, metric, duration],
    queryFn: () => queryRangePrometheus(metric.replaceAll('INSTANCE', instance), start, now, step),
    refetchInterval: 30000, // 30초마다 갱신
  });
};