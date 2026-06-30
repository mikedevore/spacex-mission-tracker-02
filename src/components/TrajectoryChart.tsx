import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TrajectoryChartProps {
  id: string; // Used to seed the random data
  flightNumber: number;
}

export function TrajectoryChart({ id, flightNumber }: TrajectoryChartProps) {
  // Generate deterministic mock trajectory data based on launch ID/number
  const data = useMemo(() => {
    const baseCurve = [
      { t: 0, alt: 0, vel: 0 },
      { t: 60, alt: 10, vel: 900 },
      { t: 120, alt: 40, vel: 2500 }, // Max Q around here roughly
      { t: 150, alt: 70, vel: 6000 }, // MECO, Stage Sep
      { t: 160, alt: 80, vel: 6100 },
      { t: 300, alt: 150, vel: 15000 },
      { t: 480, alt: 200, vel: 25000 },
      { t: 540, alt: 210, vel: 27000 }, // SECO
    ];

    // Simple pseudo-random using flightName or ID to make each chart slightly different
    const seed = flightNumber || parseInt(id.slice(0, 4), 16) || 123;
    const rand = (i: number) => Math.sin(seed + i) * 0.1; // +/- 10%

    return baseCurve.map((pt, i) => ({
      time: `T+${pt.t}s`,
      altitude: Math.max(0, Math.round(pt.alt * (1 + rand(i)))),
      velocity: Math.max(0, Math.round(pt.vel * (1 + rand(i + 10)))),
    }));
  }, [id, flightNumber]);

  return (
    <div className="bg-[#0b101f]/90 border border-cyan-500/30 rounded-xl p-4 text-left space-y-4 mb-4 animate-fade-in relative overflow-hidden backdrop-blur-sm self-stretch w-full">
      <div className="flex justify-between items-center border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-1.5">
          {/* A simple line chart icon from lucide-react could be passed or we just write text */}
          <h3 className="font-space text-xs text-cyan-300 font-bold tracking-wider uppercase">
            ESTIMATED LAUNCH TRAJECTORY
          </h3>
        </div>
        <span className="font-mono text-[9px] px-2 py-0.5 rounded border uppercase text-slate-400 bg-slate-500/10 border-slate-500/20">
          SIMULATED TELEMETRY
        </span>
      </div>

      <div className="w-full h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left" 
              stroke="#00e7ff" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `${val}km`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#f59e0b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `${val}km/h`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px', color: '#f8fafc' }}
              itemStyle={{ fontSize: '11px' }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="altitude" 
              name="Altitude (km)"
              stroke="#00e7ff" 
              strokeWidth={2}
              dot={{ r: 2, fill: '#00e7ff' }}
              activeDot={{ r: 4 }} 
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="velocity" 
              name="Velocity (km/h)"
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ r: 2, fill: '#f59e0b' }}
              activeDot={{ r: 4 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
