import { YearlyDataPoint, FireMetrics } from "@/types/firecalc";

interface Props {
    data: YearlyDataPoint[];
    metrics: FireMetrics;
    targetAge: number;
}

export default function FireCalcTable({ data, targetAge, metrics }: Props) {

    // Formatting helper
    const fmtCurrency = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        return "$" + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-2xl w-full h-[600px] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-slate-700/60 bg-slate-900/50 shrink-0">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="text-indigo-400">📊</span> Simulation Trajectory Datapoints
                </h3>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative font-mono text-sm">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur shadow-sm">
                        <tr>
                            <th className="p-3 text-slate-400 font-medium border-b border-slate-700/60">Age</th>
                            <th className="p-3 text-slate-400 font-medium border-b border-slate-700/60">Cash</th>
                            <th className="p-3 text-slate-400 font-medium border-b border-slate-700/60">Brokerage</th>
                            <th className="p-3 text-slate-400 font-medium border-b border-slate-700/60">Retirement</th>
                            <th className="p-3 text-slate-400 font-medium border-b border-slate-700/60">Net Worth</th>
                            <th className="p-3 text-cyan-500 font-medium border-b border-cyan-800/40 border-l">10th %ile</th>
                            <th className="p-3 text-indigo-400 font-medium border-b border-indigo-800/40">50th %ile</th>
                            <th className="p-3 text-emerald-500 font-medium border-b border-emerald-800/40">90th %ile</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => {
                            const isFireYear = row.Age === targetAge;

                            return (
                                <tr
                                    key={idx}
                                    className={`transition-colors border-b border-slate-800/50 hover:bg-slate-700/30 ${isFireYear ? 'bg-cyan-900/20' : ''}`}
                                >
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <span className={isFireYear ? "text-cyan-400 font-bold" : "text-white"}>{row.Age}</span>
                                            {isFireYear && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-sans font-bold uppercase track-wider ml-1">FIRE</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-300">{fmtCurrency(row.Cash)}</td>
                                    <td className="p-3 text-slate-300">{fmtCurrency(row.Brokerage)}</td>
                                    <td className="p-3 text-slate-300">{fmtCurrency(row.Retirement)}</td>
                                    <td className="p-3 font-medium text-slate-200">{fmtCurrency(row.NetWorth)}</td>
                                    <td className="p-3 text-cyan-400/80 border-l border-slate-800">{fmtCurrency(row.NetWorth_10th)}</td>
                                    <td className="p-3 text-indigo-300/80">{fmtCurrency(row.NetWorth_50th)}</td>
                                    <td className="p-3 text-emerald-400/80">{fmtCurrency(row.NetWorth_90th)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
