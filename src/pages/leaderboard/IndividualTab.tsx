import { useEffect, useState } from 'react';
import { Trophy, Medal, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

/** Huy hiệu hạng, dùng chung cho cả hai tab */
export function getRankBadge(index: number) {
  if (index === 0) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 border border-amber-300 flex items-center justify-center font-bold shadow-sm"
      >
        <Trophy className="w-5 h-5 text-amber-500" />
      </motion.div>
    );
  }
  if (index === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 border border-slate-300 flex items-center justify-center font-bold shadow-sm">
        <Medal className="w-5 h-5 text-slate-400" />
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-900/10 text-amber-800 border border-amber-700/20 flex items-center justify-center font-bold shadow-sm">
        <Medal className="w-5 h-5 text-amber-700" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
      {index + 1}
    </div>
  );
}

export default function IndividualTab() {
  const [topVolunteers, setTopVolunteers] = useState<any[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ id: number; name: string }[]>([]);
  const [unitsError, setUnitsError] = useState(false);
  const [unitFilter, setUnitFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/units')
      .then(res => res.json())
      .then(data => setUnitOptions(data.units || []))
      .catch(err => {
        console.error(err);
        setUnitsError(true);
      });
  }, []);

  useEffect(() => {
    let huy = false;
    setLoading(true);
    const url = unitFilter === 'all' ? '/api/leaderboard' : `/api/leaderboard?unitId=${unitFilter}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (huy) return;
        setTopVolunteers(data.topVolunteers || []);
        setLoading(false);
      })
      .catch(err => {
        if (huy) return;
        console.error(err);
        setLoading(false);
      });
    return () => { huy = true; };
  }, [unitFilter]);

  return (
    <div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/40">
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          aria-label="Lọc theo đơn vị Đoàn"
          className="w-full sm:w-80 h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
        >
          <option value="all">Tất cả đơn vị</option>
          {unitOptions.map((u) => (
            <option key={u.id} value={String(u.id)}>{u.name}</option>
          ))}
        </select>
        {unitsError && (
          <p className="text-[11px] text-red-600 font-medium mt-1.5">
            Không tải được danh sách đơn vị. Vui lòng thử lại sau.
          </p>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Đang tải bảng xếp hạng...</div>
      ) : topVolunteers.length === 0 ? (
        <div className="p-8 text-center text-slate-500">Chưa có dữ liệu tình nguyện viên.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {topVolunteers.map((vol, idx) => (
            <motion.div
              key={vol.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              whileHover={{ backgroundColor: 'rgba(241, 245, 249, 0.9)', x: 2 }}
              className={`p-4 flex items-center justify-between transition-all ${idx === 0 ? 'bg-amber-50/40' : ''}`}
            >
              <div className="flex items-center gap-4">
                {getRankBadge(idx)}
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {vol.fullName || 'Đoàn viên chưa cập nhật tên'}
                    {vol.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-blue-600 fill-blue-600/20" />
                    )}
                  </div>
                  <div className={`text-xs ${vol.unitName ? 'text-slate-500' : 'text-slate-400 italic'}`}>
                    {vol.unitName || 'Chưa chọn đơn vị'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-blue-700 text-base">
                  {vol.reputationPoints || 0} <span className="text-xs font-semibold text-slate-500">Điểm</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {vol.volunteerHours || 0} Giờ tình nguyện
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
