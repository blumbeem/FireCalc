"use client";

import { useState, useEffect } from "react";
import { FireType, BaseFireInput, NormalFireInput, CoastFireInput, BaristaFireInput } from "@/types/firecalc";

// Decouple internal string state from the parent's math model so backspacing doesn't force a '0'
const InputRow = ({ label, value, onChange, prefix = "", suffix = "", step = "1", mult = 1 }: any) => {
    const initialDisplayValue = (value * mult).toString();
    const [internalVal, setInternalVal] = useState(initialDisplayValue);

    // Sync down from parent changes (like initial load)
    useEffect(() => {
        // Only overwrite if the numeric value actually deviates from the string parsing to avoid interrupting typing
        if (parseFloat(internalVal) !== (value * mult) && !(internalVal === "" && value === 0)) {
            setInternalVal((value * mult).toString());
        }
    }, [value, mult]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const str = e.target.value;
        setInternalVal(str);
        // Parse the string to a valid float, or default to 0 if totally empty, then convert back to base (monthly)
        const numeric = parseFloat(str);
        onChange(!isNaN(numeric) ? (numeric / mult) : 0);
    };

    return (
        <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-sm font-medium text-slate-300">{label}</label>
            <div className="relative flex items-center">
                {prefix && <span className="absolute left-3 text-slate-500 font-medium">{prefix}</span>}
                <input
                    type="number"
                    step={step}
                    className={`w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 ${prefix ? 'pl-7' : 'pl-3'} ${suffix !== false ? 'pr-12' : 'pr-3'} text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base`}
                    value={internalVal}
                    onChange={handleChange}
                />
                {suffix !== false && <span className="absolute right-3 text-slate-500 text-sm">{suffix}</span>}
            </div>
        </div>
    );
};

// Tooltip fixed position to not overlap inputs
const Tooltip = ({ text }: { text: string }) => (
    <div className="group relative z-20 inline-block ml-2 cursor-help">
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold">i</span>
        <div className="opacity-0 w-[280px] bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl p-3 absolute z-30 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none transition-all shadow-xl">
            {text}
            <svg className="absolute text-slate-700 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0" /></svg>
        </div>
    </div>
);

interface Props {
    fireType: FireType;
    setFireType: (type: FireType) => void;
    baseInput: BaseFireInput;
    setBaseInput: React.Dispatch<React.SetStateAction<BaseFireInput>>;
    normalInput: Omit<NormalFireInput, keyof BaseFireInput>;
    setNormalInput: React.Dispatch<React.SetStateAction<Omit<NormalFireInput, keyof BaseFireInput>>>;
    coastInput: Omit<CoastFireInput, keyof BaseFireInput>;
    setCoastInput: React.Dispatch<React.SetStateAction<Omit<CoastFireInput, keyof BaseFireInput>>>;
    baristaInput: Omit<BaristaFireInput, keyof BaseFireInput>;
    setBaristaInput: React.Dispatch<React.SetStateAction<Omit<BaristaFireInput, keyof BaseFireInput>>>;
    isMonthly: boolean;
    setIsMonthly: (val: boolean) => void;
}

export default function FireCalcForm({
    fireType,
    setFireType,
    baseInput,
    setBaseInput,
    normalInput,
    setNormalInput,
    coastInput,
    setCoastInput,
    baristaInput,
    setBaristaInput,
    isMonthly,
    setIsMonthly
}: Props) {
    const [isFormOpen, setIsFormOpen] = useState(true);
    const [isFormLocked, setIsFormLocked] = useState(true);

    const handleBaseChange = (field: keyof BaseFireInput, value: number | string) => {
        setBaseInput(prev => ({ ...prev, [field]: value }));
    };

    const handleAssetChange = (field: keyof BaseFireInput["assets"], value: number) => {
        setBaseInput(prev => ({
            ...prev,
            assets: { ...prev.assets, [field]: value }
        }));
    };

    const handleRateChange = (field: keyof BaseFireInput["rates"], value: number) => {
        setBaseInput(prev => ({
            ...prev,
            rates: { ...prev.rates, [field]: value }
        }));
    };

    const dynSuffix = isMonthly ? "/mo" : "/yr";
    const dynMult = isMonthly ? 1 : 12;

    if (!isFormOpen) {
        return (
            <div className={`z-50 ${isFormLocked ? 'relative' : 'absolute top-0 left-0'}`}>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-3 bg-slate-800/90 backdrop-blur-md hover:bg-slate-700 text-white rounded-xl px-5 py-3 shadow-xl transition-all border border-slate-600 hover:border-cyan-500 group"
                >
                    <svg className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="font-semibold text-sm">Expand Parameters</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl p-6 w-full transition-all duration-300 ${isFormLocked ? 'bg-slate-800/50 backdrop-blur-md border border-slate-700 shadow-2xl relative' : 'bg-slate-800/95 backdrop-blur-3xl border border-cyan-500/50 absolute top-0 left-0 z-50 shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)]'}`}>

            {/* Scope Toggles & Type Selector header row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsFormOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-2 transition-colors border border-slate-600" title="Minimize Parameters">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                    </button>
                    <h2 className="text-2xl font-bold text-white shrink-0">Simulation Parameters</h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Type Selector */}
                    <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 w-full sm:w-auto overflow-hidden shrink-0">
                        {(['normal', 'coast', 'barista'] as FireType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFireType(type)}
                                className={`px-4 py-2 capitalize rounded-lg text-sm font-semibold transition-all duration-300 ${fireType === type
                                    ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/50'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {type} FIRE
                            </button>
                        ))}
                    </div>

                    {/* Monthly Toggle */}
                    <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700 shrink-0">
                        <button onClick={() => setIsMonthly(true)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${isMonthly ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Monthly</button>
                        <button onClick={() => setIsMonthly(false)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${!isMonthly ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Annually</button>
                    </div>

                    {/* Floating Lock Toggle */}
                    <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700 shrink-0">
                        <button
                            onClick={() => setIsFormLocked(!isFormLocked)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${isFormLocked ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title={isFormLocked ? "Unlock to float over chart" : "Lock to push chart down"}
                        >
                            {isFormLocked ? (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Locked</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg> Floating</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Horizontal Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 xl:gap-6 items-start">

                {/* Profile & Current Cash Flow - Combined for grid space */}
                <div className="flex flex-col gap-6">
                    <section className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                            <span className="text-xl">👤</span>
                            <h3 className="text-lg font-semibold text-white">Your Profile</h3>
                        </div>
                        <InputRow label="Current Age" value={baseInput.current_age} suffix={false} mult={1} onChange={(v: any) => handleBaseChange("current_age", v)} />
                    </section>

                    <section className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 flex-grow">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                            <span className="text-xl">💰</span>
                            <h3 className="text-lg font-semibold text-white">Current Cash Flow</h3>
                        </div>
                        <InputRow label="Current W-2 (Net)" prefix="$" mult={dynMult} suffix={dynSuffix} value={baseInput.w2_income} onChange={(v: any) => handleBaseChange("w2_income", v)} />
                        <InputRow label="Current Extra/Hobby Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={baseInput.current_extra_income} onChange={(v: any) => handleBaseChange("current_extra_income", v)} />
                        <InputRow label="Current Living Expenses" prefix="$" mult={dynMult} suffix={dynSuffix} value={baseInput.monthly_expenses} onChange={(v: any) => handleBaseChange("monthly_expenses", v)} />
                    </section>
                </div>

                {/* Dynamic Retirement Targets */}
                <section className="bg-cyan-900/10 border border-cyan-800/30 rounded-xl p-5 shadow-inner">
                    <div className="flex items-center gap-2 mb-4 border-b border-cyan-800/30 pb-2">
                        <span className="text-xl">🎯</span>
                        <h3 className="text-lg font-semibold text-cyan-400 capitalize">{fireType} Specifics (Retirement)</h3>
                    </div>

                    {fireType === 'normal' && (
                        <div className="flex flex-col h-full">
                            <InputRow label="Expected Hobby/Side Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={normalInput.hobby_income} onChange={(v: any) => setNormalInput({ hobby_income: v })} />
                        </div>
                    )}

                    {fireType === 'coast' && (
                        <div className="flex flex-col gap-1">
                            <InputRow label="Coast Age Goal" value={coastInput.coast_age} mult={1} suffix={false} onChange={(v: any) => setCoastInput(p => ({ ...p, coast_age: v }))} />
                            <InputRow label="Coast Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={coastInput.coast_income} onChange={(v: any) => setCoastInput(p => ({ ...p, coast_income: v }))} />
                            <InputRow label="Expected Hobby/Side Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={coastInput.hobby_income} onChange={(v: any) => setCoastInput(p => ({ ...p, hobby_income: v }))} />
                        </div>
                    )}

                    {fireType === 'barista' && (
                        <div className="flex flex-col gap-1">
                            <div className="mb-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center mb-1">
                                    Extra Income Decay Rate
                                    <Tooltip text="The estimated annual rate at which side hustles or temporary hobbies decrease in profitability over time." />
                                </label>
                                <InputRow label="" mult={1} suffix="%" step="0.1" value={baristaInput.ms_decay * 100} onChange={(v: any) => setBaristaInput(p => ({ ...p, ms_decay: v / 100 }))} />
                            </div>
                            <InputRow label="Expected Barista Ret. Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={baristaInput.expected_barista_income} onChange={(v: any) => setBaristaInput(p => ({ ...p, expected_barista_income: v }))} />
                            <InputRow label="Passive/Hobby Ret. Income (No Nerf)" prefix="$" mult={dynMult} suffix={dynSuffix} value={baristaInput.hobby_income} onChange={(v: any) => setBaristaInput(p => ({ ...p, hobby_income: v }))} />
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-cyan-800/30">
                        <InputRow label="Expected Living Expenses (in Ret.)" prefix="$" mult={dynMult} suffix={dynSuffix} value={baseInput.expected_retirement_monthly_expenses} onChange={(v: any) => handleBaseChange("expected_retirement_monthly_expenses", v)} />
                    </div>
                </section>

                {/* Balances */}
                <section className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <span className="text-xl">🏦</span>
                        <h3 className="text-lg font-semibold text-white">Starting Balances</h3>
                    </div>
                    <div className="flex flex-col gap-1">
                        <InputRow label="Cash / TTTXX" prefix="$" mult={1} suffix={false} value={baseInput.assets.cash_bal} onChange={(v: any) => handleAssetChange("cash_bal", v)} />
                        <InputRow label="Taxable Brokerage" prefix="$" mult={1} suffix={false} value={baseInput.assets.taxable_bal} onChange={(v: any) => handleAssetChange("taxable_bal", v)} />
                        <InputRow label="Retirement (401k/IRA)" prefix="$" mult={1} suffix={false} value={baseInput.assets.retirement_bal} onChange={(v: any) => handleAssetChange("retirement_bal", v)} />
                        <InputRow label="Home Equity" prefix="$" mult={1} suffix={false} value={baseInput.assets.re_value} onChange={(v: any) => handleAssetChange("re_value", v)} />
                        <div className="pt-2">
                            <InputRow label="Non-Interest Assets (Cars, etc)" prefix="$" mult={1} suffix={false} value={baseInput.assets.other_assets} onChange={(v: any) => handleAssetChange("other_assets", v)} />
                        </div>
                    </div>
                </section>

                {/* Rates */}
                <section className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <span className="text-xl">📈</span>
                        <h3 className="text-lg font-semibold text-white">Market & System Rates</h3>
                    </div>

                    <div className="mb-5">
                        <label className="text-sm font-medium text-slate-300 flex items-center mb-2">
                            Simulation Engine
                        </label>
                        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 overflow-hidden shrink-0">
                            <button
                                onClick={() => handleBaseChange("simulation_type", "monte_carlo")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${baseInput.simulation_type === 'monte_carlo' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >Monte Carlo</button>
                            <button
                                onClick={() => handleBaseChange("simulation_type", "historical")}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${baseInput.simulation_type === 'historical' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >Historical</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <InputRow label="Expected Return" mult={1} suffix="%" step="0.1" value={baseInput.rates.returns * 100} onChange={(v: any) => handleRateChange("returns", v / 100)} />
                        <InputRow label="Volatility" mult={1} suffix="%" step="0.1" value={baseInput.rates.volatility * 100} onChange={(v: any) => handleRateChange("volatility", v / 100)} />
                        <div className="col-span-2">
                            <InputRow label="Safe Withdrawal Rate" mult={1} suffix="%" step="0.1" value={baseInput.rates.withdrawal_rate * 100} onChange={(v: any) => handleRateChange("withdrawal_rate", v / 100)} />
                        </div>
                        <InputRow label="TTTXX Yield" mult={1} suffix="%" step="0.1" value={baseInput.rates.cash_return * 100} onChange={(v: any) => handleRateChange("cash_return", v / 100)} />
                        <InputRow label="Inflation" mult={1} suffix="%" step="0.1" value={baseInput.rates.inflation * 100} onChange={(v: any) => handleRateChange("inflation", v / 100)} />
                    </div>
                </section>

            </div>
        </div>
    );
}
