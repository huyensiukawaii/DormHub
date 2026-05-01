'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Zap,
  Droplets,
  Award,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

type Tab = 'electricity' | 'water' | 'priority';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
}

// ========================================
// CONFIG cố định cho UI
// ========================================

const ELECTRICITY_TIERS = [
  { tier: 1, label: '0 – 50 kWh', limitKey: 'electricity_tier_1_limit', priceKey: 'electricity_tier_1_price' },
  { tier: 2, label: '51 – 100 kWh', limitKey: 'electricity_tier_2_limit', priceKey: 'electricity_tier_2_price' },
  { tier: 3, label: '101 – 200 kWh', limitKey: 'electricity_tier_3_limit', priceKey: 'electricity_tier_3_price' },
  { tier: 4, label: '201 – 300 kWh', limitKey: 'electricity_tier_4_limit', priceKey: 'electricity_tier_4_price' },
  { tier: 5, label: '301 – 400 kWh', limitKey: 'electricity_tier_5_limit', priceKey: 'electricity_tier_5_price' },
  { tier: 6, label: '401+ kWh', limitKey: null, priceKey: 'electricity_tier_6_price' },
];

const WATER_FIELDS = [
  { key: 'water_per_person_monthly', label: 'Tiền khoán / người / tháng', desc: 'Áp dụng cho tất cả sinh viên, bất kể lượng nước dùng', unit: 'đ / người / tháng' },
  { key: 'water_quota_per_person', label: 'Định mức nước / người / tháng', desc: 'Lượng nước được dùng trong mức khoán, vượt quá sẽ tính thêm', unit: 'm³ / người / tháng' },
  { key: 'water_over_quota_price', label: 'Giá nước vượt định mức', desc: 'Áp dụng cho mỗi m³ vượt quá định mức cho phép', unit: 'đ / m³' },
];

const PRIORITY_ITEMS = [
  { section: 'Hoàn cảnh', items: [
    { key: 'priority_poor_household', label: 'Hộ nghèo', desc: 'Gia đình thuộc diện hộ nghèo' },
    { key: 'priority_near_poor', label: 'Hộ cận nghèo', desc: 'Gia đình thuộc diện hộ cận nghèo' },
    { key: 'priority_orphan', label: 'Mồ côi', desc: 'Sinh viên mồ côi cha hoặc mẹ' },
    { key: 'priority_disabled', label: 'Khuyết tật', desc: 'Sinh viên có giấy chứng nhận khuyết tật' },
    { key: 'priority_policy_family', label: 'Gia đình chính sách', desc: 'Gia đình có công với cách mạng' },
  ]},
  { section: 'Học tập', items: [
    { key: 'priority_first_year', label: 'Sinh viên năm nhất', desc: 'Đang học năm thứ nhất' },
    { key: 'priority_gpa_3_2', label: 'GPA ≥ 3.2', desc: 'Điểm trung bình tích lũy từ 3.2 trở lên' },
    { key: 'priority_was_resident', label: 'Đã ở KTX kỳ trước', desc: 'Đã từng ở ký túc xá kỳ học trước' },
  ]},
  { section: 'Khoảng cách', items: [
    { key: 'priority_distance_over_100', label: 'Khoảng cách > 100km', desc: 'Quê cách trường trên 100km' },
    { key: 'priority_distance_over_300', label: 'Khoảng cách > 300km', desc: 'Quê cách trường trên 300km' },
    { key: 'priority_distance_over_500', label: 'Khoảng cách > 500km', desc: 'Quê cách trường trên 500km' },
  ]},
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('electricity');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const isAdmin = getStoredUser()?.role === 'ADMIN';

  // Preview electricity
  const [previewKwh, setPreviewKwh] = useState(120);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/all');
      const map: Record<string, string> = {};
      (res.data as Setting[]).forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (prefix: string) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const toSave = Object.entries(settings)
        .filter(([k]) => k.startsWith(prefix))
        .map(([key, value]) => ({ key, value }));

      await api.put('/settings/bulk', { settings: toSave });
      setSuccess('Đã lưu cài đặt thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // PREVIEW: Tính tiền điện
  // ========================================
  const electricityPreview = useMemo(() => {
    const tiers = [
      { limit: parseInt(settings['electricity_tier_1_limit']) || 50, price: parseInt(settings['electricity_tier_1_price']) || 1728 },
      { limit: parseInt(settings['electricity_tier_2_limit']) || 100, price: parseInt(settings['electricity_tier_2_price']) || 1786 },
      { limit: parseInt(settings['electricity_tier_3_limit']) || 200, price: parseInt(settings['electricity_tier_3_price']) || 2074 },
      { limit: parseInt(settings['electricity_tier_4_limit']) || 300, price: parseInt(settings['electricity_tier_4_price']) || 2612 },
      { limit: parseInt(settings['electricity_tier_5_limit']) || 400, price: parseInt(settings['electricity_tier_5_price']) || 2919 },
      { limit: Infinity, price: parseInt(settings['electricity_tier_6_price']) || 3015 },
    ];

    let remaining = previewKwh;
    let total = 0;
    let prev = 0;

    for (const tier of tiers) {
      if (remaining <= 0) break;
      const range = tier.limit === Infinity ? Infinity : tier.limit - prev;
      const used = Math.min(remaining, range);
      total += Math.round(used * tier.price);
      remaining -= used;
      prev = tier.limit;
    }

    const avg = previewKwh > 0 ? Math.round(total / previewKwh) : 0;
    return { total, avg };
  }, [settings, previewKwh]);

  // ========================================
  // PREVIEW: Tính tiền nước
  // ========================================
  const waterPreview = useMemo(() => {
    const perPerson = parseInt(settings['water_per_person_monthly']) || 30000;
    const quotaPP = parseInt(settings['water_quota_per_person']) || 4;
    const overPrice = parseInt(settings['water_over_quota_price']) || 7000;

    const occupants = 4;
    const used = 20;
    const quotaTotal = occupants * quotaPP;
    const quotaFee = occupants * perPerson;
    const overUsed = Math.max(0, used - quotaTotal);
    const overFee = Math.round(overUsed * overPrice);

    return { occupants, used, quotaTotal, quotaFee, overUsed, overFee, total: quotaFee + overFee };
  }, [settings]);

  // ========================================
  // PREVIEW: Điểm ưu tiên tối đa
  // ========================================
  const priorityMaxScores = useMemo(() => {
    let circumstance = 0;
    let academic = 0;
    let distance = 0;

    PRIORITY_ITEMS.forEach((section) => {
      section.items.forEach((item) => {
        const val = parseInt(settings[item.key]) || 0;
        if (section.section === 'Hoàn cảnh') circumstance += val;
        else if (section.section === 'Học tập') academic += val;
        else distance += val;
      });
    });

    return { circumstance, academic, distance, total: circumstance + academic + distance };
  }, [settings]);

  const fc = (v: number) => new Intl.NumberFormat('vi-VN').format(v);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Cài đặt hệ thống</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý giá điện, nước và điểm ưu tiên đăng ký</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('electricity')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'electricity' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Zap className="w-4 h-4" /> Giá điện
        </button>
        <button
          onClick={() => setActiveTab('water')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'water' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Droplets className="w-4 h-4" /> Giá nước
        </button>
        <button
          onClick={() => setActiveTab('priority')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'priority' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" /> Điểm ưu tiên
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* ==================== TAB: GIÁ ĐIỆN ==================== */}
      {activeTab === 'electricity' && (
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Biểu giá điện bậc thang</h2>
                <p className="text-sm text-slate-500 mt-0.5">Áp dụng theo quy định EVN, tính theo kWh tiêu thụ mỗi tháng</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-600" />
              </div>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 gap-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase col-start-2">Bậc</span>
              <span className="text-xs font-semibold text-slate-400 uppercase text-center">Ngưỡng (kWh)</span>
              <span className="text-xs font-semibold text-slate-400 uppercase text-center">Đơn giá</span>

              {ELECTRICITY_TIERS.map((tier) => (
                <React.Fragment key={tier.tier}>
                  <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {tier.tier}
                  </div>
                  <p className="text-sm font-medium text-slate-700">Bậc {tier.tier}</p>

                  <div className="flex items-center gap-1.5 justify-center">
                    {tier.limitKey ? (
                      <>
                        <input
                          type="number"
                          value={settings[tier.limitKey] || ''}
                          onChange={(e) => handleChange(tier.limitKey!, e.target.value)}
                          disabled={!isAdmin}
                          className="w-20 px-2 py-2 text-sm font-mono text-center border border-slate-200 rounded-lg bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <span className="text-xs text-slate-400">kWh</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400 font-mono w-20 text-center">∞</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 justify-center">
                    <input
                      type="number"
                      value={settings[tier.priceKey] || ''}
                      onChange={(e) => handleChange(tier.priceKey, e.target.value)}
                      disabled={!isAdmin}
                      className="w-24 px-2 py-2 text-sm font-mono text-center border border-slate-200 rounded-lg bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="text-xs text-slate-400">đ/kWh</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-1">Xem trước: Tính tiền điện mẫu</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-amber-700">Tiêu thụ</span>
              <input
                type="number"
                value={previewKwh}
                onChange={(e) => setPreviewKwh(parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-sm font-mono text-center border border-amber-300 rounded bg-white"
              />
              <span className="text-sm text-amber-700">kWh →</span>
              <span className="text-xl font-bold text-amber-700">{fc(electricityPreview.total)}đ</span>
              <span className="text-sm text-amber-600">({fc(electricityPreview.avg)}đ/kWh trung bình)</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => handleSave('electricity_')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cài đặt giá điện
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: GIÁ NƯỚC ==================== */}
      {activeTab === 'water' && (
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Cài đặt giá nước</h2>
                <p className="text-sm text-slate-500 mt-0.5">Tính theo khoán người + phần vượt định mức</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Droplets className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="space-y-6">
              {WATER_FIELDS.map((field) => (
                <div key={field.key} className="bg-slate-50 rounded-xl p-5">
                  <h3 className="text-base font-semibold text-slate-800 mb-1">{field.label}</h3>
                  <p className="text-sm text-slate-500 mb-3">{field.desc}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      disabled={!isAdmin}
                      className="w-32 px-3 py-2 text-sm font-mono text-center border border-slate-200 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="text-sm text-slate-500">{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview nước */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              Xem trước: Phòng {waterPreview.occupants} người, dùng {waterPreview.used} m³
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Khoán {waterPreview.occupants} người × {fc(parseInt(settings['water_per_person_monthly']) || 30000)}đ</span>
                <span className="font-semibold text-blue-800">{fc(waterPreview.quotaFee)}đ</span>
              </div>
              <p className="text-xs text-blue-600">
                Định mức: {waterPreview.quotaTotal} m³ | Thực dùng: {waterPreview.used} m³ | Vượt: {waterPreview.overUsed} m³
              </p>
              {waterPreview.overUsed > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">Vượt {waterPreview.overUsed} m³ × {fc(parseInt(settings['water_over_quota_price']) || 7000)}đ</span>
                  <span className="font-semibold text-blue-800">{fc(waterPreview.overFee)}đ</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-blue-200">
                <span className="font-semibold text-blue-800">Tổng tiền nước</span>
                <span className="text-lg font-bold text-blue-700">{fc(waterPreview.total)}đ</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => handleSave('water_')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cài đặt giá nước
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB: ĐIỂM ƯU TIÊN ==================== */}
      {activeTab === 'priority' && (
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Cài đặt điểm ưu tiên</h2>
                <p className="text-sm text-slate-500 mt-0.5">Điểm cộng cho từng tiêu chí khi xét duyệt đơn đăng ký KTX</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-6">
              {PRIORITY_ITEMS.map((section) => (
                <div key={section.section}>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">
                    {section.section}
                  </p>
                  <div className="space-y-3">
                    {section.items.map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm text-slate-400">+</span>
                          <input
                            type="number"
                            value={settings[item.key] || ''}
                            onChange={(e) => handleChange(item.key, e.target.value)}
                            disabled={!isAdmin}
                            className="w-20 px-3 py-1.5 text-sm font-mono text-center border border-slate-200 rounded-lg bg-emerald-50 disabled:bg-slate-50 disabled:text-slate-400 text-emerald-700 font-semibold"
                          />
                          <span className="text-sm text-slate-500">điểm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Max scores preview */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-3">Điểm tối đa có thể đạt</p>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <p className="text-xs text-amber-700 mb-1">Khoảng cách</p>
                <p className="text-2xl font-bold text-amber-800">{priorityMaxScores.distance}</p>
                <p className="text-xs text-amber-600">điểm</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-amber-700 mb-1">Hoàn cảnh</p>
                <p className="text-2xl font-bold text-amber-800">{priorityMaxScores.circumstance}</p>
                <p className="text-xs text-amber-600">điểm</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-amber-700 mb-1">Học tập</p>
                <p className="text-2xl font-bold text-amber-800">{priorityMaxScores.academic}</p>
                <p className="text-xs text-amber-600">điểm</p>
              </div>
            </div>
            <div className="text-center pt-3 border-t border-amber-200">
              <span className="text-sm text-amber-700">Tổng điểm tối đa: </span>
              <span className="text-xl font-bold text-amber-800">{priorityMaxScores.total} điểm</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => handleSave('priority_')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cài đặt điểm ưu tiên
              </button>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}