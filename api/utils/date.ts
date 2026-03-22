/**
 * 日期处理工具函数
 */

/**
 * 解析日期字符串
 */
export function parseDate(dateStr: string | Date | undefined | null): Date | undefined {
  if (!dateStr) return undefined;
  if (dateStr instanceof Date) return dateStr;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

/**
 * 格式化日期为ISO字符串（仅日期部分）
 */
export function formatDate(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
}

/**
 * 格式化日期时间为ISO字符串
 */
export function formatDateTime(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * 获取当前日期时间
 */
export function now(): Date {
  return new Date();
}

/**
 * 比较两个日期
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(
  date1: Date | string | undefined | null,
  date2: Date | string | undefined | null
): number {
  const d1 = date1 ? (date1 instanceof Date ? date1 : new Date(date1)) : null;
  const d2 = date2 ? (date2 instanceof Date ? date2 : new Date(date2)) : null;
  
  if (!d1 && !d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;
  
  if (isNaN(d1.getTime()) && isNaN(d2.getTime())) return 0;
  if (isNaN(d1.getTime())) return -1;
  if (isNaN(d2.getTime())) return 1;
  
  return d1.getTime() - d2.getTime();
}

/**
 * 检查日期是否在范围内
 */
export function isDateInRange(
  date: Date | string,
  from?: Date | string,
  to?: Date | string
): boolean {
  const d = date instanceof Date ? date : new Date(date);
  
  if (from) {
    const f = from instanceof Date ? from : new Date(from);
    if (d < f) return false;
  }
  
  if (to) {
    const t = to instanceof Date ? to : new Date(to);
    if (d > t) return false;
  }
  
  return true;
}

/**
 * 检查关系在指定日期是否有效
 */
export function isRelationshipActiveAt(
  startDate: Date | string | undefined | null,
  endDate: Date | string | undefined | null,
  asOfDate: Date | string
): boolean {
  const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  
  if (startDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    if (asOf < start) return false;
  }
  
  if (endDate) {
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    if (asOf > end) return false;
  }
  
  return true;
}

/**
 * 计算年龄
 */
export function calculateAge(
  birthDate: Date | string,
  asOfDate: Date | string = new Date()
): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 获取默认的as_of日期（当前时间）
 */
export function getDefaultAsOfDate(): Date {
  return new Date();
}
