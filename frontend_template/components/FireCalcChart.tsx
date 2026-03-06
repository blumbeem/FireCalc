"use client";

import { YearlyDataPoint, FireMetrics } from "@/types/firecalc";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Line,
    ComposedChart
} from "recharts";

interface Props {
    data: YearlyDataPoint[];
    metrics: FireMetrics;
    targetAge: number;
}

const CustomTooltip = ({ active, payload, label, targetAge }: any) => {
    if (active && payload && payload.length) {
        const formatCurrency = (val: number) =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
            }).format(val);

        return (
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl min-w-[200px]">
                <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                    <p className="text-slate-300 font-bold">Age: {label}</p>
                    {label >= targetAge && <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Retirement</span>}
                </div>

                {payload.map((entry: any, index: number) => {
                    // Rename the technical keys to human readable
                    let name = entry.name;
                    if (name === "NetWorth_90th") name = "90th Percentile (Best)";
                    if (name === "NetWorth_50th") name = "Median (Expected)";
                    if (name === "NetWorth_10th") name = "10th Percentile (Worst)";

                    return (
                        <div key={index} className="flex items-center justify-between gap-6 mb-1">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-3 h-3 rounded-full ${entry.dataKey.includes('NetWorth') && !entry.dataKey.includes('50th') ? 'opacity-50' : ''}`}
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className={`text-sm ${entry.dataKey.includes('NetWorth') ? 'text-slate-400' : 'text-slate-300'}`}>{name}</span>
                            </div>
                            <span className={`font-semibold ${entry.dataKey.includes('NetWorth') ? 'text-slate-400' : 'text-white'}`}>
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

export default function FireCalcChart({ data, metrics, targetAge }: Props) {
    const formatYAxis = (tickItem: number) => {
        if (tickItem >= 1000000) {
            return `$${(tickItem / 1000000).toFixed(1)}M`;
        }
        if (tickItem >= 1000) {
            return `$${(tickItem / 1000).toFixed(0)}k`;
        }
        return `$${tickItem}`;
    };

    return (
        <div className="w-full h-[600px] bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Financial Independence Projection</h3>
                <span className="text-xs text-slate-500 font-mono">1,000 Monte Carlo Simulations</span>
            </div>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                    <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorBrokerage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorRetirement" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                    <XAxis
                        dataKey="Age"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        tickMargin={10}
                        domain={['dataMin', 'dataMax']}
                        type="number"
                    />
                    <YAxis
                        stroke="#94a3b8"
                        tickFormatter={formatYAxis}
                        tick={{ fill: '#94a3b8' }}
                        tickMargin={10}
                        width={80}
                        domain={[0, 'auto']}
                    />
                    <Tooltip content={<CustomTooltip targetAge={targetAge} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />

                    <Area
                        type="monotone"
                        dataKey="Cash"
                        stackId="1"
                        stroke="#06b6d4"
                        fill="url(#colorCash)"
                        name="Cash (TTTXX)"
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="Brokerage"
                        stackId="1"
                        stroke="#10b981"
                        fill="url(#colorBrokerage)"
                        name="Taxable Brokerage"
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="Retirement"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="url(#colorRetirement)"
                        name="Retirement Accounts"
                        isAnimationActive={false}
                    />

                    {/* Monte Carlo Bands */}
                    <Line type="monotone" dataKey="NetWorth_90th" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="NetWorth_10th" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="NetWorth_50th" stroke="#f8fafc" strokeWidth={2} dot={false} isAnimationActive={false} />

                    <ReferenceLine
                        y={metrics.traditional_fire_number}
                        stroke="#fbbf24"
                        strokeDasharray="5 5"
                        label={{ position: 'insideTopLeft', value: 'FIRE Target', fill: '#fbbf24', fontSize: 12, className: 'hidden sm:block' }}
                    />

                    <ReferenceLine
                        x={targetAge}
                        stroke="#f43f5e"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{ position: 'insideTopRight', value: 'Expected Age', fill: '#f43f5e', fontSize: 12 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
