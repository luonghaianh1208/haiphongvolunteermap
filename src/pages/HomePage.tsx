import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buttonVariants, Button } from '../components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { ArrowRight, Map, Users, Shield, Zap, Award, Calendar, MapPin, Sparkles, CheckCircle2, Flame, HeartHandshake } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { motion } from 'motion/react';

export default function HomePage() {
  const [stats, setStats] = useState({ totalVolunteers: 1280, totalActivities: 24, totalHours: 4950, verifiedCount: 1040 });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);

    fetch('/api/activities')
      .then(res => res.json())
      .then(data => setActivities(data.slice(0, 3)))
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-12 pb-8">
      {/* Hero Section Softened Youth Union Theme */}
      <motion.section 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-800 text-white p-8 md:p-12 shadow-md overflow-hidden border border-blue-600/30"
      >
        <div className="absolute -top-10 -right-10 w-96 h-96 bg-sky-400/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/15 text-amber-300 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-sm shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            CHIẾN DỊCH THANH NIÊN TÌNH NGUYỆN HÈ 2026
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Nền Tảng Số & Điều Phối <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-sky-200 to-white">
              Thanh Niên Tình Nguyện Hải Phòng
            </span>
          </h1>

          <p className="text-blue-100 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
            Phát huy tinh thần xung kích của tuổi trẻ Đất Cảng: <strong>"Khát vọng - Sáng tạo - Cống hiến - Chuyển đổi số"</strong>. Tham gia chiến dịch, tích lũy điểm uy tín và ghi nhận đóng góp vì sự phát triển của Thành phố Hải Phòng.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/activities"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold shadow-sm px-6 rounded-2xl"
                )}
              >
                Đăng ký Chiến dịch <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/map"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold rounded-2xl backdrop-blur-sm"
                )}
              >
                <Map className="mr-2 w-5 h-5 text-sky-200" />
                Bản đồ GIS Địa bàn
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/rapid-response"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-xs rounded-2xl"
                )}
              >
                <Zap className="mr-1.5 w-4 h-4 fill-amber-300 text-amber-300" />
                Đội Phản ứng nhanh
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Real-time Ticker Statistics */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/15 text-center"
        >
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div className="text-2xl md:text-3xl font-extrabold text-amber-300">{stats.totalVolunteers.toLocaleString()}</div>
            <div className="text-xs text-blue-100 font-medium">Chiến sĩ TNV</div>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-300">{stats.totalHours.toLocaleString()}h</div>
            <div className="text-xs text-blue-100 font-medium">Giờ tình nguyện</div>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div className="text-2xl md:text-3xl font-extrabold text-sky-200">{stats.totalActivities}</div>
            <div className="text-xs text-blue-100 font-medium">Chiến dịch cấp TP</div>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div className="text-2xl md:text-3xl font-extrabold text-white">15/15</div>
            <div className="text-xs text-blue-100 font-medium">Quận/Huyện phủ sóng</div>
          </div>
        </motion.div>
      </motion.section>

      {/* Emergency Rapid Response Softened Banner */}
      <motion.section 
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-rose-50 border border-rose-200 text-slate-800 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-rose-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              Đội Xung Kích Phản Ứng Nhanh Khẩn Cấp Hải Phòng
            </h3>
            <p className="text-slate-600 text-xs">
              Sẵn sàng ứng phó thiên tai, bão lũ, tìm kiếm cứu hộ và điều tiết giao thông trọng điểm.
            </p>
          </div>
        </div>
        <Link
          to="/rapid-response"
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shrink-0 transition-colors shadow-2xs hover:shadow-xs active:scale-95"
        >
          Đăng ký Đội Phản Ứng Nhanh
        </Link>
      </motion.section>

      {/* Featured Campaigns Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-blue-950 tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500/20" />
              Chiến Dịch Tình Nguyện Trọng Điểm
            </h2>
            <p className="text-slate-500 text-sm">Các hoạt động do Thành Đoàn & Các Quận Đoàn phát động</p>
          </div>
          <Link to="/activities" className="text-blue-700 hover:text-blue-800 font-bold text-sm flex items-center gap-1 group">
            Xem tất cả ({stats.totalActivities}) <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activities.map((act, idx) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              whileHover={{ y: -4 }}
            >
              <Card className="overflow-hidden flex flex-col border-slate-200 shadow-2xs hover:shadow-md transition-all h-full">
                <div className="h-44 bg-slate-200 relative overflow-hidden">
                  <img src={act.banner || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'} alt={act.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <Badge className="absolute top-3 left-3 bg-blue-700 text-white font-semibold">
                    {act.category || 'Tình nguyện'}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                    {act.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {act.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{act.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{new Date(act.timeStart).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Chỉ tiêu: {act.requiredVolunteers} chiến sĩ</span>
                    <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      Đã tuyển {act.registeredCount || 0}/{act.requiredVolunteers}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t border-slate-100">
                  <Link to="/activities" className="w-full">
                    <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs">
                      Chi tiết & Đăng ký
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid md:grid-cols-3 gap-6 pt-4">
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white p-6 rounded-2xl shadow-2xs hover:shadow-md border border-slate-200 flex flex-col items-start space-y-3 transition-all"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-bold">
            <Map className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-blue-950">Bản Đồ Trực Quan GIS</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Theo dõi vị trí các điểm hoạt động trên 15 quận huyện Hải Phòng. Tích hợp dẫn đường Google Maps và điều phối khẩn cấp.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white p-6 rounded-2xl shadow-2xs hover:shadow-md border border-slate-200 flex flex-col items-start space-y-3 transition-all"
        >
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-blue-950">Bảng Xếp Hạng & Huy Hiệu</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Tích lũy điểm uy tín, nhận huy hiệu "Thủ Lĩnh Tình Nguyện", "TNV Nòng Cốt" và cấp Giấy chứng nhận Đoàn viên cấp Thành phố.
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white p-6 rounded-2xl shadow-2xs hover:shadow-md border border-slate-200 flex flex-col items-start space-y-3 transition-all"
        >
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-blue-950">Điểm Danh Thẻ QR Điện Tử</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Tạo thẻ chiến sĩ có mã QR độc bản (`HP-TNV-XXXX`). Tự động ghi nhận giờ cống hiến ngay sau khi BTC quét mã điểm danh.
          </p>
        </motion.div>
      </section>
    </div>
  );
}


