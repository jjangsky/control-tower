import axios from 'axios';
import { PrometheusQueryResult, PrometheusRangeResult } from '../types/prometheus';

const PROMETHEUS_URL = process.env.REACT_APP_PROMETHEUS_URL || 'http://localhost:9090';

export const prometheusApi = axios.create({
  baseURL: PROMETHEUS_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const queryPrometheus = async (query: string): Promise<PrometheusQueryResult> => {
  const response = await prometheusApi.get('/api/v1/query', {
    params: { query },
  });
  return response.data;
};

export const queryRangePrometheus = async (
  query: string,
  start: number,
  end: number,
  step: number = 15
): Promise<PrometheusRangeResult> => {
  const response = await prometheusApi.get('/api/v1/query_range', {
    params: { query, start, end, step },
  });
  return response.data;
};

export const getServerList = async (): Promise<string[]> => {
  const response = await prometheusApi.get('/api/v1/label/instance/values');
  return response.data.data;
};

export const getServerListWithAlias = async (): Promise<Array<{instance: string, alias?: string}>> => {
  // up 메트릭을 사용해서 모든 활성 타겟과 그들의 레이블을 가져옴
  const response = await queryPrometheus('up');
  
  return response.data.result.map((item) => ({
    instance: item.metric.instance,
    alias: item.metric.alias || item.metric.instance
  }));
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};