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
    simulation_end_age: 95,
    w2_income: 6000,
    current_extra_income: 1000,
    monthly_expenses: 4000,
    expected_retirement_monthly_expenses: 5000,
    essential_retirement_expenses: 0,
    monthly_retirement_contribution: 0,
    allow_early_withdrawal: true,
    roth_fraction: 0,
    retirement_withdrawal_tax_rate: 0.22,
    ss_monthly_benefit: 0,
    ss_start_age: 67,
    dynamic_withdrawal: false,
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
    const [paramsVisible, setParamsVisible] = useState(true);

    const [response, setResponse] = useState<FireResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const isInitialMount = useRef(true);

    useEffect(() => {
        try {
            const savedBase = localStorage.getItem("fc_base");
            // Spread over defaults so newly-added fields always have a value even with stale cached data
            if (savedBase) setBaseInput({ ...defaultBaseInput, ...JSON.parse(savedBase) });
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
                        Model your Financial Independence journey mathematically. Compare probabilistic Monte Carlo simulations against actual Historical Backtesting based on your tailored FIRE strategy.
                    </p>
                </header>

                <div className="relative flex flex-col gap-6 lg:gap-10">

                    {/* Parameters panel with collapse toggle */}
                    <div className="w-full shrink-0">
                        {/* Toggle bar — always visible */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-400 tracking-wide uppercase">
                                Parameters
                            </span>
                            <button
                                onClick={() => setParamsVisible(v => !v)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                            >
                                <svg
                                    className={`w-3.5 h-3.5 transition-transform duration-300 ${paramsVisible ? '' : 'rotate-180'}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                </svg>
                                {paramsVisible ? 'Hide' : 'Show Parameters'}
                            </button>
                        </div>

                        {/* Form — keep mounted so income entry state is preserved, just hide visually */}
                        <div className={paramsVisible ? '' : 'hidden'}>
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
                    </div>

                    <div className="w-full flex-1 flex flex-col">
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

                {/* ── Educational Content (SEO) ─────────────────────────────────────────── */}
                <article className="mt-20 border-t border-slate-800 pt-14 max-w-3xl space-y-10 text-slate-400 leading-relaxed">

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">What is Barista FIRE?</h2>
                        <p>
                            Barista FIRE is a semi-retirement strategy within the Financial Independence, Retire Early (FIRE) movement. Instead of accumulating the full 25× portfolio required for complete retirement, you leave your high-stress career early and take a low-pressure, part-time job — the canonical example being a barista — to cover day-to-day living costs while your investment portfolio continues to compound in the background.
                        </p>
                        <p className="mt-3">
                            The defining feature of Barista FIRE is that your part-time income reduces or eliminates the need to draw from your portfolio, which dramatically lowers your required FIRE number and lets you semi-retire years — sometimes a decade — earlier than the traditional path.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">How the Barista FIRE Number is Calculated</h2>
                        <p>
                            Your Barista FIRE number is lower than the traditional 25× multiple (based on the 4% safe withdrawal rate) because your part-time income covers a portion of retirement expenses. The formula is:
                        </p>
                        <div className="my-4 p-4 bg-slate-900/60 border border-slate-700 rounded-xl font-mono text-sm text-cyan-300">
                            FIRE Number = (Annual Retirement Expenses − Annual Barista Income) ÷ Safe Withdrawal Rate
                        </div>
                        <p>
                            For example: if you expect $5,000/month in retirement expenses and earn $2,500/month as a barista, your net annual gap is $30,000. At a 4% withdrawal rate, your Barista FIRE number is $750,000 — compared to $1,500,000 for traditional FIRE on the same budget.
                        </p>
                        <p className="mt-3">
                            The simulator above models barista income as decaying over time from your retirement date, reflecting the reality that part-time work naturally diminishes as you age or disengage further from the workforce. Your portfolio must grow to absorb an increasing share of expenses over time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">Barista FIRE vs. Coast FIRE vs. Lean FIRE</h2>
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-xl">
                                <p className="text-white font-semibold mb-1">Barista FIRE</p>
                                <p>Semi-retire early. Work part-time to cover living costs. Portfolio compounds untouched (or nearly so) until it can fully support you. Best for people who want to escape the grind immediately but aren&apos;t ready to stop working entirely.</p>
                            </div>
                            <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-xl">
                                <p className="text-white font-semibold mb-1">Coast FIRE</p>
                                <p>You&apos;ve saved enough that, even with zero additional contributions, compounding alone will grow your portfolio to your FIRE number by traditional retirement age. You can coast on any income that covers current expenses. You may still work full-time — just without the pressure to save aggressively.</p>
                            </div>
                            <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-xl">
                                <p className="text-white font-semibold mb-1">Lean FIRE</p>
                                <p>Full early retirement on a frugal, minimalist budget — typically under $40,000/year. Requires the smallest portfolio but demands the most lifestyle discipline. No part-time income buffer.</p>
                            </div>
                            <div className="p-4 bg-slate-900/40 border border-slate-700 rounded-xl">
                                <p className="text-white font-semibold mb-1">Fat FIRE</p>
                                <p>Full early retirement on a generous budget — typically $100,000+/year. Requires the largest portfolio but offers maximum lifestyle flexibility. Suitable for high earners who don&apos;t want to compromise spending in retirement.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">Dynamic Withdrawal: Protecting Against Sequence-of-Returns Risk</h2>
                        <p>
                            One of the biggest risks in early retirement is a severe market downturn in the first few years — known as sequence-of-returns risk. If your portfolio drops 30% in year one of retirement, the fixed withdrawals required to cover expenses permanently impair recovery.
                        </p>
                        <p className="mt-3">
                            The dynamic withdrawal strategy addresses this by splitting your retirement budget into two buckets: <strong className="text-slate-200">essential spending</strong> (housing, food, utilities, healthcare premiums — the non-negotiables) and <strong className="text-slate-200">discretionary spending</strong> (travel, dining out, hobbies, entertainment, manufactured spending). In bad market years, discretionary spending scales back proportionally with your portfolio, protecting the core from being depleted. Essential spending is never cut.
                        </p>
                        <p className="mt-3">
                            Enable this in the simulator above and set your essential floor. The model will automatically reduce discretionary withdrawals as the portfolio declines below your FIRE target, and restore full spending as it recovers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">Why Monte Carlo Simulation?</h2>
                        <p>
                            Historical backtesting tells you what would have happened in every 30-year window since 1928. Monte Carlo simulation generates 1,000 synthetic futures drawn from the statistical distribution of historical returns, giving you a probability distribution of outcomes rather than a single number. The &quot;Success Probability&quot; shown in the results represents the fraction of those 1,000 paths where your portfolio survived to your simulation end age without running to zero.
                        </p>
                        <p className="mt-3">
                            A 90%+ success rate is generally considered robust. Below 80%, most financial planners would recommend adjusting the plan — either by reducing expenses, adding a part-time income stream, or delaying retirement by a few years.
                        </p>
                    </section>

                </article>

            </div>
        </main>
    );
}
