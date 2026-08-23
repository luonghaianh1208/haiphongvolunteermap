import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Navigation, MapPin, Users, ExternalLink, Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

// Custom Colored Leaflet SVG Icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
          </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const greenIcon = createCustomIcon('#10B981');
const yellowIcon = createCustomIcon('#F59E0B');
const redIcon = createCustomIcon('#EF4444');
const blueIcon = createCustomIcon('#1D4ED8');

// Hai Phong City Center coordinates
const DEFAULT_CENTER: [number, number] = [20.8449, 106.6881];

// Khung bao Hải Phòng sau sáp nhập với Hải Dương (hiệu lực 01/7/2025).
// Số đo lấy từ public/haiphong-boundary.geojson (nguyenduy1133/Free-GIS-Data),
// đã loại trừ đặc khu Bạch Long Vĩ (đo được minLat 20.598 / maxLat 21.237 /
// minLng 106.124 / maxLng 107.212 khi bỏ đảo; làm tròn ra ngoài 2 chữ số thập phân).
export const HAI_PHONG_BOUNDS: LatLngBoundsExpression = [
  [20.59, 106.12],
  [21.24, 107.22],
];

// Vành ngoài của lớp mặt nạ: phủ trọn mặt phẳng chiếu Web Mercator.
const WORLD_RING: [number, number][] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/**
 * Dựng lớp mặt nạ từ ranh giới: một polygon phủ toàn cầu, khoét lỗ đúng phần
 * Hải Phòng. Nhờ vậy mọi khu vực bên ngoài bị phủ mờ, làm nổi bật thành phố.
 * Trả về null nếu GeoJSON không có polygon nào.
 */
function buildMask(geojson: any): any | null {
  const holes: [number, number][][] = [];
  for (const feature of geojson?.features ?? []) {
    const geom = feature?.geometry;
    if (geom?.type === 'Polygon') {
      holes.push(geom.coordinates[0]);
    } else if (geom?.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) holes.push(poly[0]);
    }
  }
  if (holes.length === 0) return null;
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [WORLD_RING, ...holes] },
  };
}

/** Chuẩn hóa chuỗi để tìm kiếm: bỏ dấu, thường hóa. "Đồ Sơn" -> "do son" */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export default function MapPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [boundary, setBoundary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetch('/api/activities')
      .then(res => res.json())
      .then(data => setActivities(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/haiphong-boundary.geojson')
      .then(res => res.json())
      .then(setBoundary)
      .catch(() => setBoundary(null)); // không có ranh giới thì bản đồ vẫn chạy
  }, []);

  const mask = useMemo(() => (boundary ? buildMask(boundary) : null), [boundary]);

  const categories = Array.from(
    new Set(activities.map(a => a.category).filter(Boolean))
  ).sort();

  const filteredActivities = activities.filter(act => {
    if (category !== 'all' && act.category !== category) return false;
    if (search.trim() === '') return true;
    const needle = normalize(search);
    return normalize(act.title || '').includes(needle)
        || normalize(act.location || '').includes(needle);
  });

  return (
    <div className="space-y-4">
      {/* Top Map Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-blue-950 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-700" /> Bản đồ số Thanh niên tình nguyện Hải Phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Giám sát các điểm hoạt động và điều phối lực lượng theo thời gian thực</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoạt động hoặc địa điểm..."
            aria-label="Tìm kiếm hoạt động"
            className="h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] flex-1 md:flex-none md:w-64"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Lọc theo lĩnh vực"
            className="h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] flex-1 md:flex-none"
          >
            <option value="all">Tất cả lĩnh vực</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Map Legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium bg-slate-100 px-3 py-2.5 rounded-xl border border-slate-200/80 shrink-0">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đủ TNV</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Cần TNV</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Khẩn cấp</span>
          </div>
        </div>
      </div>


      {/* Map Canvas */}
      <div className="h-[calc(100vh-14rem)] min-h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={10}
          maxBounds={HAI_PHONG_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={9}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Ranh giới hành chính: Free-GIS-Data'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mask && (
            <GeoJSON
              data={mask}
              interactive={false}
              style={{
                stroke: false,
                fillColor: '#0F172A',
                fillOpacity: 0.5,
                fillRule: 'evenodd',
              }}
            />
          )}

          {boundary && (
            <GeoJSON
              data={boundary}
              interactive={false}
              style={{ color: '#1D4ED8', weight: 2, fill: false }}
            />
          )}

          {filteredActivities.map((act) => {
            if (!act.lat || !act.lng) return null;

            const isUrgent = act.category === 'Ứng phó thiên tai' || act.category === 'Phản ứng nhanh';
            const iconToUse = isUrgent ? redIcon : (act.registeredCount >= act.requiredVolunteers ? greenIcon : yellowIcon);

            return (
              <Marker key={act.id} position={[act.lat, act.lng]} icon={iconToUse}>
                <Popup>
                  <div className="font-sans space-y-2 p-1 min-w-[200px]">
                    <Badge className="bg-blue-700 text-white text-[10px]">{act.category || 'Tình nguyện'}</Badge>
                    <h3 className="font-bold text-sm text-slate-900 m-0 leading-tight">{act.title}</h3>
                    <p className="text-xs text-slate-600 m-0 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600 shrink-0" /> {act.location}
                    </p>
                    <div className="text-xs font-semibold text-blue-800 m-0 bg-blue-50 p-1.5 rounded flex items-center justify-between">
                      <span>Cần: {act.requiredVolunteers} chiến sĩ</span>
                      <span>Đã có: {act.registeredCount || 0}</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold h-8 mt-2"
                      onClick={() => window.open(`https://maps.google.com/?q=${act.lat},${act.lng}`, '_blank')}
                    >
                      <Navigation className="w-3.5 h-3.5 mr-1.5" /> Dẫn đường Google Maps
                    </Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {filteredActivities.length === 0 && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 px-5 py-3 rounded-xl border border-slate-200 shadow-md text-sm font-semibold text-slate-700">
              Không có hoạt động nào khớp bộ lọc
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

