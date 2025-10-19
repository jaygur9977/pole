
        // Application state
        const AppState = {
            poles: [
                { id: 'P001', lat: 23.2599, lng: 77.4126, status: 'healthy', area: 'Awadhpuri Main Square' },
                { id: 'P002', lat: 23.2632, lng: 77.4180, status: 'healthy', area: 'Sector A' },
                { id: 'P003', lat: 23.2651, lng: 77.4205, status: 'healthy', area: 'Sector B' },
                { id: 'P004', lat: 23.2670, lng: 77.4150, status: 'healthy', area: 'Sector C' },
                { id: 'P005', lat: 23.2615, lng: 77.4190, status: 'healthy', area: 'Sector D' },
                { id: 'P006', lat: 23.2580, lng: 77.4220, status: 'healthy', area: 'Sector E' },
                { id: 'P007', lat: 23.2550, lng: 77.4170, status: 'healthy', area: 'Sector F' },
                { id: 'P008', lat: 23.2620, lng: 77.4130, status: 'healthy', area: 'Sector G' },
                { id: 'P009', lat: 23.2660, lng: 77.4100, status: 'healthy', area: 'Sector H' },
                { id: 'P010', lat: 23.2690, lng: 77.4180, status: 'healthy', area: 'Sector I' }
            ],
            lines: [
                { id: 'L001', from: 'P001', to: 'P002', status: 'healthy' },
                { id: 'L002', from: 'P002', to: 'P003', status: 'healthy' },
                { id: 'L003', from: 'P003', to: 'P004', status: 'healthy' },
                { id: 'L004', from: 'P004', to: 'P005', status: 'healthy' },
                { id: 'L005', from: 'P005', to: 'P006', status: 'healthy' },
                { id: 'L006', from: 'P006', to: 'P007', status: 'healthy' },
                { id: 'L007', from: 'P007', to: 'P008', status: 'healthy' },
                { id: 'L008', from: 'P008', to: 'P009', status: 'healthy' },
                { id: 'L009', from: 'P009', to: 'P010', status: 'healthy' },
                { id: 'L010', from: 'P010', to: 'P001', status: 'healthy' }
            ],
            vans: [
                { id: 'van01', name: 'Van 01 - Repair Team Alpha', status: 'available', currentPole: 'P001', driver: 'Rajesh Kumar' },
                { id: 'van02', name: 'Van 02 - Repair Team Beta', status: 'available', currentPole: 'P003', driver: 'Mohan Singh' }
            ],
            notifications: [],
            currentUser: null,
            officialMap: null,
            publicMap: null,
            networkMap: null,
            officialLayerGroup: null,
            publicLayerGroup: null,
            networkLayerGroup: null,
            vanMarkers: {}
        };

        // Initialize page after DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Setup login functionality
            setupLogin();
            
            // Setup event listeners
            setupEventListeners();
            
            // Update current time
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);
        });
        
        // Update current time display
        function updateCurrentTime() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString();
            document.getElementById('current-time').textContent = timeStr;
            document.getElementById('public-current-time').textContent = timeStr;
        }
        
        // Initialize maps for both dashboards
        function initMaps() {
            // Official Map
            AppState.officialMap = L.map('official-map').setView([23.261, 77.416], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(AppState.officialMap);
            
            // Public Map
            AppState.publicMap = L.map('public-map').setView([23.261, 77.416], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(AppState.publicMap);
            
            // Network Map (for officials)
            AppState.networkMap = L.map('network-map-view').setView([23.261, 77.416], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(AppState.networkMap);
            
            // Create layer groups for dynamic updates
            AppState.officialLayerGroup = L.layerGroup().addTo(AppState.officialMap);
            AppState.publicLayerGroup = L.layerGroup().addTo(AppState.publicMap);
            AppState.networkLayerGroup = L.layerGroup().addTo(AppState.networkMap);
            
            // Draw poles and lines on all maps
            updateMaps();
            
            // Add van markers
            addVanMarkers();
            
            // Setup click events for network map
            setupMapInteractions();
        }
        
        // Add van markers to the map
        function addVanMarkers() {
            AppState.vans.forEach(van => {
                const pole = AppState.poles.find(p => p.id === van.currentPole);
                if (pole) {
                    const vanIcon = L.divIcon({
                        html: `<div class="van-marker">${van.id.replace('van', 'V')}</div>`,
                        className: 'van-icon',
                        iconSize: [24, 24]
                    });
                    
                    // Add van marker to official map
                    const vanMarker = L.marker([pole.lat, pole.lng], { icon: vanIcon }).addTo(AppState.officialLayerGroup);
                    vanMarker.bindPopup(`
                        <div class="map-popup">
                            <h4>${van.name}</h4>
                            <p><strong>Driver:</strong> ${van.driver}</p>
                            <p><strong>Status:</strong> ${van.status}</p>
                            <p><strong>Current Location:</strong> ${pole.id} (${pole.area})</p>
                        </div>
                    `);
                    
                    // Store reference to van marker
                    AppState.vanMarkers[van.id] = vanMarker;
                }
            });
        }
        
        // Setup map interactions
        function setupMapInteractions() {
            AppState.networkMap.on('click', function(e) {
                // Find if a line was clicked
                const line = findLineNearPoint(e.latlng, AppState.networkMap);
                if (line) {
                    // Create a simple context menu at click position
                    const menu = document.createElement('div');
                    menu.style.position = 'absolute';
                    menu.style.left = e.containerPoint.x + 'px';
                    menu.style.top = e.containerPoint.y + 'px';
                    menu.style.background = 'var(--panel-bg)';
                    menu.style.border = '1px solid var(--neon-blue)';
                    menu.style.borderRadius = '5px';
                    menu.style.padding = '0.5rem';
                    menu.style.zIndex = '1000';
                    
                    menu.innerHTML = `
                        <button data-action="mark-fault" style="display: block; width: 100%; text-align: left; padding: 0.5rem; background: none; border: none; color: white; cursor: pointer;">Mark as Fault</button>
                        <button data-action="start-repair" style="display: block; width: 100%; text-align: left; padding: 0.5rem; background: none; border: none; color: white; cursor: pointer;">Start Repair</button>
                        <button data-action="mark-resolved" style="display: block; width: 100%; text-align: left; padding: 0.5rem; background: none; border: none; color: white; cursor: pointer;">Mark as Resolved</button>
                    `;
                    
                    document.body.appendChild(menu);
                    
                    // Add event listeners to context menu buttons
                    menu.querySelector('[data-action="mark-fault"]').addEventListener('click', function() {
                        changeLineStatus(line, 'fault');
                        document.body.removeChild(menu);
                    });
                    
                    menu.querySelector('[data-action="start-repair"]').addEventListener('click', function() {
                        changeLineStatus(line, 'repair');
                        document.body.removeChild(menu);
                        
                        // Simulate repair process
                        setTimeout(() => {
                            changeLineStatus(line, 'healthy');
                            addNotification(`Repair completed on line ${line.id}`, 'resolved', 'official');
                        }, 60000); // 1 minute repair time
                    });
                    
                    menu.querySelector('[data-action="mark-resolved"]').addEventListener('click', function() {
                        changeLineStatus(line, 'healthy');
                        document.body.removeChild(menu);
                    });
                    
                    // Remove menu when clicking elsewhere
                    const clickHandler = function(evt) {
                        if (!menu.contains(evt.target)) {
                            document.body.removeChild(menu);
                            document.removeEventListener('click', clickHandler);
                        }
                    };
                    
                    setTimeout(() => {
                        document.addEventListener('click', clickHandler);
                    }, 100);
                }
            });
        }
        
        // Find line near a point
        function findLineNearPoint(latlng, map) {
            const point = map.latLngToContainerPoint(latlng);
            let closestLine = null;
            let minDistance = Infinity;
            
            AppState.lines.forEach(line => {
                const fromPole = AppState.poles.find(p => p.id === line.from);
                const toPole = AppState.poles.find(p => p.id === line.to);
                
                if (fromPole && toPole) {
                    const fromPoint = map.latLngToContainerPoint([fromPole.lat, fromPole.lng]);
                    const toPoint = map.latLngToContainerPoint([toPole.lat, toPole.lng]);
                    
                    // Calculate distance from point to line
                    const distance = pointToLineDistance(
                        point.x, point.y,
                        fromPoint.x, fromPoint.y,
                        toPoint.x, toPoint.y
                    );
                    
                    if (distance < minDistance && distance < 20) { // 20px tolerance
                        minDistance = distance;
                        closestLine = line;
                    }
                }
            });
            
            return closestLine;
        }
        
        // Calculate distance from point to line segment
        function pointToLineDistance(px, py, x1, y1, x2, y2) {
            const A = px - x1;
            const B = py - y1;
            const C = x2 - x1;
            const D = y2 - y1;
            
            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            
            if (len_sq !== 0) {
                param = dot / len_sq;
            }
            
            let xx, yy;
            
            if (param < 0) {
                xx = x1;
                yy = y1;
            } else if (param > 1) {
                xx = x2;
                yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }
            
            const dx = px - xx;
            const dy = py - yy;
            
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        // Draw poles and connecting lines on the map
        function updateMaps() {
            // Clear existing layers
            if (AppState.officialLayerGroup) AppState.officialLayerGroup.clearLayers();
            if (AppState.publicLayerGroup) AppState.publicLayerGroup.clearLayers();
            if (AppState.networkLayerGroup) AppState.networkLayerGroup.clearLayers();
            
            // Update pole status based on connected lines
            updatePoleStatuses();
            
            // Draw lines between poles
            AppState.lines.forEach(line => {
                const fromPole = AppState.poles.find(p => p.id === line.from);
                const toPole = AppState.poles.find(p => p.id === line.to);
                
                if (fromPole && toPole) {
                    const linePoints = [[fromPole.lat, fromPole.lng], [toPole.lat, toPole.lng]];
                    const lineColor = getLineColor(line.status);
                    
                    // Draw line on official map
                    const officialLine = L.polyline(linePoints, {
                        color: lineColor,
                        weight: 4,
                        opacity: 0.7
                    }).addTo(AppState.officialLayerGroup);
                    
                    // Draw line on public map
                    const publicLine = L.polyline(linePoints, {
                        color: lineColor,
                        weight: 4,
                        opacity: 0.7
                    }).addTo(AppState.publicLayerGroup);
                    
                    // Draw line on network map with interactive features
                    const networkLine = L.polyline(linePoints, {
                        color: lineColor,
                        weight: 6,
                        opacity: 0.8
                    }).addTo(AppState.networkLayerGroup);
                    
                    // Add hover effects to network map lines
                    networkLine.on('mouseover', function() {
                        this.setStyle({ weight: 8 });
                    });
                    
                    networkLine.on('mouseout', function() {
                        this.setStyle({ weight: 6 });
                    });
                    
                    // Add click event to network map lines for status info
                    networkLine.on('click', function(e) {
                        const popupContent = `
                            <div class="map-popup">
                                <h4>${line.id}</h4>
                                <p><strong>From:</strong> ${fromPole.id} (${fromPole.area})</p>
                                <p><strong>To:</strong> ${toPole.id} (${toPole.area})</p>
                                <p><strong>Status:</strong> <span class="status ${line.status}">${line.status.toUpperCase()}</span></p>
                                <p><strong>Length:</strong> ${calculateDistance(fromPole.lat, fromPole.lng, toPole.lat, toPole.lng).toFixed(2)} km</p>
                            </div>
                        `;
                        networkLine.bindPopup(popupContent).openPopup();
                    });
                    
                    // Add blinking animation for fault lines
                    if (line.status === 'fault') {
                        let isRed = true;
                        setInterval(() => {
                            officialLine.setStyle({
                                color: isRed ? 'rgba(255, 7, 58, 0.3)' : '#ff073a'
                            });
                            publicLine.setStyle({
                                color: isRed ? 'rgba(255, 7, 58, 0.3)' : '#ff073a'
                            });
                            networkLine.setStyle({
                                color: isRed ? 'rgba(255, 7, 58, 0.3)' : '#ff073a'
                            });
                            isRed = !isRed;
                        }, 1000);
                    }
                    
                    // Add glow animation for healthy lines
                    if (line.status === 'healthy') {
                        let isBright = true;
                        setInterval(() => {
                            officialLine.setStyle({
                                opacity: isBright ? 0.7 : 1
                            });
                            publicLine.setStyle({
                                opacity: isBright ? 0.7 : 1
                            });
                            networkLine.setStyle({
                                opacity: isBright ? 0.7 : 1
                            });
                            isBright = !isBright;
                        }, 1500);
                    }
                }
            });
            
            // Add poles as markers
            AppState.poles.forEach(pole => {
                const markerIcon = L.divIcon({
                    html: `<div style="background-color: ${getStatusColor(pole.status)}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${getStatusColor(pole.status)};"></div>`,
                    className: 'pole-marker',
                    iconSize: [20, 20]
                });
                
                // Add marker to official map
                const officialMarker = L.marker([pole.lat, pole.lng], { icon: markerIcon }).addTo(AppState.officialLayerGroup);
                officialMarker.bindPopup(`
                    <div class="map-popup">
                        <h4>${pole.id}</h4>
                        <p><strong>Area:</strong> ${pole.area}</p>
                        <p><strong>Location:</strong> ${pole.lat.toFixed(4)}, ${pole.lng.toFixed(4)}</p>
                        <span class="status ${pole.status}">${pole.status.toUpperCase()}</span>
                    </div>
                `);
                
                // Add marker to public map
                const publicMarker = L.marker([pole.lat, pole.lng], { icon: markerIcon }).addTo(AppState.publicLayerGroup);
                publicMarker.bindPopup(`
                    <div class="map-popup">
                        <h4>${pole.id}</h4>
                        <p><strong>Area:</strong> ${pole.area}</p>
                        <p><strong>Status:</strong> ${pole.status.toUpperCase()}</p>
                    </div>
                `);
                
                // Add marker to network map
                const networkMarker = L.marker([pole.lat, pole.lng], { icon: markerIcon }).addTo(AppState.networkLayerGroup);
                networkMarker.bindPopup(`
                    <div class="map-popup">
                        <h4>${pole.id}</h4>
                        <p><strong>Area:</strong> ${pole.area}</p>
                        <p><strong>Location:</strong> ${pole.lat.toFixed(4)}, ${pole.lng.toFixed(4)}</p>
                        <span class="status ${pole.status}">${pole.status.toUpperCase()}</span>
                    </div>
                `);
            });
            
            // Re-add van markers
            addVanMarkers();
        }
        
        // Update pole status based on connected lines
        function updatePoleStatuses() {
            AppState.poles.forEach(pole => {
                // Find all lines connected to this pole
                const connectedLines = AppState.lines.filter(line => 
                    line.from === pole.id || line.to === pole.id
                );
                
                // If any connected line has fault, pole has fault
                if (connectedLines.some(line => line.status === 'fault')) {
                    pole.status = 'fault';
                } 
                // If any connected line is under repair, pole is under repair
                else if (connectedLines.some(line => line.status === 'repair')) {
                    pole.status = 'repair';
                }
                // Otherwise, pole is healthy
                else {
                    pole.status = 'healthy';
                }
            });
        }
        
        // Calculate distance between two points
        function calculateDistance(lat1, lng1, lat2, lng2) {
            const R = 6371; // Earth's radius in km
            const dLat = deg2rad(lat2 - lat1);
            const dLng = deg2rad(lng2 - lng1);
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }
        
        function deg2rad(deg) {
            return deg * (Math.PI/180);
        }
        
        // Determine line color based on status
        function getLineColor(status) {
            if (status === 'fault') return '#ff073a'; // Red for fault
            if (status === 'repair') return '#ff8c42'; // Orange for repair
            return '#00f3ff'; // Blue for healthy
        }
        
        // Determine marker color based on status
        function getStatusColor(status) {
            if (status === 'fault') return '#ff073a'; // Red for fault
            if (status === 'repair') return '#ff8c42'; // Orange for repair
            return '#39ff14'; // Green for healthy
        }
        
        // Setup login functionality
        function setupLogin() {
            const loginBtn = document.getElementById('login-btn');
            const userTypes = document.querySelectorAll('.user-type');
            const loginScreen = document.getElementById('login-screen');
            const officialDashboard = document.querySelector('.officials-dashboard');
            const publicDashboard = document.querySelector('.public-dashboard');
            
            // User type selection
            userTypes.forEach(type => {
                type.addEventListener('click', () => {
                    userTypes.forEach(t => t.classList.remove('active'));
                    type.classList.add('active');
                });
            });
            
            // Login button click
            loginBtn.addEventListener('click', () => {
                const isOfficial = document.getElementById('official-user').classList.contains('active');
                
                // Hide login screen
                loginScreen.style.display = 'none';
                
                // Show appropriate dashboard
                if (isOfficial) {
                    officialDashboard.classList.remove('hidden');
                    AppState.currentUser = { type: 'official' };
                } else {
                    publicDashboard.classList.remove('hidden');
                    AppState.currentUser = { type: 'public' };
                }
                
                // Initialize maps after login
                initMaps();
            });
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Logout buttons
            document.getElementById('logout-btn').addEventListener('click', logout);
            document.getElementById('public-logout-btn').addEventListener('click', logout);
            
            // Manual blackout trigger button
            document.getElementById('manual-blackout-btn').addEventListener('click', showBlackoutModal);
            
            // Modal close buttons
            document.getElementById('cancel-blackout').addEventListener('click', hideBlackoutModal);
            document.querySelector('.close-modal').addEventListener('click', hideBlackoutModal);
            
            // Confirm blackout button
            document.getElementById('confirm-blackout').addEventListener('click', triggerBlackout);
            
            // View repair map
            document.getElementById('view-repair-map').addEventListener('click', viewRepairMap);
            
            // Simulate fault button
            document.getElementById('simulate-fault').addEventListener('click', simulateRandomFault);
            
            // Dispatch van button
            document.getElementById('dispatch-van').addEventListener('click', dispatchVan);
            
            // Navigation items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', function() {
                    const section = this.getAttribute('data-section');
                    switchDashboardSection(section);
                    
                    // Update active nav item
                    document.querySelectorAll('.nav-item').forEach(nav => {
                        nav.classList.remove('active');
                    });
                    this.classList.add('active');
                });
            });
        }
        
        // Switch between dashboard sections
        function switchDashboardSection(sectionId) {
            document.querySelectorAll('.dashboard-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
            
            // Invalidate map size when switching to a map section
            if (sectionId === 'network-map' && AppState.networkMap) {
                setTimeout(() => {
                    AppState.networkMap.invalidateSize();
                }, 100);
            }
        }
        
        // Logout function
        function logout() {
            document.querySelector('.officials-dashboard').classList.add('hidden');
            document.querySelector('.public-dashboard').classList.add('hidden');
            document.getElementById('login-screen').style.display = 'flex';
            AppState.currentUser = null;
        }
        
        // Show blackout modal
        function showBlackoutModal() {
            const modal = document.getElementById('blackout-modal');
            modal.style.display = 'block';
            
            // Set current time as default
            const now = new Date();
            const timeString = now.toISOString().slice(0, 16);
            document.getElementById('break-time').value = timeString;
        }
        
        // Hide blackout modal
        function hideBlackoutModal() {
            const modal = document.getElementById('blackout-modal');
            modal.style.display = 'none';
        }
        
        // Trigger blackout function
        function triggerBlackout() {
            const password = document.getElementById('break-password').value;
            const poleId = document.getElementById('break-pole-select').value;
            const breakReason = document.getElementById('break-reason').value;
            
            if (!poleId) {
                alert('Please select a pole!');
                return;
            }
            
            if (!breakReason) {
                alert('Please enter a break reason!');
                return;
            }
            
            if (password === 'admin123') { // Dummy password for demo
                // Find the pole and update its status
                const poleIndex = AppState.poles.findIndex(p => p.id === poleId);
                if (poleIndex !== -1) {
                    // Update connected lines to fault
                    AppState.lines.forEach(line => {
                        if (line.from === poleId || line.to === poleId) {
                            line.status = 'fault';
                        }
                    });
                    
                    // Update maps
                    updateMaps();
                    
                    // Add notification
                    const pole = AppState.poles[poleIndex];
                    addNotification(`Blackout triggered at ${pole.id}, ${pole.area} (${breakReason})`, 'fault', 'official');
                    addNotification(`Power outage in your area. Repair team will be dispatched shortly.`, 'fault', 'public');
                    
                    // Update repair tracker
                    updateRepairTracker('fault-reported');
                    
                    // Hide modal
                    hideBlackoutModal();
                    
                    // Clear form
                    document.getElementById('break-reason').value = '';
                    document.getElementById('break-password').value = '';
                }
            } else {
                alert('Incorrect security password!');
            }
        }
        
        // Change line status
        function changeLineStatus(line, status) {
            line.status = status;
            
            // Update maps
            updateMaps();
            
            // Add notification based on status change
            if (status === 'fault') {
                addNotification(`Fault detected on line ${line.id}`, 'fault', 'official');
                addNotification(`Power interruption detected in your area. Repair team notified.`, 'fault', 'public');
                updateRepairTracker('fault-reported');
            } else if (status === 'repair') {
                addNotification(`Repair started on line ${line.id}`, 'repair', 'official');
                addNotification(`Repair in progress in your area. ETA: 45 minutes`, 'repair', 'public');
                updateRepairTracker('repair-started');
            } else if (status === 'healthy') {
                addNotification(`Repair completed on line ${line.id}. Supply restored.`, 'resolved', 'official');
                addNotification(`Power restored in your area. Thank you for your patience.`, 'resolved', 'public');
                updateRepairTracker('resolved');
            }
        }
        
        // Dispatch van to repair
        function dispatchVan() {
            const vanId = document.getElementById('van-select').value;
            const poleId = document.getElementById('faulty-pole').value;
            
            if (!vanId || !poleId) {
                alert('Please select both a van and a faulty pole!');
                return;
            }
            
            const van = AppState.vans.find(v => v.id === vanId);
            const pole = AppState.poles.find(p => p.id === poleId);
            
            if (van && pole) {
                // Update van status
                van.status = 'dispatched';
                van.currentPole = poleId;
                
                // Update UI
                updateVanStatus();
                
                // Add notification
                addNotification(`${van.name} dispatched to ${poleId} (${pole.area})`, 'repair', 'official');
                addNotification(`Repair van dispatched to your area. ETA: 15 minutes`, 'repair', 'public');
                
                // Update repair tracker
                updateRepairTracker('van-dispatched');
                
                // Animate van movement
                animateVanMovement(van, pole);
                
                // Simulate repair process
                setTimeout(() => {
                    // Repair the lines connected to this pole
                    AppState.lines.forEach(line => {
                        if (line.from === poleId || line.to === poleId) {
                            line.status = 'repair';
                        }
                    });
                    
                    // Update maps
                    updateMaps();
                    
                    addNotification(`Repair started at ${poleId} (${pole.area})`, 'repair', 'official');
                    addNotification(`Repair in progress in your area. ETA: 30 minutes`, 'repair', 'public');
                    
                    updateRepairTracker('repair-started');
                    
                    // Simulate repair completion after some time
                    setTimeout(() => {
                        // Complete repair
                        AppState.lines.forEach(line => {
                            if (line.from === poleId || line.to === poleId) {
                                line.status = 'healthy';
                            }
                        });
                        
                        // Update van status
                        van.status = 'available';
                        updateVanStatus();
                        
                        // Update maps
                        updateMaps();
                        
                        addNotification(`Repair completed at ${poleId} (${pole.area}). Supply restored.`, 'resolved', 'official');
                        addNotification(`Power restored in your area. Thank you for your patience.`, 'resolved', 'public');
                        
                        updateRepairTracker('resolved');
                    }, 30000); // 30 seconds for repair completion
                }, 15000); // 15 seconds for van to arrive
            }
        }
        
        // Animate van movement
        function animateVanMovement(van, targetPole) {
            const vanMarker = AppState.vanMarkers[van.id];
            if (vanMarker) {
                // Get current position
                const currentPole = AppState.poles.find(p => p.id === van.currentPole);
                
                // Calculate movement direction (simplified)
                const targetLatLng = [targetPole.lat, targetPole.lng];
                
                // Move the marker with animation
                vanMarker.setLatLng(targetLatLng);
                
                // Update popup content
                vanMarker.bindPopup(`
                    <div class="map-popup">
                        <h4>${van.name}</h4>
                        <p><strong>Driver:</strong> ${van.driver}</p>
                        <p><strong>Status:</strong> En route to ${targetPole.id}</p>
                        <p><strong>Destination:</strong> ${targetPole.id} (${targetPole.area})</p>
                    </div>
                `);
            }
        }
        
        // Update van status display
        function updateVanStatus() {
            const vanTrackingInfo = document.getElementById('van-tracking-info');
            if (vanTrackingInfo) {
                vanTrackingInfo.innerHTML = '';
                AppState.vans.forEach(van => {
                    const pole = AppState.poles.find(p => p.id === van.currentPole);
                    const statusText = van.status === 'available' ? 'Available' : 'Dispatched';
                    const p = document.createElement('p');
                    p.textContent = `${van.name}: ${statusText} at ${pole ? pole.id : 'Unknown location'}`;
                    vanTrackingInfo.appendChild(p);
                });
            }
            
            // Update repair management section
            const vanCards = document.querySelectorAll('.van-card');
            vanCards.forEach(card => {
                const vanName = card.querySelector('h4').textContent;
                const vanId = vanName.includes('Alpha') ? 'van01' : 'van02';
                const van = AppState.vans.find(v => v.id === vanId);
                const statusEl = card.querySelector('.status');
                
                if (van) {
                    statusEl.textContent = van.status === 'available' ? 'Available' : 'Dispatched';
                    statusEl.className = `status ${van.status === 'available' ? 'available' : 'dispatched'}`;
                    
                    const locationEl = card.querySelector('p:last-child');
                    const pole = AppState.poles.find(p => p.id === van.currentPole);
                    locationEl.textContent = `Current Location: ${pole ? pole.id + ' (' + pole.area + ')' : 'Unknown'}`;
                }
            });
        }
        
        // Update repair tracker
        function updateRepairTracker(stage) {
            const steps = document.querySelectorAll('.tracker-step');
            
            // Reset all steps
            steps.forEach(step => {
                const indicator = step.querySelector('.step-indicator');
                indicator.classList.remove('completed', 'active');
            });
            
            // Update based on stage
            if (stage === 'fault-reported') {
                steps[0].querySelector('.step-indicator').classList.add('completed');
                document.querySelector('.tracker-steps + p strong').textContent = 'Fault reported. Waiting for van dispatch.';
                document.querySelector('.tracker-steps + p + p strong').textContent = 'ETA: -';
            } else if (stage === 'van-dispatched') {
                steps[0].querySelector('.step-indicator').classList.add('completed');
                steps[1].querySelector('.step-indicator').classList.add('active');
                document.querySelector('.tracker-steps + p strong').textContent = 'Repair van is en route to your area';
                document.querySelector('.tracker-steps + p + p strong').textContent = 'ETA: 15 minutes';
            } else if (stage === 'repair-started') {
                steps[0].querySelector('.step-indicator').classList.add('completed');
                steps[1].querySelector('.step-indicator').classList.add('completed');
                steps[2].querySelector('.step-indicator').classList.add('active');
                document.querySelector('.tracker-steps + p strong').textContent = 'Repair in progress in your area';
                document.querySelector('.tracker-steps + p + p strong').textContent = 'ETA: 30 minutes';
            } else if (stage === 'resolved') {
                steps.forEach(step => {
                    step.querySelector('.step-indicator').classList.add('completed');
                });
                document.querySelector('.tracker-steps + p strong').textContent = 'Power restored in your area';
                document.querySelector('.tracker-steps + p + p strong').textContent = 'ETA: -';
            }
        }
        
        // View repair map function
        function viewRepairMap() {
            switchDashboardSection('network-map');
        }
        
        // Simulate random fault
        function simulateRandomFault() {
            // Get healthy lines
            const healthyLines = AppState.lines.filter(line => line.status === 'healthy');
            
            if (healthyLines.length > 0) {
                // Select a random line
                const randomIndex = Math.floor(Math.random() * healthyLines.length);
                const randomLine = healthyLines[randomIndex];
                
                // Change status to fault
                changeLineStatus(randomLine, 'fault');
            }
        }
        
        // Add notification function
        function addNotification(message, type, dashboard) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            const timestamp = new Date().toLocaleTimeString();
            notification.innerHTML = `<strong>${message}</strong><p>Time: ${timestamp}</p>`;
            
            if (dashboard === 'official') {
                document.getElementById('notifications-container').prepend(notification);
            } else {
                document.getElementById('public-notifications-container').prepend(notification);
            }
            
            setTimeout(() => {
                notification.remove();
            }, 10000);
        }
