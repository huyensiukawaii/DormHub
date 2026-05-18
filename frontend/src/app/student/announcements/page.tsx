'use client';

import { useState, useEffect, useRef } from 'react';
import StudentLayout from '@/components/layouts/StudentLayout';
import {
  Megaphone, Pin, Loader2, Globe, Building2, ChevronLeft, ChevronRight,
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
      {total > 0 && (
        <span className="text-sm text-slate-500 flex items-center gap-0.5">
          {topEmojis.map(([k]) => EMOJIS.find((e) => e.key === k)?.icon).join('')}
          <span className="ml-1">{total}</span>
        </span>
      )}

      <button
        onClick={() => setShow((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
          myEmoji
            ? 'bg-amber-50 border-amber-300 text-amber-600'
            : 'border-slate-200 text-slate-500 hover:border-slate-300'
        }`}
      >
        <span>{myEmoji ? myEmoji.icon : '😊'}</span>
        <span>{myEmoji ? 'Đã react' : 'React'}</span>
      </button>

      {show && (
        <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white border border-slate-200 rounded-2xl shadow-xl px-2 py-1.5 z-20">
          {EMOJIS.map((e) => (
            <button
              key={e.key}
              onClick={() => { onReact(postId, e.key); setShow(false); }}
              title={e.key}
              className={`text-xl hover:scale-125 transition-transform p-0.5 rounded-full ${reactions.myReaction === e.key ? 'bg-amber-100' : ''}`}
            >
              {e.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onReact }: {
  post: Post;
  onReact: (postId: number, emoji: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.content.length > 300;

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
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-amber-700">
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

        {/* Content */}
        <h3 className="text-base font-bold text-slate-800 mb-1.5">{post.title}</h3>
        <p className={`text-sm text-slate-600 whitespace-pre-wrap leading-relaxed ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
          {post.content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}

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

export default function StudentAnnouncementsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [pinned, setPinned] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (activeChannel !== undefined) fetchPosts();
  }, [activeChannel, page]);

  const fetchChannels = async () => {
    try {
      const res = await api.get('/student/announcements/channels');
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
      const res = await api.get(`/student/announcements?channel=${channelParam()}&page=${page}&limit=10`);
      setPinned(res.data.pinned ?? []);
      setPosts(res.data.data ?? []);
      setTotalPages(res.data.totalPages ?? 1);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleReact = async (postId: number, emoji: string) => {
    try {
      await api.post(`/student/announcements/${postId}/react`, { emoji });
      fetchPosts();
    } catch { /* ignore */ }
  };

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Bảng thông báo</h1>
        <p className="text-sm text-slate-500 mt-1">Thông báo từ Ban quản lý ký túc xá</p>
      </div>

      <div className="flex gap-6">
        {/* Channel sidebar — desktop */}
        <div className="hidden lg:block w-52 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-2">Kênh</p>
          <div className="space-y-0.5">
            {channels.map((ch) => (
              <button
                key={ch.code}
                onClick={() => { setActiveChannel(ch); setPage(1); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  activeChannel?.code === ch.code
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {ch.id === null ? <Globe className="w-4 h-4 flex-shrink-0" /> : <Building2 className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channel tabs — mobile */}
        <div className="lg:hidden w-full mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {channels.map((ch) => (
              <button
                key={ch.code}
                onClick={() => { setActiveChannel(ch); setPage(1); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeChannel?.code === ch.code
                    ? 'bg-amber-500 text-white border-amber-500'
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
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : (
            <>
              {pinned.map((p) => (
                <PostCard key={`pin-${p.id}`} post={p} onReact={handleReact} />
              ))}
              {posts.length === 0 && pinned.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Chưa có thông báo nào trong kênh này</p>
                </div>
              )}
              {posts.map((p) => (
                <PostCard key={p.id} post={p} onReact={handleReact} />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-500">Trang {page}/{totalPages}</span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
