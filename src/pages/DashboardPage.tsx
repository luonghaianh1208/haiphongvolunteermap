import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog.tsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, CheckCircle, Clock, ShieldAlert, BarChart3, Plus, Check, X, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../lib/auth-context.tsx';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, dbUser } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for creating activity
  const [newAct, setNewAct] = useState({
    title: '',
    description: '',
    location: '',
    category: 'Môi trường',
    requiredVolunteers: '20',
    timeStart: '2026-08-01T08:00',
    timeEnd: '2026-08-01T17:00',
    zaloLink: 'https://zalo.me/g/haiphong2026',
    lat: '20.8449',
    lng: '106.6881'
  });

  const statsChartData = [
    { name: 'Thg 1', act: 40, tnv: 240 },
    { name: 'Thg 2', act: 30, tnv: 139 },
    { name: 'Thg 3', act: 20, tnv: 980 },
    { name: 'Thg 4', act: 27, tnv: 390 },
    { name: 'Thg 5', act: 18, tnv: 480 },
    { name: 'Thg 6', act: 23, tnv: 380 },
    { name: 'Thg 7', act: 34, tnv: 430 },
  ];

  useEffect(() => {
    fetchActivities();
  }, [user]);

  const fetchActivities = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    fetch('/api/activities?status=all', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setActivities(data);
      })
      .catch(console.error);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo chiến dịch');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newAct)
      });

      if (res.ok) {
        toast.success('Tạo chiến dịch mới thành công!');
        setIsCreateOpen(false);
        fetchActivities();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Tạo chiến dịch thất bại');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (activityId: number, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/activities/${activityId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        toast.success(status === 'approved' ? 'Đã phê duyệt chiến dịch' : 'Đã từ chối chiến dịch');
        fetchActivities();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (dbUser?.role !== 'thanh_doan' && dbUser?.role !== 'doan_co_so') {
    return (
      <div className="p-12 text-center text-slate-500 font-medium max-w-md mx-auto space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Quyền Truy Cập Hạn Chế</h2>
        <p className="text-xs text-slate-500">Bảng điều khiển này dành riêng cho Cán bộ Thành Đoàn và Đoàn cơ sở Hải Phòng.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-blue-600/30"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2 border border-white/20">
              <BarChart3 className="w-3.5 h-3.5" /> Trung Tâm Điều Hành Số
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bảng Điều Khiển Quản Lý Tình Nguyện
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              Thống kê trực quan dữ liệu thanh niên, chiến dịch và giờ đóng góp toàn thành phố Hải Phòng.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs min-h-[44px] shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Tạo Chiến Dịch Mới
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng TNV Ghi Nhận</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">12,345</div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">+18% so với tháng trước</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chiến Dịch Khởi Tạo</CardTitle>
              <FileText className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{activities.length}</div>
              <p className="text-xs text-blue-600 font-semibold mt-1">Chiến dịch trực tuyến</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỉ Lệ Tham Gia thực tế</CardTitle>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">89%</div>
              <p className="text-xs text-slate-500 font-medium mt-1">Đánh giá theo mã QR điểm danh</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -2 }}>
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Giờ Đóng Góp</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">45,670h</div>
              <p className="text-xs text-amber-600 font-semibold mt-1">+2,400 giờ so với tháng trước</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">Biểu Đồ Tăng Trưởng Tình Nguyện Viên Theo Tháng</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px] p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statsChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
              <RechartsTooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'}} />
              <Bar dataKey="tnv" fill="#1d4ed8" radius={[6, 6, 0, 0]} name="Số TNV Tham gia" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Management Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Danh Sách & Phê Duyệt Chiến Dịch Đoàn</CardTitle>
          <Badge variant="outline" className="text-xs font-semibold">
            {activities.length} Chiến dịch
          </Badge>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold">
                <th className="p-4">Tên Chiến Dịch</th>
                <th className="p-4">Danh Mục</th>
                <th className="p-4">Địa Điểm</th>
                <th className="p-4">Chỉ Tiêu</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900 max-w-xs truncate">{act.title}</td>
                  <td className="p-4 text-slate-600">{act.category || 'Môi trường'}</td>
                  <td className="p-4 text-slate-600 max-w-xs truncate">{act.location}</td>
                  <td className="p-4 font-semibold text-slate-800">{act.registeredCount || 0} / {act.requiredVolunteers}</td>
                  <td className="p-4">
                    {act.status === 'approved' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">Đã Duyệt</Badge>
                    ) : act.status === 'rejected' ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">Từ Chối</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">Chờ Duyệt</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-1">
                    {dbUser?.role === 'thanh_doan' && act.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(act.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-[11px] px-2.5 rounded-lg"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(act.id, 'rejected')}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 text-[11px] px-2.5 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Từ chối
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Activity Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Tạo Chiến Dịch Tình Nguyện Mới</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Khởi tạo chương trình mới để tuyển TNV và ghi nhận giờ hoạt động.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateActivity} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold text-slate-700">Tên Chiến Dịch</Label>
              <Input
                id="title"
                value={newAct.title}
                onChange={(e) => setNewAct({ ...newAct, title: e.target.value })}
                placeholder="VD: Chiến dịch Làm Sạch Biển Đồ Sơn 2026"
                className="rounded-xl h-10 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold text-slate-700">Danh Mục</Label>
                <select
                  id="category"
                  value={newAct.category}
                  onChange={(e) => setNewAct({ ...newAct, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                >
                  <option value="Môi trường">Môi trường</option>
                  <option value="An sinh xã hội">An sinh xã hội</option>
                  <option value="Tiếp sức mùa thi">Tiếp sức mùa thi</option>
                  <option value="Hiến máu nhân đạo">Hiến máu nhân đạo</option>
                  <option value="Phản ứng nhanh">Phản ứng nhanh</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="requiredVolunteers" className="text-xs font-bold text-slate-700">Chỉ Tiêu Tuyển (TNV)</Label>
                <Input
                  id="requiredVolunteers"
                  type="number"
                  value={newAct.requiredVolunteers}
                  onChange={(e) => setNewAct({ ...newAct, requiredVolunteers: e.target.value })}
                  className="rounded-xl h-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-bold text-slate-700">Địa Điểm Tổ Chức</Label>
              <Input
                id="location"
                value={newAct.location}
                onChange={(e) => setNewAct({ ...newAct, location: e.target.value })}
                placeholder="VD: Khu du lịch Đồ Sơn, Hải Phòng"
                className="rounded-xl h-10 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="timeStart" className="text-xs font-bold text-slate-700">Bắt Đầu</Label>
                <Input
                  id="timeStart"
                  type="datetime-local"
                  value={newAct.timeStart}
                  onChange={(e) => setNewAct({ ...newAct, timeStart: e.target.value })}
                  className="rounded-xl h-10 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeEnd" className="text-xs font-bold text-slate-700">Kết Thúc</Label>
                <Input
                  id="timeEnd"
                  type="datetime-local"
                  value={newAct.timeEnd}
                  onChange={(e) => setNewAct({ ...newAct, timeEnd: e.target.value })}
                  className="rounded-xl h-10 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-700">Mô Tả Chi Tiết</Label>
              <textarea
                id="description"
                rows={3}
                value={newAct.description}
                onChange={(e) => setNewAct({ ...newAct, description: e.target.value })}
                placeholder="Nội dung công việc, quyền lợi chiến sĩ..."
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1 rounded-xl min-h-[44px]">
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl min-h-[44px]">
                {isSubmitting ? 'Đang gửi...' : 'Khởi Tạo Chiến Dịch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


