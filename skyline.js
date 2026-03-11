/**
 * Generates an animated, 3-layer parallax city skyline
 * with infinite horizontal scrolling.
 */
function initSkyline(containerId, isMini = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let resizeTimeout;
    let animationFrameId;

    // Define layers - Slower speeds for an ambient feel
    // If isMini is true, we compress heights and drastically reduce speed
    const layersConfig = isMini ? [
        { name: 'far', speed: 0.02, z: 1, minH: 10, maxH: 30, strokeWidth: 0.8, hasDetails: false },
        { name: 'mid', speed: 0.05, z: 2, minH: 20, maxH: 50, strokeWidth: 1.0, hasDetails: false },
        { name: 'near', speed: 0.1, z: 3, minH: 30, maxH: 80, strokeWidth: 1.2, hasDetails: true }
    ] : [
        { name: 'far', speed: 0.1, z: 1, minH: 40, maxH: 100, strokeWidth: 1.0, hasDetails: false },
        { name: 'mid', speed: 0.25, z: 2, minH: 80, maxH: 200, strokeWidth: 1.5, hasDetails: false },
        { name: 'near', speed: 0.45, z: 3, minH: 120, maxH: 280, strokeWidth: 2.0, hasDetails: true }
    ];

    const layerElements = [];
    let skylineWidth = 0;

    function draw() {
        container.innerHTML = '';
        cancelAnimationFrame(animationFrameId);
        
        const width = window.innerWidth;
        skylineWidth = width * 2; // Exactly 2x viewport width for the seamless loop
        const height = isMini ? 72 : 300; // Match navbar height if mini
        const baseline = isMini ? 72 : 298;
        const ns = "http://www.w3.org/2000/svg";

        // Create stars background layer only if not mini
        if (!isMini) {
            const starsBg = document.createElement('div');
            starsBg.className = 'skyline-stars';
        for (let i = 0; i < 80; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.opacity = 0.2 + Math.random() * 0.8;
            star.style.animationDelay = `${Math.random() * 4}s`;
            starsBg.appendChild(star);
            }
            container.appendChild(starsBg);
        }

        // Define point generator for a continuous path
        function buildSkylinePath(config, targetWidth) {
            let pathD = `M 0,${baseline} `;
            let x = 0;
            const points = [];
            
            function pt(nx, ny) {
                pathD += `L ${nx.toFixed(1)},${ny.toFixed(1)} `;
                points.push({x: nx, y: ny});
            }

            function drawBuilding(startX, startY, w, h, details) {
                pt(startX, startY);
                
                if (details && Math.random() > 0.6 && w > 40) {
                    // Stepped roof
                    const step1w = w * 0.2;
                    const step2w = w * 0.6;
                    pt(startX, startY - h * 0.6);
                    pt(startX + step1w, startY - h * 0.6);
                    pt(startX + step1w, startY - h);
                    
                    if (Math.random() > 0.7) {
                        // Antenna on stepped roof
                        pt(startX + step1w + step2w/2 - 1, startY - h);
                        pt(startX + step1w + step2w/2 - 1, startY - h - 40);
                        pt(startX + step1w + step2w/2 + 1, startY - h - 40);
                        pt(startX + step1w + step2w/2 + 1, startY - h);
                    }
                    
                    pt(startX + step1w + step2w, startY - h);
                    pt(startX + step1w + step2w, startY - h * 0.6);
                    pt(startX + w, startY - h * 0.6);
                } 
                else if (details && Math.random() > 0.8 && w > 30) {
                    // Spire
                    pt(startX, startY - h);
                    pt(startX + w/2, startY - h - 35);
                    pt(startX + w, startY - h);
                }
                else if (details && Math.random() > 0.8) {
                    // Antenna on flat roof
                    pt(startX, startY - h);
                    pt(startX + w/2 - 1, startY - h);
                    pt(startX + w/2 - 1, startY - h - 50);
                    pt(startX + w/2 + 1, startY - h - 50);
                    pt(startX + w/2 + 1, startY - h);
                    pt(startX + w, startY - h);
                }
                else {
                    // Normal flat roof
                    pt(startX, startY - h);
                    pt(startX + w, startY - h);
                }
                
                pt(startX + w, startY);
                return startX + w;
            }

            // Generator rules for continuous path
            let firstBuildingHeight = 0;
            let isFirstBuilding = true;

            const baseGap = config.hasDetails ? 10 : 5;

            while (x < targetWidth) {
                const gap = baseGap + Math.random() * 15;
                
                // If the next gap + min building pushes us past target width, force close
                if (x + gap + 20 >= targetWidth) {
                    pt(targetWidth, baseline);
                    break;
                }
                
                x += gap;
                pt(x, baseline);

                let w = 20 + Math.random() * (config.hasDetails ? 60 : 40);
                if (x + w >= targetWidth - 10) {
                    // Close the exact seam
                    w = targetWidth - x; 
                }

                // Match first and last building exactly for loop seamlessness
                let h = config.minH + Math.random() * (config.maxH - config.minH);
                if (isFirstBuilding) {
                    firstBuildingHeight = h;
                    isFirstBuilding = false;
                }
                
                if (x + w === targetWidth) {
                    h = firstBuildingHeight; 
                    pt(x, baseline);
                    pt(x, baseline - h);
                    pt(x + w, baseline - h);
                    pt(x + w, baseline);
                    x += w;
                    break;
                }

                x = drawBuilding(x, baseline, w, h, config.hasDetails);
            }
            
            // In case while loop exited early
            if (x < targetWidth) {
                pt(targetWidth, baseline);
            }
            
            return pathD;
        }

        // Build each layer
        layersConfig.forEach(config => {
            const svgGroup = document.createElement('div');
            svgGroup.className = `skyline-layer ${config.name}-layer`;
            svgGroup.style.zIndex = config.z;
            
            // We need 2 identical SVGs placed side-by-side inside this group
            // They will shift left. When SVG A is fully off-screen, it wraps around.
            const pathD = buildSkylinePath(config, skylineWidth);

            const svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", `0 0 ${skylineWidth} ${height}`);
            svg.style.width = `${skylineWidth}px`;
            svg.style.height = `${height}px`;
            
            const p1 = document.createElementNS(ns, "path");
            p1.setAttribute("d", pathD);
            p1.className = `stroke-${config.name}`;
            p1.style.strokeWidth = `${config.strokeWidth}px`;
            
            // Add a draw animation to the near layer
            if (config.name === 'near') {
                setTimeout(() => {
                    const length = p1.getTotalLength();
                    p1.style.strokeDasharray = length;
                    p1.style.strokeDashoffset = length;
                    void p1.offsetWidth;
                    p1.style.animation = `drawSkyline 3s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
                }, 50);
            }
            
            svg.appendChild(p1);

            const svg2 = svg.cloneNode(true);
            // Ensure no gap by negative margin
            svg2.style.marginLeft = '-1.5px';

            svgGroup.appendChild(svg);
            svgGroup.appendChild(svg2);

            container.appendChild(svgGroup);

            layerElements.push({
                element: svgGroup,
                baseSpeed: config.speed,
                offset: 0
            });
        });

        let lightBeam;
        // Add moving light beam only if not mini
        if (!isMini) {
            lightBeam = document.createElement('div');
            lightBeam.className = 'skyline-searchlight';
            container.appendChild(lightBeam);
        }
        
        // Ground line anchoring
        const ground = document.createElement('div');
        ground.className = 'skyline-ground';
        container.appendChild(ground);

        // Animation Loop
        let lastTime = performance.now();
        let beamOffset = -100;

        function animate(time) {
            // Organic speed oscillation
            const dt = time - lastTime;
            lastTime = time;
            
            const timeOscillation = Math.sin(time * 0.0005) * 0.2; // Slow gentle pulse

            layerElements.forEach(layer => {
                const currentSpeed = layer.baseSpeed + (layer.baseSpeed * timeOscillation);
                
                // Adjust for FPS
                const moveDist = currentSpeed * (dt / 16.66);
                layer.offset -= moveDist; // scroll left
                
                // Wrap around when EXACTLY one full copy has scrolled past
                if (layer.offset <= -skylineWidth) {
                    layer.offset += skylineWidth;
                }
                
                layer.element.style.transform = `translate3d(${layer.offset}px, 0, 0)`;
            });

            // Beam animation (independent)
            if (!isMini && lightBeam) {
                beamOffset += 1.2 * (dt / 16.66);
                if (beamOffset > skylineWidth + 200) {
                    beamOffset = -200;
                }
                lightBeam.style.transform = `translate3d(${beamOffset}px, 0, 0)`;
            }

            animationFrameId = requestAnimationFrame(animate);
        }
        
        animationFrameId = requestAnimationFrame(animate);
    }

    draw();

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(draw, 300); // Rebuild entirely on resize
    });
}
