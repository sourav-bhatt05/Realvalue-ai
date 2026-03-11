import pickle
import sys

def inspect_model(path):
    print(f"Inspecting {path}...")
    try:
        with open(path, 'rb') as f:
            model = pickle.load(f)
        print(f"Type: {type(model)}")
        
        # If it's a pipeline or has feature names
        if hasattr(model, 'feature_names_in_'):
            print(f"Features expected: {model.feature_names_in_}")
        elif hasattr(model, 'get_feature_names_out'):
            print(f"Features: {model.get_feature_names_out()}")
            
        # Try to print the model steps if it's a pipeline
        if hasattr(model, 'steps'):
            print(f"Pipeline steps: {model.steps}")
            
    except Exception as e:
        print(f"Error loading {path}: {e}")
    print("-" * 40)

inspect_model('/Users/souravbhatt/Documents/CODING/Projects/RealEstate-Valuation/Notebooks/sales_model.pkl')
inspect_model('/Users/souravbhatt/Documents/CODING/Projects/RealEstate-Valuation/Notebooks/rental_model.pkl')
