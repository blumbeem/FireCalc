import numpy as np
import math
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
    real_volatility = rates.volatility / (1 + rates.inflation)
    return real_mkt_return, real_cash_return, real_volatility

def run_simulation(req, target_fire_number, get_surplus_and_shortfall_fn):
    # Instead of splitting Accumulation vs Retirement, we run from Current Age -> 95.
    age_start = req.current_age
    max_age = 95
    years_to_run = max_age - age_start
    
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
        
    # If starting wealth exceeds target, expected FIRE age is current age
    starting_liquid = req.assets.taxable_bal + req.assets.retirement_bal + req.assets.cash_bal
    
    tax_paths = np.ones(num_simulations) * req.assets.taxable_bal
    ret_paths = np.ones(num_simulations) * req.assets.retirement_bal
    cash_paths = np.ones(num_simulations) * req.assets.cash_bal
    
    # Array to track at which age each simulation crossed the FIRE threshold
    fire_ages = np.ones(num_simulations) * 999 
    if starting_liquid >= target_fire_number:
        fire_ages = np.ones(num_simulations) * age_start
        
    mc_data = [YearlyDataPoint(
        Age=age_start,
        Cash=req.assets.cash_bal,
        Brokerage=req.assets.taxable_bal,
        Retirement=req.assets.retirement_bal,
        NetWorth=starting_liquid + req.assets.other_assets + req.assets.re_value,
        NetWorth_10th=starting_liquid + req.assets.other_assets + req.assets.re_value,
        NetWorth_50th=starting_liquid + req.assets.other_assets + req.assets.re_value,
        NetWorth_90th=starting_liquid + req.assets.other_assets + req.assets.re_value
    )]
    
    for y in range(years_to_run):
        current_age = age_start + y + 1
        
        # Calculate liquid NW for each path to determine logically if each individual path is in retirement
        current_liquid_nws = tax_paths + ret_paths + cash_paths
        is_retired_array = current_liquid_nws >= target_fire_number
        
        # Update fire_ages tracker (record the very first year they cross the threshold)
        just_retired = (is_retired_array) & (fire_ages == 999)
        fire_ages[just_retired] = current_age
        
        # We need to calculate surplus/shortfall. Because it can vary path-by-path whether someone is retired,
        # we calculate BOTH states for the current age, then apply them via numpy where depending on is_retired_array.
        surplus_acc, shortfall_acc = get_surplus_and_shortfall_fn(current_age, False)
        surplus_ret, shortfall_ret = get_surplus_and_shortfall_fn(current_age, True)
        
        # Combine
        active_surplus = np.where(is_retired_array, surplus_ret, surplus_acc)
        active_shortfall = np.where(is_retired_array, shortfall_ret, shortfall_acc)
        
        # Process Shortfalls (Withdrawals)
        cash_pulled = np.minimum(cash_paths, active_shortfall)
        cash_paths -= cash_pulled
        rem_shortfall = active_shortfall - cash_pulled
        
        pull_tax_pref = current_age < 60
        
        tax_pulled = np.where(pull_tax_pref, np.minimum(tax_paths, rem_shortfall), 0.0)
        tax_paths -= tax_pulled
        rem_shortfall -= tax_pulled
        
        ret_pulled = np.minimum(ret_paths, rem_shortfall)
        ret_paths -= ret_pulled
        rem_shortfall -= ret_pulled
        
        tax_pulled_second = np.where(~pull_tax_pref, np.minimum(tax_paths, rem_shortfall), 0.0)
        tax_paths -= tax_pulled_second
        
        # Process Surpluses (Contributions) & Market Growth
        # Assuming surplus goes to taxable brokerage
        tax_paths = (tax_paths + active_surplus) * (1 + random_returns[:, y])
        ret_paths = ret_paths * (1 + random_returns[:, y])
        cash_paths = cash_paths * (1 + cash_returns[:, y])
        
        tax_paths = np.maximum(0, tax_paths)
        ret_paths = np.maximum(0, ret_paths)
        cash_paths = np.maximum(0, cash_paths)
        
        total_nw_arr = tax_paths + ret_paths + cash_paths + req.assets.other_assets + req.assets.re_value
        
        mc_data.append(YearlyDataPoint(
            Age=current_age,
            Cash=float(np.median(cash_paths)),
            Brokerage=float(np.median(tax_paths)),
            Retirement=float(np.median(ret_paths)),
            NetWorth=float(np.median(total_nw_arr)),
            NetWorth_10th=float(np.percentile(total_nw_arr, 10)),
            NetWorth_50th=float(np.median(total_nw_arr)),
            NetWorth_90th=float(np.percentile(total_nw_arr, 90))
        ))
        
    # Calculate Expected Target Age (Median of paths that successfully reached FIRE)
    successful_fire_ages = fire_ages[fire_ages != 999]
    expected_fire_age = int(np.median(successful_fire_ages)) if len(successful_fire_ages) > 0 else 999
    
    # Calculate Liquid at Expected Retirement Age
    liquid_at_retirement = 0
    if expected_fire_age != 999:
        idx = expected_fire_age - req.current_age
        if 0 <= idx < len(mc_data):
            liquid_at_retirement = mc_data[idx].Cash + mc_data[idx].Brokerage + mc_data[idx].Retirement
            
    # Survival Probability (did not drop to $0 total liquid NW by 95)
    surviving_sims = np.sum((tax_paths + ret_paths + cash_paths) > 0)
    survival_prob = float(surviving_sims) / num_simulations

    return mc_data, expected_fire_age, liquid_at_retirement, survival_prob

def calculate_normal_fire(req: NormalFireInput) -> FireResponse:
    ann_income = (req.w2_income + req.current_extra_income) * 12
    ann_expenses = req.monthly_expenses * 12
    ann_ret_expenses = req.expected_retirement_monthly_expenses * 12
    ann_hobby_income = req.hobby_income * 12
    
    net_ret_expenses = max(0, ann_ret_expenses - ann_hobby_income)
    traditional_fire_number = net_ret_expenses / req.rates.withdrawal_rate if net_ret_expenses > 0 else 0

    def get_surplus_and_shortfall(age, is_retired):
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

    def get_surplus_and_shortfall(age, is_retired):
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
    
    def get_surplus_and_shortfall(age, is_retired):
        years_diff = max(0, age - req.current_age)
        
        current_extra = (req.current_extra_income * 12) * ((1 - req.ms_decay) ** years_diff)
        if not is_retired:
            return (ann_w2_income + current_extra) - ann_expenses, 0.0
        else:
            current_barista = (req.expected_barista_income * 12) * ((1 - req.ms_decay) ** years_diff)
            net_exp = (ann_ret_expenses) - (current_barista + ann_hobby_income)
            return 0.0, max(0.0, net_exp)

    # Initial static calc for the target number uses Day 1 Barista numbers
    day_1_net_exp = max(0, ann_ret_expenses - ((req.expected_barista_income * 12) + ann_hobby_income))
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
