import numpy as np
from models import (
    NormalFireInput,
    CoastFireInput,
    BaristaFireInput,
    FireResponse,
    FireMetrics,
    YearlyDataPoint
)

def get_real_rates(rates):
    real_mkt_return = (1 + rates.returns) / (1 + rates.inflation) - 1
    real_cash_return = (1 + rates.cash_return) / (1 + rates.inflation) - 1
    # Volatility is a nominal measure (std dev of returns); it is not inflation-adjusted.
    # We use it directly as the simulation parameter for the lognormal draw.
    real_volatility = rates.volatility
    return real_mkt_return, real_cash_return, real_volatility

def run_simulation(req, target_fire_number, get_surplus_and_shortfall_fn):
    age_start = req.current_age
    max_age = getattr(req, 'simulation_end_age', 95)
    years_to_run = max_age - age_start

    EARLY_WITHDRAWAL_PENALTY = 0.10
    allow_early = getattr(req, 'allow_early_withdrawal', True)

    # Retirement contributions — split by Roth fraction
    ann_ret_contribution = getattr(req, 'monthly_retirement_contribution', 0.0) * 12
    roth_frac = getattr(req, 'roth_fraction', 0.0)
    ret_wd_tax = getattr(req, 'retirement_withdrawal_tax_rate', 0.22)
    ann_roth_contrib = ann_ret_contribution * roth_frac
    ann_trad_contrib = ann_ret_contribution * (1.0 - roth_frac)

    # Social Security
    ss_annual = getattr(req, 'ss_monthly_benefit', 0.0) * 12
    ss_start = getattr(req, 'ss_start_age', 67)

    # Dynamic withdrawal
    dynamic_wd = getattr(req, 'dynamic_withdrawal', False)
    essential_ann = getattr(req, 'essential_retirement_expenses', 0.0) * 12
    discr_ann = max(0.0, req.expected_retirement_monthly_expenses * 12 - essential_ann)

    if getattr(req, "simulation_type", "monte_carlo") == "historical":
        from historical_data import HISTORICAL_RATES
        num_simulations = len(HISTORICAL_RATES)
        random_returns = np.zeros((num_simulations, years_to_run))
        cash_returns = np.zeros((num_simulations, years_to_run))
        for i in range(num_simulations):
            for y in range(years_to_run):
                idx = (i + y) % num_simulations
                mkt_ret, inf_rate = HISTORICAL_RATES[idx]
                real_mkt = ((1 + mkt_ret) / (1 + inf_rate)) - 1
                real_cash = ((1 + req.rates.cash_return) / (1 + inf_rate)) - 1
                random_returns[i, y] = real_mkt
                cash_returns[i, y] = real_cash
    else:
        real_mkt_return, real_cash_return, real_volatility = get_real_rates(req.rates)
        num_simulations = 1000
        mu = np.log(1 + real_mkt_return) - 0.5 * (real_volatility ** 2)
        random_returns = np.random.lognormal(mean=mu, sigma=real_volatility, size=(num_simulations, years_to_run)) - 1
        cash_returns = np.ones((num_simulations, years_to_run)) * real_cash_return

    starting_liquid = req.assets.taxable_bal + req.assets.retirement_bal + req.assets.cash_bal

    tax_paths  = np.ones(num_simulations) * req.assets.taxable_bal
    roth_paths = np.ones(num_simulations) * req.assets.retirement_bal * roth_frac
    trad_paths = np.ones(num_simulations) * req.assets.retirement_bal * (1.0 - roth_frac)
    cash_paths = np.ones(num_simulations) * req.assets.cash_bal

    # Array to track at which age each simulation first crossed the FIRE threshold
    fire_ages = np.ones(num_simulations) * 999
    if starting_liquid >= target_fire_number:
        fire_ages = np.ones(num_simulations) * age_start

    mc_data = [YearlyDataPoint(
        Age=age_start,
        Cash=req.assets.cash_bal,
        Brokerage=req.assets.taxable_bal,
        Retirement=req.assets.retirement_bal,
        NetWorth=starting_liquid + req.assets.other_assets + req.assets.re_value,
        NetWorth_10th=starting_liquid,
        NetWorth_50th=starting_liquid,
        NetWorth_90th=starting_liquid
    )]

    for y in range(years_to_run):
        current_age = age_start + y + 1
        ret_total = roth_paths + trad_paths

        # Liquid NW used to check FIRE threshold and dynamic withdrawal scaling
        current_liquid_nws = tax_paths + ret_total + cash_paths

        # Update fire_ages tracker — first crossing only
        just_retired = (current_liquid_nws >= target_fire_number) & (fire_ages == 999)
        fire_ages[just_retired] = current_age

        # Retirement is a one-way door: once FIRE is reached, the path stays retired
        # even if the portfolio later dips below the target. Without this, failing paths
        # would incorrectly revert to "accumulation mode" with earned income, which is
        # what caused survival probability to be stuck at 100%.
        has_retired_array = fire_ages != 999

        # Surplus/shortfall from strategy (barista passes fire_ages for per-path decay)
        surplus_acc, shortfall_acc = get_surplus_and_shortfall_fn(current_age, False, fire_ages)
        surplus_ret, shortfall_ret = get_surplus_and_shortfall_fn(current_age, True, fire_ages)

        active_surplus   = np.where(has_retired_array, surplus_ret, surplus_acc)
        active_shortfall = np.where(has_retired_array, shortfall_ret, shortfall_acc)

        # --- Social Security: reduces portfolio withdrawal need after ss_start age ---
        if ss_annual > 0 and current_age >= ss_start:
            active_shortfall = np.maximum(0.0, active_shortfall - ss_annual)

        # --- Dynamic Withdrawal: cut discretionary spend as portfolio declines ---
        # Discretionary (travel, hobbies, manufactured spending, dining) scales linearly
        # with portfolio ratio vs. FIRE target. Essential floor is never cut.
        if dynamic_wd and target_fire_number > 0 and discr_ann > 0:
            port_ratio = np.clip(current_liquid_nws / target_fire_number, 0.0, 1.0)
            max_cut = discr_ann * (1.0 - port_ratio) * has_retired_array
            active_shortfall = active_shortfall - np.minimum(active_shortfall, max_cut)

        # --- Withdrawal Waterfall ---
        # Step 1: Cash first
        cash_pulled = np.minimum(cash_paths, active_shortfall)
        cash_paths -= cash_pulled
        rem_shortfall = active_shortfall - cash_pulled

        # Step 2: Under 60 → taxable preferred; 60+ → retirement preferred
        pull_tax_pref = current_age < 60
        tax_pulled = np.where(pull_tax_pref, np.minimum(tax_paths, rem_shortfall), 0.0)
        tax_paths -= tax_pulled
        rem_shortfall -= tax_pulled

        # Step 3: Retirement account — Roth/Traditional-aware
        if current_age < 60 and not allow_early:
            roth_pulled = np.zeros(num_simulations)
            trad_pulled = np.zeros(num_simulations)
        elif current_age < 60 and allow_early:
            # 10% penalty on entire pre-60 withdrawal (Roth principal is penalty-free in
            # reality, but simplified here for model tractability — slightly conservative).
            gross_needed  = rem_shortfall / (1.0 - EARLY_WITHDRAWAL_PENALTY)
            safe_total    = np.where(ret_total > 0, ret_total, 1.0)
            gross_pullable = np.minimum(ret_total, gross_needed)
            roth_pulled   = gross_pullable * (roth_paths / safe_total)
            trad_pulled   = gross_pullable * (trad_paths / safe_total)
            net_covered   = gross_pullable * (1.0 - EARLY_WITHDRAWAL_PENALTY)
            rem_shortfall = rem_shortfall - net_covered
        else:
            # 60+: Roth withdrawn tax-free; Traditional grossed-up for income tax.
            # Pull proportionally from each bucket.
            safe_total  = np.where(ret_total > 0, ret_total, 1.0)
            roth_share  = roth_paths / safe_total
            eff_factor  = roth_share + (1.0 - roth_share) * (1.0 - ret_wd_tax)
            eff_safe    = np.where(eff_factor > 0, eff_factor, 1.0)
            gross_needed   = rem_shortfall / eff_safe
            gross_pullable = np.minimum(ret_total, gross_needed)
            roth_pulled    = gross_pullable * roth_share
            trad_pulled    = gross_pullable * (1.0 - roth_share)
            net_covered    = roth_pulled + trad_pulled * (1.0 - ret_wd_tax)
            rem_shortfall  = rem_shortfall - net_covered

        roth_paths -= roth_pulled
        trad_paths -= trad_pulled

        # Step 4: Taxable as secondary for 60+ (after retirement accounts)
        tax_pulled_second = np.where(~pull_tax_pref, np.minimum(tax_paths, rem_shortfall), 0.0)
        tax_paths -= tax_pulled_second

        # --- Contributions & Market Growth ---
        roth_contrib = np.where(has_retired_array, 0.0, ann_roth_contrib)
        trad_contrib = np.where(has_retired_array, 0.0, ann_trad_contrib)

        tax_paths  = (tax_paths  + active_surplus) * (1 + random_returns[:, y])
        roth_paths = (roth_paths + roth_contrib)   * (1 + random_returns[:, y])
        trad_paths = (trad_paths + trad_contrib)   * (1 + random_returns[:, y])
        cash_paths =  cash_paths                   * (1 + cash_returns[:, y])

        tax_paths  = np.maximum(0, tax_paths)
        roth_paths = np.maximum(0, roth_paths)
        trad_paths = np.maximum(0, trad_paths)
        cash_paths = np.maximum(0, cash_paths)

        ret_total     = roth_paths + trad_paths
        liquid_nw_arr = tax_paths + ret_total + cash_paths
        total_nw_arr  = liquid_nw_arr + req.assets.other_assets + req.assets.re_value

        mc_data.append(YearlyDataPoint(
            Age=current_age,
            Cash=float(np.median(cash_paths)),
            Brokerage=float(np.median(tax_paths)),
            Retirement=float(np.median(ret_total)),
            NetWorth=float(np.median(total_nw_arr)),
            NetWorth_10th=float(np.percentile(liquid_nw_arr, 10)),
            NetWorth_50th=float(np.median(liquid_nw_arr)),
            NetWorth_90th=float(np.percentile(liquid_nw_arr, 90))
        ))

    # Expected FIRE Age: median of paths that successfully reached the target
    successful_fire_ages = fire_ages[fire_ages != 999]
    expected_fire_age = int(np.median(successful_fire_ages)) if len(successful_fire_ages) > 0 else 999

    # Liquid at expected retirement age
    liquid_at_retirement = 0
    if expected_fire_age != 999:
        idx = expected_fire_age - req.current_age
        if 0 <= idx < len(mc_data):
            liquid_at_retirement = mc_data[idx].Cash + mc_data[idx].Brokerage + mc_data[idx].Retirement

    # Survival Probability: fraction of paths with any liquid assets remaining at simulation end
    surviving_sims = np.sum((tax_paths + roth_paths + trad_paths + cash_paths) > 0)
    survival_prob = float(surviving_sims) / num_simulations

    return mc_data, expected_fire_age, liquid_at_retirement, survival_prob

def calculate_normal_fire(req: NormalFireInput) -> FireResponse:
    ann_income = (req.w2_income + req.current_extra_income) * 12
    ann_expenses = req.monthly_expenses * 12
    ann_ret_expenses = req.expected_retirement_monthly_expenses * 12
    ann_hobby_income = req.hobby_income * 12

    net_ret_expenses = max(0, ann_ret_expenses - ann_hobby_income)
    traditional_fire_number = net_ret_expenses / req.rates.withdrawal_rate if net_ret_expenses > 0 else 0

    def get_surplus_and_shortfall(_age, is_retired, _fire_ages=None):
        if not is_retired:
            return ann_income - ann_expenses, 0.0
        else:
            return 0.0, net_ret_expenses

    data, predicted_fire_age, liquid_at_retirement, survival_prob = run_simulation(req, traditional_fire_number, get_surplus_and_shortfall)

    return FireResponse(
        metrics=FireMetrics(
            traditional_fire_number=traditional_fire_number,
            predicted_fire_age=predicted_fire_age if traditional_fire_number > 0 else req.current_age,
            liquid_at_retirement=liquid_at_retirement if traditional_fire_number > 0 else req.assets.taxable_bal + req.assets.retirement_bal + req.assets.cash_bal,
            survival_probability=survival_prob if traditional_fire_number > 0 else 1.0
        ),
        data_points=data
    )

def calculate_coast_fire(req: CoastFireInput) -> FireResponse:
    ann_income = (req.w2_income + req.current_extra_income) * 12
    ann_expenses = req.monthly_expenses * 12
    ann_coast_income = req.coast_income * 12
    ann_ret_expenses = req.expected_retirement_monthly_expenses * 12
    ann_hobby_income = req.hobby_income * 12

    net_ret_expenses = max(0, ann_ret_expenses - ann_hobby_income)
    traditional_fire_number = net_ret_expenses / req.rates.withdrawal_rate if net_ret_expenses > 0 else 0

    def get_surplus_and_shortfall(age, is_retired, _fire_ages=None):
        if not is_retired:
            if age < req.coast_age:
                return ann_income - ann_expenses, 0.0
            else:
                return max(0.0, ann_coast_income - ann_expenses), max(0.0, ann_expenses - ann_coast_income)
        else:
            return 0.0, net_ret_expenses

    data, predicted_fire_age, liquid_at_retirement, survival_prob = run_simulation(req, traditional_fire_number, get_surplus_and_shortfall)

    return FireResponse(
        metrics=FireMetrics(
            traditional_fire_number=traditional_fire_number,
            predicted_fire_age=predicted_fire_age if traditional_fire_number > 0 else req.current_age,
            liquid_at_retirement=liquid_at_retirement if traditional_fire_number > 0 else req.assets.taxable_bal + req.assets.retirement_bal + req.assets.cash_bal,
            survival_probability=survival_prob if traditional_fire_number > 0 else 1.0
        ),
        data_points=data
    )

def calculate_barista_fire(req: BaristaFireInput) -> FireResponse:
    ann_w2_income = req.w2_income * 12
    ann_expenses = req.monthly_expenses * 12
    ann_ret_expenses = req.expected_retirement_monthly_expenses * 12
    ann_hobby_income = req.hobby_income * 12

    def get_surplus_and_shortfall(age, is_retired, fire_ages=None):
        # Pre-retirement extra income (side hustle) stays flat during working years
        current_extra = req.current_extra_income * 12

        if not is_retired:
            return (ann_w2_income + current_extra) - ann_expenses, 0.0
        else:
            # Barista income decay starts from when each path retired.
            if fire_ages is not None:
                years_in_ret = np.maximum(0, age - fire_ages)
                current_barista = (req.expected_barista_income * 12) * ((1 - req.ms_decay) ** years_in_ret)
                net_exp = ann_ret_expenses - (current_barista + ann_hobby_income)
                return 0.0, np.maximum(0.0, net_exp)
            else:
                # Fallback scalar path
                years_diff = max(0, age - req.current_age)
                current_barista = (req.expected_barista_income * 12) * ((1 - req.ms_decay) ** years_diff)
                net_exp = ann_ret_expenses - (current_barista + ann_hobby_income)
                return 0.0, max(0.0, net_exp)

    # Initial target uses Day 1 Barista numbers
    day_1_net_exp = max(0, ann_ret_expenses - (req.expected_barista_income * 12 + ann_hobby_income))
    # If barista income fully covers expenses, net withdrawal = 0 → FIRE number = 0.
    # The downstream guard (traditional_fire_number > 0) will correctly report current_age
    # as the predicted FIRE age, because you're already financially independent.
    traditional_fire_number = day_1_net_exp / req.rates.withdrawal_rate if day_1_net_exp > 0 else 0

    data, predicted_fire_age, liquid_at_retirement, survival_prob = run_simulation(req, traditional_fire_number, get_surplus_and_shortfall)

    return FireResponse(
        metrics=FireMetrics(
            traditional_fire_number=traditional_fire_number,
            predicted_fire_age=predicted_fire_age if traditional_fire_number > 0 else req.current_age,
            liquid_at_retirement=liquid_at_retirement if traditional_fire_number > 0 else req.assets.taxable_bal + req.assets.retirement_bal + req.assets.cash_bal,
            survival_probability=survival_prob if traditional_fire_number > 0 else 1.0
        ),
        data_points=data
    )
