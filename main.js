async function showMap() {
  try {
    const res = await fetch('/api/map-config');
    const { mapboxToken } = await res.json();

    await new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    mapboxgl.accessToken = mapboxToken;

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
        buildings: [0,'#f0d9c0', 10,'#e8c9a8', 30,'#d4a882', 60,'#c49068', 100,'#b07850'],
        buildingOpacity: 0.85,
        fog: { color:'#f5ede0','high-color':'#d4956a','horizon-blend':0.06,'space-color':'#1a0a00','star-intensity':0.1 }
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
        buildings: [0,'#1a1200', 10,'#2a1e08', 30,'#3d2a0a', 60,'#ff6b3530', 100,'#ff6b3550'],
        buildingOpacity: 0.92,
        fog: { color:'#0e0800','high-color':'#ff6b3530','horizon-blend':0.08,'space-color':'#000','star-intensity':0.6 }
      }
    };

    // ── OVERPASS QUERIES for Dar es Salaam ──
    // Using OpenStreetMap data — excellent coverage in Dar
    const DAR_BBOX = '-7.0,39.1,-6.6,39.5'; // south,west,north,east

    const categories = {
      beach: {
        label: 'Beach', emoji: '🏖️', color: '#ff6b35',
        query: `[out:json][timeout:25];
          (
            node["natural"="beach"](${DAR_BBOX});
            way["natural"="beach"](${DAR_BBOX});
            node["leisure"="beach_resort"](${DAR_BBOX});
            way["leisure"="beach_resort"](${DAR_BBOX});
          );
          out center 15;`
      },
      food: {
        label: 'Food', emoji: '🍽️', color: '#f7931e',
        query: `[out:json][timeout:25];
          (
            node["amenity"="restaurant"](${DAR_BBOX});
            node["amenity"="fast_food"](${DAR_BBOX});
            node["amenity"="food_court"](${DAR_BBOX});
          );
          out center 20;`
      },
      cafe: {
        label: 'Cafe', emoji: '☕', color: '#ffaa5c',
        query: `[out:json][timeout:25];
          (
            node["amenity"="cafe"](${DAR_BBOX});
            node["amenity"="bar"](${DAR_BBOX});
            node["amenity"="pub"](${DAR_BBOX});
          );
          out center 20;`
      },
      park: {
        label: 'Parks', emoji: '🌳', color: '#4caf7d',
        query: `[out:json][timeout:25];
          (
            node["leisure"="park"](${DAR_BBOX});
            way["leisure"="park"](${DAR_BBOX});
            node["leisure"="garden"](${DAR_BBOX});
            way["leisure"="garden"](${DAR_BBOX});
          );
          out center 15;`
      },
      explore: {
        label: 'Explore', emoji: '🏛️', color: '#e85d26',
        query: `[out:json][timeout:25];
          (
            node["tourism"="museum"](${DAR_BBOX});
            node["tourism"="attraction"](${DAR_BBOX});
            node["historic"](${DAR_BBOX});
            node["tourism"="viewpoint"](${DAR_BBOX});
            way["tourism"="attraction"](${DAR_BBOX});
          );
          out center 15;`
      }
    };

    let currentCategory = 'beach';
    let currentMode = 'light';
    let activeMarkers = [];
    let map;

    // ── FETCH FROM OPENSTREETMAP ──
    async function fetchPlaces(categoryKey) {
      const cat = categories[categoryKey];
      const url = 'https://overpass-api.de/api/interpreter';
      const response = await fetch(url, {
        method: 'POST',
        body: cat.query
      });
      const data = await response.json();

      // Filter: must have a name, deduplicate
      const seen = new Set();
      return data.elements
        .filter(el => {
          const name = el.tags?.name || el.tags?.['name:en'];
          if (!name || seen.has(name)) return false;
          seen.add(name);
          return true;
        })
        .slice(0, 15)
        .map(el => ({
          name: el.tags?.name || el.tags?.['name:en'] || 'Unnamed',
          coords: el.type === 'way' || el.type === 'relation'
            ? [el.center.lon, el.center.lat]
            : [el.lon, el.lat],
          tags: el.tags || {}
        }));
    }

    function clearMarkers() {
      activeMarkers.forEach(m => m.remove());
      activeMarkers = [];
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
        pin.textContent = cat.emoji;

        wrapper.appendChild(ring);
        wrapper.appendChild(pin);

        // Build extra detail line from OSM tags
        const detail = place.tags.cuisine
          ? `🍴 ${place.tags.cuisine}`
          : place.tags.opening_hours
          ? `🕐 ${place.tags.opening_hours}`
          : place.tags.description
          ? place.tags.description
          : cat.label + ' in Dar es Salaam';

        const popup = new mapboxgl.Popup({
          offset: 28, closeButton: true,
          maxWidth: '260px', className: 'flock-popup-wrap'
        }).setHTML(`
          <div class="flock-popup-inner">
            <div class="flock-popup-bar" style="background:${cat.color}"></div>
            <div class="flock-popup-title">${cat.emoji} ${place.name}</div>
            <div class="flock-popup-loc">📍 Dar es Salaam</div>
            <div class="flock-popup-row"><span>${detail}</span></div>
            <button class="flock-popup-btn" style="background:${cat.color}">Join a plan here</button>
          </div>
        `);

        const marker = new mapboxgl.Marker(wrapper)
          .setLngLat(place.coords)
          .setPopup(popup)
          .addTo(map);

        wrapper.addEventListener('click', () => {
          document.querySelectorAll('.flock-plan-card').forEach(c => c.classList.remove('flock-card-active'));
          const card = document.getElementById(`flock-card-${i}`);
          if (card) { card.classList.add('flock-card-active'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        });

        activeMarkers.push(marker);
      });
    }

    function renderSidebar(places, categoryKey) {
      const cat = categories[categoryKey];
      document.getElementById('flock-active-count').textContent = places.length;
      const container = document.getElementById('flock-plans-list');
      container.innerHTML = '';

      if (!places.length) {
        container.innerHTML = `<div style="text-align:center;color:#b0a098;padding:30px 10px;font-size:0.85rem">No ${cat.label} spots found — try another category</div>`;
        return;
      }

      places.forEach((place, i) => {
        const card = document.createElement('div');
        card.className = 'flock-plan-card';
        card.id = `flock-card-${i}`;
        card.innerHTML = `
          <div class="flock-card-accent-bar" style="background:${cat.color}"></div>
          <div class="flock-card-top">
            <div class="flock-card-emoji" style="background:${cat.color}18">${cat.emoji}</div>
            <div>
              <div class="flock-card-title">${place.name}</div>
              <div class="flock-card-loc">📍 Dar es Salaam</div>
            </div>
          </div>
          <button class="flock-card-btn" style="color:${cat.color};border-color:${cat.color}40"
            onclick="flockFlyTo(${place.coords[0]},${place.coords[1]},${i})">View on map →</button>
        `;
        container.appendChild(card);
      });
    }

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
        document.getElementById('flock-plans-list').innerHTML =
          `<div style="text-align:center;color:#ff6b35;padding:30px 10px;font-size:0.82rem">Could not load spots. Check your connection.</div>`;
      }
    }

    function applyStyle(styleKey) {
      const style = STYLES[styleKey];
      if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', style.water);
      Object.entries(style.roads).forEach(([layer, color]) => {
        if (map.getLayer(layer)) map.setPaintProperty(layer, 'line-color', color);
      });
      if (map.getLayer('flock-3d-buildings')) map.removeLayer('flock-3d-buildings');
      map.addLayer({
        id: 'flock-3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 12,
        paint: {
          'fill-extrusion-color': ['interpolate',['linear'],['get','height'], ...style.buildings],
          'fill-extrusion-height': ['interpolate',['linear'],['zoom'],12,0,12.5,['get','height']],
          'fill-extrusion-base': ['interpolate',['linear'],['zoom'],12,0,12.5,['get','min_height']],
          'fill-extrusion-opacity': style.buildingOpacity,
          'fill-extrusion-ambient-occlusion-intensity': 0.5,
          'fill-extrusion-ambient-occlusion-radius': 3.0
        }
      }, 'road-label');
    }

    function buildMap(styleKey) {
      if (map) map.remove();
      const style = STYLES[styleKey];
      map = new mapboxgl.Map({
        container: 'map',
        style: style.url,
        center: [39.2880, -6.8120],
        zoom: 15.5,
        pitch: 62,
        bearing: -20,
        antialias: true
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');
      map.on('style.load', () => {
        applyStyle(styleKey);
        map.setFog(style.fog);
        loadCategory(currentCategory);
      });
    }

    // ── GLOBALS ──
    window.flockFlyTo = function(lng, lat, index) {
      map.flyTo({ center:[lng,lat], zoom:16, pitch:65, bearing: Math.random()*40-20, duration:1800, essential:true });
      setTimeout(() => activeMarkers[index]?.togglePopup(), 1900);
    };

    window.flockFilter = function(cat, btn) {
      document.querySelectorAll('.flock-chip').forEach(c => c.classList.remove('flock-chip-active'));
      btn.classList.add('flock-chip-active');
      loadCategory(cat);
    };

    window.flockToggleMode = function() {
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

    window.flockToggleSidebar = function() {
      const sidebar = document.getElementById('flock-sidebar');
      const toggle = document.getElementById('flock-toggle');
      const open = sidebar.classList.toggle('flock-sidebar-open');
      toggle.classList.toggle('flock-toggle-shifted', open);
      toggle.textContent = open ? '✕' : '🐦';
    };

    buildMap('light');
    console.log('✅ Flock map alive');
  } catch (err) {
    console.error('❌ Flock map failed:', err);
  }
}

window.addEventListener('DOMContentLoaded', showMap);