"use client";

import { useState, useEffect, useRef } from "react";
import FireCalcForm from "@/components/firecalc/FireCalcForm";
import FireCalcResults from "@/components/firecalc/FireCalcResults";
import FireCalcChart from "@/components/firecalc/FireCalcChart";
import FireCalcTable from "@/components/firecalc/FireCalcTable";
import { FireType, BaseFireInput, FireResponse } from "@/types/firecalc";

// Default Inputs
const defaultBaseInput: BaseFireInput = {
    simulation_type: 'monte_carlo',
    current_age: 35,
    w2_income: 6000,
    current_extra_income: 1000,
    monthly_expenses: 4000,
    expected_retirement_monthly_expenses: 5000,
    assets: {
        cash_bal: 20000,
        taxable_bal: 100000,
        retirement_bal: 150000,
        other_assets: 15000,
        re_value: 0,
    },
    rates: {
        returns: 0.07,
        volatility: 0.15,
        cash_return: 0.052,
        inflation: 0.03,
        withdrawal_rate: 0.04
    }
};

export default function FireCalcPage() {
    const [fireType, setFireType] = useState<FireType>("normal");
    const [baseInput, setBaseInput] = useState<BaseFireInput>(defaultBaseInput);

    const [normalInput, setNormalInput] = useState({ hobby_income: 0 });
    const [coastInput, setCoastInput] = useState({ coast_age: 32, coast_income: 5000, hobby_income: 0 });
    const [baristaInput, setBaristaInput] = useState({ ms_decay: 0.02, expected_barista_income: 6000, hobby_income: 0 });

    const [isMonthly, setIsMonthly] = useState(false);
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

    const [response, setResponse] = useState<FireResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const isInitialMount = useRef(true);

    useEffect(() => {
        try {
            const savedBase = localStorage.getItem("fc_base");
            if (savedBase) setBaseInput(JSON.parse(savedBase));
            const savedNorm = localStorage.getItem("fc_norm");
            if (savedNorm) setNormalInput(JSON.parse(savedNorm));
            const savedCoast = localStorage.getItem("fc_coast");
            if (savedCoast) setCoastInput(JSON.parse(savedCoast));
            const savedBarista = localStorage.getItem("fc_barista");
            if (savedBarista) setBaristaInput(JSON.parse(savedBarista));
            const savedType = localStorage.getItem("fc_type");
            if (savedType) setFireType(savedType as FireType);
        } catch (e) {
            console.error("Local storage load failed", e);
        }
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        localStorage.setItem("fc_base", JSON.stringify(baseInput));
        localStorage.setItem("fc_norm", JSON.stringify(normalInput));
        localStorage.setItem("fc_coast", JSON.stringify(coastInput));
        localStorage.setItem("fc_barista", JSON.stringify(baristaInput));
        localStorage.setItem("fc_type", fireType);
    }, [baseInput, normalInput, coastInput, baristaInput, fireType]);

    useEffect(() => {
        const fetchSimulation = async () => {
            setLoading(true);
            try {
                let payload: any = { ...baseInput };

                if (fireType === 'normal') {
                    payload = { ...payload, ...normalInput };
                } else if (fireType === 'coast') {
                    payload = { ...payload, ...coastInput };
                } else if (fireType === 'barista') {
                    payload = { ...payload, ...baristaInput };
                }

                const res = await fetch(`/api/firecalc/${fireType}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    const data = await res.json();
                    setResponse(data);
                } else {
                    console.error("Failed to fetch calculation from backend.", await res.text());
                }
            } catch (err) {
                console.error("Error connecting to backend.", err);
            } finally {
                setLoading(false);
            }
        };

        const handler = setTimeout(() => {
            fetchSimulation();
        }, 300);

        return () => clearTimeout(handler);
    }, [fireType, baseInput, normalInput, coastInput, baristaInput]);

    return (
        <main className="min-h-screen bg-slate-950 p-4 pt-20 md:p-8 lg:p-12 font-sans overflow-x-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none no-print-bg">
                <div className="absolute -top-[40%] text-white -right-[10%] w-[70vw] h-[70vw] rounded-full bg-cyan-900/20 blur-[120px]" />
                <div className="absolute bottom-[20%] text-white -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 blur-[120px]" />
            </div>

            <div className="max-w-[1600px] w-full mx-auto">
                <header className="mb-8 md:mb-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 mb-4 tracking-tight">
                        FIRE: A Statistical Trajectory Analysis
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl">
                        Model your Financial Independence journey mathematically. Compare probabilistic Monte Carlo regressions against actual Historical Backtesting based on your tailored FIRE strategy.
                    </p>
                </header>

                <div className="flex flex-col xl:flex-row gap-6 lg:gap-10">

                    {/* Made the form column wider: from 400px fixed to 500px, taking up roughly 1/3+ of the screen */}
                    <div className="w-full xl:w-[500px] xl:max-w-[35%] shrink-0">
                        <FireCalcForm
                            fireType={fireType}
                            setFireType={setFireType}
                            baseInput={baseInput}
                            setBaseInput={setBaseInput}
                            normalInput={normalInput}
                            setNormalInput={setNormalInput}
                            coastInput={coastInput}
                            setCoastInput={setCoastInput}
                            baristaInput={baristaInput}
                            setBaristaInput={setBaristaInput}
                            isMonthly={isMonthly}
                            setIsMonthly={setIsMonthly}
                        />
                    </div>

                    <div className="w-full xl:flex-1 flex flex-col">
                        {response ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
                                <FireCalcResults metrics={response.metrics} />

                                <div className="flex justify-end my-3 shrink-0">
                                    <div className="flex bg-slate-900 border border-slate-700 p-1 rounded-lg">
                                        <button
                                            onClick={() => setViewMode("chart")}
                                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'chart' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            📈 Chart View
                                        </button>
                                        <button
                                            onClick={() => setViewMode("table")}
                                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            📋 Data Table
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-grow min-h-[500px]">
                                    {viewMode === "chart" ? (
                                        <FireCalcChart
                                            data={response.data_points}
                                            metrics={response.metrics}
                                            targetAge={response.metrics.predicted_fire_age}
                                        />
                                    ) : (
                                        <FireCalcTable
                                            data={response.data_points}
                                            metrics={response.metrics}
                                            targetAge={response.metrics.predicted_fire_age}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-[600px] flex items-center justify-center bg-slate-900/30 rounded-2xl border border-slate-800 shadow-xl">
                                <div className="flex flex-col items-center gap-4 text-cyan-500/50">
                                    <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                                    <p className="font-medium animate-pulse">Running Simulation Logic...</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </main>
    );
}
