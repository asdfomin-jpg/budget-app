import type { PaymentRow } from "../types/budget";
import { buildNextMonthDueDate } from "./dateUtils";
export function getRowCopyKey(row: Pick<PaymentRow, "type" | "name" | "dueDate">) {
  const day = row.dueDate.split("-")[2] ?? row.dueDate;
  return `${row.type}__${row.name.trim().toLowerCase()}__${day}`;
}

export function getTargetMonthCopyKey(
  row: Pick<PaymentRow, "type" | "name" | "dueDate">,
  targetYear: number,
  targetMonth: string
) {
  return getRowCopyKey({
    type: row.type,
    name: row.name,
    dueDate: buildNextMonthDueDate(row.dueDate, targetYear, targetMonth),
  });
}
