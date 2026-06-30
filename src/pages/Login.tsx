import { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Lock, Image as ImageIcon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AuroraBackground } from '@/components/ui/aurora-background';

import { API_BASE } from '@/lib/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  
  const navigate = useNavigate();

  // i18n state
  const [lang, setLang] = useState<'en' | 'zh'>('zh');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'zh';
    if (savedLang) setLang(savedLang);
  }, []);

  const handleLangChange = (newLang: 'en' | 'zh') => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        // Register mode
        const res = await axios.post(`${API_BASE}/auth/register`, {
          username,
          password,
          displayName,
          inviteCode: inviteCode || undefined, // send undefined if empty
        });
        localStorage.setItem('token', res.data.token);
        
        // Redirect based on role
        if (res.data.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        // Login mode
        const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
        localStorage.setItem('token', res.data.token);
        
        // Check if admin to route appropriately
        const meRes = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${res.data.token}` }
        });
        if (meRes.data.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        (lang === 'zh' ? '操作失败，请检查输入或重试。' : 'Action failed. Please check inputs or try again.')
      );
    }
  };

  const t = {
    welcome: isRegister 
      ? (lang === 'zh' ? '创建账户' : 'Create Account')
      : (lang === 'zh' ? '欢迎回来' : 'Welcome Back'),
    desc: isRegister
      ? (lang === 'zh' ? '使用邀请码加入数字相册' : 'Join the digital album with invite code')
      : (lang === 'zh' ? '登录到您的数字相册' : 'Sign in to your digital album'),
    username: lang === 'zh' ? '用户名' : 'Username',
    password: lang === 'zh' ? '密码' : 'Password',
    displayName: lang === 'zh' ? '昵称 (显示名称)' : 'Nickname (Display Name)',
    inviteCode: lang === 'zh' ? '邀请码' : 'Invite Code',
    signIn: lang === 'zh' ? '登录' : 'Sign In',
    signUp: lang === 'zh' ? '注册' : 'Register',
    toggleToRegister: lang === 'zh' ? '新成员？使用邀请码注册' : 'New member? Register with invite code',
    toggleToLogin: lang === 'zh' ? '已有账号？直接登录' : 'Already have an account? Sign in',
    privacy: lang === 'zh' ? '隐私政策' : 'Privacy Policy',
    terms: lang === 'zh' ? '服务条款' : 'Terms of Service',
    support: lang === 'zh' ? '联系支持' : 'Contact Support',
    copyright: lang === 'zh' ? '© 2026 White Album 数字相册。保留所有权利。' : '© 2026 White Album Digital Albums. All rights reserved.',
  };

  return (
    <AuroraBackground>
      {/* Global Nav */}
      <nav className="fixed top-0 left-0 w-full z-50 h-[44px] bg-black flex justify-between items-center px-4 md:px-8 text-white text-[12px] tracking-[-0.12px]">
        <div className="flex items-center gap-4">
          <ImageIcon className="w-4 h-4" />
          <span>White Album</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleLangChange('en')} 
            className={`hover:opacity-70 transition-opacity ${lang === 'en' ? 'font-semibold' : ''}`}
          >
            EN
          </button>
          <span className="opacity-50">/</span>
          <button 
            onClick={() => handleLangChange('zh')} 
            className={`hover:opacity-70 transition-opacity ${lang === 'zh' ? 'font-semibold' : ''}`}
          >
            ZH
          </button>
        </div>
      </nav>

      {/* Login / Register Container */}
      <main className="w-full max-w-[440px] px-4 z-10 mt-auto pt-[80px] pb-6">
        <Card className="bg-card border-border rounded-[18px] shadow-none">
          {/* Header Section */}
          <CardHeader className="text-center space-y-4 pt-10 pb-6 flex flex-col items-center">
            <CardTitle className="text-[40px] font-semibold leading-[1.1] tracking-normal">{t.welcome}</CardTitle>
            <CardDescription className="text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-muted-foreground">{t.desc}</CardDescription>
          </CardHeader>

          {/* Form Content */}
          <CardContent className="pb-10 px-8">
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              
              {/* Display Name Field (Register Only) */}
              {isRegister && (
                <div className="space-y-2">
                  <Label className="ml-2 text-[14px] font-normal tracking-[-0.224px] text-muted-foreground">{t.displayName}</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                      className="w-full bg-input/20 border border-border rounded-full h-[44px] pl-[40px] pr-4 text-[17px] focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/50 shadow-none" 
                      placeholder={t.displayName} 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isRegister}
                    />
                  </div>
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <Label className="ml-2 text-[14px] font-normal tracking-[-0.224px] text-muted-foreground">{t.username}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    className="w-full bg-input/20 border border-border rounded-full h-[44px] pl-[40px] pr-4 text-[17px] focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/50 shadow-none" 
                    placeholder={t.username} 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label className="ml-2 text-[14px] font-normal tracking-[-0.224px] text-muted-foreground">{t.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input 
                    className="w-full bg-input/20 border border-border rounded-full h-[44px] pl-[40px] pr-4 text-[17px] focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/50 shadow-none" 
                    placeholder="••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Invite Code Field (Register Only) */}
              {isRegister && (
                <div className="space-y-2">
                  <Label className="ml-2 text-[14px] font-normal tracking-[-0.224px] text-muted-foreground">{t.inviteCode}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                      className="w-full bg-input/20 border border-border rounded-full h-[44px] pl-[40px] pr-4 text-[17px] focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/50 shadow-none" 
                      placeholder={t.inviteCode} 
                      type="text" 
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-destructive text-[14px] text-center font-semibold">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit"
                className="w-full bg-primary text-primary-foreground font-normal text-[17px] h-[44px] rounded-full mt-4 hover:brightness-110 active:scale-95 transition-transform shadow-none"
              >
                {isRegister ? t.signUp : t.signIn}
              </Button>

              {/* Toggle Login/Register Mode */}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-[14px] text-primary hover:underline mt-2 text-center"
              >
                {isRegister ? t.toggleToLogin : t.toggleToRegister}
              </button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Footer Information */}
      <footer className="w-full z-10 flex flex-col items-center gap-2 pb-10 pt-12 px-4 mt-auto">
        <div className="text-[12px] font-normal tracking-[-0.12px] text-muted-foreground flex gap-4">
          <a className="hover:text-foreground transition-colors" href="#">{t.privacy}</a>
          <span className="opacity-30">|</span>
          <a className="hover:text-foreground transition-colors" href="#">{t.terms}</a>
          <span className="opacity-30">|</span>
          <a className="hover:text-foreground transition-colors" href="#">{t.support}</a>
        </div>
        <div className="text-[10px] font-normal tracking-[-0.08px] text-muted-foreground mt-2 opacity-60">
          {t.copyright}
        </div>
      </footer>
    </AuroraBackground>
  );
}
