import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Award, Trophy, Medal, Star, Flame, ShieldCheck, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function LeaderboardPage() {
  const [topVolunteers, setTopVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setTopVolunteers(data.topVolunteers || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getRankBadge = (index: number) => {
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
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-800 text-white rounded-2xl p-8 shadow-sm border border-blue-600/30"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-white/20">
              <Award className="w-4 h-4" /> Bảng Vinh Danh Thanh Niên Hải Phòng
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Bảng Xếp Hạng Tình Nguyện Viên Nòng Cốt
            </h1>
            <p className="text-blue-100 text-sm max-w-xl font-normal">
              Ghi nhận và tôn vinh những chiến sĩ tình nguyện xuất sắc, tích cực tham gia các phong trào xung kích, cống hiến sức trẻ xây dựng Hải Phòng văn minh, hiện đại.
            </p>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl border border-white/15 flex items-center gap-4 backdrop-blur-sm">
            <div className="p-3 bg-amber-400/20 text-amber-300 rounded-xl">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="text-xs text-blue-100 uppercase font-medium">Hệ thống tính điểm</div>
              <div className="text-sm font-bold text-white">+5đ Đăng ký • +20đ Tham gia</div>
              <div className="text-xs text-emerald-300 font-medium">+30đ Hoàn thành xuất sắc</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Leaderboard Table */}
        <Card className="md:col-span-2 border-slate-200 shadow-2xs">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between text-blue-900">
              <span>Top Chiến Sĩ Tình Nguyện</span>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                Thành phố Hải Phòng
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                    className={`p-4 flex items-center justify-between transition-all ${
                      idx === 0 ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {getRankBadge(idx)}
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {vol.fullName || 'Đoàn viên chưa cập nhật tên'}
                          {vol.isVerified && (
                            <ShieldCheck className="w-4 h-4 text-blue-600 fill-blue-600/20" title="Đoàn viên đã xác minh" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {vol.unionUnit || 'Đoàn cơ sở Hải Phòng'}
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
          </CardContent>
        </Card>

        {/* Badges & Criteria */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-3">
              <CardTitle className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Danh Hiệu Đoàn Viên
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <motion.div whileHover={{ x: 2 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  🥇
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Thủ Lĩnh Tình Nguyện</div>
                  <div className="text-[11px] text-slate-500">Đạt trên 500 điểm uy tín & 100 giờ tình nguyện</div>
                </div>
              </motion.div>
              <motion.div whileHover={{ x: 2 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  🥈
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">TNV Nòng Cốt</div>
                  <div className="text-[11px] text-slate-500">Đạt trên 200 điểm uy tín & 40 giờ tình nguyện</div>
                </div>
              </motion.div>
              <motion.div whileHover={{ x: 2 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  🥉
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">TNV Tích Cực</div>
                  <div className="text-[11px] text-slate-500">Tham gia tối thiểu 5 chiến dịch cộng đồng</div>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900 to-slate-900 text-white border-none shadow-xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <UserCheck className="w-4 h-4" /> Xác Minh Đoàn Viên
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                Chiến sĩ tình nguyện cập nhật đầy đủ mã CCCD và Đơn vị Đoàn để nhận "Tick Xanh Đoàn Viên" và ưu tiên duyệt tham gia các chiến dịch cấp Thành phố.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

