import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, Bell, Key, MessageSquare, ArrowRight } from 'lucide-react';


import { API_BASE } from '@/lib/api';

interface Invite {
  id: number;
  used: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    photos: 0,
    notices: 0,
    invitesTotal: 0,
    invitesUnused: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(`${API_BASE}/photos`, { headers }),
      axios.get(`${API_BASE}/notices`, { headers }),
      axios.get(`${API_BASE}/invites`, { headers }),
      axios.get(`${API_BASE}/messages`, { headers }).catch(() => ({ data: { messages: [] } })),
    ])
    .then(([photosRes, noticesRes, invitesRes, messagesRes]) => {
      const photos = photosRes.data.photos || [];
      const notices = noticesRes.data.notices || [];
      const invites = invitesRes.data.invites || [];
      const messages = messagesRes.data.messages || [];

      setStats({
        photos: photos.length,
        notices: notices.length,
        invitesTotal: invites.length,
        invitesUnused: invites.filter((inv: Invite) => !inv.used).length,
        messages: messages.length,
      });
      setLoading(false);
    })
    .catch(() => {
      setLoading(false);
    });
  }, []);

  const statCards = [
    {
      title: '照片总数',
      value: stats.photos,
      icon: ImageIcon,
      description: '画廊轮播展示的照片',
      color: 'text-blue-500',
      action: () => navigate('/admin/photos'),
    },
    {
      title: '系统通知',
      value: stats.notices,
      icon: Bell,
      description: '便签式公告与置顶提示',
      color: 'text-amber-500',
      action: () => navigate('/admin/notices'),
    },
    {
      title: '未使用邀请码',
      value: stats.invitesUnused,
      icon: Key,
      description: `总生成数 ${stats.invitesTotal} 个`,
      color: 'text-emerald-500',
      action: () => navigate('/admin/invites'),
    },
    {
      title: '留言板消息',
      value: stats.messages,
      icon: MessageSquare,
      description: '家庭成员的互动留言',
      color: 'text-purple-500',
      action: () => {},
    },
  ];

  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-[40px] font-semibold tracking-tight text-[#1d1d1f] leading-tight">
          仪表盘
        </h1>
        <p className="text-[17px] text-[#7a7a7a] mt-2">
          欢迎使用后台管理系统。在此管理您的照片、系统通知及家庭成员注册。
        </p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card 
              key={idx} 
              className="bg-[#f5f5f7] border border-[#e0e0e0] rounded-[18px] shadow-none hover:border-[#1d1d1f] transition-colors cursor-pointer group"
              onClick={card.action}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[15px] font-medium text-[#7a7a7a]">
                  {card.title}
                </CardTitle>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">
                  {loading ? '...' : card.value}
                </div>
                <p className="text-[13px] text-[#7a7a7a] mt-1">
                  {card.description}
                </p>
                {card.action !== (() => {}) && (
                  <div className="flex items-center gap-1 text-[13px] text-primary font-semibold mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    管理 <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
