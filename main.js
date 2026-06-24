// ============================================================
//  FLOCK MAP — Full working version for Dar es Salaam
//  Includes:
//    - Virtual restaurant (Waterfront) with menu & join
//    - Virtual beach event (Mbweni Sunset) with attendees
// ============================================================

async function showMap() {
  try {
    // 1. Get your Mapbox token from the backend (Vercel serverless function)
    const res = await fetch('/api/map-config');
    if (!res.ok) throw new Error(`HTTP ${res.status} – failed to fetch map token`);
    const { mapboxToken } = await res.json();

    // 2. Load Mapbox GL CSS + JS
    await new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Mapbox GL JS failed to load'));
      document.head.appendChild(script);
    });

    if (typeof mapboxgl === 'undefined') {
      throw new Error('Mapbox GL JS library did not initialise');
    }
    mapboxgl.accessToken = mapboxToken;

    // ============================================================
    //  STYLES (Light / Dark)
    // ============================================================
    const STYLES = {
      light: {
        url: 'mapbox://styles/mapbox/streets-v12',
        water: '#b8d8e8',
        roads: {
          'road-motorway-trunk': '#e8956a',
          'road-primary': '#f0c898',
          'road-secondary-tertiary': '#f5dfc0',
          'road-street': '#f7f0e6',
          'road-minor': '#f7f0e6',
        },
        buildings: [0, '#f0d9c0', 10, '#e8c9a8', 30, '#d4a882', 60, '#c49068', 100, '#b07850'],
        buildingOpacity: 0.85,
        fog: { color: '#f5ede0', 'high-color': '#d4956a', 'horizon-blend': 0.06, 'space-color': '#1a0a00', 'star-intensity': 0.1 },
      },
      dark: {
        url: 'mapbox://styles/mapbox/dark-v11',
        water: '#0d2b45',
        roads: {
          'road-motorway-trunk': '#3a1800',
          'road-primary': '#2a1400',
          'road-secondary-tertiary': '#1e1000',
          'road-street': '#150d00',
          'road-minor': '#100a00',
        },
        buildings: [0, '#1a1200', 10, '#2a1e08', 30, '#3d2a0a', 60, '#ff6b3530', 100, '#ff6b3550'],
        buildingOpacity: 0.92,
        fog: { color: '#0e0800', 'high-color': '#ff6b3530', 'horizon-blend': 0.08, 'space-color': '#000', 'star-intensity': 0.6 },
      },
    };

    // ============================================================
    //  VIRTUAL DEMO: RESTAURANT
    // ============================================================
    const DEMO_RESTAURANT = {
      name: '🌊 The Waterfront Restaurant',
      coords: [39.282, -6.811],
      tags: {
        cuisine: 'Seafood, Grills',
        menu: [
          { item: 'Grilled Lobster', price: '30,000 TZS' },
          { item: 'Fish & Chips',   price: '12,000 TZS' },
          { item: 'Coconut Rice',   price: '8,000 TZS' },
          { item: 'Fresh Juice',    price: '5,000 TZS' },
        ],
        description: 'Fresh seafood with a sunset view. Perfect for a group dinner.',
      },
      isDemo: true,
    };

    // ============================================================
    //  VIRTUAL DEMO: BEACH EVENT with ATTENDEES
    // ============================================================
    const DEMO_EVENT = {
      name: '🌅 Mbweni Beach Sunset Gathering',
      coords: [39.213, -6.621], // Mbweni Beach
      tags: {
        event: 'Sunset Beach Gathering',
        time: '4 PM – 7 PM',
        date: 'Saturday, 27 June 2026',
        description: 'Come watch the sunset with us! Swimming, music, and good vibes.',
        attendees: [
          { name: 'Michael John', emoji: '👤' },
          { name: 'Sarah K.', emoji: '👤' },
          { name: 'David M.', emoji: '👤' },
          { name: 'Emily R.', emoji: '👤' },
        ],
        activity: '🏊 Swimming • 🌅 Sunset • 🎵 Music • 🍕 Food',
      },
      isDemoEvent: true,
    };

    // ============================================================
    //  OVERPASS QUERIES — Dar es Salaam
    // ============================================================
    const DAR_BBOX = '-7.3,38.8,-6.4,39.8';

    const categories = {
      beach: {
        label: 'Beach',
        emoji: '🏖️',
        color: '#ff6b35',
        query: `[out:json][timeout:30];
          (
            node["natural"="beach"](${DAR_BBOX});
            way["natural"="beach"](${DAR_BBOX});
            node["tourism"="beach"](${DAR_BBOX});
            way["tourism"="beach"](${DAR_BBOX});
            node["leisure"="beach_resort"](${DAR_BBOX});
            way["leisure"="beach_resort"](${DAR_BBOX});
            node["leisure"="swimming_area"](${DAR_BBOX});
            way["leisure"="swimming_area"](${DAR_BBOX});
          );
          out center 20;`,
      },
      food: {
        label: 'Food',
        emoji: '🍽️',
        color: '#f7931e',
        query: `[out:json][timeout:30];
          (
            node["amenity"="restaurant"](${DAR_BBOX});
            way["amenity"="restaurant"](${DAR_BBOX});
            node["amenity"="fast_food"](${DAR_BBOX});
            way["amenity"="fast_food"](${DAR_BBOX});
            node["amenity"="food_court"](${DAR_BBOX});
            way["amenity"="food_court"](${DAR_BBOX});
          );
          out center 20;`,
      },
      cafe: {
        label: 'Cafe',
        emoji: '☕',
        color: '#ffaa5c',
        query: `[out:json][timeout:30];
          (
            node["amenity"="cafe"](${DAR_BBOX});
            way["amenity"="cafe"](${DAR_BBOX});
            node["amenity"="bar"](${DAR_BBOX});
            way["amenity"="bar"](${DAR_BBOX});
            node["amenity"="pub"](${DAR_BBOX});
            way["amenity"="pub"](${DAR_BBOX});
          );
          out center 20;`,
      },
      park: {
        label: 'Parks',
        emoji: '🌳',
        color: '#4caf7d',
        query: `[out:json][timeout:30];
          (
            node["leisure"="park"](${DAR_BBOX});
            way["leisure"="park"](${DAR_BBOX});
            node["leisure"="garden"](${DAR_BBOX});
            way["leisure"="garden"](${DAR_BBOX});
            node["leisure"="nature_reserve"](${DAR_BBOX});
            way["leisure"="nature_reserve"](${DAR_BBOX});
          );
          out center 20;`,
      },
      explore: {
        label: 'Explore',
        emoji: '🏛️',
        color: '#e85d26',
        query: `[out:json][timeout:30];
          (
            node["tourism"="museum"](${DAR_BBOX});
            way["tourism"="museum"](${DAR_BBOX});
            node["tourism"="attraction"](${DAR_BBOX});
            way["tourism"="attraction"](${DAR_BBOX});
            node["historic"](${DAR_BBOX});
            way["historic"](${DAR_BBOX});
            node["tourism"="viewpoint"](${DAR_BBOX});
            way["tourism"="viewpoint"](${DAR_BBOX});
          );
          out center 20;`,
      },
    };

    // ============================================================
    //  STATE
    // ============================================================
    let currentCategory = 'beach';
    let currentMode = 'light';
    let activeMarkers = [];
    let map = null;

    // Store current popup reference for dynamic updates
    let currentPopup = null;
    let currentPopupPlace = null;

    // ============================================================
    //  FETCH FROM OVERPASS API
    // ============================================================
    async function fetchPlaces(categoryKey) {
      const cat = categories[categoryKey];
      const url = 'https://overpass-api.de/api/interpreter';

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: cat.query,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FlockApp/1.0 (contact@yourdomain.com)',
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Overpass HTTP ${response.status} – ${text}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          const text = await response.text();
          throw new Error(`Invalid JSON from Overpass: ${text.slice(0, 150)}`);
        }

        if (data.remark && data.remark.toLowerCase().includes('error')) {
          throw new Error(data.remark);
        }

        const seen = new Set();
        const results = [];

        for (const el of data.elements) {
          const lon = el.type === 'way' || el.type === 'relation' ? el.center?.lon : el.lon;
          const lat = el.type === 'way' || el.type === 'relation' ? el.center?.lat : el.lat;
          if (!lon || !lat) continue;

          const uniqueKey = `${el.type}-${el.id}`;
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);

          const name =
            el.tags?.name ||
            el.tags?.['name:en'] ||
            el.tags?.name_sw ||
            `${cat.label} spot`;

          results.push({
            name: name,
            coords: [lon, lat],
            tags: el.tags || {},
          });
        }

        // ============================================================
        //  INJECT DEMO ITEMS into respective categories
        // ============================================================
        if (categoryKey === 'food') {
          results.unshift({
            name: DEMO_RESTAURANT.name,
            coords: DEMO_RESTAURANT.coords,
            tags: DEMO_RESTAURANT.tags,
            isDemo: true,
          });
        }

        if (categoryKey === 'beach') {
          results.unshift({
            name: DEMO_EVENT.name,
            coords: DEMO_EVENT.coords,
            tags: DEMO_EVENT.tags,
            isDemoEvent: true,
          });
        }

        return results.slice(0, 20);
      } catch (err) {
        console.error('Overpass fetch error:', err);
        throw err;
      }
    }

    // ============================================================
    //  BUILD POPUP HTML
    // ============================================================
    function buildEventPopupHTML(place, cat) {
      const attendees = place.tags.attendees || [];
      const attendeeList = attendees.map(a =>
        `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f5ede5;font-size:0.8rem;">
          <span>${a.emoji || '👤'}</span>
          <span style="font-weight:500;">${a.name}</span>
        </div>`
      ).join('');

      return `
        <div class="flock-popup-inner">
          <div class="flock-popup-bar" style="background:${cat.color}"></div>
          <div class="flock-popup-title" style="font-size:1.1rem;">${place.name}</div>
          <div class="flock-popup-loc">📍 Mbweni Beach, Dar es Salaam</div>

          <div style="padding:0 14px 6px;font-size:0.75rem;color:#4a4a4a;background:#fffaf5;border-radius:8px;margin:0 14px 6px;">
            <div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #f0e8df;">
              <span>📅 ${place.tags.date || 'N/A'}</span>
              <span>🕐 ${place.tags.time || 'N/A'}</span>
            </div>
            <div style="padding:6px 0;font-size:0.7rem;color:#b0a098;">
              ${place.tags.activity || ''}
            </div>
          </div>

          <div style="padding:0 14px 6px;font-size:0.8rem;color:#4a4a4a;">
            ${place.tags.description || ''}
          </div>

          <div style="padding:0 14px 10px;">
            <div style="font-size:0.8rem;font-weight:600;color:#2d2d2d;margin-bottom:6px;">
              👥 Attendees (${attendees.length})
            </div>
            <div id="attendee-list-${Date.now()}" style="background:#faf5f0;border-radius:8px;padding:6px 10px;max-height:120px;overflow-y:auto;">
              ${attendeeList}
            </div>
          </div>

          <button class="flock-popup-btn" style="background:${cat.color};width:calc(100% - 28px);margin:0 14px 12px;padding:10px;border-radius:10px;border:none;color:#fff;font-family:'Kalam',cursive;font-size:0.85rem;font-weight:700;cursor:pointer;"
            onclick="window.flockJoinEvent('${place.name}', '${cat.color}')">
            🐦 Join this Event
          </button>
        </div>
      `;
    }

    function buildRestaurantPopupHTML(place, cat) {
      const menuHtml = place.tags.menu.map(m =>
        `<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:2px 0;border-bottom:1px solid #f0e8df;">
          <span>${m.item}</span>
          <span style="color:#ff6b35;font-weight:600;">${m.price}</span>
        </div>`
      ).join('');

      return `
        <div class="flock-popup-inner">
          <div class="flock-popup-bar" style="background:${cat.color}"></div>
          <div class="flock-popup-title">${cat.emoji} ${place.name}</div>
          <div class="flock-popup-loc">📍 Dar es Salaam</div>
          <div style="padding:0 14px 6px;font-size:0.75rem;color:#4a4a4a;">${place.tags.description || ''}</div>
          <div style="padding:0 14px 10px;font-size:0.8rem;font-weight:600;color:#2d2d2d;">📋 Menu</div>
          <div style="padding:0 14px 10px;">${menuHtml}</div>
          <button class="flock-popup-btn" style="background:${cat.color};" onclick="window.flockJoinPlan('${place.name}')">
            🐦 Join this Plan
          </button>
        </div>
      `;
    }

    function buildRegularPopupHTML(place, cat) {
      const detail =
        place.tags.cuisine
          ? `🍴 ${place.tags.cuisine}`
          : place.tags.opening_hours
          ? `🕐 ${place.tags.opening_hours}`
          : place.tags.description
          ? place.tags.description
          : `${cat.label} in Dar es Salaam`;

      return `
        <div class="flock-popup-inner">
          <div class="flock-popup-bar" style="background:${cat.color}"></div>
          <div class="flock-popup-title">${cat.emoji} ${place.name}</div>
          <div class="flock-popup-loc">📍 Dar es Salaam</div>
          <div class="flock-popup-row"><span>${detail}</span></div>
          <button class="flock-popup-btn" style="background:${cat.color}" onclick="window.flockJoinPlan('${place.name}')">Join a plan here</button>
        </div>
      `;
    }

    // ============================================================
    //  MARKERS
    // ============================================================
    function clearMarkers() {
      activeMarkers.forEach((m) => m.remove());
      activeMarkers = [];
      currentPopup = null;
      currentPopupPlace = null;
    }

    function addMarkers(places, categoryKey) {
      const cat = categories[categoryKey];

      places.forEach((place, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flock-pin-wrapper';

        const ring = document.createElement('div');
        ring.className = 'flock-pin-ring';
        ring.style.borderColor = cat.color;
        ring.style.animationDelay = `${i * 0.12}s`;

        const pin = document.createElement('div');
        pin.className = 'flock-pin';
        pin.style.borderColor = cat.color;
        pin.style.boxShadow = `0 0 0 3px ${cat.color}22, 0 4px 16px ${cat.color}55`;

        // Different emoji for event vs regular
        if (place.isDemoEvent) {
          pin.textContent = '🎉';
        } else if (place.isDemo) {
          pin.textContent = '🍽️';
        } else {
          pin.textContent = cat.emoji;
        }

        wrapper.appendChild(ring);
        wrapper.appendChild(pin);

        // Build popup based on type
        let popupContent;
        if (place.isDemoEvent) {
          popupContent = buildEventPopupHTML(place, cat);
        } else if (place.isDemo && place.tags.menu) {
          popupContent = buildRestaurantPopupHTML(place, cat);
        } else {
          popupContent = buildRegularPopupHTML(place, cat);
        }

        const popup = new mapboxgl.Popup({
          offset: 28,
          closeButton: true,
          maxWidth: '300px',
          className: 'flock-popup-wrap',
        }).setHTML(popupContent);

        // Store popup reference for dynamic updates
        if (place.isDemoEvent) {
          popup._placeData = place;
          popup._catColor = cat.color;
        }

        const marker = new mapboxgl.Marker(wrapper)
          .setLngLat(place.coords)
          .setPopup(popup)
          .addTo(map);

        wrapper.addEventListener('click', () => {
          document.querySelectorAll('.flock-plan-card').forEach((c) => c.classList.remove('flock-card-active'));
          const card = document.getElementById(`flock-card-${i}`);
          if (card) {
            card.classList.add('flock-card-active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        activeMarkers.push(marker);
      });
    }

    // ============================================================
    //  SIDEBAR
    // ============================================================
    function renderSidebar(places, categoryKey) {
      const cat = categories[categoryKey];
      document.getElementById('flock-active-count').textContent = places.length;
      const container = document.getElementById('flock-plans-list');
      container.innerHTML = '';

      if (!places.length) {
        container.innerHTML = `
          <div style="text-align:center;color:#b0a098;padding:30px 10px;font-size:0.85rem">
            No ${cat.label} spots found — try another category
          </div>`;
        return;
      }

      places.forEach((place, i) => {
        const card = document.createElement('div');
        card.className = 'flock-plan-card';
        card.id = `flock-card-${i}`;

        let displayName = place.name;
        let emoji = cat.emoji;

        if (place.isDemoEvent) {
          emoji = '🎉';
        } else if (place.isDemo) {
          emoji = '🍽️';
        } else if (place.name.includes('spot')) {
          displayName = `${place.name} ${i + 1}`;
        }

        card.innerHTML = `
          <div class="flock-card-accent-bar" style="background:${cat.color}"></div>
          <div class="flock-card-top">
            <div class="flock-card-emoji" style="background:${cat.color}18">${emoji}</div>
            <div>
              <div class="flock-card-title">${displayName}</div>
              <div class="flock-card-loc">📍 ${place.isDemoEvent ? 'Mbweni Beach' : 'Dar es Salaam'}</div>
            </div>
          </div>
          ${place.isDemoEvent ? `<div style="padding:0 14px 6px;font-size:0.65rem;color:#b0a098;">👥 ${place.tags.attendees?.length || 0} going</div>` : ''}
          <button class="flock-card-btn" style="color:${cat.color};border-color:${cat.color}40"
            onclick="flockFlyTo(${place.coords[0]},${place.coords[1]},${i})">View on map →</button>
        `;
        container.appendChild(card);
      });
    }

    // ============================================================
    //  LOAD CATEGORY
    // ============================================================
    async function loadCategory(categoryKey) {
      currentCategory = categoryKey;
      const cat = categories[categoryKey];

      document.getElementById('flock-plans-list').innerHTML = `
        <div style="text-align:center;color:#b0a098;padding:40px 10px">
          <div style="font-size:2rem;margin-bottom:10px">${cat.emoji}</div>
          <div style="font-size:0.82rem">Finding ${cat.label} spots in Dar...</div>
        </div>`;

      clearMarkers();

      try {
        const places = await fetchPlaces(categoryKey);
        addMarkers(places, categoryKey);
        renderSidebar(places, categoryKey);
      } catch (err) {
        console.error('Failed to load places:', err);
        document.getElementById('flock-plans-list').innerHTML = `
          <div style="text-align:center;color:#ff6b35;padding:30px 10px;font-size:0.82rem">
            ⚠️ Could not load spots.<br>
            <span style="font-size:0.7rem;color:#a09088">${err.message}</span>
          </div>`;
      }
    }

    // ============================================================
    //  STYLE / 3D BUILDINGS
    // ============================================================
    function applyStyle(styleKey) {
      const style = STYLES[styleKey];
      if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', style.water);

      Object.entries(style.roads).forEach(([layer, color]) => {
        if (map.getLayer(layer)) map.setPaintProperty(layer, 'line-color', color);
      });

      if (map.getLayer('flock-3d-buildings')) map.removeLayer('flock-3d-buildings');

      map.addLayer(
        {
          id: 'flock-3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'height'], ...style.buildings],
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, ['get', 'min_height']],
            'fill-extrusion-opacity': style.buildingOpacity,
            'fill-extrusion-ambient-occlusion-intensity': 0.5,
            'fill-extrusion-ambient-occlusion-radius': 3.0,
          },
        },
        'road-label'
      );
    }

    function buildMap(styleKey) {
      if (map) {
        clearMarkers();
        map.remove();
        map = null;
      }

      const style = STYLES[styleKey];
      map = new mapboxgl.Map({
        container: 'map',
        style: style.url,
        center: [39.2880, -6.8120],
        zoom: 15.5,
        pitch: 62,
        bearing: -20,
        antialias: true,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');

      map.on('style.load', () => {
        applyStyle(styleKey);
        map.setFog(style.fog);
        loadCategory(currentCategory);
      });
    }

    // ============================================================
    //  GLOBAL FUNCTIONS (exposed to HTML buttons)
    // ============================================================
    window.flockFlyTo = function (lng, lat, index) {
      if (!map) return;
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        pitch: 65,
        bearing: Math.random() * 40 - 20,
        duration: 1800,
        essential: true,
      });
      setTimeout(() => activeMarkers[index]?.togglePopup(), 1900);
    };

    window.flockJoinPlan = function (placeName) {
      const userName = prompt(`Enter your name to join the plan at ${placeName}:`);
      if (userName && userName.trim()) {
        alert(`🎉 ${userName} joined the plan at ${placeName}! (Demo only)`);
        console.log(`[Join] ${userName} joined ${placeName}`);
      } else {
        alert('No name provided – you can still join anonymously!');
      }
    };

    // ============================================================
    //  JOIN EVENT — dynamically updates attendee list
    // ============================================================
    window.flockJoinEvent = function (eventName, catColor) {
      const userName = prompt(`Enter your name to join the event at ${eventName}:`);
      if (!userName || !userName.trim()) {
        alert('No name provided – you can still join anonymously!');
        return;
      }

      // Find the event place data from active markers
      let targetMarker = null;
      let targetPlace = null;
      let targetIndex = -1;

      for (let i = 0; i < activeMarkers.length; i++) {
        const marker = activeMarkers[i];
        if (marker._popup && marker._popup._placeData && marker._popup._placeData.name === eventName) {
          targetMarker = marker;
          targetPlace = marker._popup._placeData;
          targetIndex = i;
          break;
        }
      }

      if (!targetPlace) {
        alert('Event not found. Please try again.');
        return;
      }

      // Add user to attendees
      const newAttendee = { name: userName.trim(), emoji: '👤' };
      targetPlace.tags.attendees.push(newAttendee);

      // Update popup content
      const cat = categories.beach; // event is always in beach category
      const newPopupHTML = buildEventPopupHTML(targetPlace, cat);
      if (targetMarker && targetMarker._popup) {
        targetMarker._popup.setHTML(newPopupHTML);
      }

      // Also update the sidebar card for this place
      const card = document.getElementById(`flock-card-${targetIndex}`);
      if (card) {
        const countSpan = card.querySelector('.flock-card-loc');
        if (countSpan) {
          countSpan.textContent = `👥 ${targetPlace.tags.attendees.length} going`;
        }
      }

      // Update the global count
      const countEl = document.getElementById('flock-active-count');
      if (countEl) {
        // Force update by re-rendering the sidebar
        // We'll just update the specific card
        const container = document.getElementById('flock-plans-list');
        const cards = container.querySelectorAll('.flock-plan-card');
        cards.forEach((c, idx) => {
          if (idx === targetIndex) {
            const locSpan = c.querySelector('.flock-card-loc');
            if (locSpan) {
              locSpan.textContent = `👥 ${targetPlace.tags.attendees.length} going`;
            }
          }
        });
      }

      // Show success message
      alert(`🎉 ${userName} joined the ${eventName}! See you there!`);

      // Open the popup to show updated list
      if (targetMarker) {
        targetMarker.togglePopup();
      }
    };

    window.flockFilter = function (cat, btn) {
      if (!map) return;
      document.querySelectorAll('.flock-chip').forEach((c) => c.classList.remove('flock-chip-active'));
      btn.classList.add('flock-chip-active');
      loadCategory(cat);
    };

    window.flockToggleMode = function () {
      currentMode = currentMode === 'light' ? 'dark' : 'light';
      const btn = document.getElementById('flock-mode-btn');
      btn.textContent = currentMode === 'light' ? '🌙' : '☀️';

      const sidebar = document.getElementById('flock-sidebar');
      const pill = document.getElementById('flock-pill');

      if (currentMode === 'dark') {
        sidebar.style.background = 'rgba(14,10,0,0.96)';
        sidebar.style.borderColor = 'rgba(255,107,53,0.2)';
        pill.style.background = 'rgba(14,10,0,0.96)';
      } else {
        sidebar.style.background = 'rgba(250,244,235,0.96)';
        sidebar.style.borderColor = 'rgba(255,107,53,0.15)';
        pill.style.background = 'rgba(250,244,235,0.96)';
      }

      buildMap(currentMode);
    };

    window.flockToggleSidebar = function () {
      const sidebar = document.getElementById('flock-sidebar');
      const toggle = document.getElementById('flock-toggle');
      const open = sidebar.classList.toggle('flock-sidebar-open');
      toggle.classList.toggle('flock-toggle-shifted', open);
      toggle.textContent = open ? '✕' : '🐦';
    };

    // ============================================================
    //  START THE MAP
    // ============================================================
    buildMap('light');
    console.log('✅ Flock map is alive and loaded!');
    console.log('🎉 Demo features:');
    console.log('  🍽️  The Waterfront Restaurant (Food category)');
    console.log('  🎉  Mbweni Beach Sunset Gathering (Beach category)');
  } catch (err) {
    console.error('❌ Flock map failed:', err);
  }
}

// Boot when DOM is ready
window.addEventListener('DOMContentLoaded', showMap);