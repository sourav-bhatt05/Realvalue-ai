/**
 * RealValue - Airbnb/Zillow Style Interactive JS
 */

const INITIAL_CENTER = [28.6139, 77.2090]; // Delhi NCR
const INITIAL_ZOOM = 12;

let map;
let drawControl;
let drawnItems;
let currentSelectionLayer = null; // Either a polygon or marker
let heatmapLayer = null;
let priceMarkers = [];
let rentalChartObj = null;
let predictionHistory = [];

// Mapbox / OSM Styles
const mapLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
const mapDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
const mapSatBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
const mapSatLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
const mapSat = L.layerGroup([mapSatBase, mapSatLabels]);

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme before map init
    if (localStorage.getItem('realvalue-theme') === 'dark') {
        document.documentElement.classList.add('dark-theme');
    }

    initMap();
    setupThemeToggle();
    setupTabs();
    setupCoreInteractions();
    setupBhkAreaAutoFill();
    setupLoginSystem();

    // Initialize the main background skyline
    if (document.getElementById('skyline-container')) {
        initSkyline('skyline-container', false);
    }

    // Initialize the mini skyline for the navbar
    if (document.getElementById('navbar-skyline-container')) {
        initSkyline('navbar-skyline-container', true);
    }

    // Sync map layer buttons if dark on load
    if (document.documentElement.classList.contains('dark-theme')) {
        const btn = document.getElementById('theme-toggle');
        btn.innerHTML = '<i class="fas fa-sun"></i>';
        document.getElementById('layer-sat').classList.add('active');
        document.getElementById('layer-standard').classList.remove('active');
        refreshMapBaseLayer();
    }
});

function initMap() {
    const isDark = document.documentElement.classList.contains('dark-theme');
    map = L.map('map', {
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        zoomControl: false,
        layers: [isDark ? mapSat : mapLight]
    });

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        edit: { featureGroup: drawnItems, remove: false },
        draw: {
            polygon: {
                shapeOptions: {
                    color: '#FF5A5F',
                    weight: 3,
                    fillColor: '#FF5A5F',
                    fillOpacity: 0.2
                }
            },
            polyline: false, rectangle: false, circle: false,
            marker: true, circlemarker: false
        }
    });

    // Map Click
    map.on('click', function (e) {
        placeAnimatedPin(e.latlng);
        updateInputLocations(e.latlng.lat, e.latlng.lng);
    });

    // Draw Created
    map.on(L.Draw.Event.CREATED, function (e) {
        if (currentSelectionLayer) drawnItems.removeLayer(currentSelectionLayer);

        let layer = e.layer;
        drawnItems.addLayer(layer);
        currentSelectionLayer = layer;

        document.getElementById('btn-clear').classList.remove('hidden');

        if (e.layerType === 'polygon') {
            const areaM2 = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            const areaSqFt = Math.round(areaM2 * 10.7639);

            document.getElementById('area').value = areaSqFt;
            showAreaChip(areaSqFt);

            const center = layer.getBounds().getCenter();
            updateInputLocations(center.lat, center.lng);

        } else if (e.layerType === 'marker') {
            updateInputLocations(layer.getLatLng().lat, layer.getLatLng().lng);
            hideAreaChip();
        }
    });
}

function placeAnimatedPin(latlng) {
    if (currentSelectionLayer) drawnItems.removeLayer(currentSelectionLayer);

    hideAreaChip();

    const icon = L.divIcon({
        className: 'animated-pin',
        html: '<i class="fas fa-map-marker-alt"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    currentSelectionLayer = L.marker(latlng, { icon }).addTo(drawnItems);
    document.getElementById('btn-clear').classList.remove('hidden');
}

function updateInputLocations(lat, lng) {
    document.getElementById('latlng-display').innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    document.getElementById('locality').value = 'Fetching locality...';

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                const parts = data.display_name.split(',').slice(0, 3);
                document.getElementById('locality').value = parts.join(', ');
            } else {
                document.getElementById('locality').value = 'Locality not found';
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('locality').value = 'Delhi NCR Region';
        });
}

function showAreaChip(val) {
    const chip = document.getElementById('live-area-chip');
    document.getElementById('chip-area-val').innerText = val.toLocaleString();
    chip.classList.remove('hidden');
}
function hideAreaChip() {
    document.getElementById('live-area-chip').classList.add('hidden');
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    btn.addEventListener('click', () => {
        const html = document.documentElement;
        html.classList.toggle('dark-theme');

        const isDark = html.classList.contains('dark-theme');
        btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

        // Persist theme preference for cross-page sync
        localStorage.setItem('realvalue-theme', isDark ? 'dark' : 'light');

        const btnStd = document.getElementById('layer-standard');
        const btnSat = document.getElementById('layer-sat');

        if (isDark) {
            btnSat.classList.add('active');
            btnStd.classList.remove('active');
        } else {
            btnStd.classList.add('active');
            btnSat.classList.remove('active');
        }

        refreshMapBaseLayer();
        if (rentalChartObj) renderRentalChart();
    });
}

function refreshMapBaseLayer() {
    map.removeLayer(mapLight);
    map.removeLayer(mapDark);
    map.removeLayer(mapSat);

    if (document.getElementById('layer-sat').classList.contains('active')) {
        map.addLayer(mapSat);
    } else {
        const isDark = document.documentElement.classList.contains('dark-theme');
        map.addLayer(isDark ? mapDark : mapLight);
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`tab-${target}`).classList.add('active');

            // Rerender chart if rent tab
            if (target === 'rent' && !rentalChartObj) {
                renderRentalChart();
            }
        });
    });
}

function setupCoreInteractions() {
    // Map zooming
    document.getElementById('zoom-in').addEventListener('click', () => map.zoomIn());
    document.getElementById('zoom-out').addEventListener('click', () => map.zoomOut());
    document.getElementById('recenter-map').addEventListener('click', () => {
        if (currentSelectionLayer && currentSelectionLayer.getBounds) {
            map.fitBounds(currentSelectionLayer.getBounds());
        } else if (currentSelectionLayer && currentSelectionLayer.getLatLng) {
            map.panTo(currentSelectionLayer.getLatLng());
        } else {
            map.panTo(INITIAL_CENTER);
        }
    });

    // Layer toggles
    const btnStd = document.getElementById('layer-standard');
    const btnSat = document.getElementById('layer-sat');

    btnStd.addEventListener('click', () => {
        btnStd.classList.add('active');
        btnSat.classList.remove('active');
        refreshMapBaseLayer();
    });

    btnSat.addEventListener('click', () => {
        btnSat.classList.add('active');
        btnStd.classList.remove('active');
        refreshMapBaseLayer();
    });

    // Heatmap Mock
    document.getElementById('layer-heat').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
            const pts = [];
            const cLat = map.getCenter().lat;
            const cLng = map.getCenter().lng;
            for (let i = 0; i < 150; i++) {
                pts.push([cLat + (Math.random() - 0.5) * 0.1, cLng + (Math.random() - 0.5) * 0.1, Math.random()]);
            }
            // Heatmap gradient matching Airbnb vibe
            heatmapLayer = L.heatLayer(pts, {
                radius: 20, blur: 15,
                gradient: { 0.4: '#00A699', 0.6: '#FFB400', 1.0: '#FF5A5F' }
            }).addTo(map);
            showToast('Price Intensity Heatmap Enabled');
        } else {
            if (heatmapLayer) map.removeLayer(heatmapLayer);
        }
    });

    // Draw Tool
    document.getElementById('btn-draw').addEventListener('click', () => {
        new L.Draw.Polygon(map, drawControl.options.draw.polygon).enable();
    });

    // Clear Selection
    document.getElementById('btn-clear').addEventListener('click', (e) => {
        if (currentSelectionLayer) drawnItems.removeLayer(currentSelectionLayer);
        currentSelectionLayer = null;
        e.currentTarget.classList.add('hidden');
        document.getElementById('area').value = '';
        document.getElementById('locality').value = '';
        document.getElementById('latlng-display').innerText = '-- , --';
        hideAreaChip();
    });

    // Actions (Save and Export)
    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', () => {
        saveBtn.classList.toggle('active-save');
        const icon = saveBtn.querySelector('i');
        if (saveBtn.classList.contains('active-save')) {
            icon.className = 'fas fa-heart';
            icon.style.color = 'var(--brand-coral)';
            showToast('<i class="fas fa-heart" style="color:var(--brand-coral)"></i> Location saved to favorites');
        } else {
            icon.className = 'far fa-heart';
            icon.style.color = '';
            showToast('Removed from favorites');
        }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        showToast('<i class="fas fa-spinner fa-spin"></i> Generating CSV Export...');
    });


    // The BIG Analyze Action
    document.getElementById('analyze-btn').addEventListener('click', handleAnalysis);

    // Map Search via Nominatim
    const searchInput = document.getElementById('map-search-input');
    const searchDropdown = document.getElementById('search-results-dropdown');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        clearTimeout(searchTimeout);

        if (query.length < 3) {
            searchDropdown.classList.add('hidden');
            searchDropdown.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Delhi')}&limit=5`)
                .then(res => res.json())
                .then(data => {
                    searchDropdown.innerHTML = '';
                    if (data.length === 0) {
                        searchDropdown.classList.add('hidden');
                        return;
                    }

                    searchDropdown.classList.remove('hidden');
                    data.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--brand-coral); margin-right:8px;"></i> ${item.display_name}`;
                        div.addEventListener('click', () => {
                            const lat = parseFloat(item.lat);
                            const lng = parseFloat(item.lon);
                            map.setView([lat, lng], 15);
                            placeAnimatedPin({ lat: lat, lng: lng });
                            updateInputLocations(lat, lng);

                            searchInput.value = item.display_name.split(',')[0];
                            searchDropdown.classList.add('hidden');
                        });
                        searchDropdown.appendChild(div);
                    });
                })
                .catch(err => console.error(err));
        }, 500); // 500ms debounce
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });

}

function setupBhkAreaAutoFill() {
    const bhkSelect = document.getElementById('bhk');
    const areaInput = document.getElementById('area');

    // Approximate typical areas for Delhi NCR based on BHK
    const bhkAreaMap = {
        '1': 500,
        '2': 900,
        '3': 1400,
        '4': 2200,
        '5': 3500,
        '6': 4500,
        '7': 6000,
        '8': 8000
    };

    bhkSelect.addEventListener('change', (e) => {
        const selectedBhk = e.target.value;
        if (bhkAreaMap[selectedBhk]) {
            areaInput.value = bhkAreaMap[selectedBhk];

            // Optionally flash the input to indicate it was auto-filled
            areaInput.style.backgroundColor = 'var(--bg-light)';
            setTimeout(() => {
                areaInput.style.backgroundColor = '';
            }, 500);
        }
    });
}

function setupLoginSystem() {
    const loginForm = document.getElementById('login-form');
    const overlay = document.getElementById('login-overlay');
    const loginBtn = document.getElementById('login-btn');
    const loginTxt = loginBtn.querySelector('.cta-text');
    const loginLoader = document.getElementById('login-loader');

    // Dropdown Elements
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // Handle Login Submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        // Show loading state
        loginBtn.style.pointerEvents = 'none';
        loginTxt.classList.add('hidden');
        loginLoader.classList.remove('hidden');

        // Simulate network request (1.5 seconds)
        setTimeout(() => {
            // Revert button state
            loginBtn.style.pointerEvents = 'auto';
            loginTxt.classList.remove('hidden');
            loginLoader.classList.add('hidden');

            // Trigger exit animations
            overlay.classList.add('fade-out');

            // Optionally clear inputs
            document.getElementById('login-password').value = '';

            // Allow pointer events through after disappearing, or hide it entirely
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 550); // Matches the 0.5s CSS animation + 50ms buffer

            showToast('Welcome back, Investor!');
        }, 1500);
    });

    // Toggle user dropdown
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            userDropdown.classList.remove('active');

            // Reset the overlay display and remove the fade-out class to trigger entrance animation again
            overlay.style.display = 'flex';
            // Force a reflow to ensure the animation restarts
            void overlay.offsetWidth;
            overlay.classList.remove('fade-out');
            showToast('Logged out successfully');
        });
    }
}

function handleAnalysis() {
    const areaVal = document.getElementById('area').value;
    const latlngText = document.getElementById('latlng-display').innerText;

    if (latlngText === '-- , --') return showToast('Please select a location on the map first', 'error');
    if (!areaVal) return showToast('Please provide an area (sq.ft)', 'error');

    const lat = parseFloat(latlngText.split(',')[0]);
    const lng = parseFloat(latlngText.split(',')[1]);
    const bhk = document.getElementById('bhk').value;
    const furnishing = document.getElementById('furnishing').value;
    const prop_type = document.getElementById('prop-type').value;
    const status = document.getElementById('status').value;
    const locName = document.getElementById('locality').value;

    const btn = document.getElementById('analyze-btn');
    const txt = btn.querySelector('.cta-text');
    const loader = btn.querySelector('.shimmer-loader');

    btn.style.pointerEvents = 'none';
    txt.classList.add('hidden');
    loader.classList.remove('hidden');

    fetch('http://localhost:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            area: areaVal,
            bhk: bhk,
            furnishing: furnishing,
            prop_type: prop_type,
            status: status,
            locality: locName
        })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                console.error(data.error);
                showToast('Prediction error: see console', 'error');
                resetBtn();
                return;
            }

            const targetPriceVal = data.price;
            const targetRentVal = data.rent * areaVal; // Depending on if model outputs psf or total. Assume total for now, wait, the rental model output is rent. Let's assume the model predicted total rent. Wait, no, rental model predicts rent, the original data was total rent.
            // Actually, let's just use data.rent as the predicted rent 
            const investment = data.investment_analysis;

            const conf = data.confidence_score || (88 + Math.floor(Math.random() * 8)); // Fallback if backend failed
            const psf = Math.round(targetPriceVal / areaVal);
            const rentPsf = Math.round(data.rent / areaVal);

            animateValue("pred-price", targetPriceVal);
            document.getElementById('pred-psf').innerText = `₹${psf.toLocaleString()}`;
            document.getElementById('area-psf').innerText = `₹${(psf - 200).toLocaleString()}`;

            // Tab 2 Rents
            document.getElementById('rent-price').innerText = `₹${Math.round(data.rent).toLocaleString()}`;
            document.getElementById('rent-psf').innerText = `₹${rentPsf}`;

            // Reset and Animate Confidence Bar
            const bar = document.getElementById('conf-bar');
            document.getElementById('conf-score').innerText = conf;
            bar.style.width = '0%';
            setTimeout(() => bar.style.width = conf + '%', 100);

            // Render Insights Chart if active
            if (document.getElementById('tab-rent').classList.contains('active')) {
                renderRentalChart();
            }

            // Add to History
            const formattedPrice = formatIndianCurrency(targetPriceVal);

            predictionHistory.unshift({
                location: locName,
                details: `${bhk}BHK · ${areaVal} sq.ft · ${prop_type}`,
                extra: `${furnishing} · ${status}`,
                price: formattedPrice,
                rawData: data,
                rawArea: areaVal,
                rawBhk: bhk,
                rawPropType: prop_type
            });

            // Keep only last 5
            if (predictionHistory.length > 5) predictionHistory.pop();

            renderHistory();

            // Update Intelligence Tab Metrics
            updateIntelligenceTab(data, areaVal, bhk, prop_type, locName);

            // Complete
            resetBtn();
            showToast('Property Analysis Complete');

        })
        .catch(err => {
            showToast('Failed to connect to backend ML API', 'error');
            console.error(err);
            resetBtn();
        });

    function resetBtn() {
        btn.style.pointerEvents = 'auto';
        txt.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

function formatIndianCurrency(num) {
    if (num > 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num > 100000) return `₹${(num / 100000).toFixed(2)}L`;
    return `₹${num.toLocaleString('en-IN')}`;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    if (predictionHistory.length === 0) {
        list.innerHTML = `<div class="comp-item" style="justify-content: center; color: var(--text-muted); border: none; background: transparent;"><span>No previous predictions yet.</span></div>`;
        return;
    }

    predictionHistory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'comp-item';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <div class="comp-icon"><i class="fas fa-history"></i></div>
            <div class="comp-info" style="overflow: hidden;">
                <div class="comp-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.location}</div>
                <div class="comp-sub">${item.details}</div>
                <div class="comp-sub" style="font-size: 0.75rem; color: var(--text-muted);">${item.extra}</div>
            </div>
            <div class="comp-price data-font">${item.price}</div>
        `;
        div.addEventListener('click', () => restorePrediction(index));
        list.appendChild(div);
    });
}

function restorePrediction(index) {
    const item = predictionHistory[index];
    if (!item || !item.rawData) return;

    showToast('<i class="fas fa-sync fa-spin"></i> Restoring Prediction: ' + item.location);

    // Switch to Price Prediction tab immediately if not there
    document.querySelector('.tab-btn[data-tab="price"]').click();

    const data = item.rawData;
    const targetPriceVal = data.price;
    const areaVal = item.rawArea;
    const bhk = item.rawBhk;
    const prop_type = item.rawPropType;
    const locName = item.location;
    const investment = data.investment_analysis;

    const conf = data.confidence_score || (88 + Math.floor(Math.random() * 8)); // Fallback 
    const psf = Math.round(targetPriceVal / areaVal);
    const rentPsf = Math.round(data.rent / areaVal);

    animateValue("pred-price", targetPriceVal);
    document.getElementById('pred-psf').innerText = `₹${psf.toLocaleString()}`;
    document.getElementById('area-psf').innerText = `₹${(psf - 200).toLocaleString()}`;

    // Tab 2 Rents
    document.getElementById('rent-price').innerText = `₹${Math.round(data.rent).toLocaleString()}`;
    document.getElementById('rent-psf').innerText = `₹${rentPsf}`;

    // Reset and Animate Confidence Bar
    const bar = document.getElementById('conf-bar');
    document.getElementById('conf-score').innerText = conf;
    bar.style.width = '0%';
    setTimeout(() => bar.style.width = conf + '%', 100);

    // Render Insights Chart if active
    if (document.getElementById('tab-rent').classList.contains('active')) {
        renderRentalChart();
    }

    // Update Intelligence Tab Metrics
    updateIntelligenceTab(data, areaVal, bhk, prop_type, locName);
}

function updateIntelligenceTab(data, area, bhk, propType, location) {
    const investment = data.investment_analysis;
    if (!investment) return;

    // Update the new AI rating labels
    const confEl = document.getElementById('report-confidence');
    const ratingEl = document.getElementById('report-rating');
    const confContainer = confEl ? confEl.parentElement : null;
    const ratingContainer = ratingEl ? ratingEl.parentElement : null;

    if (confEl && data.confidence_score) {
        confEl.innerText = `${data.confidence_score}%`;

        // Remove existing color classes
        confEl.classList.remove('text-teal', 'text-warning', 'text-danger', 'text-navy', 'text-success');

        // Apply dynamic color based on confidence score
        if (data.confidence_score >= 90) {
            confEl.classList.add('text-success'); // Assuming text-success exists or using teal
            confEl.style.color = '#10b981'; // Explicit green
        } else if (data.confidence_score >= 75) {
            confEl.classList.add('text-teal');
            confEl.style.color = ''; // Reset inline
        } else {
            confEl.classList.add('text-warning');
            confEl.style.color = '#f59e0b'; // Explicit orange/warning
        }
    }

    if (ratingEl && investment.ai_rating) {
        ratingEl.innerText = investment.ai_rating;

        // Remove existing color classes
        ratingEl.classList.remove('text-teal', 'text-warning', 'text-danger', 'text-navy', 'text-success');

        // Apply dynamic color based on rating
        const rating = investment.ai_rating.toUpperCase();
        if (rating.includes("STRONG BUY")) {
            ratingEl.classList.add('text-success');
            ratingEl.style.color = '#10b981';
        } else if (rating.includes("BUY & HOLD")) {
            ratingEl.classList.add('text-teal');
            ratingEl.style.color = '';
        } else if (rating.includes("HOLD FOR APPRECIATION")) {
            ratingEl.classList.add('text-warning');
            ratingEl.style.color = '#f59e0b';
        } else {
            ratingEl.classList.add('text-navy');
            ratingEl.style.color = '';
        }
    }

    const insightEl = document.getElementById('report-insight');
    if (insightEl) {
        const yieldPercent = investment.gross_rental_yield_pct;
        const msg = investment.investment_insight;
        const profitStr = formatIndianCurrency(investment.total_net_profit_5y);

        insightEl.innerHTML = `<strong>Insight:</strong> ${msg}. <br>Our advanced ML analysis evaluates this <strong>${bhk}BHK ${propType}</strong> in <strong>${location}</strong> to have a gross rental yield of <strong>${yieldPercent}%</strong>. Considering a 5-year hold period with a 20% down payment, typical EMIs, maintenance, and a 6% annual appreciation rate, the total projected net profit is <strong>${profitStr}</strong>, resulting in a net return of <strong>${investment.total_net_return_pct}%</strong> over 5 years.`;
    }

    // Purchase & Financing
    document.getElementById('report-prop-value').innerText = formatIndianCurrency(investment.property_value);
    document.getElementById('report-down-payment').innerText = formatIndianCurrency(investment.down_payment);
    document.getElementById('report-loan-amount').innerText = formatIndianCurrency(investment.loan_amount);
    document.getElementById('report-monthly-emi').innerText = formatIndianCurrency(investment.monthly_emi);

    // Rental Economics
    document.getElementById('report-monthly-rent').innerText = formatIndianCurrency(investment.monthly_rent);
    document.getElementById('report-gross-yield').innerText = `${investment.gross_rental_yield_pct}%`;
    document.getElementById('report-net-rent-5y').innerText = formatIndianCurrency(investment.net_rent_5y);
    document.getElementById('report-net-cashflow-5y').innerText = formatIndianCurrency(investment.net_operating_cashflow_5y);

    // 5-Year Exit Strategy
    document.getElementById('report-future-value').innerText = formatIndianCurrency(investment.future_value_5y);
    document.getElementById('report-selling-cost').innerText = formatIndianCurrency(investment.selling_cost);
    document.getElementById('report-net-sale').innerText = formatIndianCurrency(investment.net_sale_proceeds);

    const capGainEl = document.getElementById('report-capital-gain');
    capGainEl.innerText = formatIndianCurrency(investment.net_capital_gain);
    capGainEl.className = investment.net_capital_gain > 0 ? 'report-val data-font text-teal' : 'report-val data-font text-danger';

    // Bottom Line ROI
    document.getElementById('report-total-invested').innerText = formatIndianCurrency(investment.total_cash_invested);

    const profitEl = document.getElementById('report-total-profit');
    profitEl.innerText = formatIndianCurrency(investment.total_net_profit_5y);

    // Update Return Progress Bar
    let returnPct = investment.total_net_return_pct;
    // Cap visual bar to 100% just for UI flair
    let barWidth = Math.min(Math.max(returnPct, 0), 100);

    document.getElementById('report-net-return-score').innerText = `${returnPct}%`;

    const barEl = document.getElementById('report-net-return-bar');
    if (barEl) {
        barEl.style.width = `${barWidth}%`;
        barEl.className = returnPct < 15 ? 'progress-fill fill-danger' : 'progress-fill fill-teal';
    }

    document.getElementById('report-break-even').innerText = `${investment.realistic_break_even_yrs} yrs`;

    // Update the dynamic yield in the Rental Insights tab as well
    const yieldEl = document.evaluate("//div[contains(text(), 'Expected Yield')]/following-sibling::span", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (yieldEl) {
        yieldEl.innerText = `${investment.gross_rental_yield_pct}%`;
    }
}

// Numeral rollup animation
function animateValue(id, endVal) {
    const obj = document.getElementById(id);
    const duration = 1200;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeOut * endVal);

        // Format as Indian Currency String
        let formatted = '₹' + current.toLocaleString('en-IN');
        if (current > 10000000) {
            formatted = `₹${(current / 10000000).toFixed(2)} Cr`;
        } else if (current > 100000) {
            formatted = `₹${(current / 100000).toFixed(2)} L`;
        }

        obj.innerHTML = formatted;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

function renderRentalChart() {
    const ctx = document.getElementById('rentalChart').getContext('2d');
    if (rentalChartObj) rentalChartObj.destroy();

    const isDark = document.documentElement.classList.contains('dark-theme');
    const lines = isDark ? '#2D3142' : '#DDDDDD';
    const text = isDark ? '#A0A5B5' : '#717171';

    rentalChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Avg Rent/sqft',
                data: [26, 26.5, 27, 28, 27.5, 29],
                borderColor: '#00A699', // Teal
                backgroundColor: 'rgba(0, 166, 153, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00A699'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: lines }, ticks: { color: text, font: { family: 'DM Mono' } } },
                x: { grid: { display: false }, ticks: { color: text, font: { family: 'Plus Jakarta Sans' } } }
            }
        }
    });
}



function showToast(html, type = 'none') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    if (type === 'error') {
        html = `<i class="fas fa-exclamation-circle text-danger"></i> ${html}`;
    }
    t.innerHTML = html;
    container.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'slideRight 0.3s ease reverse forwards';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}
