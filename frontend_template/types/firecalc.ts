export type FireType = 'normal' | 'coast' | 'barista';

export interface AssetBalances {
    cash_bal: number;
    taxable_bal: number;
    retirement_bal: number;
    other_assets: number;
    re_value: number;
}

export interface RatesAndAssumptions {
    returns: number;
    volatility: number;
    cash_return: number;
    inflation: number;
    withdrawal_rate: number;
}

export interface BaseFireInput {
    simulation_type: 'monte_carlo' | 'historical';
    current_age: number;
    w2_income: number;
    current_extra_income: number;
    monthly_expenses: number;
    expected_retirement_monthly_expenses: number;
    assets: AssetBalances;
    rates: RatesAndAssumptions;
}

export interface NormalFireInput extends BaseFireInput {
    hobby_income: number;
}

export interface CoastFireInput extends BaseFireInput {
    coast_age: number;
    coast_income: number;
    hobby_income: number;
}

export interface BaristaFireInput extends BaseFireInput {
    ms_decay: number;
    expected_barista_income: number;
    hobby_income: number;
}

export interface YearlyDataPoint {
    Age: number;
    Cash: number;
    Brokerage: number;
    Retirement: number;
    NetWorth: number;
    NetWorth_10th: number | null;
    NetWorth_50th: number | null;
    NetWorth_90th: number | null;
}

export interface FireMetrics {
    traditional_fire_number: number;
    predicted_fire_age: number;
    liquid_at_retirement: number;
    survival_probability: number;
}

export interface FireResponse {
    metrics: FireMetrics;
    data_points: YearlyDataPoint[];
}
