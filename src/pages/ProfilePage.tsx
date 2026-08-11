import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog.tsx';
import { ShieldCheck, UserCheck, Award, Clock, HeartHandshake, Edit3, FileBadge, Calendar, MapPin, Download, Printer, CheckCircle2, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, dbUser, syncProfile } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [unitOptions, setUnitOptions] = useState<{ id: number; name: string }[]>([]);

  // Profile Edit State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    unit: '',
    unitId: '' as string,
    skills: '',
    address: '',
    cccd: ''
  });

  useEffect(() => {
    if (dbUser) {
      setFormData({
        fullName: dbUser.fullName || '',
        phone: dbUser.phone || '',
        unit: dbUser.unit || '',
        unitId: dbUser.unitId ? String(dbUser.unitId) : '',
        skills: dbUser.skills || '',
        address: dbUser.address || '',
        cccd: dbUser.cccd || ''
      });
    }

    fetchMyActivities();
  }, [dbUser]);

  useEffect(() => {
    fetch('/api/units')
      .then(res => res.json())
      .then(data => setUnitOptions(data.units || []))
      .catch(console.error);
  }, []);

  const fetchMyActivities = () => {
    if (!user) return;
    user.getIdToken().then(token => {
      fetch('/api/user/my-activities', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMyActivities(data);
      })
      .catch(console.error);
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Cập nhật hồ sơ thành công!');
        setIsEditOpen(false);
        syncProfile();
      } else {
        toast.error('Lỗi khi lưu thông tin');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  if (!user) {
    return <div className="text-center py-12 text-slate-500 font-medium">Vui lòng đăng nhập để xem hồ sơ chiến sĩ.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-blue-600/30 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-blue-900 border-2 border-amber-300 shadow-md overflow-hidden shrink-0">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {dbUser?.fullName || user.displayName}
                </h1>
                {dbUser?.isVerified ? (
                  <Badge className="bg-amber-300 text-slate-950 font-bold hover:bg-amber-300 gap-1 border-none">
                    <ShieldCheck className="w-3.5 h-3.5" /> Đoàn Viên Đã Xác Minh
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300/40 text-amber-200 bg-white/10 text-xs">
                    Thành Viên
                  </Badge>
                )}
              </div>
              <p className="text-blue-200 text-xs sm:text-sm">{dbUser?.email || user.email}</p>
              <p className="text-amber-300 font-mono text-xs font-semibold">
                Mã TNV: {dbUser?.id ? `HP-TNV-${String(dbUser.id).padStart(5, '0')}` : 'HP-TNV-2026-001'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              className="bg-white/15 border-white/20 text-white hover:bg-white/25 rounded-xl text-xs font-bold min-h-[44px]"
            >
              <Edit3 className="w-4 h-4 mr-1.5" /> Cập nhật hồ sơ
            </Button>
            <Button
              onClick={() => setIsCertOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-xs min-h-[44px]"
            >
              <FileBadge className="w-4 h-4 mr-1.5" /> Giấy chứng nhận
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" /> Điểm uy tín
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600">{dbUser?.reputationPoints || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Đánh giá từ BTC chiến dịch</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" /> Giờ tình nguyện
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-600">{dbUser?.volunteerHours || 0}h</div>
              <p className="text-[11px] text-slate-400 mt-1">Tích lũy năm 2026</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-emerald-600" /> Hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600">{dbUser?.activitiesCount || 0}</div>
              <p className="text-[11px] text-slate-400 mt-1">Chiến dịch đã hoàn thành</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Profile Details */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" /> Thông Tin Hồ Sơ Tình Nguyện
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)} className="text-xs font-semibold text-blue-700">
            Chỉnh sửa
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Mã định danh TNV</span>
              <span className="font-semibold text-slate-900">{dbUser?.id ? `HP-TNV-${String(dbUser.id).padStart(5, '0')}` : 'Chưa cấp'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Đơn vị Đoàn trực thuộc</span>
              <span className="font-semibold text-slate-900">{dbUser?.unitName || 'Chưa chọn đơn vị'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Đơn vị học tập / công tác</span>
              <span className="font-semibold text-slate-900">{dbUser?.unit || 'Chưa cung cấp'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Số điện thoại liên hệ</span>
              <span className="font-semibold text-slate-900">{dbUser?.phone || 'Chưa cung cấp'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Số CCCD / Định danh</span>
              <span className="font-semibold text-slate-900">{dbUser?.cccd || 'Chưa cung cấp'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Kỹ năng & Chuyên môn</span>
              <span className="font-semibold text-slate-900">{dbUser?.skills || 'Chưa cập nhật'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Activities List */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Lịch Trình Chiến Dịch Đã Đăng Ký
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {myActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Đồng chí chưa đăng ký tham gia chiến dịch nào. Hãy chọn chiến dịch phù hợp tại trang <strong className="text-blue-700">Chiến Dịch</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              {myActivities.map((item) => (
                <div key={item.registrationId} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 border-none font-bold text-[10px]">
                        {item.activity.category || 'Chiến dịch'}
                      </Badge>
                      <span className="text-xs text-slate-400">Đăng ký ngày {new Date(item.registeredAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.activity.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {item.activity.location}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Đã xác nhận tham gia
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Cập Nhật Hồ Sơ Đoàn Viên</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Hoàn thiện thông tin cá nhân để phục vụ xác minh và ghi nhận thành tích cống hiến.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">Họ và Tên</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="rounded-xl h-10 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Số Điện Thoại</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-xl h-10 text-sm"
                  placeholder="0988..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cccd" className="text-xs font-bold text-slate-700">Số CCCD</Label>
                <Input
                  id="cccd"
                  value={formData.cccd}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                  className="rounded-xl h-10 text-sm"
                  placeholder="0310..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-xs font-bold text-slate-700">Đơn vị Học tập / Công tác</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="rounded-xl h-10 text-sm"
                placeholder="VD: Trường ĐH Hàng hải Việt Nam"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitId" className="text-xs font-bold text-slate-700">Đơn vị Đoàn trực thuộc</Label>
              <select
                id="unitId"
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="">— Chưa chọn đơn vị —</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
              {formData.unitId === '' && (
                <p className="text-[11px] text-amber-600 font-medium">
                  Chọn đơn vị Đoàn để được tính vào bảng xếp hạng đơn vị.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="skills" className="text-xs font-bold text-slate-700">Kỹ năng & Chuyên môn</Label>
              <Input
                id="skills"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="rounded-xl h-10 text-sm"
                placeholder="VD: Cứu hộ, Y tế, Dẫn chương trình, IT..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 rounded-xl min-h-[44px]">
                Hủy
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl min-h-[44px]">
                {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Digital Certificate Modal */}
      <Dialog open={isCertOpen} onOpenChange={setIsCertOpen}>
        <DialogContent className="max-w-2xl rounded-2xl bg-slate-900 text-white border-amber-400/40 p-6 sm:p-8">
          <div className="border-4 border-double border-amber-300 p-6 rounded-xl space-y-6 text-center relative bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
            {/* Stamp / Logo Header */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">
                ĐOÀN THIẾU NIÊN TIỀN PHONG & ĐOÀN TNCS HỒ CHÍ MINH THÀNH PHỐ HẢI PHÒNG
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase font-serif">
                GIẤY CHỨNG NHẬN CỐNG HIẾN
              </h2>
              <p className="text-xs text-blue-200 italic">Chiến Dịch Thanh Niên Tình Nguyện Hè 2026</p>
            </div>

            <div className="py-2 space-y-2">
              <p className="text-xs text-slate-300">Chứng nhận đồng chí:</p>
              <div className="text-2xl font-black text-amber-300 tracking-wide uppercase">
                {dbUser?.fullName || user.displayName}
              </div>
              <p className="text-xs text-slate-300 font-mono">
                Mã TNV: {dbUser?.id ? `HP-TNV-${String(dbUser.id).padStart(5, '0')}` : 'HP-TNV-2026-001'}
              </p>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed max-w-lg mx-auto">
              Đã có thành tích xuất sắc, tích cực tham gia các hoạt động xung kích, tình nguyện vì cộng đồng, góp phần xây dựng và phát triển Thành phố Hải Phòng văn minh, hiện đại.
            </p>

            <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
              <div>
                <span className="block text-[10px] text-slate-400">Tổng giờ đóng góp</span>
                <span className="font-bold text-amber-300 text-sm">{dbUser?.volunteerHours || 0} Giờ</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Điểm Uy Tín</span>
                <span className="font-bold text-emerald-400 text-sm">{dbUser?.reputationPoints || 0} Điểm</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">Chiến dịch hoàn thành</span>
                <span className="font-bold text-sky-300 text-sm">{dbUser?.activitiesCount || 0} Hoạt động</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs border-t border-white/10">
              <div className="text-left space-y-1">
                <QrCode className="w-12 h-12 text-amber-300 bg-white/10 p-1.5 rounded-lg border border-white/20" />
                <span className="text-[9px] text-slate-400 block font-mono">Xác thực số Hải Phòng</span>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] text-slate-400">Hải Phòng, ngày 21 tháng 07 năm 2026</p>
                <p className="font-bold text-amber-300 uppercase">TM. BAN THƯỜNG VỤ THÀNH ĐOÀN</p>
                <div className="w-16 h-16 bg-red-600/20 rounded-full border border-red-500/50 flex items-center justify-center text-[10px] text-red-300 font-bold ml-auto rotate-[-12deg]">
                  ĐÃ XÁC THỰC
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsCertOpen(false)} className="flex-1 bg-white/10 text-white hover:bg-white/20 rounded-xl border-white/20 min-h-[44px]">
              Đóng (Esc)
            </Button>
            <Button onClick={handlePrintCertificate} className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl min-h-[44px]">
              <Printer className="w-4 h-4 mr-1.5" /> In / Tải Bản Điện Tử
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


