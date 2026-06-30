import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

import { API_BASE } from '@/lib/api';

interface Photo {
  id: number;
  url: string;
  caption: string;
  sortOrder: number;
  originalName: string | null;
  createdAt: string;
}

export default function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Edit State
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPhotos = () => {
    setLoading(true);
    axios.get(`${API_BASE}/photos?all=true`, { headers })
      .then(res => {
        setPhotos(res.data.photos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadCaption) formData.append('caption', uploadCaption);

    try {
      await axios.post(`${API_BASE}/photos`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        }
      });
      setIsUploading(false);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadCaption('');
      fetchPhotos();
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      alert('上传失败，请确保文件是合法的图片且不超过25MB。');
    }
  };

  const openEditDialog = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditCaption(photo.caption);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    try {
      await axios.patch(`${API_BASE}/photos/${editingPhoto.id}`, {
        caption: editCaption,
      }, { headers });

      setIsEditOpen(false);
      setEditingPhoto(null);
      fetchPhotos();
    } catch (err) {
      console.error(err);
      alert('修改失败，请重试。');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('您确定要删除这张照片吗？此操作无法撤销。')) return;

    try {
      await axios.delete(`${API_BASE}/photos/${id}`, { headers });
      fetchPhotos();
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
            照片管理
          </h1>
          <p className="text-[17px] text-[#7a7a7a] mt-2">
            上传新照片、添加文字描述并调整首页轮播的播放顺序。
          </p>
        </div>

        {/* Upload Button Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-md bg-primary text-white hover:brightness-110 active:scale-95 transition-transform self-start">
              <Plus className="w-5 h-5 mr-2" />
              上传新照片
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] rounded-[18px]">
            <DialogHeader>
              <DialogTitle className="text-[22px] font-semibold text-[#1d1d1f]">上传新照片</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="file" className="text-[15px] font-medium text-[#1d1d1f]">
                  选择图片
                </Label>
                <div className="flex items-center justify-center border-2 border-dashed border-[#e0e0e0] rounded-xl p-8 bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    id="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  <div className="text-center space-y-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-[#7a7a7a] mx-auto" />
                    <p className="text-[14px] text-[#1d1d1f] font-medium">
                      {uploadFile ? uploadFile.name : '点击或拖拽文件至此区域'}
                    </p>
                    <p className="text-[12px] text-[#7a7a7a]">支持常规图片格式，上限 25MB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption" className="text-[15px] font-medium text-[#1d1d1f]">
                  照片说明
                </Label>
                <Textarea
                  id="caption"
                  placeholder="添加说明，留住这一刻的美好..."
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  className="rounded-xl border-[#e0e0e0] focus:ring-primary focus:border-primary min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-md border-[#e0e0e0] hover:bg-[#e8e8ed] active:scale-95 transition-transform"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="rounded-md bg-primary text-white hover:brightness-110 active:scale-95 transition-transform"
                >
                  {isUploading ? '正在上传...' : '确认上传'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-[#f5f5f7] rounded-[18px] h-80 animate-pulse border border-[#e0e0e0]"></div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 bg-[#f5f5f7] border border-dashed border-[#e0e0e0] rounded-[18px] space-y-4">
          <Upload className="w-12 h-12 text-[#7a7a7a] mx-auto opacity-50" />
          <div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">暂无照片</h3>
            <p className="text-[14px] text-[#7a7a7a] mt-1">上传首张照片，开启您的家庭相册之旅。</p>
          </div>
        </div>
      ) : (
        /* Photo Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="bg-white border border-[#e0e0e0] rounded-xl overflow-hidden shadow-none hover:border-[#1d1d1f] transition-all flex flex-col">
              {/* Photo Area */}
              <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
                <img
                  src={photo.url.startsWith('http') ? photo.url : `${API_BASE}${photo.url}`}
                  alt={photo.caption}
                  className="max-h-full object-contain"
                />

              </div>

              {/* Info Area */}
              <CardContent className="p-3 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[15px] font-normal leading-[1.4] text-[#1d1d1f] min-h-[42px] line-clamp-2">
                    {photo.caption || <span className="text-[#7a7a7a] italic">暂无描述</span>}
                  </p>
                  <p className="text-[12px] text-[#7a7a7a]">
                    上传于: {new Date(photo.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-3 border-t border-[#e0e0e0]">
                  {/* Edit/Delete Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(photo)}
                      className="rounded-md border-[#e0e0e0] hover:bg-[#e8e8ed]"
                    >
                      <Edit2 className="w-4 h-4 text-[#1d1d1f]" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(photo.id)}
                      className="rounded-md border-red-200 hover:bg-red-50 hover:border-red-400 group"
                    >
                      <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Photo Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-semibold text-[#1d1d1f]">编辑照片信息</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="editCaption" className="text-[15px] font-medium text-[#1d1d1f]">
                照片说明
              </Label>
              <Textarea
                id="editCaption"
                placeholder="更新说明描述..."
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="rounded-xl border-[#e0e0e0] focus:ring-primary focus:border-primary min-h-[100px]"
              />
            </div>



            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
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
