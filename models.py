from pydantic import BaseModel, Field
from typing import List, Optional

class AssetBalances(BaseModel):
    cash_bal: float = Field(50000.0, ge=0, le=100000000, description="Cash / TTTXX ($)")
    taxable_bal: float = Field(600000.0, ge=0, le=100000000, description="Taxable Brokerage ($)")
    retirement_bal: float = Field(300000.0, ge=0, le=100000000, description="Retirement (401k/IRA) ($)")
    other_assets: float = Field(25000.0, ge=0, le=100000000, description="Non-Interest Assets ($)")
    re_value: float = Field(400000.0, ge=0, le=100000000, description="Home Equity ($)")

class RatesAndAssumptions(BaseModel):
    returns: float = Field(0.07, ge=-0.5, le=0.5, description="Expected Market Return (%) normally 7%")
    volatility: float = Field(0.15, ge=0, le=1.0, description="Market Volatility (Std Dev) normally 15%")
    cash_return: float = Field(0.052, ge=-0.1, le=0.5, description="TTTXX Yield (%) normally 5.2%")
    inflation: float = Field(0.03, ge=-0.1, le=0.5, description="Inflation (%) normally 3%")
    withdrawal_rate: float = Field(0.04, ge=0.01, le=0.5, description="Safe Withdrawal Rate (%) normally 4%")

class BaseFireInput(BaseModel):
    simulation_type: str = Field("monte_carlo", description="monte_carlo or historical")
    current_age: int = Field(30, ge=18, le=90, description="Current Age")
    simulation_end_age: int = Field(95, ge=70, le=110, description="Age to run simulation to (default 95)")
    w2_income: float = Field(7000.0, ge=0, le=5000000, description="Current Monthly W-2 (Net take-home after tax)")
    current_extra_income: float = Field(0.0, ge=0, le=1000000, description="Current Monthly Extra/Side Income")
    monthly_expenses: float = Field(5000.0, ge=1, le=1000000, description="Monthly Living Expenses (Accumulation)")
    expected_retirement_monthly_expenses: float = Field(6000.0, ge=1, le=1000000, description="Expected Monthly Living Expenses in Retirement (include healthcare premiums)")
    essential_retirement_expenses: float = Field(0.0, ge=0, le=1000000, description="Non-negotiable monthly expense floor for dynamic withdrawal (housing, food, healthcare minimum)")
    monthly_retirement_contribution: float = Field(0.0, ge=0, le=100000, description="Monthly pre-tax 401k/IRA contributions (tracked separately from take-home surplus)")
    allow_early_withdrawal: bool = Field(True, description="Allow retirement account withdrawals before age 60 with a 10% early withdrawal penalty. If False, retirement funds are fully locked until age 60.")
    roth_fraction: float = Field(0.0, ge=0.0, le=1.0, description="Fraction of retirement balance and contributions that is Roth (0=all Traditional, 1=all Roth)")
    retirement_withdrawal_tax_rate: float = Field(0.22, ge=0.0, le=0.60, description="Marginal income tax rate applied to Traditional (non-Roth) retirement withdrawals post-60")
    ss_monthly_benefit: float = Field(0.0, ge=0, le=20000, description="Expected monthly Social Security benefit in today's dollars (0 = not applicable)")
    ss_start_age: int = Field(67, ge=62, le=70, description="Age to begin receiving Social Security benefits (62–70)")
    dynamic_withdrawal: bool = Field(False, description="Enable dynamic withdrawal: proportionally reduce discretionary spending when portfolio declines below FIRE target")
    assets: AssetBalances
    rates: RatesAndAssumptions

class NormalFireInput(BaseFireInput):
    hobby_income: float = Field(0.0, ge=0, le=1000000, description="Expected monthly hobby/side income during retirement")

class CoastFireInput(BaseFireInput):
    coast_age: int = Field(32, ge=18, le=100, description="Age to stop saving and start coasting")
    coast_income: float = Field(5000.0, ge=0, le=5000000, description="Monthly income during coast phase (to cover expenses)")
    hobby_income: float = Field(0.0, ge=0, le=1000000, description="Expected monthly hobby/side income during full retirement")

class BaristaFireInput(BaseFireInput):
    ms_decay: float = Field(0.02, ge=0, le=1.0, description="Annual Extra Income 'Nerf'/Decay Rate (%) normally 2%")
    expected_barista_income: float = Field(2000.0, ge=0, le=5000000, description="Expected Monthly Income from Barista/MS Job during FIRE Phase")
    hobby_income: float = Field(0.0, ge=0, le=1000000, description="Expected Monthly Hobby/Passive income during FIRE Phase (doesn't decay)")

# Output Models
class YearlyDataPoint(BaseModel):
    Age: int
    Cash: float
    Brokerage: float
    Retirement: float
    NetWorth: float
    # Percentiles for Monte Carlo
    NetWorth_10th: Optional[float] = None
    NetWorth_50th: Optional[float] = None
    NetWorth_90th: Optional[float] = None

class FireMetrics(BaseModel):
    traditional_fire_number: float
    predicted_fire_age: int
    liquid_at_retirement: float
    survival_probability: float # e.g. 0.96 for 96% success

class FireResponse(BaseModel):
    metrics: FireMetrics
    data_points: List[YearlyDataPoint]
