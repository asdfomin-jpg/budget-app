import { months } from "./constants";

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return new Date(dateString);
  }

  return new Date(year, month - 1, day);
}

export function getMonthIndex(monthName: string) {
  return months.indexOf(monthName);
}

export function getPreviousMonthInfo(year: number, monthName: string) {
  const monthIndex = getMonthIndex(monthName);

  if (monthIndex <= 0) {
    return {
      year: year - 1,
      month: months[11],
    };
  }

  return {
    year,
    month: months[monthIndex - 1],
  };
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function buildNextMonthDueDate(
  sourceDate: string,
  targetYear: number,
  targetMonth: string
) {
  const source = parseLocalDate(sourceDate);
  const targetMonthIndex = getMonthIndex(targetMonth);
  const safeDay = Math.min(source.getDate(), getDaysInMonth(targetYear, targetMonthIndex));
  const monthValue = String(targetMonthIndex + 1).padStart(2, "0");
  const dayValue = String(safeDay).padStart(2, "0");

  return `${targetYear}-${monthValue}-${dayValue}`;
}

export function getWeekFromDate(dateString: string) {
  const date = parseLocalDate(dateString);
  const day = date.getDate();

  if (day <= 7) return "Week 1";
  if (day <= 14) return "Week 2";
  if (day <= 21) return "Week 3";
  if (day <= 28) return "Week 4";
  return "Week 5";
}

export function formatDate(
  dateString: string,
  format: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
) {
  const d = parseLocalDate(dateString);
  if (Number.isNaN(d.getTime())) return dateString;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  return `${month}/${day}/${year}`;
}