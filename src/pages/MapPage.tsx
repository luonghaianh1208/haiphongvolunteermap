import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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

const DISTRICT_COORDS: Record<string, [number, number]> = {
  'Tất cả': DEFAULT_CENTER,
  'Hồng Bàng': [20.8667, 106.6833],
  'Ngô Quyền': [20.8491, 106.6895],
  'Lê Chân': [20.8430, 106.6780],
  'Hải An': [20.8522, 106.6995],
  'Thủy Nguyên': [20.9328, 106.6542],
  'Đồ Sơn': [20.7078, 106.7865],
  'Cát Hải': [20.7269, 107.0478],
};

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

export default function MapPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState('Tất cả');
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);

  useEffect(() => {
    fetch('/api/activities')
      .then(res => res.json())
      .then(data => setActivities(data))
      .catch(console.error);
  }, []);

  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrict(districtName);
    if (DISTRICT_COORDS[districtName]) {
      setCenter(DISTRICT_COORDS[districtName]);
    }
  };

  const filteredActivities = activities.filter(act => {
    if (selectedDistrict === 'Tất cả') return true;
    return act.location?.includes(selectedDistrict);
  });

  return (
    <div className="space-y-4">
      {/* Top Map Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-blue-950 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-700" /> Bản Đồ Số Tình Nguyện Hải Phòng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Giám sát các điểm hoạt động và điều phối lực lượng theo thời gian thực</p>
        </div>

        {/* District Selector & Legend */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            className="h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] flex-1 md:flex-none"
            value={selectedDistrict}
            onChange={(e) => handleDistrictChange(e.target.value)}
          >
            {Object.keys(DISTRICT_COORDS).map((d) => (
              <option key={d} value={d}>
                {d === 'Tất cả' ? 'Toàn Thành phố Hải Phòng' : `Địa bàn ${d}`}
              </option>
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
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={center} />

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
      </div>
    </div>
  );
}

