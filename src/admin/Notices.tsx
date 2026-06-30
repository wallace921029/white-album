import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Pin, PinOff, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const API_BASE = 'http://localhost:3000';

interface Notice {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  read: boolean;
  readBy: { id: number; displayName: string }[];
}

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog open/close triggers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);

  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchNotices = () => {
    setLoading(true);
    axios.get(`${API_BASE}/notices`, { headers })
      .then(res => {
        setNotices(res.data.notices || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await axios.post(`${API_BASE}/notices`, {
        title,
        content,
        pinned,
      }, { headers });

      setIsCreateOpen(false);
      setTitle('');
      setContent('');
      setPinned(false);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('创建失败，请重试。');
    }
  };

  const openEditDialog = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setPinned(notice.pinned);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !title.trim()) return;

    try {
      await axios.patch(`${API_BASE}/notices/${editingNotice.id}`, {
        title,
        content,
        pinned,
      }, { headers });

      setIsEditOpen(false);
      setEditingNotice(null);
      setTitle('');
      setContent('');
      setPinned(false);
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('修改失败，请重试。');
    }
  };

  const handleTogglePin = async (notice: Notice) => {
    try {
      await axios.patch(`${API_BASE}/notices/${notice.id}`, {
        pinned: !notice.pinned,
      }, { headers });
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('操作失败，请重试。');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除这条通知吗？删除后前台页面将不再显示此通知。')) return;

    try {
      await axios.delete(`${API_BASE}/notices/${id}`, { headers });
      fetchNotices();
    } catch (err) {
      console.error(err);
      alert('删除失败，请重试。');
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
            通知管理
          </h1>
          <p className="text-[17px] text-[#7a7a7a] mt-2">
            发布、置顶或归档家庭公共通知。置顶通知将在前台高亮展示。
          </p>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-md bg-primary text-white hover:brightness-110 active:scale-95 transition-transform self-start">
              <Plus className="w-5 h-5 mr-2" />
              新建通知
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] rounded-[18px]">
            <DialogHeader>
              <DialogTitle className="text-[22px] font-semibold text-[#1d1d1f]">新建通知</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[15px] font-medium text-[#1d1d1f]">
                  标题
                </Label>
                <Input
                  id="title"
                  placeholder="输入通知标题（如：周末家庭聚餐）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl border-[#e0e0e0] focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-[15px] font-medium text-[#1d1d1f]">
                  正文内容
                </Label>
                <Textarea
                  id="content"
                  placeholder="详细信息..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="rounded-xl border-[#e0e0e0] focus:ring-primary focus:border-primary min-h-[120px]"
                />
              </div>

              <div className="flex items-center justify-between bg-[#f5f5f7] p-4 rounded-xl">
                <div className="space-y-0.5">
                  <Label htmlFor="pinned" className="text-[15px] font-medium text-[#1d1d1f]">
                    置顶此通知
                  </Label>
                  <p className="text-[12px] text-[#7a7a7a]">置顶通知将优先在前台顶部展示</p>
                </div>
                <Switch
                  id="pinned"
                  checked={pinned}
                  onCheckedChange={setPinned}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-md border-[#e0e0e0] hover:bg-[#e8e8ed] active:scale-95 transition-transform"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="rounded-md bg-primary text-white hover:brightness-110 active:scale-95 transition-transform"
                >
                  发布
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="bg-[#f5f5f7] rounded-[18px] h-32 animate-pulse border border-[#e0e0e0]"></div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20 bg-[#f5f5f7] border border-dashed border-[#e0e0e0] rounded-[18px] space-y-4">
          <Bell className="w-12 h-12 text-[#7a7a7a] mx-auto opacity-50" />
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">暂无通知</h3>
            <p className="text-[14px] text-[#7a7a7a] mt-1">点击右上角“新建通知”发布第一条家庭公告。</p>
          </div>
        </div>
      ) : (
        /* Notices List */
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className={`bg-white border border-[#e0e0e0] rounded-xl shadow-none hover:border-[#1d1d1f] transition-all overflow-hidden ${notice.read ? 'opacity-50 bg-[#f5f5f7] hover:opacity-100' : ''}`}>
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.pinned && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-600 text-[12px] font-medium px-2 py-0.5 rounded-full">
                        <Pin className="w-3 h-3" />
                        置顶
                      </span>
                    )}
                    {notice.read ? (
                      <Badge variant="secondary" className="rounded-full bg-zinc-100 text-zinc-500 border-none font-normal text-[11px] py-0 px-2 h-5">已读</Badge>
                    ) : (
                      <Badge className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-normal shadow-none hover:bg-emerald-50 text-[11px] py-0 px-2 h-5">未读</Badge>
                    )}
                    <h3 className="text-[18px] font-semibold text-[#1d1d1f] truncate">
                      {notice.title}
                    </h3>
                  </div>
                  <p className="text-[15px] font-normal leading-[1.5] text-[#7a7a7a] whitespace-pre-wrap">
                    {notice.content || <span className="italic">无详细描述内容</span>}
                  </p>
                  <div className="text-[13px] text-[#7a7a7a] flex flex-wrap items-center gap-1 bg-[#f5f5f7] px-3 py-1.5 rounded-lg w-fit">
                    <span className="font-medium text-[#1d1d1f]">已读成员：</span>
                    {notice.readBy && notice.readBy.length > 0 ? (
                      <span>{notice.readBy.map(u => u.displayName).join('、')}</span>
                    ) : (
                      <span className="text-[#a1a1a6] italic">暂无成员阅读</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#cccccc]">
                    发布于: {new Date(notice.createdAt).toLocaleString('zh-CN')}
                    {notice.createdAt !== notice.updatedAt && ' (已编辑)'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => handleTogglePin(notice)}
                    className="rounded-md border-[#e0e0e0] hover:bg-[#e8e8ed] text-[13px] font-normal h-8"
                  >
                    {notice.pinned ? (
                      <>
                        <PinOff className="w-4 h-4 mr-1.5" />
                        取消置顶
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 mr-1.5" />
                        设为置顶
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditDialog(notice)}
                    className="rounded-md border-[#e0e0e0] hover:bg-[#e8e8ed]"
                  >
                    <Edit2 className="w-4 h-4 text-[#1d1d1f]" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(notice.id)}
                    className="rounded-md border-red-200 hover:bg-red-50 hover:border-red-400 group"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-semibold text-[#1d1d1f]">编辑通知</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle" className="text-[15px] font-medium text-[#1d1d1f]">
                标题
              </Label>
              <Input
                id="editTitle"
                placeholder="通知标题..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border-[#e0e0e0] focus:ring-primary focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editContent" className="text-[15px] font-medium text-[#1d1d1f]">
                正文内容
              </Label>
              <Textarea
                id="editContent"
                placeholder="详细信息..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-xl border-[#e0e0e0] focus:ring-primary focus:border-primary min-h-[120px]"
              />
            </div>

            <div className="flex items-center justify-between bg-[#f5f5f7] p-4 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="editPinned" className="text-[15px] font-medium text-[#1d1d1f]">
                  置顶此通知
                </Label>
                <p className="text-[12px] text-[#7a7a7a]">置顶通知将优先在前台顶部展示</p>
              </div>
              <Switch
                id="editPinned"
                checked={pinned}
                onCheckedChange={setPinned}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingNotice(null);
                  setTitle('');
                  setContent('');
                  setPinned(false);
                }}
                className="rounded-md border-[#e0e0e0] hover:bg-[#e8e8ed] active:scale-95 transition-transform"
              >
                取消
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-primary text-white hover:brightness-110 active:scale-95 transition-transform"
              >
                保存修改
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
