import joblib
import pandas as pd

def check_features(path):
    print(f"Loading {path}...")
    model = joblib.load(path)
    if hasattr(model, 'feature_names_in_'):
        print(f"Features for {path}:")
        print(list(model.feature_names_in_))
    else:
        print("Model does not have 'feature_names_in_'.")

try:
    check_features('/Users/souravbhatt/Documents/CODING/Projects/RealEstate-Valuation/Notebooks/sales_model.pkl')
    check_features('/Users/souravbhatt/Documents/CODING/Projects/RealEstate-Valuation/Notebooks/rental_model.pkl')
except Exception as e:
    print("Error:", e)
