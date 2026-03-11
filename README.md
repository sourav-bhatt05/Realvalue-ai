# RealValue AI - Real Estate Analytics Platform

A machine learning-powered real estate analytics dashboard for Delhi NCR properties. Combines interactive mapping, price predictions, and investment analysis tools.

## ⚠️ IMPORTANT LEGAL DISCLAIMER

**This project is for EDUCATIONAL AND PORTFOLIO PURPOSES ONLY.**

**It is NOT:**
- Professional financial or investment advice
- A licensed property valuation service
- A substitute for qualified financial advisors or real estate professionals
- Guaranteed to be accurate or reliable for real-world decision-making

**All predictions are based on machine learning models trained on historical data and may be significantly inaccurate.** Real estate markets are complex and influenced by countless factors not captured in this model.

**BY USING THIS PROJECT, YOU AGREE THAT:**
1. You will NOT rely on this tool for any real financial decisions
2. You will consult licensed professionals before making property investments
3. The creators are not liable for any financial losses or damages
4. You use this entirely at your own risk

---

## Features

### 🗺️ Interactive Mapping
- Mark properties on Delhi NCR map
- Support for polygon and point selection
- Heatmap visualization of property prices
- Multiple map styles (light, dark, satellite)

### 💰 Price Predictions
- ML-based sale price estimation
- Monthly rental price prediction
- Confidence scoring
- Per-square-foot analysis

### 📊 Investment Analysis
- Projected ROI calculations
- EMI & loan affordability analysis
- 5-year break-even analysis
- Rental yield estimates
- Cash flow projections

### 📈 Prediction History
- Stores recent analyses
- Comparison across multiple properties
- Exportable reports

---

## Tech Stack

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with dark/light themes
- **JavaScript (ES6+)** - Interactive features
- **Libraries:**
  - Leaflet.js - Interactive mapping
  - Leaflet Draw - Polygon drawing tools
  - Leaflet Heatmap - Heat visualization
  - Chart.js - Data visualization
  - Font Awesome - Icons

### Backend
- **Python 3.8+**
- **Flask** - REST API framework
- **Flask-CORS** - Cross-origin requests
- **scikit-learn** - ML models (pre-trained)
- **pandas** - Data processing
- **joblib** - Model loading
- **numpy** - Numerical computing

### APIs (Free, No Keys Required)
- **OpenStreetMap Nominatim** - Reverse geocoding & location search
- **CartoDB** - Map tiles
- **ArcGIS Online** - Satellite imagery
- **Google Fonts** - Typography
- **Font Awesome CDN** - Icons

---

## Project Structure

```
realvalue-ai/
├── index.html              # Main dashboard UI
├── landing.html            # Landing/marketing page
├── app.js                  # Frontend logic
├── styles.css              # Styling
├── skyline.js             # Animated background
├── skyline.css            # Background styles
│
├── backend/
│   └── app.py             # Flask backend server
│
├── venv/                  # Python virtual environment
└── README.md              # This file
```

---

## Installation & Setup

### Prerequisites
- Python 3.8+ with pip
- Modern web browser (Chrome, Firefox, Safari, Edge)
- 500MB free disk space

### Step 1: Clone & Navigate
```bash
cd realvalue-ai
```

### Step 2: Set Up Python Environment
```bash
# Create virtual environment
python3 -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install flask flask-cors scikit-learn pandas joblib numpy
```

### Step 4: Start Backend Server
```bash
cd backend
python app.py
```
Server runs on `http://localhost:5001`

### Step 5: Open Frontend
```bash
# In another terminal, navigate to realvalue-ai folder
# Open index.html in a web browser
open index.html
# Or use a local server:
python3 -m http.server 8000
# Then visit: http://localhost:8000/index.html
```

---

## Usage

1. **Log in** with any email/password (demo mode)
2. **Select a property:**
   - Click on map to place a marker
   - OR draw a polygon to mark an area
3. **Enter property details:**
   - Area (sq. ft)
   - BHK (bedrooms)
   - Property type & furnishing
   - Status
4. **View predictions:**
   - Estimated sale price & rental income
   - Confidence score
   - Investment metrics
5. **Explore insights:**
   - Rental yield analysis
   - Break-even timeline
   - Risk assessment

---

## How It Works

### Price Prediction Model
1. **Rental Model:** Trained on location + size features → monthly rent
2. **Sales Model:** Trained on BHK, area, locality, furnishing → sale price
3. **Market Calibration:** Blends ML predictions with market data for each region
4. **Confidence Scoring:** Based on deviation from market averages

### Investment Analysis
- **EMI Calculation:** Standard mortgage formula
- **Rental Yield:** Annual rent / property price
- **Break-Even:** Years to recover investment via rental income
- **5-Year ROI:** Capital appreciation + cumulative rental income

---

## Model Accuracy & Limitations

⚠️ **These models have inherent limitations:**

- Trained on **Delhi NCR data only** (2024-2025)
- Cannot predict market crashes or booms
- Influenced by macro factors not in the data (interest rates, policy changes, economic crisis)
- Historical patterns may not repeat
- Accuracy typically ±15-25% (varies by location & property type)

**Trust these numbers at your own risk.**

---

## Rate Limiting & Production Deployment



## File Descriptions

| File | Purpose |
|------|---------|
| `app.js` | Main frontend logic: map interactions, API calls, UI updates |
| `backend/app.py` | Flask REST API: ML predictions, investment calculations |
| `styles.css` | All UI styling (light/dark themes) |
| `skyline.js` | Animated parallax background |
| `index.html` | Main dashboard HTML |
| `landing.html` | Marketing/landing page |

---

## Known Issues & TODOs

- [ ] Nominatim caching needed for production
- [ ] Add authentication beyond demo login
- [ ] Implement data persistence (database)
- [ ] Mobile responsiveness improvements
- [ ] Add more regions beyond Delhi
- [ ] Improve model accuracy with more recent data

---

## Dependencies

See `requirements.txt` (to be generated):
```
Flask==2.3.0
Flask-CORS==4.0.0
scikit-learn==1.3.0
pandas==2.0.0
joblib==1.3.0
numpy==1.24.0
Werkzeug==2.3.0
```

---

## License

This project is provided as-is for educational purposes. See LICENSE file.

---

## Security Notes

⚠️ **Not production-ready security:**
- CORS allows all origins (should be restricted)
- No HTTPS enforcement
- Client-side login only (demo)
- Rate limiting not implemented
- No input validation/sanitization on backend

**Do not use with real money or real user data without proper security hardening.**

---

## Contributing

This is a personal educational project. Use it, learn from it, but understand its limitations.

---

## Support & Contact

This is a educational portfolio project. For questions, bugs, or suggestions, refer to the limitations above.

---

## Acknowledgments

- **Data Sources:** Delhi property datasets (2024-2025)
- **Maps:** OpenStreetMap, CartoDB, ArcGIS
- **Libraries:** Flask, scikit-learn, Leaflet.js, Chart.js
- **Icons:** Font Awesome
- **Fonts:** Google Fonts

---

**Last Updated:** March 2026

**Status:** Educational/Portfolio Project - Use at your own risk
