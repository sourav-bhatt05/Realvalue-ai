from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import numpy as np
import joblib
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# --- Path config ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, '..', '..', 'Notebooks')
SALES_MODEL_PATH = os.path.join(MODELS_DIR, 'sales_model.pkl')
RENTAL_MODEL_PATH = os.path.join(MODELS_DIR, 'rental_model.pkl')

print(f"Loading Sales Model from: {SALES_MODEL_PATH}")
sales_model = joblib.load(SALES_MODEL_PATH)

print(f"Loading Rental Model from: {RENTAL_MODEL_PATH}")
rental_model = joblib.load(RENTAL_MODEL_PATH)

print("Models loaded successfully!")

# --- Helper: Geodistance (Haversine via Python) ---
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Delhi Landmarks
AIIMS_COORDS = (28.5659, 77.2096)
IGI_AIRPORT_COORDS = (28.5562, 77.1000)
NDLS_COORDS = (28.6429, 77.2191)

# A few major stations to estimate nearest metro distance
METRO_STATIONS = [
    (28.6328, 77.2197),  # Rajiv Chowk
    (28.6665, 77.2289),  # Kashmere Gate
    (28.5434, 77.2001),  # Hauz Khas
    (28.5204, 77.2798),  # Okhla
    (28.6256, 77.2783),  # Laxmi Nagar
]

def calculate_distances(lat, lng):
    min_metro = min([haversine(lat, lng, m[0], m[1]) for m in METRO_STATIONS])
    return {
        'closest_metro_station_km': min_metro,
        'AP_dist_km': haversine(lat, lng, IGI_AIRPORT_COORDS[0], IGI_AIRPORT_COORDS[1]),
        'Aiims_dist_km': haversine(lat, lng, AIIMS_COORDS[0], AIIMS_COORDS[1]),
        'NDRLW_dist_km': haversine(lat, lng, NDLS_COORDS[0], NDLS_COORDS[1])
    }

# --- Investment Analysis Engine ---
def advanced_investment_analysis(
    sale_price,
    monthly_rent,
    appreciation_rate=0.06,
    rent_growth_rate=0.05,
    years=5,
    loan_interest_rate=0.085,
    loan_tenure_years=25,
    down_payment_percent=20,
    vacancy_rate=0.08,
    maintenance_percent=0.01,
    exit_cost_percent=0.02
):
    annual_rent_gross = monthly_rent * 12
    rental_yield = (annual_rent_gross / sale_price) * 100 if sale_price > 0 else 0

    down_payment = sale_price * (down_payment_percent / 100)
    loan_amount = sale_price - down_payment
    monthly_interest = loan_interest_rate / 12
    total_payments = loan_tenure_years * 12

    if loan_amount > 0 and monthly_interest > 0:
        emi = (loan_amount * monthly_interest * (1 + monthly_interest) ** total_payments) / ((1 + monthly_interest) ** total_payments - 1)
    else:
        emi = 0
    annual_emi = emi * 12

    total_net_rent = 0
    total_emi_paid = 0
    current_annual_rent = annual_rent_gross
    annual_maintenance = sale_price * maintenance_percent

    for _ in range(years):
        effective_rent = current_annual_rent * (1 - vacancy_rate)
        net_rent_after_costs = effective_rent - annual_maintenance
        total_net_rent += net_rent_after_costs
        total_emi_paid += annual_emi
        current_annual_rent *= (1 + rent_growth_rate)

    net_operating_cashflow = total_net_rent - total_emi_paid

    future_price = sale_price * ((1 + appreciation_rate) ** years)
    selling_cost = future_price * exit_cost_percent
    net_sale_proceeds = future_price - selling_cost
    capital_gain_net = net_sale_proceeds - sale_price
    total_cash_invested = down_payment + max(0, -net_operating_cashflow)
    total_net_profit = capital_gain_net + net_operating_cashflow

    total_return_percent = (total_net_profit / total_cash_invested) * 100 if total_cash_invested > 0 else 0

    if total_net_rent > 0:
        break_even_years = total_cash_invested / (total_net_rent / years)
    else:
        break_even_years = float("inf")

    if net_operating_cashflow >= 0 and total_return_percent >= 40:
        insight = "This property offers strong rental yield and generates positive monthly cashflow even after financing costs. The investment provides both immediate steady income and long-term capital appreciation. Suitable for investors seeking cash-flow positive assets."
        ai_rating = "STRONG BUY"
    elif total_return_percent >= 25:
        insight = "This property offers moderate rental yield but generates negative cashflow due to financing costs. The investment relies primarily on long-term capital appreciation. Suitable for investors seeking asset growth rather than immediate rental income."
        ai_rating = "BUY & HOLD"
    else:
        insight = "This property offers low rental yield and generates significant negative cashflow due to financing costs. The investment relies entirely on speculative long-term capital appreciation. Suitable only for high-net-worth investors prioritizing asset parking and long-term wealth growth."
        ai_rating = "HOLD FOR APPRECIATION"

    return {
        "property_value": sale_price,
        "down_payment": down_payment,
        "loan_amount": loan_amount,
        "monthly_emi": emi,
        "monthly_rent": monthly_rent,
        "gross_rental_yield_pct": round(rental_yield, 2),
        "net_rent_5y": total_net_rent,
        "net_operating_cashflow_5y": net_operating_cashflow,
        "future_value_5y": future_price,
        "selling_cost": selling_cost,
        "net_sale_proceeds": net_sale_proceeds,
        "net_capital_gain": capital_gain_net,
        "total_cash_invested": total_cash_invested,
        "total_net_profit_5y": total_net_profit,
        "total_net_return_pct": round(total_return_percent, 2),
        "realistic_break_even_yrs": round(break_even_years, 1) if break_even_years != float("inf") else "N/A",
        "investment_insight": insight,
        "ai_rating": ai_rating
    }

SALES_FEATURES = ['Area', 'BHK', 'Bathroom', 'Parking', 'Furnishing_Semi-Furnished', 'Furnishing_Unfurnished', 'Locality_Chhattarpur', 'Locality_Chittaranjan Park', 'Locality_Common Wealth Games Village, Commonwealth Games Village 2010', 'Locality_DDA Flats Sarita Vihar, Sarita Vihar, Mathura Road', 'Locality_DLF Capital Greens, New Moti Nagar, Kirti Nagar', 'Locality_Dilshad Colony, Dilshad Garden', 'Locality_J R Designers Floors, Rohini Sector 24', 'Locality_Kailash Colony, Greater Kailash', 'Locality_Lajpat Nagar 2', 'Locality_Lajpat Nagar 3', 'Locality_Laxmi Nagar', 'Locality_Mahavir Enclave', 'Locality_Mahavir Enclave Part 1', 'Locality_Malviya Nagar', 'Locality_Mehrauli', 'Locality_Narmada Apartment, Alaknanda', 'Locality_New Friends Colony', 'Locality_New Manglapuri, Sultanpur', 'Locality_New Moti Nagar, Kirti Nagar', 'Locality_Patel Nagar West', 'Locality_Rohini Sector 24', 'Locality_Safdarjung Enclave', 'Locality_Saket', 'Locality_Sheikh Sarai Phase 1', 'Locality_Sukhdev Vihar, Okhla', 'Locality_The Amaryllis, Karol Bagh', 'Locality_Vasant Kunj', 'Locality_Vasundhara Enclave', 'Locality_Yamuna Vihar, Shahdara', 'Status_Ready_to_move', 'Transaction_Resale', 'Type_Builder_Floor']

RENTAL_FEATURES = ['size_sq_ft', 'bedrooms', 'latitude', 'longitude', 'closest_mtero_station_km', 'AP_dist_km', 'Aiims_dist_km', 'NDRLW_dist_km']

DELHI_RENT_PSQFT = {
    "West Delhi": 45,
    "South Delhi": 65,
    "Central Delhi": 75,
    "North Delhi": 40,
    "East Delhi": 38,
    "Dwarka": 42
}

DELHI_PRICE_PSQFT = {
    "Janakpuri": 18000,
    "Dwarka": 16000,
    "Vasant Kunj": 22000,
    "Rohini": 15000,
    "Patel Nagar": 20000,
    "Lajpat Nagar": 24000
}

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    try:
        lat = float(data.get('latitude', 28.6139))
        lng = float(data.get('longitude', 77.2090))
        area = float(data.get('area', 1000))
        bhk = int(data.get('bhk', 3))
        furnishing = data.get('furnishing', 'Semi-Furnished') # Unfurnished, Semi-Furnished, Fully-Furnished
        prop_type = data.get('prop_type', 'Apartment')
        status = data.get('status', 'Ready to Move')
        locality_text = data.get('locality', '')

        # 1. RENTAL PREDICTION
        distances = calculate_distances(lat, lng)
        rental_dict = {
            'size_sq_ft': area,
            'bedrooms': bhk,
            'latitude': lat,
            'longitude': lng,
            'closest_mtero_station_km': distances['closest_metro_station_km'],
            'AP_dist_km': distances['AP_dist_km'],
            'Aiims_dist_km': distances['Aiims_dist_km'],
            'NDRLW_dist_km': distances['NDRLW_dist_km']
        }
        
        # Ensure exact column order as expected by model
        rental_input = pd.DataFrame([rental_dict], columns=RENTAL_FEATURES)
        predicted_rent_log = rental_model.predict(rental_input)[0]
        # Rental model was trained using log1p, so invert with expm1. Predictions are already monthly.
        raw_predicted_rent = np.expm1(predicted_rent_log)

        # 1.1 RENTAL BLENDING LAYER (Price-Per-SqFt Market Correction)
        region = "Default"
        for r in DELHI_RENT_PSQFT.keys():
            if r.lower() in locality_text.lower():
                region = r
                break
                
        market_rent = area * DELHI_RENT_PSQFT.get(region, 45) # 45 as safe default

        # Calculate Rent Confidence Score
        rent_diff_pct = abs(raw_predicted_rent - market_rent) / market_rent * 100
        rent_confidence_score = max(60.0, min(99.0, 100.0 - rent_diff_pct))

        # Adaptive Calibration: Only correct when ML model is unrealistic
        diff = abs(raw_predicted_rent - market_rent) / market_rent
        if diff > 0.40:
            blended_rent = (0.6 * raw_predicted_rent) + (0.4 * market_rent)
        else:
            blended_rent = raw_predicted_rent
        
        # Clamp against crazy predictions
        min_rent = area * 30
        max_rent = area * 100
        predicted_rent = max(min_rent, min(blended_rent, max_rent))

        # 2. SALES PREDICTION
        sales_dict = {f: 0 for f in SALES_FEATURES}
        sales_dict['Area'] = area
        sales_dict['BHK'] = bhk
        sales_dict['Bathroom'] = max(1, bhk - 1) # Imputed
        sales_dict['Parking'] = 1 # Imputed

        # Furnishing
        if furnishing == 'Semi-Furnished':
            sales_dict['Furnishing_Semi-Furnished'] = 1
        elif furnishing == 'Unfurnished':
            sales_dict['Furnishing_Unfurnished'] = 1

        # Status
        if status == 'Ready to Move':
            sales_dict['Status_Ready_to_move'] = 1
            
        # Hardcode Resale to 1 since we dropped the field
        sales_dict['Transaction_Resale'] = 1
        
        # Property Type
        if "Builder Floor" in prop_type:
            sales_dict['Type_Builder_Floor'] = 1

        # Locality match
        for f in SALES_FEATURES:
            if f.startswith('Locality_'):
                loc_name = f.replace('Locality_', '')
                # Improved matching to avoid edge cases if possible
                if loc_name.lower() in locality_text.lower() or locality_text.lower() in loc_name.lower():
                    sales_dict[f] = 1
                    break 

        # Ensure exact column order as expected by model
        sales_input = pd.DataFrame([sales_dict], columns=SALES_FEATURES)
        
        predicted_sale_log = sales_model.predict(sales_input)[0]
        # Sales model was trained using log, so invert with exp
        raw_predicted_sale = np.exp(predicted_sale_log)
        
        # 2.1 SALES BLENDING LAYER (Post-Model Price Calibration)
        sale_region = "Default"
        for r in DELHI_PRICE_PSQFT.keys():
            if r.lower() in locality_text.lower():
                sale_region = r
                break
                
        market_price = area * DELHI_PRICE_PSQFT.get(sale_region, 18000) # 18000 as safe default
        
        # Calculate Price Confidence Score
        price_diff_pct = abs(raw_predicted_sale - market_price) / market_price * 100
        price_confidence_score = max(60.0, min(99.0, 100.0 - price_diff_pct))
        
        # Overall Confidence Score (Average of Rent and Price)
        final_confidence_score = (rent_confidence_score + price_confidence_score) / 2.0
        
        # Adaptive Calibration: Only correct when ML model is unrealistic
        diff_price = abs(raw_predicted_sale - market_price) / market_price
        if diff_price > 0.35:
            blended_sale = (0.7 * raw_predicted_sale) + (0.3 * market_price)
        else:
            blended_sale = raw_predicted_sale
        
        # Clamp against crazy predictions
        min_price = area * 12000
        max_price = area * 50000
        predicted_sale = max(min_price, min(blended_sale, max_price))
        
        # Calculate investment metrics
        investment_metrics = advanced_investment_analysis(
            sale_price=float(predicted_sale),
            monthly_rent=float(predicted_rent)
        )

        return jsonify({
            'success': True,
            'price': float(predicted_sale),
            'rent': float(predicted_rent),
            'confidence_score': round(final_confidence_score, 1),
            'investment_analysis': investment_metrics
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001, debug=True)
