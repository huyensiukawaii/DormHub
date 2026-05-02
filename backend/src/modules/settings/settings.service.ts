import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertSettingDto } from './dto';

// ========================================
// DEFAULT SETTINGS (seed khi chưa có)
// ========================================
export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  // Giá điện bậc thang (đ/kWh)
  electricity_tier_1_limit: { value: '50', description: 'Bậc 1: 0 - 50 kWh' },
  electricity_tier_1_price: { value: '1728', description: 'Giá bậc 1 (đ/kWh)' },
  electricity_tier_2_limit: { value: '100', description: 'Bậc 2: 51 - 100 kWh' },
  electricity_tier_2_price: { value: '1786', description: 'Giá bậc 2 (đ/kWh)' },
  electricity_tier_3_limit: { value: '200', description: 'Bậc 3: 101 - 200 kWh' },
  electricity_tier_3_price: { value: '2074', description: 'Giá bậc 3 (đ/kWh)' },
  electricity_tier_4_limit: { value: '300', description: 'Bậc 4: 201 - 300 kWh' },
  electricity_tier_4_price: { value: '2612', description: 'Giá bậc 4 (đ/kWh)' },
  electricity_tier_5_limit: { value: '400', description: 'Bậc 5: 301 - 400 kWh' },
  electricity_tier_5_price: { value: '2919', description: 'Giá bậc 5 (đ/kWh)' },
  electricity_tier_6_price: { value: '3015', description: 'Giá bậc 6: 401+ kWh (đ/kWh)' },

  // Giá nước
  water_per_person_monthly: { value: '30000', description: 'Tiền khoán nước / người / tháng (đ)' },
  water_quota_per_person: { value: '4', description: 'Định mức nước / người / tháng (m³)' },
  water_over_quota_price: { value: '7000', description: 'Giá nước vượt định mức (đ/m³)' },

  // Điểm ưu tiên
  priority_poor_household: { value: '40', description: 'Điểm: Hộ nghèo' },
  priority_near_poor: { value: '30', description: 'Điểm: Hộ cận nghèo' },
  priority_orphan: { value: '30', description: 'Điểm: Mồ côi' },
  priority_disabled: { value: '35', description: 'Điểm: Khuyết tật' },
  priority_policy_family: { value: '25', description: 'Điểm: Gia đình chính sách' },
  priority_first_year: { value: '20', description: 'Điểm: Sinh viên năm nhất' },
  priority_gpa_3_2: { value: '15', description: 'Điểm: GPA ≥ 3.2' },
  priority_was_resident: { value: '15', description: 'Điểm: Đã ở KTX kỳ trước' },
  priority_distance_over_100: { value: '20', description: 'Điểm: Khoảng cách > 100km' },
  priority_distance_over_300: { value: '30', description: 'Điểm: Khoảng cách > 300km' },
  priority_distance_over_500: { value: '50', description: 'Điểm: Khoảng cách > 500km' },
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // SEED DEFAULTS (gọi khi khởi tạo)
  // ========================================
  async seedDefaults() {
    for (const [key, { value, description }] of Object.entries(DEFAULT_SETTINGS)) {
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value, description },
        update: {}, // không ghi đè nếu đã tồn tại
      });
    }
  }

  // ========================================
  // GET ALL
  // ========================================
  async findAll() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
      include: {
        updatedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // ========================================
  // GET BY KEY
  // ========================================
  async findByKey(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" không tồn tại`);
    return setting;
  }

  // ========================================
  // GET BY PREFIX (VD: "electricity_", "water_", "priority_")
  // ========================================
  async findByPrefix(prefix: string) {
    return this.prisma.setting.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { key: 'asc' },
    });
  }

  // ========================================
  // UPSERT SINGLE
  // ========================================
  async upsert(dto: UpsertSettingDto, userId: number) {
    return this.prisma.setting.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value,
        description: dto.description,
        updatedById: userId,
      },
      update: {
        value: dto.value,
        description: dto.description,
        updatedById: userId,
      },
    });
  }

  // ========================================
  // BULK UPSERT (Lưu nhiều settings cùng lúc)
  // ========================================
  async bulkUpsert(settings: UpsertSettingDto[], userId: number) {
    const results: Awaited<ReturnType<typeof this.upsert>>[] = [];
    for (const setting of settings) {
      const result = await this.upsert(setting, userId);
      results.push(result);
    }
    return { message: `Đã lưu ${results.length} cài đặt`, count: results.length };
  }

  // ========================================
  // HELPER: Lấy giá trị setting as number
  // ========================================
  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    try {
      const setting = await this.findByKey(key);
      const parsed = parseFloat(setting.value);
      return Number.isNaN(parsed) ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  }

  // ========================================
  // HELPER: Tính tiền điện theo bậc thang
  // ========================================
  async calculateElectricityCost(kWh: number): Promise<{
    totalCost: number;
    avgPrice: number;
    breakdown: { tier: number; range: string; kWh: number; price: number; cost: number }[];
  }> {
    const tiers = [
      { tier: 1, limit: await this.getNumber('electricity_tier_1_limit', 50), price: await this.getNumber('electricity_tier_1_price', 1728) },
      { tier: 2, limit: await this.getNumber('electricity_tier_2_limit', 100), price: await this.getNumber('electricity_tier_2_price', 1786) },
      { tier: 3, limit: await this.getNumber('electricity_tier_3_limit', 200), price: await this.getNumber('electricity_tier_3_price', 2074) },
      { tier: 4, limit: await this.getNumber('electricity_tier_4_limit', 300), price: await this.getNumber('electricity_tier_4_price', 2612) },
      { tier: 5, limit: await this.getNumber('electricity_tier_5_limit', 400), price: await this.getNumber('electricity_tier_5_price', 2919) },
      { tier: 6, limit: Infinity, price: await this.getNumber('electricity_tier_6_price', 3015) },
    ];

    let remaining = kWh;
    let totalCost = 0;
    let prevLimit = 0;
    const breakdown: { tier: number; range: string; kWh: number; price: number; cost: number }[] = [];

    for (const tier of tiers) {
      if (remaining <= 0) break;

      const tierRange = tier.limit === Infinity
        ? tier.limit
        : tier.limit - prevLimit;
      const used = Math.min(remaining, tierRange);
      const cost = Math.round(used * tier.price);

      breakdown.push({
        tier: tier.tier,
        range: tier.limit === Infinity
          ? `${prevLimit + 1}+`
          : `${prevLimit + 1} - ${tier.limit}`,
        kWh: used,
        price: tier.price,
        cost,
      });

      totalCost += cost;
      remaining -= used;
      prevLimit = tier.limit;
    }

    return {
      totalCost,
      avgPrice: kWh > 0 ? Math.round(totalCost / kWh) : 0,
      breakdown,
    };
  }

  // ========================================
  // HELPER: Tính tiền nước
  // ========================================
  async calculateWaterCost(
    cubicMeters: number,
    occupants: number,
  ): Promise<{
    totalCost: number;
    breakdown: {
      quotaFee: number;
      overQuotaFee: number;
      quota: number;
      used: number;
      overUsed: number;
    };
  }> {
    const perPerson = await this.getNumber('water_per_person_monthly', 30000);
    const quotaPerPerson = await this.getNumber('water_quota_per_person', 4);
    const overQuotaPrice = await this.getNumber('water_over_quota_price', 7000);

    const quotaFee = occupants * perPerson;
    const totalQuota = occupants * quotaPerPerson;
    const overUsed = Math.max(0, cubicMeters - totalQuota);
    const overQuotaFee = Math.round(overUsed * overQuotaPrice);

    return {
      totalCost: quotaFee + overQuotaFee,
      breakdown: {
        quotaFee,
        overQuotaFee,
        quota: totalQuota,
        used: cubicMeters,
        overUsed,
      },
    };
  }

  // ========================================
  // GET GROUPED (cho frontend hiển thị tabs)
  // ========================================
  async getGrouped() {
    const all = await this.findAll();

    const electricity = all.filter((s) => s.key.startsWith('electricity_'));
    const water = all.filter((s) => s.key.startsWith('water_'));
    const priority = all.filter((s) => s.key.startsWith('priority_'));
    const other = all.filter(
      (s) =>
        !s.key.startsWith('electricity_') &&
        !s.key.startsWith('water_') &&
        !s.key.startsWith('priority_'),
    );

    return { electricity, water, priority, other };
  }
}