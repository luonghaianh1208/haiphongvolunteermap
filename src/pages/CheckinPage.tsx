import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { QrCode, Scan, ShieldCheck, CheckCircle2, User, Sparkles, Award, Copy, Check } from 'lucide-react';
import { useAuth } from '../lib/auth-context.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function CheckinPage() {
  const { user, dbUser, signIn } = useAuth();
  const [scannedCode, setScannedCode] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const tnvCode = `HP-TNV-${dbUser?.id || '2026'}-${(dbUser?.fullName || 'DOANVIEN').replace(/\s+/g, '').toUpperCase()}`;

  // Keyboard shortcut for Escape to dismiss scan result
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && scanResult) {
        setScanResult(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanResult]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tnvCode);
    setCopied(true);
    toast.success('Đã sao chép mã ID Chiến sĩ Tình nguyện');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        success: true,
        tnvName: dbUser?.fullName || 'Nguyễn Văn An',
        activityTitle: 'Chiến dịch Mùa Hè Xanh 2026 - Thủy Nguyên',
        time: new Date().toLocaleTimeString('vi-VN'),
        reputationAdded: 20,
        hoursAdded: 4
      });
      toast.success('Điểm danh thành công!');
    }, 1200);
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
          <QrCode className="w-4 h-4" /> Thẻ Chiến Sĩ & Hệ Thống Điểm Danh Số
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Thẻ Điện Tử & Điểm Danh Hoạt Động
        </h1>
        <p className="text-slate-600 text-sm max-w-lg mx-auto">
          Mã QR xác thực chính chủ dành cho tình nguyện viên Hải Phòng. BTC sử dụng máy quét để quét thẻ và tự động ghi nhận giờ tình nguyện.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Digital Member Badge Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -2 }}
        >
          <Card className="bg-gradient-to-br from-blue-700 via-blue-800 to-slate-800 text-white border-blue-600/30 shadow-md overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>
            <CardHeader className="border-b border-blue-700/60 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white text-blue-800 font-black flex items-center justify-center text-xs">
                    ĐOÀN
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">THÀNH ĐOÀN HẢI PHÒNG</div>
                    <div className="text-[10px] text-amber-300">THẺ CHIẾN SĨ TÌNH NGUYỆN SỐ 2026</div>
                  </div>
                </div>
                <Badge className="bg-amber-300 text-slate-950 font-bold hover:bg-amber-300 border-none">
                  XÁC MINH
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {user ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-blue-700 border-2 border-amber-400 flex items-center justify-center text-2xl font-bold overflow-hidden shadow-xs shrink-0">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="TNV Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white flex items-center gap-1.5">
                          {dbUser?.fullName || user.displayName || 'TNV Hải Phòng'}
                          <ShieldCheck className="w-4 h-4 text-sky-300 fill-sky-300/20" />
                        </h3>
                        <p className="text-xs text-blue-200">
                          {dbUser?.unitName || 'Đoàn Thanh Niên Hải Phòng'}
                        </p>
                        <p className="text-xs text-amber-300 font-mono mt-1 font-bold">
                          Mã ID: {tnvCode}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:ring-2 focus-visible:ring-amber-300 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Sao chép mã TNV"
                      aria-label="Sao chép mã ID chiến sĩ"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Simulated Visual QR Box */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-4 rounded-2xl max-w-[200px] mx-auto text-slate-900 text-center shadow-inner space-y-2 border border-slate-100"
                  >
                    <div className="w-36 h-36 mx-auto bg-slate-900 rounded-xl p-2 flex items-center justify-center text-white relative overflow-hidden">
                      <QrCode className="w-28 h-28 text-white" />
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none"></div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      QUÉT ĐỂ ĐIỂM DANH
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-blue-900/60 p-3 rounded-xl border border-blue-700/60">
                    <div>
                      <div className="text-blue-300 text-[10px]">Điểm uy tín</div>
                      <div className="font-bold text-amber-300">{dbUser?.reputationPoints || 0}</div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-[10px]">Giờ tích lũy</div>
                      <div className="font-bold text-emerald-400">{dbUser?.volunteerHours || 0}h</div>
                    </div>
                    <div>
                      <div className="text-blue-300 text-[10px]">Hoạt động</div>
                      <div className="font-bold text-sky-300">{dbUser?.activitiesCount || 0}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-blue-200">Vui lòng đăng nhập để nhận Thẻ Chiến sĩ Tình nguyện Điện tử.</p>
                  <Button onClick={signIn} className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold">
                    Đăng Nhập Ngay
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Organizer QR Scanner Tool */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scan className="w-5 h-5 text-blue-600" />
              Công Cụ Quét Điểm Danh (Dành Cho BTC)
            </CardTitle>
            <CardDescription className="text-xs">
              BTC sử dụng camera hoặc trình mô phỏng để quét mã QR thẻ chiến sĩ khi tham gia sự kiện.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="border-2 border-dashed border-blue-300 bg-blue-50/50 p-8 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <Scan className={`w-8 h-8 ${isScanning ? 'animate-spin text-blue-700' : ''}`} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Trình Quét Camera Điểm Danh</h4>
                <p className="text-xs text-slate-500">Đang hoạt động trên trình duyệt</p>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="bg-blue-700 hover:bg-blue-800 font-bold shadow-xs rounded-xl min-h-[44px] px-6 text-sm focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {isScanning ? 'Đang đọc mã QR...' : 'Thử Quét Thẻ Tình Nguyện Viên'}
                </Button>
              </motion.div>

            </div>

            <AnimatePresence>
              {scanResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Ghi Nhận Điểm Danh Thành Công!
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <div><strong>Chiến sĩ:</strong> {scanResult.tnvName}</div>
                    <div><strong>Hoạt động:</strong> {scanResult.activityTitle}</div>
                    <div><strong>Thời gian:</strong> {scanResult.time}</div>
                  </div>
                  <div className="flex gap-2 text-xs pt-1">
                    <span className="bg-emerald-200/60 text-emerald-900 px-2.5 py-1 rounded-lg font-semibold">
                      +{scanResult.reputationAdded} Điểm uy tín
                    </span>
                    <span className="bg-blue-200/60 text-blue-900 px-2.5 py-1 rounded-lg font-semibold">
                      +{scanResult.hoursAdded} Giờ tình nguyện
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

