import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Key, Copy, Check } from 'lucide-react';

const API_BASE = 'http://localhost:3000';

interface Invite {
  id: number;
  code: string;
  used: boolean;
  usedBy: number | null;
  usedByName: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function Invites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchInvites = () => {
    setLoading(true);
    axios.get(`${API_BASE}/invites`, { headers })
      .then(res => {
        setInvites(res.data.invites || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleGenerate = async () => {
    try {
      await axios.post(`${API_BASE}/invites`, {}, { headers });
      fetchInvites();
    } catch (err) {
      console.error(err);
      alert('生成邀请码失败，请重试。');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这个邀请码吗？删除后此邀请码将失效且无法被使用。')) return;

    try {
      await axios.delete(`${API_BASE}/invites/${id}`, { headers });
      fetchInvites();
    } catch (err) {
      console.error(err);
      alert('删除失败，可能该邀请码已被使用。');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
            邀请码管理
          </h1>
          <p className="text-[17px] text-[#7a7a7a] mt-2">
            生成一次性邀请码以允许家庭新成员注册。已被使用的邀请码不可被删除。
          </p>
        </div>

        <Button 
          onClick={handleGenerate}
          className="rounded-md bg-primary text-white hover:brightness-110 active:scale-95 transition-transform self-start"
        >
          <Plus className="w-5 h-5 mr-2" />
          生成邀请码
        </Button>
      </div>

      {/* Invites Area */}
      {loading ? (
        <div className="bg-[#f5f5f7] rounded-[18px] h-60 animate-pulse border border-[#e0e0e0]"></div>
      ) : invites.length === 0 ? (
        <div className="text-center py-20 bg-[#f5f5f7] border border-dashed border-[#e0e0e0] rounded-[18px] space-y-4">
          <Key className="w-12 h-12 text-[#7a7a7a] mx-auto opacity-50" />
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">暂无邀请码</h3>
            <p className="text-[14px] text-[#7a7a7a] mt-1">点击右上角“生成邀请码”以生成首个新成员注册密钥。</p>
          </div>
        </div>
      ) : (
        <Card className="border border-[#e0e0e0] rounded-[18px] overflow-hidden shadow-none bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#f5f5f7]">
                <TableRow className="border-[#e0e0e0] hover:bg-transparent">
                  <TableHead className="w-[120px] text-[#7a7a7a] font-semibold text-[14px] h-12 px-4">邀请码</TableHead>
                  <TableHead className="text-[#7a7a7a] font-semibold text-[14px] h-12">状态</TableHead>
                  <TableHead className="text-[#7a7a7a] font-semibold text-[14px] h-12">使用者</TableHead>
                  <TableHead className="hidden md:table-cell text-[#7a7a7a] font-semibold text-[14px] h-12">创建时间</TableHead>
                  <TableHead className="hidden md:table-cell text-[#7a7a7a] font-semibold text-[14px] h-12">使用时间</TableHead>
                  <TableHead className="text-right text-[#7a7a7a] font-semibold text-[14px] h-12 px-4">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id} className="border-[#e0e0e0] hover:bg-[#f5f5f7]/40 transition-colors">
                    <TableCell className="font-mono font-medium text-[15px] text-[#1d1d1f] h-14 px-4">
                      <div className="flex items-center gap-1.5">
                        <span>{invite.code}</span>
                        <button
                          onClick={() => copyToClipboard(invite.code)}
                          className="text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors"
                        >
                          {copiedCode === invite.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="h-14">
                      {invite.used ? (
                        <Badge variant="secondary" className="rounded-full bg-zinc-100 text-zinc-500 border-none font-normal text-[12px] px-2 py-0">
                          已使用
                        </Badge>
                      ) : (
                        <Badge className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-normal shadow-none hover:bg-emerald-50 text-[12px] px-2 py-0">
                          未使用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[14px] text-[#1d1d1f] h-14">
                      {invite.usedByName ? (
                        <span>{invite.usedByName}</span>
                      ) : (
                        <span className="text-[#cccccc]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[14px] text-[#7a7a7a] h-14">
                      {new Date(invite.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[14px] text-[#7a7a7a] h-14">
                      {invite.usedAt ? (
                        new Date(invite.usedAt).toLocaleString('zh-CN')
                      ) : (
                        <span className="text-[#cccccc]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right h-14 px-4">
                      {!invite.used ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(invite.id)}
                          className="rounded-md border-red-200 hover:bg-red-50 hover:border-red-400 group"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                        </Button>
                      ) : (
                        <span className="text-[12px] text-[#cccccc] px-1 select-none">锁定</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
