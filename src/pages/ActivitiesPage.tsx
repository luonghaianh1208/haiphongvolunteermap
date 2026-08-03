import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog.tsx';
import { MapPin, Calendar, Users, Search, Filter, ExternalLink, CheckCircle, Sparkles, X, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth-context.tsx';
import { motion, AnimatePresence } from 'motion/react';

export default function ActivitiesPage() {
  const { user, dbUser, signIn } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedAct, setSelectedAct] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredIds, setRegisteredIds] = useState<number[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  // Keyboard Shortcuts Handler (/ to focus search, Esc to close modal or clear search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input/select/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (selectedAct) {
          setSelectedAct(null);
        } else if (search !== '') {
          setSearch('');
        } else if (selectedCategory !== 'Tất cả') {
          setSelectedCategory('Tất cả');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAct, search, selectedCategory]);

  const fetchActivities = () => {
    fetch('/api/activities')
      .then(res => res.json())
      .then(data => setActivities(data))
      .catch(err => {
        console.error(err);
        toast.error("Không thể tải danh sách hoạt động");
      });
  };

  const categories = ['Tất cả', 'Chuyển đổi số cộng đồng', 'An sinh xã hội', 'Môi trường', 'Hiến máu', 'Giáo dục', 'Ứng phó thiên tai'];

  const filteredActivities = activities.filter(act => {
    const matchesSearch = act.title?.toLowerCase().includes(search.toLowerCase()) ||
                          act.location?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Tất cả' || act.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleRegister = (activityId: number) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập trước khi đăng ký tham gia');
      signIn();
      return;
    }

    if (registeredIds.includes(activityId)) {
      toast.info('Đồng chí đã đăng ký tham gia chiến dịch này rồi!');
      return;
    }

    setIsRegistering(true);
    fetch(`/api/activities/${activityId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        setIsRegistering(false);
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.success('Đăng ký tham gia chiến dịch thành công! (+5 điểm uy tín)');
          setRegisteredIds(prev => [...prev, activityId]);
          setSelectedAct(null);
          fetchActivities();
        }
      })
      .catch(err => {
        setIsRegistering(false);
        console.error(err);
        toast.error('Có lỗi xảy ra khi đăng ký');
      });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-800 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-blue-600/30"
      >
        <div className="space-y-2">
          <Badge className="bg-amber-300 text-slate-950 font-bold hover:bg-amber-300 border-none">
            CHIẾN DỊCH TÌNH NGUYỆN HÈ 2026
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Danh Sách Hoạt Động & Chiến Dịch</h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-2xl font-normal leading-relaxed">
            Lựa chọn chiến dịch phù hợp với chuyên môn, đăng ký tham gia đóng góp sức trẻ và nhận điểm cống hiến Đoàn viên Hải Phòng.
          </p>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search Input with Shortcuts */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder="Tìm chiến dịch, địa điểm..."
            className="pl-10 pr-16 h-11 text-sm rounded-xl focus-visible:ring-2 focus-visible:ring-blue-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                toast.info(`Đã tìm kiếm: "${search}"`);
              }
            }}
          />
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Xoá tìm kiếm (Esc)"
              aria-label="Xoá tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:flex items-center gap-0.5 absolute right-3 top-3 text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <div className="flex gap-1.5 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-semibold px-3.5 py-2.5 rounded-xl whitespace-nowrap min-h-[40px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  selectedCategory === cat
                    ? 'bg-blue-700 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Grid */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-16 px-4 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 space-y-3"
            >
              <p className="font-semibold text-slate-700">Không tìm thấy hoạt động tình nguyện nào phù hợp.</p>
              <p className="text-xs text-slate-400">Thử xoá bộ lọc hoặc tìm kiếm theo địa bàn khác.</p>
              {(search || selectedCategory !== 'Tất cả') && (
                <Button 
                  onClick={() => { setSearch(''); setSelectedCategory('Tất cả'); }}
                  variant="outline"
                  className="rounded-xl text-xs font-semibold"
                >
                  Đặt lại tất cả bộ lọc
                </Button>
              )}
            </motion.div>
          ) : (
            filteredActivities.map((act, index) => {
              const isAlreadyRegistered = registeredIds.includes(act.id);
              return (
                <motion.div
                  key={act.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="overflow-hidden flex flex-col border-slate-200 shadow-2xs hover:shadow-md transition-all h-full rounded-2xl">
                    <div className="h-44 bg-slate-200 relative overflow-hidden">
                      <img
                        src={act.banner || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'}
                        alt={act.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-3 left-3 bg-blue-700 text-white font-semibold shadow-md">
                        {act.category || 'Hoạt động'}
                      </Badge>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                        {act.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 text-slate-500">
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
                        <span className="text-slate-500">Chỉ tiêu chiến sĩ:</span>
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {act.registeredCount || 0} / {act.requiredVolunteers}
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3 border-t border-slate-100 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedAct(act)}
                        className="flex-1 min-h-[44px] text-xs font-semibold rounded-xl focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        Xem chi tiết
                      </Button>
                      <Button
                        onClick={() => handleRegister(act.id)}
                        disabled={isAlreadyRegistered}
                        className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          isAlreadyRegistered 
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white' 
                            : 'bg-blue-700 hover:bg-blue-800 text-white'
                        }`}
                      >
                        {isAlreadyRegistered ? (
                          <span className="flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Đã đăng ký
                          </span>
                        ) : 'Đăng ký ngay'}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </AnimatePresence>

      {/* Activity Details Modal Dialog */}
      {selectedAct && (
        <Dialog open={!!selectedAct} onOpenChange={() => setSelectedAct(null)}>
          <DialogContent className="max-w-xl rounded-2xl">
            <DialogHeader>
              <Badge className="w-fit bg-blue-700 text-white mb-2">{selectedAct.category || 'Hoạt động'}</Badge>
              <DialogTitle className="text-lg font-bold text-slate-900">{selectedAct.title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Đăng bởi Ban Tổ Chức Đoàn Thanh Niên Hải Phòng • (Nhấn Esc để đóng)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm text-slate-700">
              <div className="h-48 rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={selectedAct.banner || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'}
                  alt={selectedAct.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">Địa điểm:</span> {selectedAct.location}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">Thời gian:</span> {new Date(selectedAct.timeStart).toLocaleString('vi-VN')}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold">Lực lượng:</span> Cần {selectedAct.requiredVolunteers} chiến sĩ (Đã đăng ký: {selectedAct.registeredCount || 0})
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase mb-1">Mô tả chi tiết nội dung</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedAct.description}</p>
              </div>

              {selectedAct.zaloLink && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-sky-900 font-semibold">Nhóm Zalo trao đổi thông tin BTC</span>
                  <a
                    href={selectedAct.zaloLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-700 hover:underline font-bold flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-sky-600 rounded p-1"
                  >
                    Tham gia Nhóm Zalo <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setSelectedAct(null)} className="flex-1 min-h-[44px] rounded-xl font-semibold">
                Đóng (Esc)
              </Button>
              <Button
                onClick={() => handleRegister(selectedAct.id)}
                disabled={isRegistering || registeredIds.includes(selectedAct.id)}
                className={`flex-1 min-h-[44px] rounded-xl font-bold ${
                  registeredIds.includes(selectedAct.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-700 hover:bg-blue-800 text-white'
                }`}
              >
                {registeredIds.includes(selectedAct.id) 
                  ? 'Đã đăng ký chiến dịch' 
                  : (isRegistering ? 'Đang xử lý...' : 'Xác Nhận Đăng Ký Tham Gia')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


