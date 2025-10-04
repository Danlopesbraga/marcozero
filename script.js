const btnGetLocation = document.getElementById('btn-get-location');
const btnOpenGps = document.getElementById('btn-open-gps');
const statusEl = document.getElementById('status');
const distanceEl = document.getElementById('distance');

let userCoords = null;
const DEST = (window.MARCO_ZERO || { lat: -8.063173, lng: -34.871139 });

function toRad(v) { return (v * Math.PI) / 180; }
function haversineKm(a, b) {
  const R = 6371; 
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

function updateDistance() {
  if (!userCoords) return;
  const d = haversineKm(userCoords, DEST);
  distanceEl.textContent = `Distância até o Marco Zero: ${formatKm(d)}`;
}

function buildMapsUrl(origin, dest) {
  const base = 'https://www.google.com/maps/dir/?api=1';
  const originStr = `${origin.lat},${origin.lng}`;
  const destStr = `${dest.lat},${dest.lng}`;
  const params = new URLSearchParams({ origin: originStr, destination: destStr, travelmode: 'driving' });
  return `${base}&${params.toString()}`;
}

function openGps() {
  if (!userCoords) return;
  const url = buildMapsUrl(userCoords, DEST);
  window.location.href = url;
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error('Nominatim error');
  const data = await resp.json();
  return data.display_name || '';
}

async function getRouteOSRM(origin, dest) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false&alternatives=false&steps=false`;
  const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!resp.ok) throw new Error('OSRM error');
  const data = await resp.json();
  if (!data.routes || !data.routes[0]) throw new Error('OSRM no route');
  const r = data.routes[0];
  return { distanceMeters: r.distance, durationSeconds: r.duration };
}

function formatDuration(sec) {
  if (!isFinite(sec)) return '';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} h ${rm} min`;
}

function getLocation() {
  if (!('geolocation' in navigator)) {
    statusEl.textContent = 'Geolocalização não suportada no seu navegador.';
    return;
  }
  statusEl.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Obtendo sua localização...';
  btnGetLocation.disabled = true;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    try {
      const address = await reverseGeocode(userCoords.lat, userCoords.lng).catch(() => '');
      const posText = `${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}`;
      statusEl.textContent = address ? `Você está em: ${address}` : `Sua posição: ${posText}`;

      try {
        const route = await getRouteOSRM(userCoords, DEST);
        const km = route.distanceMeters / 1000;
        const dur = formatDuration(route.durationSeconds);
        distanceEl.textContent = `Distância por rota até o Marco Zero: ${formatKm(km)} • Tempo estimado: ${dur}`;
      } catch (_) {
        updateDistance();
      }
    } finally {
      btnOpenGps.disabled = false;
      btnGetLocation.disabled = false;
    }
  }, (err) => {
    console.error(err);
    statusEl.textContent = 'Não foi possível obter a localização. Verifique as permissões.';
    btnGetLocation.disabled = false;
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

if (btnGetLocation) btnGetLocation.addEventListener('click', getLocation);
if (btnOpenGps) btnOpenGps.addEventListener('click', openGps);
