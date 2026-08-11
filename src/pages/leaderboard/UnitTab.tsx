import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getRankBadge } from './IndividualTab.tsx';

export default function UnitTab() {
  const [topUnits, setTopUnits] = useState<any[]>([]);
  const [sort, setSort] = useState<'total' | 'avg'>('total');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard/units?sort=${sort}`)
      .then(res => res.json())
      .then(data => {
        setTopUnits(data.topUnits || []);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [sort]);

  return (
    <div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSort('total')}
            aria-pressed={sort === 'total'}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] transition-colors ${
              sort === 'total' ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tổng điểm
          </button>
          <button
            onClick={() => setSort('avg')}
            aria-pressed={sort === 'avg'}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] transition-colors ${
              sort === 'avg' ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Điểm TB/người
          </button>
        </div>
        {sort === 'avg' && (
          <p className="text-[11px] text-slate-500 font-medium">
            Chỉ tính đơn vị có từ 3 TNV trở lên.
          </p>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Đang tải bảng xếp hạng...</div>
      ) : topUnits.length === 0 ? (
        <div className="p-8 text-center text-slate-500">Chưa có đơn vị nào đủ điều kiện xếp hạng.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {topUnits.map((u, idx) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={`p-4 flex items-center justify-between ${idx === 0 ? 'bg-amber-50/40' : ''}`}
            >
              <div className="flex items-center gap-4">
                {getRankBadge(idx)}
                <div>
                  <div className="font-bold text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">
                    {u.memberCount} TNV · {u.totalHours} giờ
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-blue-700 text-base">
                  {u.totalPoints} <span className="text-xs font-semibold text-slate-500">Điểm</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  TB {u.avgPoints} điểm/người
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
