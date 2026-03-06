"use client";

import { FireMetrics } from "@/types/firecalc";

interface Props {
    metrics: FireMetrics;
}

export default function FireCalcResults({ metrics }: Props) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Expected Age</h3>
                <p className="text-3xl font-bold text-fuchsia-400 tracking-tight">{metrics.predicted_fire_age}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Trad. FIRE Target</h3>
                <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(metrics.traditional_fire_number)}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay"></div>
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Liquid at Target</h3>
                <p className="text-3xl font-bold text-emerald-400 tracking-tight">{formatCurrency(metrics.liquid_at_retirement)}</p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden">
                <div className={`absolute inset-0 mix-blend-overlay ${metrics.survival_probability > 0.9 ? 'bg-emerald-500/10' : metrics.survival_probability > 0.75 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}></div>
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Success Prob.</h3>
                <p className={`text-3xl font-bold tracking-tight ${metrics.survival_probability > 0.9 ? 'text-emerald-400' : metrics.survival_probability > 0.75 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(metrics.survival_probability * 100).toFixed(1)}%
                </p>
            </div>
        </div>
    );
}
