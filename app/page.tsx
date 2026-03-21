"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { years, months, STORAGE_KEYS } from "../lib/constants";
import {
  parseLocalDate,
  buildNextMonthDueDate,
  formatDate,
  getPreviousMonthInfo,
  getWeekFromDate,
} from "../lib/dateUtils";
import { getRowCopyKey, getTargetMonthCopyKey } from "../lib/copyKeys";

import type {
  PaymentRow,
  PaymentForm,
  SettingsState,
  ViewMode,
  SortField,
  SortDirection,
} from "../types/budget";
import { viewModes } from "../types/budget";

function normalizeSavedView(value: string | null): ViewMode {
  if (value && (viewModes as readonly string[]).includes(value)) {
    return value as ViewMode;
  }
  return "Month";
}

function emptyForm(): PaymentForm {
  return {
    type: "Bill",
    name: "",
    dueDate: "",
    currentAmount: "",
    carryOver: "0",
    creditMinPayment: "",
    creditBalance: "",
  };
}

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState("March");
  const [selectedView, setSelectedView] = useState<ViewMode>("Month");

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    theme: "light",
    paidRowColor: "#dcfce7",

    pageScale: 96,
    menuScale: 82,
    tableScale: 90,
    formScale: 88,

    dateFormat: "MM/DD/YYYY",

    showYears: true,
    showMonths: true,
    showWeeks: true,
    showSummary: true,

    yearsScale: 100,
    monthsScale: 100,
    weeksScale: 100,
    actionsScale: 100,
  });

  const [rows, setRows] = useState<PaymentRow[]>([
    {
      year: 2026,
      month: "March",
      week: "Week 1",
      type: "Bill",
      name: "Rent",
      dueDate: "2026-03-01",
      currentAmount: 1500,
      carryOver: 0,
      totalDue: 1500,
      isPaid: true,
      isConfirmed: true,
      isActive: true,
      paidAmount: 1500,
      paidDate: "2026-03-01",
    },
    {
      year: 2026,
      month: "March",
      week: "Week 2",
      type: "Bill",
      name: "Electric",
      dueDate: "2026-03-10",
      currentAmount: 120,
      carryOver: 30,
      totalDue: 150,
      isPaid: false,
      isConfirmed: true,
      isActive: true,
    },
    {
      year: 2026,
      month: "March",
      week: "Week 2",
      type: "Bill",
      name: "Internet",
      dueDate: "2026-03-12",
      currentAmount: 80,
      carryOver: 0,
      totalDue: 80,
      isPaid: true,
      isConfirmed: true,
      isActive: true,
      paidAmount: 80,
      paidDate: "2026-03-12",
    },
    {
      year: 2026,
      month: "March",
      week: "Week 3",
      type: "Credit",
      name: "Chase Card",
      dueDate: "2026-03-18",
      currentAmount: 200,
      carryOver: 50,
      totalDue: 250,
      isPaid: false,
      isConfirmed: true,
      isActive: true,
      creditMinPayment: 40,
      creditBalance: 3200,
    },
    {
      year: 2026,
      month: "March",
      week: "Week 4",
      type: "Credit",
      name: "Capital One",
      dueDate: "2026-03-23",
      currentAmount: 150,
      carryOver: 0,
      totalDue: 150,
      isPaid: true,
      isConfirmed: true,
      isActive: true,
      paidAmount: 150,
      paidDate: "2026-03-23",
      creditMinPayment: 35,
      creditBalance: 1800,
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [paidModalIndex, setPaidModalIndex] = useState<number | null>(null);
  const [paidForm, setPaidForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const didLoadRef = useRef(false);
  const rowsRef = useRef<PaymentRow[]>(rows);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    try {
      const savedRows = localStorage.getItem(STORAGE_KEYS.rows);
      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      const savedYear = localStorage.getItem(STORAGE_KEYS.selectedYear);
      const savedMonth = localStorage.getItem(STORAGE_KEYS.selectedMonth);
      const savedView = localStorage.getItem(STORAGE_KEYS.selectedView);

      if (savedRows) {
        const parsedRows = JSON.parse(savedRows) as PaymentRow[];
        if (Array.isArray(parsedRows)) {
          setRows(parsedRows);
        }
      }

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as Partial<SettingsState>;
        setSettings((prev) => ({ ...prev, ...parsedSettings }));
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = months[now.getMonth()];

      if (years.includes(currentYear)) {
        setSelectedYear(currentYear);
        setSelectedMonth(currentMonth);
      } else {
        if (savedYear) {
          const parsedYear = Number(savedYear);
          if (!Number.isNaN(parsedYear) && years.includes(parsedYear)) {
            setSelectedYear(parsedYear);
          }
        }

        if (savedMonth && months.includes(savedMonth)) {
          setSelectedMonth(savedMonth);
        }
      }

      setSelectedView(normalizeSavedView(savedView));
    } catch (error) {
      console.error("Failed to load saved budget data", error);
    } finally {
      didLoadRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!didLoadRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.rows, JSON.stringify(rows));
    } catch (error) {
      console.error("Failed to save rows", error);
    }
  }, [rows]);

  useEffect(() => {
    if (!didLoadRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings", error);
    }
  }, [settings]);

  useEffect(() => {
    if (!didLoadRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.selectedYear, String(selectedYear));
      localStorage.setItem(STORAGE_KEYS.selectedMonth, selectedMonth);
      localStorage.setItem(STORAGE_KEYS.selectedView, selectedView);
    } catch (error) {
      console.error("Failed to save selection state", error);
    }
  }, [selectedYear, selectedMonth, selectedView]);

  useEffect(() => {
    if (!didLoadRef.current) return;

    const currentRows = rowsRef.current;
    const previous = getPreviousMonthInfo(selectedYear, selectedMonth);

    const previousMonthRows = currentRows.filter(
      (row) => row.year === previous.year && row.month === previous.month
    );

    if (previousMonthRows.length === 0) return;

    const currentMonthRows = currentRows.filter(
      (row) => row.year === selectedYear && row.month === selectedMonth
    );

    const existingRowsByKey = new Map(
      currentMonthRows.map((row) => [getRowCopyKey(row), row] as const)
    );

    const rowsToAdd: PaymentRow[] = [];
    const updatesByKey = new Map<string, Partial<PaymentRow>>();

    previousMonthRows.forEach((row) => {
      const paidAmount = row.paidAmount ?? 0;
      const unpaidBalance = Math.max(row.totalDue - paidAmount, 0);
      const nextDueDate = buildNextMonthDueDate(
        row.dueDate,
        selectedYear,
        selectedMonth
      );
      const targetKey = getTargetMonthCopyKey(
        row,
        selectedYear,
        selectedMonth
      );

      const existing = existingRowsByKey.get(targetKey);

      if (!existing) {
        rowsToAdd.push({
          year: selectedYear,
          month: selectedMonth,
          week: getWeekFromDate(nextDueDate),
          type: row.type,
          name: row.name,
          dueDate: nextDueDate,
          currentAmount: row.currentAmount,
          carryOver: unpaidBalance,
          totalDue: row.currentAmount + unpaidBalance,
          isPaid: false,
          isConfirmed: false,
          isActive: false,
          paidAmount: undefined,
          paidDate: undefined,
          creditMinPayment: row.creditMinPayment,
          creditBalance: row.creditBalance,
        });
        return;
      }

      if (!existing.isPaid && !existing.isConfirmed) {
        updatesByKey.set(targetKey, {
          week: getWeekFromDate(nextDueDate),
          dueDate: nextDueDate,
          currentAmount: row.currentAmount,
          carryOver: unpaidBalance,
          totalDue: row.currentAmount + unpaidBalance,
          creditMinPayment: row.creditMinPayment,
          creditBalance: row.creditBalance,
        });
      }
    });

    if (rowsToAdd.length === 0 && updatesByKey.size === 0) return;

    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.year !== selectedYear || row.month !== selectedMonth) {
          return row;
        }

        const key = getRowCopyKey(row);
        const patch = updatesByKey.get(key);

        if (!patch) return row;
        if (row.isPaid || row.isConfirmed) return row;

        return {
          ...row,
          ...patch,
        };
      });

      return [...updated, ...rowsToAdd];
    });
  }, [selectedYear, selectedMonth]);

  const toggleSort = (field: Exclude<SortField, null>) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: Exclude<SortField, null>) => {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "▲" : "▼";
  };

  const openAdd = () => {
    setEditingIndex(null);
    setForm(emptyForm());
    setShowSuggestions(false);
    setIsAddOpen(true);
  };

  const openEdit = (originalIndex: number) => {
    const row = rows[originalIndex];
    setEditingIndex(originalIndex);
    setForm({
      type: row.type,
      name: row.name,
      dueDate: row.dueDate,
      currentAmount: String(row.currentAmount),
      carryOver: String(row.carryOver),
      creditMinPayment:
        row.creditMinPayment !== undefined ? String(row.creditMinPayment) : "",
      creditBalance:
        row.creditBalance !== undefined ? String(row.creditBalance) : "",
    });
    setShowSuggestions(false);
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setEditingIndex(null);
    setShowSuggestions(false);
  };

  const deleteRow = (originalIndex: number) => {
    setRows((prev) => prev.filter((_, index) => index !== originalIndex));
  };

  const openPaidModal = (originalIndex: number) => {
    const row = rows[originalIndex];
    setPaidModalIndex(originalIndex);
    setPaidForm({
      amount: String(row.paidAmount ?? row.totalDue),
      date: row.paidDate ?? new Date().toISOString().slice(0, 10),
    });
  };

  const closePaidModal = () => {
    setPaidModalIndex(null);
    setPaidForm({
      amount: "",
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const savePaidModal = () => {
    if (paidModalIndex === null) return;

    const amount = Number(paidForm.amount);
    if (Number.isNaN(amount) || amount < 0) {
      alert("Paid Amount must be a valid number");
      return;
    }

    if (!paidForm.date) {
      alert("Please select a Paid Date");
      return;
    }

    setRows((prev) =>
      prev.map((row, index) =>
        index === paidModalIndex
          ? { ...row, isPaid: true, paidAmount: amount, paidDate: paidForm.date }
          : row
      )
    );

    closePaidModal();
  };

  const togglePaid = (originalIndex: number) => {
    const row = rows[originalIndex];

    if (row.isPaid) {
      setRows((prev) =>
        prev.map((item, index) =>
          index === originalIndex
            ? { ...item, isPaid: false, paidAmount: undefined, paidDate: undefined }
            : item
        )
      );
      return;
    }

    openPaidModal(originalIndex);
  };

  const toggleConfirm = (originalIndex: number) => {
    setRows((prev) =>
      prev.map((row, index) =>
        index === originalIndex
          ? { ...row, isConfirmed: !row.isConfirmed, isActive: !row.isConfirmed }
          : row
      )
    );
  };

  const saveAdd = () => {
    const name = form.name.trim();
    if (!name) {
      alert("Please enter a Name");
      return;
    }

    if (!form.dueDate) {
      alert("Please select a Due Date");
      return;
    }

    const currentAmount = Number(form.currentAmount);
    const formCarryOver = Number(form.carryOver || 0);

    if (Number.isNaN(currentAmount) || currentAmount < 0) {
      alert("Current Amount must be a valid number");
      return;
    }

    if (Number.isNaN(formCarryOver) || formCarryOver < 0) {
      alert("Carry Over must be a valid number");
      return;
    }

    const dueDateObj = parseLocalDate(form.dueDate);
    const rowYear = dueDateObj.getFullYear();
    const rowMonth = months[dueDateObj.getMonth()];
    const rowWeek = getWeekFromDate(form.dueDate);
    const existingRow = editingIndex !== null ? rows[editingIndex] : null;

    const rowCarryOver = editingIndex !== null ? formCarryOver : 0;

    const newRow: PaymentRow = {
      year: rowYear,
      month: rowMonth,
      week: rowWeek,
      type: form.type,
      name,
      dueDate: form.dueDate,
      currentAmount,
      carryOver: rowCarryOver,
      totalDue: currentAmount + rowCarryOver,
      isPaid: existingRow?.isPaid ?? false,
      isConfirmed: existingRow?.isConfirmed ?? true,
      isActive: existingRow?.isActive ?? true,
      paidAmount: existingRow?.paidAmount,
      paidDate: existingRow?.paidDate,
    };

    if (form.type === "Credit") {
      const minPay = form.creditMinPayment ? Number(form.creditMinPayment) : undefined;
      const balance = form.creditBalance ? Number(form.creditBalance) : undefined;

      if (minPay !== undefined && !Number.isNaN(minPay)) newRow.creditMinPayment = minPay;
      if (balance !== undefined && !Number.isNaN(balance)) newRow.creditBalance = balance;
    }

    if (editingIndex !== null) {
      setRows((prev) => prev.map((row, index) => (index === editingIndex ? newRow : row)));
    } else {
      setRows((prev) => [...prev, newRow]);
    }

    setIsAddOpen(false);
    setEditingIndex(null);
    setShowSuggestions(false);
  };

  const visibleRows = useMemo(() => {
    let filtered = rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        if (row.year !== selectedYear) return false;
        if (row.month !== selectedMonth) return false;

        if (selectedView === "Month") return true;
        if (selectedView === "Credit") return row.type === "Credit";

        return row.week === selectedView;
      });

    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortField === "dueDate") {
        aVal = parseLocalDate(a.row.dueDate).getTime();
        bVal = parseLocalDate(b.row.dueDate).getTime();
      } else if (sortField === "name") {
        aVal = a.row.name.toLowerCase();
        bVal = b.row.name.toLowerCase();
      } else {
        aVal = a.row.type;
        bVal = b.row.type;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, selectedYear, selectedMonth, selectedView, sortField, sortDirection]);

  const summary = useMemo(() => {
    const bills = visibleRows.filter((item) => item.row.type === "Bill");
    const credits = visibleRows.filter((item) => item.row.type === "Credit");

    const sumTotal = (items: typeof visibleRows) =>
      items.reduce((sum, item) => sum + item.row.totalDue, 0);

    const sumPaid = (items: typeof visibleRows) =>
      items
        .filter((item) => item.row.isPaid)
        .reduce((sum, item) => sum + (item.row.paidAmount ?? item.row.totalDue), 0);

    const billsTotal = sumTotal(bills);
    const billsPaid = sumPaid(bills);
    const billsRemaining = billsTotal - billsPaid;

    const creditsTotal = sumTotal(credits);
    const creditsPaid = sumPaid(credits);
    const creditsRemaining = creditsTotal - creditsPaid;

    const grandTotal = billsTotal + creditsTotal;
    const grandPaid = billsPaid + creditsPaid;
    const grandRemaining = grandTotal - grandPaid;

    return {
      billsTotal,
      billsPaid,
      billsRemaining,
      creditsTotal,
      creditsPaid,
      creditsRemaining,
      grandTotal,
      grandPaid,
      grandRemaining,
    };
  }, [visibleRows]);

  const savedBillNames = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .filter((row) => row.type === "Bill")
          .map((row) => row.name.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const savedCreditNames = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .filter((row) => row.type === "Credit")
          .map((row) => row.name.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const currentNameSuggestions = useMemo(() => {
    const source = form.type === "Bill" ? savedBillNames : savedCreditNames;
    const query = form.name.trim().toLowerCase();

    if (!query) return source.slice(0, 8);

    return source.filter((name) => name.toLowerCase().includes(query)).slice(0, 8);
  }, [form.type, form.name, savedBillNames, savedCreditNames]);

  const getThemeColors = () => {
    if (settings.theme === "dark") {
      return {
        pageBg: "#111827",
        cardBg: "#1f2937",
        cardBorder: "#374151",
        text: "#f9fafb",
        subText: "#9ca3af",
        tableBg: "#111827",
        rowAlt: "#1f2937",
        rowNormal: "#111827",
        headerBg: "#374151",
        border: "#4b5563",
        inputBg: "#111827",
        suggestionBg: "#1f2937",
        suggestionHover: "#374151",
      };
    }

    return {
      pageBg: "#f3f6fb",
      cardBg: "#ffffff",
      cardBorder: "#dbe2ea",
      text: "#111827",
      subText: "#6b7280",
      tableBg: "#ffffff",
      rowAlt: "#fafafa",
      rowNormal: "#ffffff",
      headerBg: "#f3f4f6",
      border: "#d1d5db",
      inputBg: "#ffffff",
      suggestionBg: "#ffffff",
      suggestionHover: "#f9fafb",
    };
  };

  const colors = getThemeColors();
  const pageScaleFactor = settings.pageScale / 100;
  const menuScaleFactor = settings.menuScale / 100;
  const tableScaleFactor = settings.tableScale / 100;
  const formScaleFactor = settings.formScale / 100;

  const yearsScaleFactor = settings.yearsScale / 100;
  const monthsScaleFactor = settings.monthsScale / 100;
  const weeksScaleFactor = settings.weeksScale / 100;
  const actionsScaleFactor = settings.actionsScale / 100;

  const navButton = (
    active: boolean,
    activeColor = "#1d4ed8",
    inactiveColor = "#e5e7eb",
    scale = 1
  ) => ({
    padding: `${6 * menuScaleFactor * scale}px ${10 * menuScaleFactor * scale}px`,
    borderRadius: "6px",
    border: active ? `1px solid ${activeColor}` : `1px solid ${colors.border}`,
    cursor: "pointer",
    background: active ? activeColor : inactiveColor,
    color: active ? "#ffffff" : "#111827",
    fontWeight: 600,
    fontSize: `${12 * menuScaleFactor * scale}px`,
    lineHeight: 1.1,
  });

  const tableHeaderStyle = {
    borderBottom: `1px solid ${colors.border}`,
    padding: `${10 * tableScaleFactor}px ${12 * tableScaleFactor}px`,
    textAlign: "left" as const,
    fontWeight: 700,
    backgroundColor: colors.headerBg,
    color: colors.text,
    fontSize: `${13 * tableScaleFactor}px`,
    position: "sticky" as const,
    top: 0,
    zIndex: 1,
    cursor: "pointer",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
  };

  const tableCellStyle = {
    borderBottom: `1px solid ${colors.border}`,
    padding: `${10 * tableScaleFactor}px ${12 * tableScaleFactor}px`,
    fontSize: `${13 * tableScaleFactor}px`,
    color: colors.text,
  };

  const inputStyle = {
    padding: `${10 * formScaleFactor}px ${12 * formScaleFactor}px`,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: `${14 * formScaleFactor}px`,
    width: "100%",
    boxSizing: "border-box" as const,
    background: colors.inputBg,
    color: colors.text,
  };

  const actionButtonStyle = (bg: string, color: string = "white") => ({
    padding: `${6 * formScaleFactor}px ${10 * formScaleFactor}px`,
    borderRadius: 6,
    border: "none",
    background: bg,
    color,
    cursor: "pointer",
    fontSize: `${12 * formScaleFactor}px`,
    fontWeight: 700,
  });

  const summaryTitle = `${selectedMonth} • ${selectedView}`;

  const StatCard = ({
    title,
    total,
    paid,
    remaining,
    accent,
  }: {
    title: string;
    total: number;
    paid: number;
    remaining: number;
    accent: string;
  }) => (
    <div
      style={{
        padding: `${10 * formScaleFactor}px ${12 * formScaleFactor}px`,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: colors.cardBg,
        minWidth: 210,
      }}
    >
      <div
        style={{
          fontSize: `${11 * formScaleFactor}px`,
          color: colors.subText,
          marginBottom: 6,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ color: colors.text, fontSize: `${13 * formScaleFactor}px` }}>
          Total: <strong>${total}</strong>
        </div>
        <div style={{ color: "#16a34a", fontSize: `${13 * formScaleFactor}px` }}>
          Paid: <strong>${paid}</strong>
        </div>
        <div style={{ color: accent, fontSize: `${13 * formScaleFactor}px` }}>
          Remaining: <strong>${remaining}</strong>
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        height: "100vh",
        background: colors.pageBg,
        padding: "8px 12px",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          transform: `scale(${pageScaleFactor})`,
          transformOrigin: "top center",
          height: `${100 / pageScaleFactor}%`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginBottom: 10,
              fontSize: `${12 * menuScaleFactor}px`,
              fontWeight: 700,
              color: colors.subText,
            }}
          >
            <span style={{ cursor: "default" }}>File</span>
            <span style={{ cursor: "default" }}>View</span>
            <span
              onClick={() => setSettingsOpen(true)}
              style={{ cursor: "pointer" }}
            >
              Settings
            </span>
          </div>

          {settings.showYears && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    style={navButton(selectedYear === year, "#1d4ed8", "#e5e7eb", yearsScaleFactor)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.showMonths && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {months.map((month) => (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    style={navButton(
                      selectedMonth === month,
                      "#0f766e",
                      "#ecfeff",
                      monthsScaleFactor
                    )}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}></div>

              <div>
                <button
                  onClick={openAdd}
                  style={{
                    padding: `${7 * menuScaleFactor * actionsScaleFactor}px ${11 * menuScaleFactor * actionsScaleFactor}px`,
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: `${12 * menuScaleFactor * actionsScaleFactor}px`,
                  }}
                >
                  + Add Payment
                </button>
              </div>
            </div>
          </div>

          {settings.showWeeks && (
            <div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {viewModes.map((view) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view)}
                    style={navButton(
                      selectedView === view,
                      view === "Credit"
                        ? "#7c3aed"
                        : view === "Month"
                        ? "#2563eb"
                        : "#ea580c",
                      view === "Credit"
                        ? "#f3e8ff"
                        : view === "Month"
                        ? "#dbeafe"
                        : "#fff7ed",
                      weeksScaleFactor
                    )}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {settings.showSummary && (
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 12,
              padding: 10,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              position: "sticky",
              top: 122,
              zIndex: 20,
            }}
          >
            <div
              style={{
                fontSize: `${15 * formScaleFactor}px`,
                fontWeight: 800,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {summaryTitle}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatCard
                title="Bills"
                total={summary.billsTotal}
                paid={summary.billsPaid}
                remaining={summary.billsRemaining}
                accent="#dc2626"
              />
              <StatCard
                title="Credits"
                total={summary.creditsTotal}
                paid={summary.creditsPaid}
                remaining={summary.creditsRemaining}
                accent="#7c3aed"
              />
              <StatCard
                title="Total"
                total={summary.grandTotal}
                paid={summary.grandPaid}
                remaining={summary.grandRemaining}
                accent="#2563eb"
              />
            </div>
          </div>
        )}

        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 12,
            padding: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            height: settings.showSummary ? "calc(100vh - 250px)" : "calc(100vh - 185px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              flex: 1,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: colors.tableBg,
                minWidth: selectedView === "Credit" ? 1200 : 1100,
              }}
            >
              <thead>
                {selectedView === "Credit" ? (
                  <tr>
                    <th style={tableHeaderStyle} onClick={() => toggleSort("name")}>
                      Name {getSortIcon("name")}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => toggleSort("dueDate")}>
                      Due Date {getSortIcon("dueDate")}
                    </th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Payment Amount</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Carry Over</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Total Due</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Min Payment</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Balance</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Paid</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Confirm</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={tableHeaderStyle} onClick={() => toggleSort("type")}>
                      Type {getSortIcon("type")}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => toggleSort("name")}>
                      Name {getSortIcon("name")}
                    </th>
                    <th style={tableHeaderStyle} onClick={() => toggleSort("dueDate")}>
                      Due Date {getSortIcon("dueDate")}
                    </th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Current Amount</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Carry Over</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Total Due</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Paid</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Confirm</th>
                    <th style={{ ...tableHeaderStyle, cursor: "default" }}>Actions</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedView === "Credit" ? 10 : 9}
                      style={{
                        padding: "28px",
                        textAlign: "center",
                        color: colors.subText,
                        fontSize: "14px",
                      }}
                    >
                      No records for this selection.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(({ row, originalIndex }, index) => (
                    <tr
                      key={`${row.name}-${index}`}
                      style={{
                        background: row.isPaid
                          ? settings.paidRowColor
                          : index % 2 === 0
                          ? colors.rowNormal
                          : colors.rowAlt,
                        opacity: row.isActive ? 1 : 0.72,
                      }}
                    >
                      {selectedView === "Credit" ? (
                        <>
                          <td style={tableCellStyle}>{row.name}</td>
                          <td style={tableCellStyle}>
                            {formatDate(row.dueDate, settings.dateFormat)}
                          </td>
                          <td style={tableCellStyle}>${row.currentAmount}</td>
                          <td style={tableCellStyle}>${row.carryOver}</td>
                          <td style={tableCellStyle}>${row.totalDue}</td>
                          <td style={tableCellStyle}>{row.creditMinPayment ?? ""}</td>
                          <td style={tableCellStyle}>{row.creditBalance ?? ""}</td>
                          <td style={tableCellStyle}>
                            <button
                              onClick={() => togglePaid(originalIndex)}
                              style={actionButtonStyle(row.isPaid ? "#16a34a" : "#dc2626")}
                            >
                              {row.isPaid ? `Paid $${row.paidAmount ?? row.totalDue}` : "Not Paid"}
                            </button>
                          </td>
                          <td style={tableCellStyle}>
                            <button
                              onClick={() => toggleConfirm(originalIndex)}
                              disabled={row.isConfirmed}
                              style={{
                                ...actionButtonStyle(row.isConfirmed ? "#2563eb" : "#f59e0b"),
                                opacity: row.isConfirmed ? 0.9 : 1,
                                cursor: row.isConfirmed ? "default" : "pointer",
                              }}
                            >
                              {row.isConfirmed ? "Confirmed" : "Needs Confirm"}
                            </button>
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => openEdit(originalIndex)} style={actionButtonStyle("#2563eb")}>
                                Edit
                              </button>
                              <button onClick={() => deleteRow(originalIndex)} style={actionButtonStyle("#dc2626")}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tableCellStyle}>{row.type}</td>
                          <td style={tableCellStyle}>{row.name}</td>
                          <td style={tableCellStyle}>
                            {formatDate(row.dueDate, settings.dateFormat)}
                          </td>
                          <td style={tableCellStyle}>${row.currentAmount}</td>
                          <td style={tableCellStyle}>${row.carryOver}</td>
                          <td style={tableCellStyle}>${row.totalDue}</td>
                          <td style={tableCellStyle}>
                            <button
                              onClick={() => togglePaid(originalIndex)}
                              style={actionButtonStyle(row.isPaid ? "#16a34a" : "#dc2626")}
                            >
                              {row.isPaid ? `Paid $${row.paidAmount ?? row.totalDue}` : "Not Paid"}
                            </button>
                          </td>
                          <td style={tableCellStyle}>
                            <button
                              onClick={() => toggleConfirm(originalIndex)}
                              disabled={row.isConfirmed}
                              style={{
                                ...actionButtonStyle(row.isConfirmed ? "#2563eb" : "#f59e0b"),
                                opacity: row.isConfirmed ? 0.9 : 1,
                                cursor: row.isConfirmed ? "default" : "pointer",
                              }}
                            >
                              {row.isConfirmed ? "Confirmed" : "Needs Confirm"}
                            </button>
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => openEdit(originalIndex)} style={actionButtonStyle("#2563eb")}>
                                Edit
                              </button>
                              <button onClick={() => deleteRow(originalIndex)} style={actionButtonStyle("#dc2626")}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isAddOpen && (
          <div
            onClick={closeAdd}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                background: colors.cardBg,
                color: colors.text,
                borderRadius: 12,
                padding: `${16 * formScaleFactor}px`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h2 style={{ fontSize: `${18 * formScaleFactor}px`, fontWeight: 800 }}>
                  {editingIndex !== null ? "Edit Payment" : "Add Payment"}
                </h2>
                <button
                  onClick={closeAdd}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: `${18 * formScaleFactor}px`,
                    cursor: "pointer",
                    color: colors.text,
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                    Type
                  </span>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, type: e.target.value as "Bill" | "Credit" }))
                    }
                    style={inputStyle}
                  >
                    <option value="Bill">Bill</option>
                    <option value="Credit">Credit</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6, position: "relative" }}>
                  <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                    Name
                  </span>
                  <input
                    value={form.name}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, name: e.target.value }));
                      setShowSuggestions(true);
                    }}
                    placeholder="e.g., Rent"
                    style={inputStyle}
                  />

                  {showSuggestions && currentNameSuggestions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: colors.suggestionBg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        overflow: "hidden",
                        zIndex: 20,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                    >
                      {currentNameSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setForm((p) => ({ ...p, name }));
                            setShowSuggestions(false);
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: `${9 * formScaleFactor}px ${12 * formScaleFactor}px`,
                            border: "none",
                            background: colors.suggestionBg,
                            color: colors.text,
                            cursor: "pointer",
                            fontSize: `${13 * formScaleFactor}px`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.suggestionHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = colors.suggestionBg;
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                    Due Date
                  </span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                      Current Amount
                    </span>
                    <input
                      inputMode="decimal"
                      value={form.currentAmount}
                      onChange={(e) => setForm((p) => ({ ...p, currentAmount: e.target.value }))}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                      Carry Over
                    </span>
                    <input
                      inputMode="decimal"
                      value={form.carryOver}
                      onChange={(e) => setForm((p) => ({ ...p, carryOver: e.target.value }))}
                      placeholder="0"
                      style={inputStyle}
                    />
                  </label>
                </div>

                {form.type === "Credit" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                        Minimum Payment
                      </span>
                      <input
                        inputMode="decimal"
                        value={form.creditMinPayment}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, creditMinPayment: e.target.value }))
                        }
                        placeholder="optional"
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                        Credit Balance
                      </span>
                      <input
                        inputMode="decimal"
                        value={form.creditBalance}
                        onChange={(e) => setForm((p) => ({ ...p, creditBalance: e.target.value }))}
                        placeholder="optional"
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={closeAdd}
                    style={{
                      padding: `${9 * formScaleFactor}px ${12 * formScaleFactor}px`,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      cursor: "pointer",
                      color: colors.text,
                      fontSize: `${13 * formScaleFactor}px`,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAdd}
                    style={{
                      padding: `${9 * formScaleFactor}px ${12 * formScaleFactor}px`,
                      borderRadius: 8,
                      border: "none",
                      background: "#16a34a",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: `${13 * formScaleFactor}px`,
                    }}
                  >
                    {editingIndex !== null ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {paidModalIndex !== null && (
          <div
            onClick={closePaidModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 420,
                background: colors.cardBg,
                color: colors.text,
                borderRadius: 12,
                padding: `${16 * formScaleFactor}px`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: `${18 * formScaleFactor}px`, fontWeight: 800 }}>
                  Mark as Paid
                </h2>
                <button
                  onClick={closePaidModal}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: `${18 * formScaleFactor}px`,
                    cursor: "pointer",
                    color: colors.text,
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                    Paid Amount
                  </span>
                  <input
                    inputMode="decimal"
                    value={paidForm.amount}
                    onChange={(e) => setPaidForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: `${13 * formScaleFactor}px` }}>
                    Paid Date
                  </span>
                  <input
                    type="date"
                    value={paidForm.date}
                    onChange={(e) => setPaidForm((prev) => ({ ...prev, date: e.target.value }))}
                    style={inputStyle}
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={closePaidModal}
                    style={{
                      padding: `${9 * formScaleFactor}px ${12 * formScaleFactor}px`,
                      borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      cursor: "pointer",
                      color: colors.text,
                      fontSize: `${13 * formScaleFactor}px`,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePaidModal}
                    style={{
                      padding: `${9 * formScaleFactor}px ${12 * formScaleFactor}px`,
                      borderRadius: 8,
                      border: "none",
                      background: "#16a34a",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: `${13 * formScaleFactor}px`,
                    }}
                  >
                    Save Paid
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {settingsOpen && (
          <div
            onClick={() => setSettingsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 9999,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 620,
                maxHeight: "85vh",
                overflowY: "auto",
                background: colors.cardBg,
                color: colors.text,
                borderRadius: 12,
                padding: `${16 * formScaleFactor}px`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: `${18 * formScaleFactor}px`, fontWeight: 800 }}>
                  Settings
                </h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: `${18 * formScaleFactor}px`,
                    cursor: "pointer",
                    color: colors.text,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 800, color: colors.text }}>Appearance</div>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Theme</span>
                    <select
                      value={settings.theme}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          theme: e.target.value as SettingsState["theme"],
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Date Format</span>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dateFormat: e.target.value as SettingsState["dateFormat"],
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Paid Row Color</span>
                    <input
                      type="color"
                      value={settings.paidRowColor}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          paidRowColor: e.target.value,
                        }))
                      }
                      style={{
                        width: 80,
                        height: 42,
                        padding: 4,
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                        background: colors.inputBg,
                        cursor: "pointer",
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 800, color: colors.text }}>Layout</div>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Page Scale: {settings.pageScale}%</span>
                    <input
                      type="range"
                      min={80}
                      max={120}
                      step={2}
                      value={settings.pageScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          pageScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Menu Scale: {settings.menuScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      step={5}
                      value={settings.menuScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          menuScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Table Scale: {settings.tableScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      step={5}
                      value={settings.tableScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          tableScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Form Scale: {settings.formScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      step={5}
                      value={settings.formScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          formScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 800, color: colors.text }}>Menu Visibility</div>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.showYears}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          showYears: e.target.checked,
                        }))
                      }
                    />
                    <span>Show Years</span>
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.showMonths}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          showMonths: e.target.checked,
                        }))
                      }
                    />
                    <span>Show Months</span>
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.showWeeks}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          showWeeks: e.target.checked,
                        }))
                      }
                    />
                    <span>Show Weeks</span>
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={settings.showSummary}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          showSummary: e.target.checked,
                        }))
                      }
                    />
                    <span>Show Summary</span>
                  </label>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 800, color: colors.text }}>Custom</div>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Years Scale: {settings.yearsScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={5}
                      value={settings.yearsScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          yearsScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Months Scale: {settings.monthsScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={5}
                      value={settings.monthsScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          monthsScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Weeks Scale: {settings.weeksScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={5}
                      value={settings.weeksScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          weeksScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>Actions Scale: {settings.actionsScale}%</span>
                    <input
                      type="range"
                      min={70}
                      max={140}
                      step={5}
                      value={settings.actionsScale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          actionsScale: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      padding: `${9 * formScaleFactor}px ${12 * formScaleFactor}px`,
                      borderRadius: 8,
                      border: "none",
                      background: "#2563eb",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}