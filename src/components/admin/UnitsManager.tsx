import { useEffect, useState, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Input } from '../ui/input.tsx';
import { Badge } from '../ui/badge.tsx';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../lib/auth-context.tsx';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, string> = {
  dia_ban: 'Địa bàn',
  truong_hoc: 'Trường học',
  doanh_nghiep: 'Doanh nghiệp',
  luc_luong_vu_trang: 'Lực lượng vũ trang',
};

export default function UnitsManager() {
  const { user } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('dia_ban');
  const [busy, setBusy] = useState(false);

  const fetchUnits = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/units?includeInactive=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUnits(data.units || []);
  };

  useEffect(() => { fetchUnits(); }, [user]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || newName.trim() === '') return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      if (res.ok) {
        toast.success('Đã thêm đơn vị mới');
        setNewName('');
        fetchUnits();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Thêm đơn vị thất bại');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (unit: any) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !unit.isActive }),
    });
    if (res.ok) {
      toast.success(unit.isActive ? 'Đã ẩn đơn vị' : 'Đã hiện lại đơn vị');
      fetchUnits();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Cập nhật thất bại');
    }
  };

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-900">
          Quản Lý Đơn Vị Đoàn ({units.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleCreate} className="p-4 flex flex-col sm:flex-row gap-2 border-b border-slate-100">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên đơn vị mới, VD: Đoàn trường ĐH Hàng hải"
            className="rounded-xl h-10 text-sm flex-1"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            aria-label="Loại đơn vị"
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white font-medium"
          >
            {Object.entries(TYPE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <Button type="submit" disabled={busy} className="bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl min-h-[40px]">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm
          </Button>
        </form>

        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
          {units.map((u) => (
            <div key={u.id} className={`p-3 flex items-center justify-between gap-3 ${u.isActive ? '' : 'bg-slate-50/60'}`}>
              <div className="min-w-0">
                <div className={`text-sm font-semibold truncate ${u.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {u.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {TYPE_LABELS[u.type] || u.type} · {u.memberCount} TNV
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!u.isActive && <Badge variant="outline" className="text-[10px] text-slate-500">Đã ẩn</Badge>}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggle(u)}
                  className="h-8 text-[11px] px-2.5 rounded-lg"
                  aria-label={u.isActive ? `Ẩn ${u.name}` : `Hiện lại ${u.name}`}
                >
                  {u.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
