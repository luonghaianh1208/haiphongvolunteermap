import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Zap, AlertTriangle, ShieldCheck, PhoneCall, BellRing, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth-context.tsx';
import { motion, AnimatePresence } from 'motion/react';

export default function RapidResponsePage() {
  const { user, dbUser, signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Hồng Bàng');
  const [skill, setSkill] = useState('Bơi lội & Cứu hộ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập trước khi đăng ký');
      signIn();
      return;
    }

    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại khẩn cấp');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setRegistered(true);
      toast.success('Đã đăng ký gia nhập Đội Phản Ứng Nhanh Hải Phòng!');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Alert Header Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-rose-600 via-rose-700 to-slate-800 text-white p-8 rounded-2xl shadow-sm relative overflow-hidden"
      >
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-amber-300">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" /> ĐỘI XUNG KÍCH PHẢN ỨNG NHANH KHẨN CẤP
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Thanh Niên Tình Nguyện Phản Ứng Nhanh Hải Phòng
          </h1>
          <p className="text-rose-100 text-sm max-w-2xl leading-relaxed font-normal">
            Sẵn sàng huy động lực lượng trong vòng 60 phút hỗ trợ ứng phó thiên tai, bão lũ, phòng chống dịch bệnh, tìm kiếm cứu hộ cứu nạn và điều tiết giao thông trọng điểm trên địa bàn Thành phố.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rapid Response Registration Form */}
        <Card className="md:col-span-2 border-slate-200 shadow-2xs">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Đăng Ký Gia Nhập Đội Xung Kích Khẩn Cấp
            </CardTitle>
            <CardDescription className="text-xs">
              Yêu cầu tính kỷ luật cao, tinh thần trách nhiệm và có khả năng tham gia trực tiếp khi có lệnh điều động khẩn.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {registered ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Đã Đăng Ký Thành Công!</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Cảm ơn đồng chí! Thông tin của bạn đã được lưu vào hệ thống cơ sở dữ liệu Phản ứng nhanh của Thành Đoàn Hải Phòng. Khi có lệnh huy động khẩn, Thành Đoàn sẽ nhắn tin và gọi điện trực tiếp.
                  </p>
                  <Button variant="outline" onClick={() => setRegistered(false)} className="mt-2 rounded-xl text-xs font-semibold">
                    Cập nhật lại thông tin
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại liên lạc khẩn cấp (Hotline 24/7)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="VD: 0988 123 456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-xl h-11 text-sm focus-visible:ring-2 focus-visible:ring-rose-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="district">Địa bàn thường trú tại Hải Phòng</Label>
                      <select
                        id="district"
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                      >
                        <option value="Hồng Bàng">Quận Hồng Bàng</option>
                        <option value="Ngô Quyền">Quận Ngô Quyền</option>
                        <option value="Lê Chân">Quận Lê Chân</option>
                        <option value="Hải An">Quận Hải An</option>
                        <option value="Kiến An">Quận Kiến An</option>
                        <option value="Đồ Sơn">Quận Đồ Sơn</option>
                        <option value="Dương Kinh">Quận Dương Kinh</option>
                        <option value="Thủy Nguyên">Huyện Thủy Nguyên</option>
                        <option value="An Dương">Huyện An Dương</option>
                        <option value="Cát Hải">Huyện Cát Hải</option>
                        <option value="Kiến Thụy">Huyện Kiến Thụy</option>
                        <option value="Tiên Lãng">Huyện Tiên Lãng</option>
                        <option value="Vĩnh Bảo">Huyện Vĩnh Bảo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skill">Kỹ năng đặc thù / Chuyên môn</Label>
                      <select
                        id="skill"
                        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                      >
                        <option value="Bơi lội & Cứu hộ">Bơi lội & Cứu hộ đường thủy</option>
                        <option value="Sơ cấp cứu Y tế">Sơ cấp cứu y tế / Điều dưỡng</option>
                        <option value="Lái xe & Vận tải">Lái xe cứu hộ & Vận tải</option>
                        <option value="Truyền thông & Công nghệ">Sử dụng Flycam / Truyền thông khẩn</option>
                        <option value="Sức khỏe & Lao động">Thể lực tốt & Bốc xếp vật tư</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Cam kết tinh thần tình nguyện
                    </div>
                    <div>
                      Tôi cam kết sẵn sàng chấp hành lệnh điều phối của Ban Chỉ đạo Thành Đoàn Hải Phòng khi phát sinh tình huống thiên tai hoặc sự cố khẩn cấp trên địa bàn.
                    </div>
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full bg-rose-600 hover:bg-rose-700 font-bold min-h-[44px] h-11 text-sm rounded-xl shadow-xs focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      {isSubmitting ? 'Đang gửi thông tin...' : 'Xác Nhận Đăng Ký Đội Phản Ứng Nhanh'}
                    </Button>
                  </motion.div>

                </form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Emergency Info Sidebar */}
        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <PhoneCall className="w-4 h-4" /> Đường Dây Nóng Khẩn Cấp
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-800 rounded-xl">
                <div className="text-slate-400">Ban Thường vụ Thành Đoàn HP</div>
                <div className="text-lg font-bold text-emerald-400">0225.3842.112</div>
              </div>
              <div className="p-3 bg-slate-800 rounded-xl">
                <div className="text-slate-400">Cứu nạn cứu hộ HP (114)</div>
                <div className="text-lg font-bold text-rose-400">114</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <BellRing className="w-4 h-4 text-blue-600" /> Quy Trình Báo Động Khẩn
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Thành Đoàn phát tín hiệu cảnh báo trên cổng hệ thống & SMS.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>TNV phản ứng nhanh điểm danh và tập trung tại địa điểm chỉ định trong 60 phút.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Trang bị bảo hộ và thực hiện nhiệm vụ dưới sự chỉ đạo của Thành Đoàn.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

