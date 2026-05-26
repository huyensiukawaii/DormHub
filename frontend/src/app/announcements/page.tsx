'use client';

import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Megaphone, Plus, Pin, Pencil, Trash2, Loader2, X,
  Building2, Globe, ImagePlus, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/timeAgo';

const EMOJIS: { key: string; icon: string }[] = [
  { key: 'LIKE', icon: '👍' },
  { key: 'LOVE', icon: '❤️' },
  { key: 'HAHA', icon: '😂' },
  { key: 'WOW', icon: '😮' },
  { key: 'SAD', icon: '😢' },
  { key: 'ANGRY', icon: '😡' },
];

interface Channel { id: number | null; code: string; name: string }
interface Post {
  id: number;
  buildingId: number | null;
  title: string;
  content: string;
  images: string[];
  isPinned: boolean;
  channelLabel: string;
  author: { id: number; fullName: string; role: string };
  reactions: { counts: Record<string, number>; myReaction: string | null; total: number };
  createdAt: string;
}

function EmojiBar({ reactions, postId, onReact }: {
  reactions: Post['reactions']; postId: number;
  onReact: (postId: number, emoji: string) => void;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [show]);

  const total = reactions.total;
  const topEmojis = Object.entries(reactions.counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const myEmoji = EMOJIS.find((e) => e.key === reactions.myReaction);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {/* Reaction summary */}
      {total > 0 && (
        <span className="text-sm text-slate-500 flex items-center gap-0.5">
          {topEmojis.map(([k]) => EMOJIS.find((e) => e.key === k)?.icon).join('')}
          <span className="ml-1">{total}</span>
        </span>
      )}

      {/* React button */}
      <button
        onClick={() => setShow((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
          myEmoji
            ? 'bg-blue-50 border-blue-200 text-blue-600'
            : 'border-slate-200 text-slate-500 hover:border-slate-300'
        }`}
      >
        <span>{myEmoji ? myEmoji.icon : '😊'}</span>
        <span>{myEmoji ? myEmoji.icon === '👍' ? 'Thích' : 'Đã react' : 'React'}</span>
      </button>

      {/* Emoji picker */}
      {show && (
        <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white border border-slate-200 rounded-2xl shadow-xl px-2 py-1.5 z-20">
          {EMOJIS.map((e) => (
            <button
              key={e.key}
              onClick={() => { onReact(postId, e.key); setShow(false); }}
              title={e.key}
              className={`text-xl hover:scale-125 transition-transform p-0.5 rounded-full ${reactions.myReaction === e.key ? 'bg-blue-100' : ''}`}
            >
              {e.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, currentUserId, currentUserRole, onPin, onEdit, onDelete, onReact }: {
  post: Post; currentUserId: number; currentUserRole: string;
  onPin: (id: number, isPinned: boolean) => void;
  onEdit: (post: Post) => void;
  onDelete: (id: number) => void;
  onReact: (postId: number, emoji: string) => void;
}) {
  const isAdmin = currentUserRole === 'ADMIN';
  const isOwn = post.author.id === currentUserId;
  const canEditDelete = isAdmin || isOwn;

  return (
    <div className={`bg-white rounded-xl border ${post.isPinned ? 'border-amber-300 shadow-amber-50' : 'border-slate-200'} shadow-sm overflow-hidden`}>
      {post.isPinned && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 border-b border-amber-200">
          <Pin className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">Đã ghim</span>
        </div>
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-700">
              {post.author.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{post.author.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-400">{timeAgo(post.createdAt)}</span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  {post.buildingId ? <Building2 className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {post.channelLabel}
                </span>
              </div>
            </div>
          </div>
          {(canEditDelete) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onPin(post.id, !post.isPinned)}
                title={post.isPinned ? 'Bỏ ghim' : 'Ghim'}
                className={`p-1.5 rounded-lg transition-colors ${post.isPinned ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button onClick={() => onEdit(post)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(post.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-slate-800 mb-1.5">{post.title}</h3>
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Images */}
        {post.images.length > 0 && (
          <div className={`mt-3 grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.images.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 3 && post.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">+{post.images.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <EmojiBar reactions={post.reactions} postId={post.id} onReact={onReact} />
        </div>
      </div>
    </div>
  );
}

function PostModal({ channels, editPost, onClose, onSaved }: {
  channels: Channel[];
  editPost: Post | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editPost?.title ?? '');
  const [content, setContent] = useState(editPost?.content ?? '');
  const [channelId, setChannelId] = useState<string>(
    editPost ? (editPost.buildingId === null ? 'GLOBAL' : String(editPost.buildingId)) : 'GLOBAL'
  );
  const [images, setImages] = useState<string[]>(editPost?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');
      for (const file of Array.from(files).slice(0, 4 - images.length)) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${baseUrl}/announcements/upload-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token ?? ''}` },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Upload thất bại');
        urls.push(data.url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 4));
    } catch {
      setError('Upload ảnh thất bại');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { setError('Tiêu đề và nội dung không được để trống'); return; }
    setSaving(true);
    setError('');
    const buildingId = channelId === 'GLOBAL' ? undefined : parseInt(channelId);
    try {
      if (editPost) {
        await api.put(`/announcements/${editPost.id}`, { title: title.trim(), content: content.trim(), images });
      } else {
        await api.post('/announcements', { title: title.trim(), content: content.trim(), images, buildingId });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi khi lưu bài');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b border-slate-100 z-10">
          <h3 className="text-lg font-bold text-slate-800">{editPost ? 'Sửa bài đăng' : 'Bài đăng mới'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {!editPost && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kênh đăng</label>
              <div className="flex flex-wrap gap-2">
                {channels.map((ch) => (
                  <button
                    key={ch.code}
                    onClick={() => setChannelId(ch.id === null ? 'GLOBAL' : String(ch.id))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      (ch.id === null ? 'GLOBAL' : String(ch.id)) === channelId
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}
                  >
                    {ch.id === null ? <Globe className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề thông báo..."
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nội dung <span className="text-red-500">*</span></label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nội dung thông báo..."
              rows={5}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Ảnh đính kèm ({images.length}/4)</label>
              {images.length < 4 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                  Thêm ảnh
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 rounded-lg flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editPost ? 'Lưu thay đổi' : 'Đăng bài'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [pinned, setPinned] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((r) => { setCurrentUserId(r.data.id); setCurrentUserRole(r.data.role); }).catch(() => {});
    fetchChannels();
  }, []);

  useEffect(() => {
    if (activeChannel !== null) fetchPosts();
  }, [activeChannel, page]);

  const fetchChannels = async () => {
    try {
      const res = await api.get('/announcements/channels');
      setChannels(res.data);
      setActiveChannel(res.data[0] ?? null);
    } catch { /* ignore */ }
  };

  const channelParam = () => {
    if (!activeChannel) return '';
    return activeChannel.id === null ? '' : String(activeChannel.id);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/announcements?channel=${channelParam()}&page=${page}&limit=10`);
      setPinned(res.data.pinned ?? []);
      setPosts(res.data.data ?? []);
      setTotalPages(res.data.totalPages ?? 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handlePin = async (id: number, isPinned: boolean) => {
    try {
      await api.patch(`/announcements/${id}/pin`, { isPinned });
      fetchPosts();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi ghim'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa bài đăng này?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchPosts();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi xóa'); }
  };

  const handleReact = async (postId: number, emoji: string) => {
    try {
      await api.post(`/announcements/${postId}/react`, { emoji });
      fetchPosts();
    } catch { /* ignore */ }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditPost(null);
    fetchPosts();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảng thông báo</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng thông báo theo kênh tòa nhà</p>
        </div>
        <button
          onClick={() => { setEditPost(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" /> Bài đăng mới
        </button>
      </div>

      <div className="flex gap-6">
        {/* Channel sidebar */}
        <div className="hidden lg:block w-52 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-2">Kênh</p>
          <div className="space-y-0.5">
            {channels.map((ch) => (
              <button
                key={ch.code}
                onClick={() => { setActiveChannel(ch); setPage(1); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  activeChannel?.code === ch.code
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {ch.id === null ? <Globe className="w-4 h-4 flex-shrink-0" /> : <Building2 className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile channel tabs */}
        <div className="lg:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {channels.map((ch) => (
              <button
                key={ch.code}
                onClick={() => { setActiveChannel(ch); setPage(1); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeChannel?.code === ch.code
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {ch.id === null ? <Globe className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                {ch.name}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <>
              {pinned.map((p) => (
                <PostCard key={`pin-${p.id}`} post={p} currentUserId={currentUserId} currentUserRole={currentUserRole}
                  onPin={handlePin} onEdit={(p) => { setEditPost(p); setShowModal(true); }}
                  onDelete={handleDelete} onReact={handleReact} />
              ))}
              {posts.length === 0 && pinned.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Chưa có bài đăng nào trong kênh này</p>
                </div>
              )}
              {posts.map((p) => (
                <PostCard key={p.id} post={p} currentUserId={currentUserId} currentUserRole={currentUserRole}
                  onPin={handlePin} onEdit={(p) => { setEditPost(p); setShowModal(true); }}
                  onDelete={handleDelete} onReact={handleReact} />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button onClick={() => setPage(page - 1)} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-500">Trang {page}/{totalPages}</span>
                  <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <PostModal
          channels={channels}
          editPost={editPost}
          onClose={() => { setShowModal(false); setEditPost(null); }}
          onSaved={handleSaved}
        />
      )}
    </AdminLayout>
  );
}
