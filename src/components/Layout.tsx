import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.tsx';
import { Button } from './ui/button.tsx';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.tsx';
import { Map, List, LayoutDashboard, User as UserIcon, LogIn, LogOut, Award, Zap, QrCode, ShieldCheck, Home, Menu, X, Phone, Compass } from 'lucide-react';
import { Toaster } from './ui/sonner.tsx';
import { motion, AnimatePresence } from 'motion/react';

function Layout() {
  const { user, dbUser, signIn, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Trang chủ', icon: Home },
    { path: '/map', label: 'Bản đồ GIS', icon: Map },
    { path: '/activities', label: 'Hoạt động', icon: List },
    { path: '/rapid-response', label: 'Phản ứng nhanh', icon: Zap, badge: 'HOT' },
    { path: '/leaderboard', label: 'Bảng xếp hạng', icon: Award },
    { path: '/checkin', label: 'Mã QR Điểm danh', icon: QrCode },
  ];

  if (dbUser?.role === 'thanh_doan' || dbUser?.role === 'doan_co_so') {
    navItems.push({ path: '/dashboard', label: 'Quản trị Thành Đoàn', icon: LayoutDashboard, badge: 'ADMIN' });
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Banner Thanh Niên Hải Phòng */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-white tracking-wide">THÀNH ĐOÀN HẢI PHÒNG</span>
            <span className="hidden sm:inline text-slate-400">| Nền tảng số & Điều phối Thanh niên Tình nguyện 2026</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 font-medium">
            <a href="tel:02253842112" className="hidden md:flex items-center gap-1 hover:text-amber-300 transition-colors focus-visible:ring-2 focus-visible:ring-amber-300 rounded px-1">
              <Phone className="w-3 h-3 text-amber-400" /> 0225.3842.112
            </a>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-amber-300 font-semibold border border-slate-700">Hải Phòng</span>
          </div>
        </div>
      </div>

      {/* Main Youth Union Header */}
      <header className="sticky top-0 z-50 w-full bg-blue-700/95 backdrop-blur-md text-white shadow-sm border-b border-blue-600/50 transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700 rounded-xl p-1"
            aria-label="Trang chủ — Bản đồ số Thanh niên tình nguyện Hải Phòng"
          >
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 3 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0"
            >
              <span className="text-blue-700 font-black text-base tracking-tight">ĐOÀN</span>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white uppercase leading-tight group-hover:text-sky-200 transition-colors">
                TNV HẢI PHÒNG
              </span>
              <span className="text-[10px] text-blue-100 tracking-wider uppercase font-medium hidden sm:block truncate max-w-[240px]">
                Bản đồ số Thanh niên tình nguyện Hải Phòng
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium" aria-label="Menu chính">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-xl"
                >
                  <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                      isActive
                        ? 'bg-white/20 text-white font-bold shadow-xs backdrop-blur-xs'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-1 text-[10px] bg-amber-300 text-slate-900 px-1.5 py-0.5 rounded-full font-bold uppercase shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-300 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Mobile Toggle Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2 bg-blue-800/80 p-1.5 pr-2 sm:pr-3 rounded-2xl border border-blue-500/50">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-amber-300 rounded-xl p-0.5"
                  aria-label="Xem hồ sơ"
                >
                  <Avatar className="w-8 h-8 border-2 border-amber-300 group-hover:scale-105 transition-transform">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback className="bg-blue-800 text-white font-bold"><UserIcon className="w-4 h-4"/></AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-bold text-xs text-white leading-tight flex items-center gap-1">
                      {dbUser?.fullName || user.displayName || 'TNV Hải Phòng'}
                      {dbUser?.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-200 fill-sky-200/20" title="Đoàn viên xác minh" />
                      )}
                    </span>
                    <span className="text-[10px] text-amber-200 font-semibold">
                      {dbUser?.reputationPoints || 0} Uy tín • {dbUser?.volunteerHours || 0}h
                    </span>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={signOut}
                  className="text-blue-100 hover:text-white hover:bg-blue-600 rounded-lg min-h-[36px] min-w-[36px] focus-visible:ring-2 focus-visible:ring-white"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={signIn} 
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-sm rounded-xl h-10 px-4 text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-white"
                >
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Đăng nhập
                </Button>
              </motion.div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white hover:bg-blue-600/80 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu di động'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Slide-Out Navigation Sheet */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden bg-blue-900 border-t border-blue-600/60 overflow-hidden shadow-lg"
            >
              <div className="p-4 space-y-2">
                <div className="text-[10px] uppercase font-bold text-blue-300 tracking-wider px-3 pb-1 border-b border-blue-800">
                  Menu Điều Hướng (Nhấn Esc để đóng)
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl min-h-[44px] text-sm font-semibold transition-all ${
                        isActive 
                          ? 'bg-amber-300 text-slate-950 font-bold shadow-xs' 
                          : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold uppercase">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area with Route Transition */}
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Thanh Niên Hải Phòng */}
      <footer className="bg-slate-900 text-slate-300 text-sm border-t border-slate-800 mt-12 py-8">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              THÀNH ĐOÀN HẢI PHÒNG
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Cổng thông tin và Bản đồ số điều phối lực lượng Thanh niên tình nguyện Thành phố Hải Phòng. Phát huy tinh thần xung kích, sáng tạo của tuổi trẻ Đất Cảng.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider">Liên kết nhanh</h5>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><Link to="/map" className="hover:text-blue-400 transition-colors focus-visible:underline">Bản đồ số địa bàn tình nguyện</Link></li>
              <li><Link to="/activities" className="hover:text-blue-400 transition-colors focus-visible:underline">Danh sách các Chiến dịch Tình nguyện Hè</Link></li>
              <li><Link to="/rapid-response" className="hover:text-blue-400 transition-colors focus-visible:underline">Đăng ký Đội Phản ứng nhanh Khẩn cấp</Link></li>
              <li><Link to="/leaderboard" className="hover:text-blue-400 transition-colors focus-visible:underline">Bảng xếp hạng TNV & Đơn vị Đoàn</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider">Thông tin liên hệ</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Địa chỉ: Số 22 Minh Khai, Hồng Bàng, Hải Phòng<br />
              Điện thoại: (0225) 3842 112 • Email: thanhdoanhp@haiphong.gov.vn<br />
              Bản quyền © 2026 Thành Đoàn Hải Phòng. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </footer>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default Layout;

