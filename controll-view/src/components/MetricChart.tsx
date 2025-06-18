import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface MetricChartProps {
  data: Array<{ time: number; value: number }>;
  title: string;
  unit?: string;
  color?: string;
  height?: number;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  data,
  title,
  unit = '%',
  color = '#3B82F6',
  height = 300,
}) => {
  const formattedData = data.map(item => ({
    ...item,
    formattedTime: format(new Date(item.time * 1000), 'HH:mm'),
  }));

  const formatYAxis = (value: number) => {
    return `${value.toFixed(0)}${unit}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="formattedTime"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={formatYAxis}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
            }}
            labelStyle={{ color: '#374151' }}
            formatter={(value: number) => [`${value.toFixed(2)}${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};