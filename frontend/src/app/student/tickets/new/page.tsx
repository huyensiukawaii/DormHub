'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Wrench, Plus, X, Zap, Droplets,
  Wind, Lock, Sofa, HelpCircle, Building2, ImagePlus,
} from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = [
  { value: 'ELECTRICAL',      label: 'Điện',       desc: 'Đèn, ổ cắm, cầu dao, dây điện',   icon: Zap,       color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', active: 'border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200' },
  { value: 'PLUMBING',        label: 'Nước',       desc: 'Vòi nước, đường ống, thoát nước',  icon: Droplets,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' },
  { value: 'AIR_CONDITIONER', label: 'Điều hòa',  desc: 'Không mát, chảy nước, kêu tiếng',  icon: Wind,      color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200',    active: 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' },
  { value: 'DOOR_LOCK',       label: 'Cửa / Khóa', desc: 'Khóa kẹt, bản lề, tay nắm cửa',  icon: Lock,      color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200',  active: 'border-slate-500 bg-slate-50 ring-2 ring-slate-300' },
  { value: 'FURNITURE',       label: 'Nội thất',   desc: 'Giường, bàn, tủ, ghế, cửa sổ',    icon: Sofa,      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' },
  { value: 'OTHER',           label: 'Khác',       desc: 'Vấn đề không thuộc danh mục trên', icon: HelpCircle,color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', active: 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' },
];

export default function CreateTicketPage() {
  const router = useRouter();

  const [category, setCategory]   = useState('');
  const [title, setTitle]         = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages]       = useState<{ file: File; preview: string; url?: string; uploading?: boolean; error?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [roomInfo, setRoomInfo]   = useState<{ code: string; buildingName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/auth/me').then((res) => {
      const room = res.data.currentRoom;
      if (room) setRoomInfo({ code: room.code, buildingName: room.buildingName ?? '' });
    }).catch(() => {});
  }, []);

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 3 - images.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const preview = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview, uploading: true }]);
      const form = new FormData();
      form.append('file', file);
      api.post('/tickets/student/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((res) => {
        setImages((prev) => prev.map((img) => img.preview === preview ? { ...img, url: res.data.url, uploading: false } : img));
      }).catch(() => {
        setImages((prev) => prev.map((img) => img.preview === preview ? { ...img, uploading: false, error: 'Upload thất bại' } : img));
      });
    });
    e.target.value = '';
  };

  const handleRemoveImage = (preview: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.preview === preview);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.preview !== preview);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError('Vui lòng chọn danh mục sự cố'); return; }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề'); return; }
    if (images.some((i) => i.uploading)) { setError('Ảnh đang được tải lên, vui lòng chờ'); return; }
    if (images.some((i) => i.error)) { setError('Có ảnh upload thất bại, vui lòng xóa và chọn lại'); return; }
    setError('');
    setSubmitting(true);
    try {
      const uploadedUrls = images.map((i) => i.url).filter(Boolean) as string[];
      await api.post('/tickets/student', {
        category,
        title: title.trim(),
        description: description.trim() || undefined,
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
      router.push('/student/tickets');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.value === category);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-3">
        <Link href="/student/dashboard" className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <span className="font-bold text-slate-800 text-sm hidden sm:block">DormHub</span>
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <button
          onClick={() => router.push('/student/tickets')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <span className="text-sm font-medium text-slate-700">Báo sự cố mới</span>
        {roomInfo && (
          <span className="ml-auto text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
            Phòng {roomInfo.code} · {roomInfo.buildingName}
          </span>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* LEFT: Category + Title + Description */}
            <div className="lg:col-span-3 space-y-6">

              {/* Category */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-1">
                  Danh mục sự cố <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-slate-500 mb-4">Chọn loại sự cố phù hợp nhất</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          isActive ? cat.active : `${cat.border} bg-white hover:${cat.bg}`
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${cat.bg}`}>
                          <Icon className={`w-5 h-5 ${cat.color}`} />
                        </div>
                        <p className={`text-sm font-semibold ${isActive ? cat.color : 'text-slate-700'}`}>
                          {cat.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{cat.desc}</p>
                        {isActive && (
                          <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center ${cat.bg}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${cat.color.replace('text-', 'bg-')}`} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title + Description */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    placeholder="VD: Bóng đèn phòng tắm không sáng"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{title.length}/200</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Mô tả chi tiết <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={5}
                    placeholder="Mô tả thêm về tình trạng, thời gian bắt đầu xảy ra, ảnh hưởng đến sinh hoạt như thế nào..."
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{description.length}/2000</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Images + Submit */}
            <div className="lg:col-span-2 space-y-6">

              {/* Images */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-1">Ảnh đính kèm</h2>
                <p className="text-sm text-slate-500 mb-4">Tối đa 3 ảnh · JPG, PNG, WEBP · mỗi ảnh &lt; 5MB</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handlePickFiles}
                />

                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img.preview} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      {img.error && (
                        <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center p-1">
                          <p className="text-white text-[10px] text-center font-medium">Upload thất bại</p>
                        </div>
                      )}
                      {!img.uploading && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.preview)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {images.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50 flex flex-col items-center justify-center gap-1.5 transition-colors group"
                    >
                      <ImagePlus className="w-6 h-6 text-slate-300 group-hover:text-amber-400 transition-colors" />
                      <span className="text-xs text-slate-400 group-hover:text-amber-500">Thêm ảnh</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Summary card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-800 mb-3">Tóm tắt</h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Phòng</span>
                    <span className="font-medium text-slate-700">
                      {roomInfo ? `${roomInfo.code} · ${roomInfo.buildingName}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Danh mục</span>
                    <span className={`font-medium ${selectedCat ? selectedCat.color : 'text-slate-400'}`}>
                      {selectedCat ? selectedCat.label : 'Chưa chọn'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  Mức ưu tiên sẽ do ban quản lý phân loại sau khi nhận yêu cầu.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="submit"
                  disabled={submitting || !category || !title.trim()}
                  className="w-full px-4 py-3 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                  Gửi yêu cầu
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/student/tickets')}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
