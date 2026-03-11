"use client";

import { useState, useEffect, useRef } from "react";
import { FireType, BaseFireInput, NormalFireInput, CoastFireInput, BaristaFireInput } from "@/types/firecalc";

// --- Income Entry Types ---
type PayFrequency = 'biweekly' | 'semimonthly' | 'monthly' | 'annual';
type IncomeMode = 'net' | 'gross';

const PERIODS_PER_YEAR: Record<PayFrequency, number> = {
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
    annual: 1,
};

const FREQ_LABEL: Record<PayFrequency, string> = {
    biweekly: 'Bi-weekly',
    semimonthly: 'Semi-monthly',
    monthly: 'Monthly',
    annual: 'Annual',
};

const FREQ_SUFFIX: Record<PayFrequency, string> = {
    biweekly: '/paycheck',
    semimonthly: '/paycheck',
    monthly: '/mo',
    annual: '/yr',
};

/** Convert income entry state → monthly net take-home (what the backend stores as w2_income). */
const computeMonthlyNet = (
    mode: IncomeMode,
    amount: number,
    freq: PayFrequency,
    taxRate: number,
    monthlyRetContrib: number
): number => {
    const monthlyAmount = (amount * PERIODS_PER_YEAR[freq]) / 12;
    if (mode === 'net') return monthlyAmount;
    // Gross: pre-tax 401k reduces taxable income before tax is applied.
    return (monthlyAmount - monthlyRetContrib) * (1 - taxRate);
};

const fmtDollars = (n: number) => '$' + Math.max(0, Math.round(n)).toLocaleString();

// --- Helpers ---
// decimals: if set, rounds display to N decimal places (prevents floating-point garbage like 7.000000000000001)
const fmt = (raw: number, decimals?: number) =>
    decimals !== undefined ? parseFloat(raw.toFixed(decimals)).toString() : parseFloat(raw.toPrecision(10)).toString();

const InputRow = ({ label, value, onChange, prefix = "", suffix = "", step = "1", mult = 1, decimals }: any) => {
    const initialDisplayValue = fmt(value * mult, decimals);
    const [internalVal, setInternalVal] = useState(initialDisplayValue);

    // Sync down from parent changes (like initial load)
    useEffect(() => {
        // Only overwrite if the numeric value actually deviates from the string parsing to avoid interrupting typing
        if (parseFloat(internalVal) !== (value * mult) && !(internalVal === "" && value === 0)) {
            setInternalVal(fmt(value * mult, decimals));
        }
    }, [value, mult]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const str = e.target.value;
        setInternalVal(str);
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

    const handleBaseChange = (field: keyof BaseFireInput, value: number | string | boolean) => {
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

    // --- Income Entry State ---
    // Initialized to monthly/net so the first computed w2_income == baseInput.w2_income (no flash).
    const [incomeMode, setIncomeMode] = useState<IncomeMode>('net');
    const [payFrequency, setPayFrequency] = useState<PayFrequency>('monthly');
    const [paycheckAmount, setPaycheckAmount] = useState<number>(baseInput.w2_income);
    const [grossTaxRate, setGrossTaxRate] = useState<number>(0.25);
    const incomeLoaded = useRef(false);

    // Load income entry state from its own localStorage key on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('fc_income_entry');
            if (saved) {
                const p = JSON.parse(saved);
                setIncomeMode(p.mode ?? 'net');
                setPayFrequency(p.freq ?? 'monthly');
                setPaycheckAmount(p.amount ?? baseInput.w2_income);
                setGrossTaxRate(p.taxRate ?? 0.25);
            } else {
                // No saved state: default to monthly/net with current w2_income
                setPaycheckAmount(baseInput.w2_income);
            }
        } catch {
            setPaycheckAmount(baseInput.w2_income);
        }
        incomeLoaded.current = true;
    }, []);

    // Whenever income entry state changes, recompute w2_income and persist
    useEffect(() => {
        if (!incomeLoaded.current) return;
        const monthly = computeMonthlyNet(incomeMode, paycheckAmount, payFrequency, grossTaxRate, baseInput.monthly_retirement_contribution);
        setBaseInput(prev => ({ ...prev, w2_income: Math.max(0, monthly) }));
        try {
            localStorage.setItem('fc_income_entry', JSON.stringify({
                mode: incomeMode, freq: payFrequency, amount: paycheckAmount, taxRate: grossTaxRate
            }));
        } catch { /* ignore */ }
    }, [incomeMode, payFrequency, paycheckAmount, grossTaxRate, baseInput.monthly_retirement_contribution]);

    const computedMonthlyNet = computeMonthlyNet(incomeMode, paycheckAmount, payFrequency, grossTaxRate, baseInput.monthly_retirement_contribution);

    const dynSuffix = isMonthly ? "/mo" : "/yr";
    const dynMult = isMonthly ? 1 : 12;

    const showRetWdTax = baseInput.roth_fraction < 1;

    return (
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl">

            {/* Scope Toggles */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-white">Parameters</h2>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setIsMonthly(true)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${isMonthly ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Monthly</button>
                    <button onClick={() => setIsMonthly(false)} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${!isMonthly ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Annually</button>
                </div>
            </div>

            {/* Type Selector */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 mb-8 overflow-hidden shrink-0">
                {(['normal', 'coast', 'barista'] as FireType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setFireType(type)}
                        className={`flex-1 capitalize py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${fireType === type
                            ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        {type} FIRE
                    </button>
                ))}
            </div>

            <div className="space-y-8">

                {/* Profile */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <span className="text-xl">👤</span>
                        <h3 className="text-lg font-semibold text-white">Your Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4">
                        <InputRow label="Current Age" value={baseInput.current_age} suffix={false} mult={1} onChange={(v: any) => handleBaseChange("current_age", v)} />
                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                Simulate Until Age
                                <Tooltip text="Run the simulation to this age. Default 95. Increase to 100–110 if you have family longevity history or want a more conservative stress test." />
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    step="1"
                                    min="70"
                                    max="110"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-3 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base"
                                    value={baseInput.simulation_end_age}
                                    onChange={(e) => handleBaseChange("simulation_end_age", parseInt(e.target.value) || 95)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Current Cash Flow */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <span className="text-xl">💰</span>
                        <h3 className="text-lg font-semibold text-white">Current Cash Flow (Accumulation)</h3>
                    </div>

                    {/* W-2 Income Entry */}
                    <div className="mb-5 p-3 bg-slate-900/40 border border-slate-700 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-300">W-2 Income</span>
                            {/* Net / Gross toggle */}
                            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                <button
                                    onClick={() => setIncomeMode('net')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${incomeMode === 'net' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-white'}`}
                                >Net Take-Home</button>
                                <button
                                    onClick={() => setIncomeMode('gross')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${incomeMode === 'gross' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-slate-400 hover:text-white'}`}
                                >Gross Pay</button>
                            </div>
                        </div>

                        {/* Pay Frequency Selector */}
                        <div className="flex gap-1 mb-3">
                            {(Object.keys(FREQ_LABEL) as PayFrequency[]).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setPayFrequency(f)}
                                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors border ${payFrequency === f
                                        ? 'bg-slate-700 text-white border-slate-500'
                                        : 'text-slate-500 border-slate-700 hover:text-slate-300 hover:border-slate-600'}`}
                                >{FREQ_LABEL[f]}</button>
                            ))}
                        </div>

                        {/* Paycheck Amount Input */}
                        <div className="relative flex items-center mb-2">
                            <span className="absolute left-3 text-slate-500 font-medium">$</span>
                            <input
                                type="number"
                                step="100"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-7 pr-24 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base"
                                value={paycheckAmount}
                                onChange={(e) => setPaycheckAmount(parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-3 text-slate-500 text-xs whitespace-nowrap">{incomeMode === 'gross' ? 'gross ' : ''}{FREQ_SUFFIX[payFrequency]}</span>
                        </div>

                        {/* Gross: Tax Rate */}
                        {incomeMode === 'gross' && (
                            <div className="flex items-center gap-2 mb-2 mt-3">
                                <label className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                                    Effective Tax Rate
                                    <Tooltip text="Your combined federal + state effective tax rate applied to taxable income (gross minus pre-tax 401k). Use your marginal rate as a conservative estimate, or your effective rate for average. Typically 20–35% for most W-2 earners." />
                                </label>
                                <div className="relative flex items-center flex-1">
                                    <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="60"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-1.5 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-sm"
                                        value={parseFloat((grossTaxRate * 100).toFixed(1))}
                                        onChange={(e) => setGrossTaxRate((parseFloat(e.target.value) || 0) / 100)}
                                    />
                                    <span className="absolute right-2 text-slate-500 text-xs">%</span>
                                </div>
                            </div>
                        )}

                        {/* Computed monthly net display */}
                        <div className={`text-xs px-2 py-1.5 rounded-md mt-1 flex items-center gap-1.5 ${computedMonthlyNet > 0 ? 'bg-emerald-900/20 text-emerald-400' : 'bg-red-900/20 text-red-400'}`}>
                            <span>≈</span>
                            <span className="font-mono font-semibold">{fmtDollars(computedMonthlyNet)}/mo</span>
                            <span className="text-slate-500">net take-home → used by simulation</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <InputRow label="Current Extra/Hobby Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={baseInput.current_extra_income} onChange={(v: any) => handleBaseChange("current_extra_income", v)} />
                        <div className="md:col-span-1">
                            <div className="flex flex-col gap-1.5 mb-4">
                                <label className="text-sm font-medium text-slate-300 flex items-center">
                                    {isMonthly ? "Monthly" : "Annual"} 401k/IRA Contribution
                                    <Tooltip text="Pre-tax retirement contributions (401k, IRA, etc.) made from your gross paycheck — not included in your net take-home. These flow directly into your retirement account each year and compound separately from your taxable surplus." />
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-slate-500 font-medium">$</span>
                                    <input
                                        type="number"
                                        step="100"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-7 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base"
                                        value={baseInput.monthly_retirement_contribution * dynMult}
                                        onChange={(e) => handleBaseChange("monthly_retirement_contribution", (parseFloat(e.target.value) || 0) / dynMult)}
                                    />
                                    <span className="absolute right-3 text-slate-500 text-sm">{dynSuffix}</span>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <InputRow label="Current Living Expenses" prefix="$" mult={dynMult} suffix={dynSuffix} value={baseInput.monthly_expenses} onChange={(v: any) => handleBaseChange("monthly_expenses", v)} />
                        </div>
                    </div>
                </section>

                {/* Dynamic Specific Section based on Fire Type */}
                <section className="bg-cyan-900/10 border border-cyan-800/30 p-4 rounded-xl relative">
                    <div className="flex items-center gap-2 mb-4 border-b border-cyan-800/30 pb-2">
                        <span className="text-xl">🎯</span>
                        <h3 className="text-lg font-semibold text-cyan-400 capitalize">{fireType} Specifics (Retirement Phase)</h3>
                    </div>

                    {fireType === 'normal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                            <div className="md:col-span-2">
                                <InputRow label="Expected Hobby/Side Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={normalInput.hobby_income} onChange={(v: any) => setNormalInput({ hobby_income: v })} />
                            </div>
                        </div>
                    )}

                    {fireType === 'coast' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                            <InputRow label="Coast Age Goal" value={coastInput.coast_age} mult={1} suffix={false} onChange={(v: any) => setCoastInput(p => ({ ...p, coast_age: v }))} />
                            <InputRow label="Coast Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={coastInput.coast_income} onChange={(v: any) => setCoastInput(p => ({ ...p, coast_income: v }))} />
                            <div className="md:col-span-2">
                                <InputRow label="Expected Hobby/Side Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={coastInput.hobby_income} onChange={(v: any) => setCoastInput(p => ({ ...p, hobby_income: v }))} />
                            </div>
                        </div>
                    )}

                    {fireType === 'barista' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                            <div className="md:col-span-2 mb-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center mb-1">
                                    Extra Income Decay Rate
                                    <Tooltip text="Annual rate at which side hustles decrease over time. Applied to pre-retirement extra income from your working years. Barista income in retirement decays separately, starting fresh from zero at your actual retirement date." />
                                </label>
                                <InputRow label="" mult={1} suffix="%" step="0.1" value={baristaInput.ms_decay * 100} onChange={(v: any) => setBaristaInput(p => ({ ...p, ms_decay: v / 100 }))} />
                            </div>
                            <InputRow label="Barista/Part-Time Ret. Income" prefix="$" mult={dynMult} suffix={dynSuffix} value={baristaInput.expected_barista_income} onChange={(v: any) => setBaristaInput(p => ({ ...p, expected_barista_income: v }))} />
                            <InputRow label="Passive/Hobby Income (No Decay)" prefix="$" mult={dynMult} suffix={dynSuffix} value={baristaInput.hobby_income} onChange={(v: any) => setBaristaInput(p => ({ ...p, hobby_income: v }))} />
                        </div>
                    )}

                    {/* Retirement Expenses */}
                    <div className="mt-2 pt-4 border-t border-cyan-800/30">
                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                Expected Living Expenses (in Ret.)
                                <Tooltip text="Your total monthly budget in retirement — include healthcare premiums. Before Medicare eligibility at 65, ACA marketplace plans can add $500–$1,500/month. This is your spending ceiling. If Dynamic Withdrawal is enabled, discretionary spending scales down in bad market years but this total remains the target." />
                            </label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3 text-slate-500 font-medium">$</span>
                                <input
                                    type="number"
                                    step="100"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-7 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base"
                                    value={baseInput.expected_retirement_monthly_expenses * dynMult}
                                    onChange={(e) => handleBaseChange("expected_retirement_monthly_expenses", (parseFloat(e.target.value) || 0) / dynMult)}
                                />
                                <span className="absolute right-3 text-slate-500 text-sm">{dynSuffix}</span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Withdrawal */}
                    <div className="pt-3 border-t border-cyan-800/30">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-slate-300">Dynamic Withdrawal</span>
                                <Tooltip text="When enabled, discretionary spending (travel, dining, hobbies, manufactured spending / credit card churning, entertainment) scales down proportionally when your portfolio drops below your FIRE target. Essential spending — housing, food, utilities, minimum healthcare premiums — is never cut. This mimics how most retirees actually behave and improves success probability vs. a fixed-withdrawal plan." />
                            </div>
                            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 ml-3 shrink-0">
                                <button
                                    onClick={() => handleBaseChange("dynamic_withdrawal", true)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${baseInput.dynamic_withdrawal ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-400 hover:text-white'}`}
                                >On</button>
                                <button
                                    onClick={() => handleBaseChange("dynamic_withdrawal", false)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${!baseInput.dynamic_withdrawal ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'text-slate-400 hover:text-white'}`}
                                >Off</button>
                            </div>
                        </div>

                        {baseInput.dynamic_withdrawal && (
                            <div className="mt-2">
                                <div className="flex flex-col gap-1.5 mb-2">
                                    <label className="text-sm font-medium text-slate-300 flex items-center">
                                        Essential Spending Floor
                                        <Tooltip text="The non-negotiable minimum you cannot cut: housing (rent/mortgage), groceries, utilities, minimum healthcare premiums. Everything above this in your retirement budget — travel, dining, hobbies, manufactured spend, discretionary subscriptions — is treated as cuttable in bad market years." />
                                    </label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3 text-slate-500 font-medium">$</span>
                                        <input
                                            type="number"
                                            step="100"
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-7 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono text-base"
                                            value={baseInput.essential_retirement_expenses * dynMult}
                                            onChange={(e) => handleBaseChange("essential_retirement_expenses", (parseFloat(e.target.value) || 0) / dynMult)}
                                        />
                                        <span className="absolute right-3 text-slate-500 text-sm">{dynSuffix}</span>
                                    </div>
                                    {baseInput.essential_retirement_expenses > 0 && baseInput.essential_retirement_expenses < baseInput.expected_retirement_monthly_expenses && (
                                        <p className="text-xs text-slate-500">
                                            {fmtDollars((baseInput.expected_retirement_monthly_expenses - baseInput.essential_retirement_expenses) * dynMult)}{dynSuffix} discretionary budget can be cut in downturns
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Social Security */}
                    <div className="pt-4 mt-3 border-t border-cyan-800/30">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-base">🏛️</span>
                            <span className="text-sm font-semibold text-slate-300">Social Security</span>
                            <Tooltip text="Enter your estimated monthly SS benefit in today's dollars. Check ssa.gov for your personal estimate. This income reduces the portfolio withdrawal requirement from your SS start age onward — a significant factor for early retirees who will still collect SS starting at 62–70." />
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <div className="flex flex-col gap-1.5 mb-2">
                                <label className="text-xs font-medium text-slate-400">Monthly Benefit</label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-slate-500 font-medium text-sm">$</span>
                                    <input
                                        type="number"
                                        step="50"
                                        min="0"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-7 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-sm"
                                        value={baseInput.ss_monthly_benefit}
                                        onChange={(e) => handleBaseChange("ss_monthly_benefit", parseFloat(e.target.value) || 0)}
                                    />
                                    <span className="absolute right-3 text-slate-500 text-xs">/mo</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 mb-2">
                                <label className="text-xs font-medium text-slate-400">Start Age (62–70)</label>
                                <div className="relative flex items-center">
                                    <input
                                        type="number"
                                        step="1"
                                        min="62"
                                        max="70"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-3 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-sm"
                                        value={baseInput.ss_start_age}
                                        onChange={(e) => handleBaseChange("ss_start_age", parseInt(e.target.value) || 67)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Balances */}
                <section>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
                        <span className="text-xl">🏦</span>
                        <h3 className="text-lg font-semibold text-white">Starting Balances</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <InputRow label="Cash / TTTXX" prefix="$" mult={1} suffix={false} value={baseInput.assets.cash_bal} onChange={(v: any) => handleAssetChange("cash_bal", v)} />
                        <InputRow label="Taxable Brokerage" prefix="$" mult={1} suffix={false} value={baseInput.assets.taxable_bal} onChange={(v: any) => handleAssetChange("taxable_bal", v)} />
                        <div className="md:col-span-2">
                            <div className="flex flex-col gap-1.5 mb-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center">
                                    Retirement (401k/IRA)
                                    <Tooltip text="Your retirement account balance is counted toward your FIRE threshold in the simulation. Note: if your projected FIRE age is before 59½, these funds cannot be accessed without penalty unless you enable early withdrawal below." />
                                </label>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3 text-slate-500 font-medium">$</span>
                                    <input
                                        type="number"
                                        step="1000"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-7 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base"
                                        value={baseInput.assets.retirement_bal}
                                        onChange={(e) => handleAssetChange("retirement_bal", parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {/* Roth / Traditional Split */}
                            <div className="mb-4 p-3 bg-slate-900/40 border border-slate-700 rounded-xl">
                                <div className="flex items-center gap-1 mb-2">
                                    <span className="text-xs font-medium text-slate-400">Roth % of Retirement Balance & Contributions</span>
                                    <Tooltip text="What fraction of your retirement account (and future contributions) is Roth vs. Traditional? Roth withdrawals are tax-free after 60. Traditional withdrawals are taxed as ordinary income at the rate below. Applied proportionally to both your current balance and all new contributions." />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 w-16 shrink-0">Traditional</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        className="flex-1 accent-cyan-500"
                                        value={Math.round(baseInput.roth_fraction * 100)}
                                        onChange={(e) => handleBaseChange("roth_fraction", parseInt(e.target.value) / 100)}
                                    />
                                    <span className="text-xs text-slate-500 w-8 shrink-0">Roth</span>
                                    <span className="text-sm font-mono font-semibold text-cyan-400 w-12 text-right shrink-0">
                                        {Math.round(baseInput.roth_fraction * 100)}% R
                                    </span>
                                </div>

                                {showRetWdTax && (
                                    <div className="flex items-center gap-2 mt-3">
                                        <label className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                                            Trad. Withdrawal Tax Rate
                                            <Tooltip text="Marginal income tax rate applied when withdrawing from your Traditional (pre-tax) retirement accounts post-60. A common estimate is 22–24% for most retirees, but your rate depends on your total income including SS, pensions, and RMDs." />
                                        </label>
                                        <div className="relative flex items-center flex-1">
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                max="60"
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-1.5 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-sm"
                                                value={parseFloat((baseInput.retirement_withdrawal_tax_rate * 100).toFixed(0))}
                                                onChange={(e) => handleBaseChange("retirement_withdrawal_tax_rate", (parseFloat(e.target.value) || 0) / 100)}
                                            />
                                            <span className="absolute right-2 text-slate-500 text-xs">%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <InputRow label="Home Equity" prefix="$" mult={1} suffix={false} value={baseInput.assets.re_value} onChange={(v: any) => handleAssetChange("re_value", v)} />
                        <div className="md:col-span-2 pt-2">
                            <InputRow label="Non-Interest Assets (Cars, etc)" prefix="$" mult={1} suffix={false} value={baseInput.assets.other_assets} onChange={(v: any) => handleAssetChange("other_assets", v)} />
                        </div>
                    </div>
                </section>

                {/* Rates */}
                <section>
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
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${baseInput.simulation_type === 'monte_carlo' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >Monte Carlo (Probabilistic)</button>
                            <button
                                onClick={() => handleBaseChange("simulation_type", "historical")}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${baseInput.simulation_type === 'historical' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >Historical (1928-2023)</button>
                        </div>
                    </div>

                    {/* Early Withdrawal Toggle */}
                    <div className="mb-5 p-3 bg-slate-900/40 border border-slate-700 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-slate-300">Allow Early Retirement Withdrawal</span>
                                <Tooltip text="If enabled, the simulation can draw from your 401k/IRA before age 60 as a last resort, applying a 10% early withdrawal penalty (gross-up applied). If disabled, retirement funds are fully locked until age 60 — the simulation will show portfolio stress if cash and taxable run dry early." />
                            </div>
                            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 ml-3 shrink-0">
                                <button
                                    onClick={() => handleBaseChange("allow_early_withdrawal", true)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${baseInput.allow_early_withdrawal ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'text-slate-400 hover:text-white'}`}
                                >Yes (10% Penalty)</button>
                                <button
                                    onClick={() => handleBaseChange("allow_early_withdrawal", false)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${!baseInput.allow_early_withdrawal ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-400 hover:text-white'}`}
                                >No (Locked)</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <InputRow label="Expected Return" mult={1} suffix="%" step="0.1" decimals={1} value={baseInput.rates.returns * 100} onChange={(v: any) => handleRateChange("returns", v / 100)} />
                        <div className="flex flex-col gap-1.5 mb-4">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                Market Volatility
                                <Tooltip text="The annualized standard deviation of nominal market returns (e.g. 15% = S&P 500 historical average). This is the raw spread of returns — it is NOT inflation-adjusted. A higher value widens the simulation's fan of outcomes: higher upside and lower downside across Monte Carlo paths." />
                            </label>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono text-base"
                                    value={parseFloat((baseInput.rates.volatility * 100).toFixed(1))}
                                    onChange={(e) => handleRateChange("volatility", (parseFloat(e.target.value) || 0) / 100)}
                                />
                                <span className="absolute right-3 text-slate-500 text-sm">%</span>
                            </div>
                        </div>
                        <InputRow label="TTTXX Yield" mult={1} suffix="%" step="0.1" decimals={1} value={baseInput.rates.cash_return * 100} onChange={(v: any) => handleRateChange("cash_return", v / 100)} />
                        <InputRow label="Inflation" mult={1} suffix="%" step="0.1" decimals={1} value={baseInput.rates.inflation * 100} onChange={(v: any) => handleRateChange("inflation", v / 100)} />
                        <div className="col-span-2 pt-2">
                            <InputRow label="Safe Withdrawal Rate" mult={1} suffix="%" step="0.1" decimals={1} value={baseInput.rates.withdrawal_rate * 100} onChange={(v: any) => handleRateChange("withdrawal_rate", v / 100)} />
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
