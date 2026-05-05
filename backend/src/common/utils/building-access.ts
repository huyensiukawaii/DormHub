import { ForbiddenException } from '@nestjs/common';

/**
 * Trả về danh sách buildingId được phép truy cập.
 * - ADMIN: undefined  → không giới hạn
 * - STAFF: mảng (có thể rỗng nếu chưa được giao tòa nào)
 */
export function getAllowedBuildingIds(user: any): number[] | undefined {
  if (user?.role === 'STAFF') {
    return (user.assignedBuildingIds as number[]) ?? [];
  }
  return undefined;
}

/**
 * Throw ForbiddenException nếu buildingId không nằm trong danh sách được phép.
 * Nếu allowedBuildingIds là undefined (ADMIN), bỏ qua kiểm tra.
 */
export function assertAllowed(allowedBuildingIds: number[] | undefined, buildingId: number): void {
  if (allowedBuildingIds !== undefined && !allowedBuildingIds.includes(buildingId)) {
    throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của tòa này');
  }
}

/**
 * Shortcut: lấy danh sách allowed từ req.user rồi assert.
 */
export function assertBuildingAccess(user: any, buildingId: number): void {
  assertAllowed(getAllowedBuildingIds(user), buildingId);
}
