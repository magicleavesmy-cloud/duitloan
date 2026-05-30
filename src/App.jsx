import { useEffect, useRef, useState } from "react";
import {
  Bell, Home, Wallet, FileText, MoreHorizontal, Plus,
  House, Car, CreditCard, User, Landmark, Eye, EyeOff, X, Pencil, Trash2, Search
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, PieChart, Pie, Cell
} from "recharts";

const STORAGE_KEY = "duitloan.loans";
const REMINDER_ENABLED_KEY = "duitloan.reminderEnabled";
const REMINDER_NOTIFIED_KEY = "duitloan.lastNotified";

const initialLoans = [
  { id: "sample-house", name: "House Loan", bank: "Maybank", amount: 686000, monthly: 4491, paid: 43, type: "House", nextDueDate: "2026-06-01", annualInterestRate: 4.2, originalTenureYears: 35, remainingTenureYears: 22 },
  { id: "sample-car", name: "Car Loan", bank: "Public Bank", amount: 120000, monthly: 1200, paid: 65, type: "Car", nextDueDate: "2026-06-05", annualInterestRate: 3.1, originalTenureYears: 9, remainingTenureYears: 4 },
  { id: "sample-asb", name: "ASB Loan", bank: "Maybank", amount: 200000, monthly: 870, paid: 20, type: "ASB", nextDueDate: "2026-06-15", annualInterestRate: 4.0, originalTenureYears: 30, remainingTenureYears: 24 },
  { id: "sample-personal", name: "Personal Loan", bank: "CIMB Bank", amount: 35000, monthly: 1356, paid: 60, type: "Personal", nextDueDate: "2026-06-28", annualInterestRate: 7.5, originalTenureYears: 5, remainingTenureYears: 2 },
  { id: "sample-credit-card", name: "Credit Card", bank: "Maybank", amount: 12000, monthly: 500, paid: 80, type: "Credit Card", nextDueDate: "2026-06-10", annualInterestRate: 15, originalTenureYears: 3, remainingTenureYears: 1 },
];

const loanTypes = [
  { label: "House", icon: House },
  { label: "Car", icon: Car },
  { label: "ASB", icon: Landmark },
  { label: "Personal", icon: User },
  { label: "Credit Card", icon: CreditCard },
];

const filterTypes = ["All", ...loanTypes.map((type) => type.label)];

const repaymentTypes = [
  { value: "fixed", label: "Fixed loan" },
  { value: "flexi", label: "Flexi loan" },
];

const breakdownColors = {
  House: "#2563eb",
  Car: "#14b8a6",
  Personal: "#8b5cf6",
  ASB: "#22c55e",
  "Credit Card": "#f97316",
};

const chartData = [
  { month: "Jan", value: 900000 },
  { month: "Feb", value: 850000 },
  { month: "Mar", value: 790000 },
  { month: "Apr", value: 720000 },
  { month: "May", value: 686000 },
];

function formatRM(num) {
  return `RM ${Number(num || 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactRM(num) {
  return formatRM(num);
}

function formatInputCurrency(value) {
  if (value === "") {
    return "";
  }

  return Number(value || 0).toFixed(2);
}

function formatMonths(months) {
  if (!Number.isFinite(months) || months <= 0) {
    return "0 months";
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (!years) {
    return `${remainingMonths} mo`;
  }

  if (!remainingMonths) {
    return `${years} yr`;
  }

  return `${years} yr ${remainingMonths} mo`;
}

function formatDueDate(date) {
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
  });
}

function formatFullDueDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function createDueDate(year, month, dueDay) {
  const day = Math.min(Math.max(1, dueDay), daysInMonth(year, month));
  return new Date(year, month, day);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultNextDueDate(dueDay = 1, today = new Date()) {
  const currentDay = startOfDay(today);
  const thisMonthDue = createDueDate(currentDay.getFullYear(), currentDay.getMonth(), dueDay);
  const nextDue = currentDay <= thisMonthDue
    ? thisMonthDue
    : createDueDate(currentDay.getFullYear(), currentDay.getMonth() + 1, dueDay);

  return toDateInputValue(nextDue);
}

function addOneMonth(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const targetYear = date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
  const targetMonth = (date.getMonth() + 1) % 12;
  const targetDay = Math.min(date.getDate(), daysInMonth(targetYear, targetMonth));

  return toDateInputValue(new Date(targetYear, targetMonth, targetDay));
}

function addMonths(dateString, monthCount) {
  let nextDate = dateString;

  for (let index = 0; index < monthCount; index += 1) {
    nextDate = addOneMonth(nextDate);
  }

  return nextDate;
}

function getLoanDueStatus(loan, today = new Date()) {
  const currentDay = startOfDay(today);
  const dueDate = startOfDay(new Date(`${loan.nextDueDate}T00:00:00`));

  if (currentDay > dueDate) {
    const overdueDays = Math.ceil((currentDay - dueDate) / 86400000);
    return {
      date: dueDate,
      daysRemaining: 0,
      overdueDays,
      isOverdue: true,
      isDueSoon: false,
    };
  }

  const daysRemaining = Math.ceil((dueDate - currentDay) / 86400000);

  return {
    date: dueDate,
    daysRemaining,
    overdueDays: 0,
    isOverdue: false,
    isDueSoon: daysRemaining <= 3,
  };
}

function getLoanIcon(type) {
  return loanTypes.find((loanType) => loanType.label === type)?.icon || House;
}

function createLoanId() {
  return `loan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createPaymentId() {
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function estimateOriginalAmount(amount, paid) {
  if (paid <= 0) {
    return amount;
  }

  if (paid >= 100) {
    return amount;
  }

  return Math.round(amount / (1 - paid / 100));
}

function calculatePaidPercent(amount, originalAmount) {
  if (!originalAmount) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((originalAmount - amount) / originalAmount) * 100));
}

function getLoanProgress(loan) {
  return calculatePaidPercent(loan.amount, loan.originalAmount || loan.amount);
}

function formatProgress(value) {
  return value < 10 && value > 0 ? value.toFixed(1) : Math.round(value);
}

function normalizePayment(payment) {
  const amount = Number(payment.amount) || 0;

  return {
    id: payment.id || createPaymentId(),
    amount,
    normalPayment: Number(payment.normalPayment) || amount,
    extraPayment: Number(payment.extraPayment) || 0,
    interestPortion: Number(payment.interestPortion) || 0,
    principalPortion: Number(payment.principalPortion) || amount,
    interestSaved: Number(payment.interestSaved) || 0,
    advancePaymentCredit: Number(payment.advancePaymentCredit) || 0,
    advancePaymentCreditBefore: Number(payment.advancePaymentCreditBefore) || 0,
    advancePaymentCreditAfter: Number(payment.advancePaymentCreditAfter) || 0,
    installmentCreditBefore: Number(payment.installmentCreditBefore) || 0,
    installmentCreditAfter: Number(payment.installmentCreditAfter) || 0,
    monthsAdvanced: Number(payment.monthsAdvanced) || 0,
    monthsCovered: Number(payment.monthsCovered) || Number(payment.monthsAdvanced) || 0,
    repaymentType: payment.repaymentType || "flexi",
    paymentType: payment.paymentType || "monthly",
    annualRate: Number(payment.annualRate) || 4.2,
    dueDateBefore: payment.dueDateBefore || "",
    dueDateAfter: payment.dueDateAfter || "",
    coveredDueStart: payment.coveredDueStart || "",
    coveredDueEnd: payment.coveredDueEnd || "",
    date: payment.date || new Date().toISOString().slice(0, 10),
    notes: payment.notes || "",
  };
}

function normalizeLoan(loan) {
  const amount = Number(loan.amount) || 0;
  const paid = Math.min(100, Math.max(0, Number(loan.paid) || 0));
  const originalAmount = Number(loan.originalAmount) || Number(loan.initialAmount) || estimateOriginalAmount(amount, paid);

  return {
    id: loan.id || createLoanId(),
    name: loan.name,
    bank: loan.bank,
    amount,
    originalAmount,
    monthly: Number(loan.monthly) || 0,
    nextDueDate: loan.nextDueDate || getDefaultNextDueDate(Number(loan.dueDay) || 1),
    annualInterestRate: loan.annualInterestRate === "" || loan.annualInterestRate === undefined
      ? ""
      : Number(loan.annualInterestRate),
    originalTenureYears: loan.originalTenureYears === "" || loan.originalTenureYears === undefined
      ? ""
      : Number(loan.originalTenureYears),
    remainingTenureYears: loan.remainingTenureYears === "" || loan.remainingTenureYears === undefined
      ? ""
      : Number(loan.remainingTenureYears),
    repaymentType: loan.repaymentType || "flexi",
    advancePaymentCredit: Number(loan.advancePaymentCredit) || 0,
    installmentCredit: Number(loan.installmentCredit) || 0,
    paid: calculatePaidPercent(amount, originalAmount),
    type: loan.type || "House",
    payments: Array.isArray(loan.payments) ? loan.payments.map(normalizePayment) : [],
  };
}

function loadLoans() {
  try {
    const savedLoans = localStorage.getItem(STORAGE_KEY);

    if (!savedLoans) {
      return [];
    }

    const parsedLoans = JSON.parse(savedLoans);

    if (!Array.isArray(parsedLoans)) {
      return [];
    }

    return parsedLoans.map(normalizeLoan);
  } catch {
    return [];
  }
}

function loadReminderEnabled() {
  return localStorage.getItem(REMINDER_ENABLED_KEY) === "true";
}

function loadLastNotified() {
  try {
    return JSON.parse(localStorage.getItem(REMINDER_NOTIFIED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLastNotified(lastNotified) {
  localStorage.setItem(REMINDER_NOTIFIED_KEY, JSON.stringify(lastNotified));
}

function calculatePayoff(balance, payment, annualRate, maxMonths = 2400) {
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  let currentBalance = Math.max(0, balance);
  let totalInterest = 0;
  let months = 0;

  if (currentBalance <= 0 || payment <= 0) {
    return { months: 0, interest: 0, paidOff: currentBalance <= 0, paymentTooLow: currentBalance > 0 };
  }

  if (monthlyRate > 0 && payment <= currentBalance * monthlyRate) {
    return { months: 0, interest: 0, paidOff: false, paymentTooLow: true };
  }

  while (currentBalance > 0.01 && months < maxMonths) {
    const interest = currentBalance * monthlyRate;
    const principal = payment - interest;

    if (principal <= 0) {
      return { months, interest: totalInterest, paidOff: false, paymentTooLow: true };
    }

    totalInterest += interest;
    currentBalance -= principal;
    months += 1;
  }

  return { months, interest: totalInterest, paidOff: currentBalance <= 0.01, paymentTooLow: false };
}

function estimateExtraInterestSaved(balance, monthlyPayment, annualRate, extraPayment, maxMonths) {
  if (extraPayment <= 0) {
    return 0;
  }

  const original = calculatePayoff(balance, monthlyPayment, annualRate, maxMonths);
  const withExtraPrincipal = calculatePayoff(Math.max(0, balance - extraPayment), monthlyPayment, annualRate, maxMonths);

  if (original.paymentTooLow || withExtraPrincipal.paymentTooLow) {
    return 0;
  }

  return Math.max(0, original.interest - withExtraPrincipal.interest);
}

function isFixedCycleCovered(loan) {
  return (loan.payments || []).some((payment) => (
    payment.repaymentType === "fixed"
    && payment.dueDateBefore
    && payment.dueDateAfter
    && payment.dueDateBefore <= loan.nextDueDate
    && payment.dueDateAfter > loan.nextDueDate
    && payment.monthsAdvanced > 0
  ));
}

function calculatePaymentBreakdown(loan, paymentAmount, annualRate, paymentType = "monthly") {
  const monthlyInterest = loan.amount * (Math.max(0, annualRate) / 100 / 12);
  const isFixed = loan.repaymentType === "fixed";
  const isFlexiExtraPrincipal = !isFixed && paymentType === "extra-principal";
  const addsInstallmentCredit = isFixed || paymentType === "monthly";
  const installmentCreditBefore = loan.installmentCredit || 0;
  const installmentCreditTotal = addsInstallmentCredit ? installmentCreditBefore + paymentAmount : installmentCreditBefore;
  const rawMonthsCovered = loan.monthly > 0 ? Math.floor(installmentCreditTotal / loan.monthly) : 0;
  const installmentCreditAfter = loan.monthly > 0 ? installmentCreditTotal % loan.monthly : installmentCreditTotal;

  if (isFlexiExtraPrincipal) {
    const remainingMonths = loan.remainingTenureYears ? Math.round(loan.remainingTenureYears * 12) : undefined;

    return {
      normalPayment: 0,
      extraPayment: paymentAmount,
      interestPortion: 0,
      principalPortion: Math.min(loan.amount, paymentAmount),
      interestSaved: remainingMonths ? estimateExtraInterestSaved(loan.amount, loan.monthly, annualRate, paymentAmount, remainingMonths) : 0,
      advancePaymentCredit: 0,
      advancePaymentCreditBefore: loan.advancePaymentCredit || 0,
      advancePaymentCreditAfter: loan.advancePaymentCredit || 0,
      monthsAdvanced: 0,
      monthsCovered: 0,
      installmentCreditBefore,
      installmentCreditAfter,
      paymentTooLow: false,
    };
  }

  const currentCycleCovered = isFixedCycleCovered(loan);
  const normalPayment = isFixed && currentCycleCovered ? 0 : Math.min(paymentAmount, loan.monthly);
  const extraPayment = Math.max(0, paymentAmount - normalPayment);
  const interestPortion = Math.min(normalPayment, monthlyInterest);
  const normalPrincipal = Math.max(0, normalPayment - interestPortion);
  const monthsAdvanced = isFixed ? rawMonthsCovered : 0;
  const advancePaymentCreditAfter = isFixed ? installmentCreditAfter : (loan.advancePaymentCredit || 0);
  const advancePaymentCredit = isFixed ? extraPayment : 0;
  const principalPortion = isFixed
    ? Math.min(loan.amount, normalPrincipal)
    : Math.min(loan.amount, normalPrincipal + extraPayment);
  const remainingMonths = loan.remainingTenureYears ? Math.round(loan.remainingTenureYears * 12) : undefined;
  const interestSaved = isFixed || !remainingMonths ? 0 : estimateExtraInterestSaved(loan.amount, loan.monthly, annualRate, extraPayment, remainingMonths);

  return {
    normalPayment,
    extraPayment,
    interestPortion,
    principalPortion,
    interestSaved,
    advancePaymentCredit,
    advancePaymentCreditBefore: loan.advancePaymentCredit || 0,
    advancePaymentCreditAfter,
    monthsAdvanced,
    monthsCovered: isFixed ? monthsAdvanced : rawMonthsCovered,
    installmentCreditBefore,
    installmentCreditAfter,
    paymentTooLow: normalPayment <= monthlyInterest && loan.amount > 0,
  };
}

function calculateLoanInterestSaved(loan) {
  if (
    loan.repaymentType !== "flexi"
    || loan.annualInterestRate === ""
    || loan.annualInterestRate === undefined
    || !loan.remainingTenureYears
  ) {
    return 0;
  }

  const extraPrincipalPaid = (loan.payments || []).reduce((total, payment) => (
    payment.repaymentType === "flexi" ? total + (payment.extraPayment || 0) : total
  ), 0);

  if (extraPrincipalPaid <= 0) {
    return 0;
  }

  const normalBalance = loan.amount + extraPrincipalPaid;
  const remainingMonths = Math.round(loan.remainingTenureYears * 12);
  const normalPayoff = calculatePayoff(normalBalance, loan.monthly, loan.annualInterestRate, remainingMonths);
  const reducedPayoff = calculatePayoff(loan.amount, loan.monthly, loan.annualInterestRate, remainingMonths);

  if (normalPayoff.paymentTooLow || reducedPayoff.paymentTooLow) {
    return 0;
  }

  return Math.max(0, normalPayoff.interest - reducedPayoff.interest);
}

function ProgressRing({ value, size = 56 }) {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2563eb"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {formatProgress(value)}%
      </div>
    </div>
  );
}

function SmartAnalytics({ loans }) {
  const totalOutstanding = loans.reduce((total, loan) => total + loan.amount, 0);
  const totalMonthly = loans.reduce((total, loan) => total + loan.monthly, 0);
  const highestLoan = loans.reduce((highest, loan) => (
    !highest || loan.amount > highest.amount ? loan : highest
  ), null);
  const averagePaid = loans.length
    ? Math.round(loans.reduce((total, loan) => total + getLoanProgress(loan), 0) / loans.length)
    : 0;
  const breakdown = loanTypes.map((type) => ({
    name: type.label,
    value: loans
      .filter((loan) => loan.type === type.label)
      .reduce((total, loan) => total + loan.amount, 0),
  }));
  const visibleBreakdown = breakdown.filter((item) => item.value > 0);

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-lg">Smart Analytics</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Outstanding</p>
          <h3 className="font-semibold text-lg mt-2">{formatCompactRM(totalOutstanding)}</h3>
        </div>

        <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Monthly</p>
          <h3 className="font-semibold text-lg mt-2">{formatCompactRM(totalMonthly)}</h3>
        </div>

        <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Highest Loan</p>
          <h3 className="font-semibold text-lg mt-2">{highestLoan ? formatCompactRM(highestLoan.amount) : "RM 0"}</h3>
          <p className="text-gray-500 text-xs mt-1 truncate">{highestLoan?.name || "No loans"}</p>
        </div>

        <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Average Paid</p>
          <h3 className="font-semibold text-lg mt-2 text-blue-600">{averagePaid}%</h3>
        </div>
      </div>

      <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-semibold">Debt Breakdown</h3>
            <p className="text-gray-500 text-sm">By loan type</p>
          </div>
        </div>

        <div className="h-44">
          {visibleBreakdown.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value) => formatRM(value)} />
                <Pie
                  data={visibleBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke="none"
                >
                  {visibleBreakdown.map((item) => (
                    <Cell key={item.name} fill={breakdownColors[item.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              No debt data
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">
          {breakdown.map((item) => (
            <div key={item.name} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: breakdownColors[item.name] }}
              />
              <p className="text-gray-500 text-xs truncate">{item.name}</p>
              <p className="text-xs font-semibold ml-auto">{formatCompactRM(item.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExtraPaymentModal({ loan, onClose }) {
  const [extraPayment, setExtraPayment] = useState("");
  const [interestRate, setInterestRate] = useState("4.2");
  const [tenureYears, setTenureYears] = useState(loan.remainingTenureYears || "");
  const [calculatedInputs, setCalculatedInputs] = useState({
    extraPayment: 0,
    interestRate: 4.2,
    tenureYears: loan.remainingTenureYears || "",
  });

  const extra = calculatedInputs.extraPayment;
  const rate = calculatedInputs.interestRate;
  const hasTenure = calculatedInputs.tenureYears !== "";
  const payoffMonths = hasTenure ? Math.round(Number(calculatedInputs.tenureYears) * 12) : undefined;
  const original = hasTenure
    ? calculatePayoff(loan.amount, loan.monthly, rate, payoffMonths)
    : { months: 0, interest: 0, paymentTooLow: false };
  const accelerated = hasTenure
    ? calculatePayoff(loan.amount, loan.monthly + extra, rate, payoffMonths)
    : { months: 0, interest: 0, paymentTooLow: false };
  const monthsSaved = Math.max(0, original.months - accelerated.months);
  const interestSaved = Math.max(0, original.interest - accelerated.interest);
  const hasPaymentWarning = original.paymentTooLow || accelerated.paymentTooLow;

  const handleCalculate = () => {
    setCalculatedInputs({
      extraPayment: Math.max(0, Number(extraPayment) || 0),
      interestRate: Math.max(0, Number(interestRate) || 0),
      tenureYears: tenureYears === "" ? "" : Math.max(0, Number(tenureYears) || 0),
    });
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
      <div className="modal-sheet bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-semibold">Extra Payment</h2>
            <p className="text-gray-500">{loan.name}</p>
          </div>

          <button onClick={onClose} className="bg-gray-100 rounded-full p-2 active:scale-95 transition">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-gray-500 text-sm">Balance</p>
            <h3 className="font-semibold">{formatRM(loan.amount)}</h3>
          </div>

          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-gray-500 text-sm">Monthly</p>
            <h3 className="font-semibold">{formatRM(loan.monthly)}</h3>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <label className="block">
            <span className="text-gray-500 text-sm">Extra monthly payment</span>
            <input
              type="number"
              min="0"
              value={extraPayment}
              onChange={(event) => setExtraPayment(event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="300"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-500 text-sm">Interest rate %</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={interestRate}
                onChange={(event) => setInterestRate(event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="4.2"
              />
            </label>

            <label className="block">
              <span className="text-gray-500 text-sm">Tenure years</span>
              <input
                type="number"
                min="1"
                value={tenureYears}
                onChange={(event) => setTenureYears(event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="30"
              />
            </label>
          </div>
        </div>

        {hasPaymentWarning && (
          <div className="bg-red-50 text-red-600 rounded-2xl p-4 mb-4 text-sm font-medium">
            Monthly payment is too low to cover the estimated monthly interest.
          </div>
        )}

        {!loan.remainingTenureYears && (
          <div className="bg-orange-50 text-orange-600 rounded-2xl p-4 mb-4 text-sm font-medium">
            Tenure missing. Edit loan to improve estimate.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-500 text-sm">Original payoff</p>
            <h3 className="font-semibold">{formatMonths(original.months)}</h3>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-500 text-sm">New payoff</p>
            <h3 className="font-semibold text-blue-600">{formatMonths(accelerated.months)}</h3>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-500 text-sm">Interest saved</p>
            <h3 className="font-semibold text-green-600">{formatRM(interestSaved)}</h3>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-500 text-sm">Months saved</p>
            <h3 className="font-semibold">{monthsSaved}</h3>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold active:scale-[0.98] transition mb-3"
        >
          Calculate
        </button>

        <p className="text-gray-400 text-xs text-center mb-3">
          Estimate only. Actual bank interest/reducing balance may differ.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-gray-100 text-gray-800 rounded-2xl py-4 font-semibold active:scale-[0.98] transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function PaymentModal({ loan, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("monthly");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const paymentAmount = Number(amount) || 0;
  const isFixedLoan = loan.repaymentType === "fixed";
  const isFlexiExtraPrincipal = !isFixedLoan && paymentType === "extra-principal";
  const extraAmount = isFlexiExtraPrincipal ? paymentAmount : Math.max(0, paymentAmount - loan.monthly);
  const hasInterestRate = loan.annualInterestRate !== "" && loan.annualInterestRate !== undefined;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!paymentAmount || paymentAmount <= 0 || !date || !hasInterestRate) {
      return;
    }

    onSave(loan.id, {
      id: createPaymentId(),
      amount: paymentAmount,
      paymentType,
      date,
      notes: notes.trim(),
    });
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
      <form onSubmit={handleSubmit} className="modal-sheet bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-semibold">Add Payment</h2>
            <p className="text-gray-500">{loan.name}</p>
          </div>

          <button type="button" onClick={onClose} className="bg-gray-100 rounded-full p-2 active:scale-95 transition">
            <X size={20} />
          </button>
        </div>

        <div className="bg-blue-50 rounded-[1.7rem] p-5 mb-4">
          <p className="text-gray-500 text-sm">Current Outstanding</p>
          <h3 className="text-2xl font-bold">{formatRM(loan.amount)}</h3>
        </div>

        <div className="space-y-3">
          {!isFixedLoan && (
            <label className="block">
              <span className="text-gray-500 text-sm">Payment Type</span>
              <select
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly installment</option>
                <option value="extra-principal">Extra principal / redraw payment</option>
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-gray-500 text-sm">Payment amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={() => setAmount(formatInputCurrency(amount))}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000"
            />
          </label>

          {extraAmount > 0 && !isFlexiExtraPrincipal && (
            <div className={`${isFixedLoan ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"} rounded-2xl p-4 text-sm font-medium`}>
              {isFixedLoan
                ? "This loan is fixed. Extra amount will be treated as advance payment, not principal reduction."
                : "This payment is higher than your monthly installment. Extra amount will be treated as additional principal payment."}
            </div>
          )}

          {extraAmount > 0 && !isFlexiExtraPrincipal && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">Normal payment</p>
                <h3 className="font-semibold">{formatRM(Math.min(paymentAmount, loan.monthly))}</h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">{isFixedLoan ? "Advance payment" : "Extra payment"}</p>
                <h3 className={`font-semibold ${isFixedLoan ? "text-orange-600" : "text-blue-600"}`}>{formatRM(extraAmount)}</h3>
              </div>
            </div>
          )}

          {isFlexiExtraPrincipal && paymentAmount > 0 && (
            <div className="bg-blue-50 text-blue-600 rounded-2xl p-4 text-sm font-medium">
              This payment will be treated as direct principal reduction.
            </div>
          )}

          <label className="block">
            <span className="text-gray-500 text-sm">Payment date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {!hasInterestRate && (
            <div className="bg-red-50 text-red-600 rounded-2xl p-4 text-sm font-medium">
              Interest rate missing. Please edit loan.
            </div>
          )}

          <label className="block">
            <span className="text-gray-500 text-sm">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional"
              rows="3"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!hasInterestRate}
          className={`mt-5 w-full rounded-2xl py-4 font-semibold active:scale-[0.98] transition ${
            hasInterestRate
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          Save Payment
        </button>
      </form>
    </div>
  );
}

function SettingsModal({ reminderEnabled, onEnableReminders, onResetData, onClose }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
      <div className="modal-sheet bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-semibold">Settings</h2>
            <p className="text-gray-500">Payment reminders</p>
          </div>

          <button onClick={onClose} className="bg-gray-100 rounded-full p-2 active:scale-95 transition">
            <X size={20} />
          </button>
        </div>

        <div className="bg-gray-50 rounded-[1.7rem] p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Reminder status</p>
            <p className={reminderEnabled ? "text-green-600 text-sm" : "text-gray-500 text-sm"}>
              {reminderEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>

          <div className={`w-3 h-3 rounded-full ${reminderEnabled ? "bg-green-500" : "bg-gray-300"}`} />
        </div>

        <button
          onClick={onEnableReminders}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold active:scale-[0.98] transition mb-3"
        >
          Enable Payment Reminders
        </button>

        <button
          onClick={onResetData}
          className="w-full bg-red-50 text-red-600 rounded-2xl py-4 font-semibold active:scale-[0.98] transition"
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
}

function LoanFormModal({ loan, onClose, onSave }) {
  const [form, setForm] = useState({
    name: loan?.name || "",
    bank: loan?.bank || "",
    amount: loan?.amount || "",
    monthly: loan?.monthly || "",
    annualInterestRate: loan?.annualInterestRate ?? "",
    originalTenureYears: loan?.originalTenureYears ?? "",
    remainingTenureYears: loan?.remainingTenureYears ?? "",
    nextDueDate: loan?.nextDueDate || getDefaultNextDueDate(),
    repaymentType: loan?.repaymentType || "flexi",
    paid: loan?.paid ?? "",
    type: loan?.type || loanTypes[0].label,
  });

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const selectedType = loanTypes.find((type) => type.label === form.type) || loanTypes[0];
    const amount = Number(form.amount);
    const monthly = Number(form.monthly);
    const annualInterestRate = form.annualInterestRate === "" ? "" : Math.max(0, Number(form.annualInterestRate) || 0);
    const originalTenureYears = form.originalTenureYears === "" ? "" : Math.max(0, Number(form.originalTenureYears) || 0);
    const remainingTenureYears = form.remainingTenureYears === "" ? "" : Math.max(0, Number(form.remainingTenureYears) || 0);
    const paid = Math.min(100, Math.max(0, Number(form.paid || 0)));

    if (!form.name.trim() || !form.bank.trim() || !amount || !monthly) {
      return;
    }

    onSave({
      id: loan?.id || createLoanId(),
      name: form.name.trim(),
      bank: form.bank.trim(),
      amount,
      originalAmount: loan?.originalAmount || amount,
      monthly,
      annualInterestRate,
      originalTenureYears,
      remainingTenureYears,
      nextDueDate: form.nextDueDate || getDefaultNextDueDate(),
      repaymentType: form.repaymentType,
      paid,
      type: selectedType.label,
      advancePaymentCredit: loan?.advancePaymentCredit || 0,
      payments: loan?.payments || [],
    });
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
      <form onSubmit={handleSubmit} className="modal-sheet bg-white w-full max-w-sm rounded-[2rem] p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-semibold">{loan ? "Edit Loan" : "Add Loan"}</h2>
            <p className="text-gray-500">{loan ? "Update loan details" : "Track a new commitment"}</p>
          </div>

          <button type="button" onClick={onClose} className="bg-gray-100 rounded-full p-2 active:scale-95 transition">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-gray-500 text-sm">Loan Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="House Loan"
            />
          </label>

          <label className="block">
            <span className="text-gray-500 text-sm">Bank</span>
            <input
              value={form.bank}
              onChange={(event) => updateField("bank", event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Maybank"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-500 text-sm">Outstanding</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                onBlur={() => updateField("amount", formatInputCurrency(form.amount))}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="120000"
              />
            </label>

            <label className="block">
              <span className="text-gray-500 text-sm">Monthly</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthly}
                onChange={(event) => updateField("monthly", event.target.value)}
                onBlur={() => updateField("monthly", formatInputCurrency(form.monthly))}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1200"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-500 text-sm">Paid %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.paid}
                onChange={(event) => updateField("paid", event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="25"
              />
            </label>

            <label className="block">
              <span className="text-gray-500 text-sm">Type</span>
              <select
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {loanTypes.map((type) => (
                  <option key={type.label}>{type.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-gray-500 text-sm">Next upcoming due date</span>
            <input
              type="date"
              value={form.nextDueDate}
              onChange={(event) => updateField("nextDueDate", event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-gray-500 text-sm">Annual interest rate %</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.annualInterestRate}
              onChange={(event) => updateField("annualInterestRate", event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="4.2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-gray-500 text-sm">Original tenure years</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.originalTenureYears}
                onChange={(event) => updateField("originalTenureYears", event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="30"
              />
            </label>

            <label className="block">
              <span className="text-gray-500 text-sm">Remaining tenure years</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.remainingTenureYears}
                onChange={(event) => updateField("remainingTenureYears", event.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="20"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-gray-500 text-sm">Repayment type</span>
            <select
              value={form.repaymentType}
              onChange={(event) => updateField("repaymentType", event.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {repaymentTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" className="mt-5 w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold active:scale-[0.98] transition">
          {loan ? "Save Changes" : "Save Loan"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const skipNextLoanPersist = useRef(false);
  const [loans, setLoans] = useState(loadLoans);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [calculatorLoan, setCalculatorLoan] = useState(null);
  const [paymentLoan, setPaymentLoan] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(loadReminderEnabled);
  const [showBalance, setShowBalance] = useState(true);
  const [loanSearch, setLoanSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const selectedLoan = loans.find((loan) => loan.id === selectedLoanId);
  const selectedLoanDueStatus = selectedLoan ? getLoanDueStatus(selectedLoan) : null;
  const totalOutstanding = loans.reduce((total, loan) => total + loan.amount, 0);
  const monthlyCommitment = loans.reduce((total, loan) => total + loan.monthly, 0);
  const totalInterestPaid = loans.reduce((loanTotal, loan) => (
    loanTotal + (loan.payments || []).reduce((paymentTotal, payment) => paymentTotal + payment.interestPortion, 0)
  ), 0);
  const totalInterestSaved = loans.reduce((loanTotal, loan) => loanTotal + calculateLoanInterestSaved(loan), 0);
  const normalizedSearch = loanSearch.trim().toLowerCase();
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch = !normalizedSearch
      || loan.name.toLowerCase().includes(normalizedSearch)
      || loan.bank.toLowerCase().includes(normalizedSearch);
    const matchesFilter = activeFilter === "All" || loan.type === activeFilter;

    return matchesSearch && matchesFilter;
  });
  const dueStatuses = loans.map((loan) => ({ loanId: loan.id, ...getLoanDueStatus(loan) }));
  const overdueCount = dueStatuses.filter((status) => status.isOverdue).length;
  const dueSoonCount = dueStatuses.filter((status) => status.isDueSoon).length;
  const hiddenLong = `RM ${"\u2022".repeat(7)}`;
  const hiddenShort = `RM ${"\u2022".repeat(4)}`;
  const hiddenTiny = `RM ${"\u2022".repeat(3)}`;

  const handleSaveLoan = (loan) => {
    setLoans((currentLoans) => [normalizeLoan(loan), ...currentLoans]);
    setShowAddLoan(false);
  };

  const handleUpdateLoan = (updatedLoan) => {
    const normalizedLoan = normalizeLoan(updatedLoan);

    setLoans((currentLoans) => (
      currentLoans.map((loan) => (loan.id === normalizedLoan.id ? normalizedLoan : loan))
    ));
    setSelectedLoanId(normalizedLoan.id);
    setEditingLoan(null);
  };

  const handleSavePayment = (loanId, payment) => {
    setLoans((currentLoans) => (
      currentLoans.map((loan) => {
        if (loan.id !== loanId) {
          return loan;
        }

        const annualRate = Math.max(0, Number(loan.annualInterestRate) || 0);
        const breakdown = calculatePaymentBreakdown(loan, Number(payment.amount) || 0, annualRate, payment.paymentType);
        const normalizedPayment = normalizePayment({
          ...payment,
          annualRate,
          normalPayment: breakdown.normalPayment,
          extraPayment: breakdown.extraPayment,
          interestPortion: breakdown.interestPortion,
          principalPortion: breakdown.principalPortion,
          interestSaved: breakdown.interestSaved,
          advancePaymentCredit: breakdown.advancePaymentCredit,
          advancePaymentCreditBefore: breakdown.advancePaymentCreditBefore,
          advancePaymentCreditAfter: breakdown.advancePaymentCreditAfter,
          installmentCreditBefore: breakdown.installmentCreditBefore,
          installmentCreditAfter: breakdown.installmentCreditAfter,
          monthsAdvanced: breakdown.monthsAdvanced,
          monthsCovered: breakdown.monthsCovered,
          repaymentType: loan.repaymentType,
          paymentType: payment.paymentType || "monthly",
        });
        const nextAmount = Math.max(0, loan.amount - normalizedPayment.principalPortion);
        const originalAmount = loan.originalAmount || estimateOriginalAmount(loan.amount, loan.paid);
        const nextDueDate = loan.repaymentType === "fixed"
          ? addMonths(loan.nextDueDate, normalizedPayment.monthsAdvanced)
          : normalizedPayment.paymentType === "monthly" && normalizedPayment.monthsCovered > 0
            ? addMonths(loan.nextDueDate, normalizedPayment.monthsCovered)
            : loan.nextDueDate;
        normalizedPayment.dueDateBefore = loan.nextDueDate;
        normalizedPayment.dueDateAfter = nextDueDate;
        normalizedPayment.coveredDueStart = loan.repaymentType === "fixed" && normalizedPayment.monthsAdvanced > 0
          ? loan.nextDueDate
          : "";
        normalizedPayment.coveredDueEnd = loan.repaymentType === "fixed" && normalizedPayment.monthsAdvanced > 0
          ? addMonths(loan.nextDueDate, normalizedPayment.monthsAdvanced - 1)
          : "";

        return {
          ...loan,
          amount: nextAmount,
          originalAmount,
          nextDueDate,
          advancePaymentCredit: loan.repaymentType === "fixed"
            ? normalizedPayment.advancePaymentCreditAfter
            : (loan.advancePaymentCredit || 0) + normalizedPayment.advancePaymentCredit,
          installmentCredit: normalizedPayment.installmentCreditAfter,
          paid: calculatePaidPercent(nextAmount, originalAmount),
          payments: [normalizedPayment, ...(loan.payments || [])],
        };
      })
    ));
    setPaymentLoan(null);
  };

  const handleDeletePayment = (loanId, payment) => {
    if (!window.confirm(`Delete payment from ${payment.date}?`)) {
      return;
    }

    setLoans((currentLoans) => (
      currentLoans.map((loan) => {
        if (loan.id !== loanId) {
          return loan;
        }

        const originalAmount = loan.originalAmount || estimateOriginalAmount(loan.amount, loan.paid);
        const nextAmount = Math.min(originalAmount, loan.amount + payment.principalPortion);
        const nextAdvancePaymentCredit = payment.repaymentType === "fixed" && loan.advancePaymentCredit === payment.advancePaymentCreditAfter
          ? payment.advancePaymentCreditBefore
          : Math.max(0, (loan.advancePaymentCredit || 0) - (payment.advancePaymentCredit || 0));
        const nextInstallmentCredit = loan.installmentCredit === payment.installmentCreditAfter
          ? payment.installmentCreditBefore
          : loan.installmentCredit || 0;
        const nextDueDate = payment.dueDateAfter && payment.dueDateBefore && loan.nextDueDate === payment.dueDateAfter
          ? payment.dueDateBefore
          : loan.nextDueDate;

        return {
          ...loan,
          amount: nextAmount,
          originalAmount,
          nextDueDate,
          advancePaymentCredit: nextAdvancePaymentCredit,
          installmentCredit: nextInstallmentCredit,
          paid: calculatePaidPercent(nextAmount, originalAmount),
          payments: (loan.payments || []).filter((currentPayment) => currentPayment.id !== payment.id),
        };
      })
    ));
  };

  const handleDeleteLoan = (loan) => {
    if (!window.confirm(`Delete ${loan.name}?`)) {
      return;
    }

    setLoans((currentLoans) => currentLoans.filter((currentLoan) => currentLoan.id !== loan.id));
    setSelectedLoanId(null);
  };

  const handleEnableReminders = async () => {
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      localStorage.setItem(REMINDER_ENABLED_KEY, "true");
      setReminderEnabled(true);
    }
  };

  const handleResetData = () => {
    if (!window.confirm("Reset all DuitLoan data? This cannot be undone.")) {
      return;
    }

    Object.keys(localStorage)
      .filter((key) => key.startsWith("duitloan."))
      .forEach((key) => localStorage.removeItem(key));

    skipNextLoanPersist.current = true;
    setLoans([]);
    setSelectedLoanId(null);
    setShowAddLoan(false);
    setEditingLoan(null);
    setCalculatorLoan(null);
    setPaymentLoan(null);
    setReminderEnabled(false);
    setLoanSearch("");
    setActiveFilter("All");
    setShowSettings(false);
  };

  useEffect(() => {
    if (skipNextLoanPersist.current) {
      skipNextLoanPersist.current = false;
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    if (!reminderEnabled || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const lastNotified = loadLastNotified();
    const nextNotified = { ...lastNotified };
    let changed = false;

    loans.forEach((loan) => {
      const status = getLoanDueStatus(loan);

      if (!status.isDueSoon && !status.isOverdue) {
        return;
      }

      const dueDateKey = toDateInputValue(status.date);
      const notificationKey = `${loan.id}:${dueDateKey}:${status.isOverdue ? "overdue" : "due-soon"}`;

      if (lastNotified[notificationKey]) {
        return;
      }

      new Notification(status.isOverdue ? `Payment overdue: ${loan.name}` : `Payment due soon: ${loan.name}`);
      nextNotified[notificationKey] = new Date().toISOString().slice(0, 10);
      changed = true;
    });

    if (changed) {
      saveLastNotified(nextNotified);
    }
  }, [loans, reminderEnabled]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex justify-center px-5 py-6">
      <div className="w-full max-w-sm pb-28">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-500">Good Morning {"\uD83D\uDC4B"}</p>
            <h1 className="text-3xl font-semibold tracking-tight">Adam</h1>
          </div>

          <button className="bg-white rounded-2xl p-3 shadow-sm active:scale-95 transition">
            <Bell size={20} />
          </button>
        </div>

        {(dueSoonCount > 0 || overdueCount > 0) && (
          <div className="bg-white rounded-[1.7rem] p-4 shadow-sm mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 rounded-2xl p-4">
                <p className="text-orange-600 text-sm font-medium">Due Soon</p>
                <h3 className="font-semibold text-lg mt-1 text-orange-600">
                  {dueSoonCount} payments due soon
                </h3>
              </div>

              <div className="bg-red-50 rounded-2xl p-4">
                <p className="text-red-600 text-sm font-medium">Overdue</p>
                <h3 className="font-semibold text-lg mt-1 text-red-600">
                  {overdueCount} overdue payment
                </h3>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="opacity-80">Total Outstanding</p>
              <h2 className="text-3xl font-bold mt-2 tracking-tight">
                {showBalance ? formatRM(totalOutstanding) : hiddenLong}
              </h2>
            </div>

            <button onClick={() => setShowBalance(!showBalance)} className="bg-white/15 rounded-2xl p-2 active:scale-95 transition">
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <div className="mt-6 flex justify-between">
            <div>
              <p className="text-sm opacity-75">Monthly Commitment</p>
              <p className="font-semibold text-lg">{showBalance ? formatRM(monthlyCommitment) : hiddenShort}</p>
            </div>

            <div className="text-right">
              <p className="text-sm opacity-75">Active Loans</p>
              <p className="font-semibold text-lg">{loans.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Interest Paid</p>
            <h3 className="font-semibold text-lg mt-2">{showBalance ? formatCompactRM(totalInterestPaid) : hiddenTiny}</h3>
          </div>

          <div className="bg-white rounded-[1.7rem] p-4 shadow-sm">
            <p className="text-gray-500 text-sm">Interest Saved</p>
            <h3 className="font-semibold text-lg mt-2 text-green-600">{showBalance ? formatCompactRM(totalInterestSaved) : hiddenTiny}</h3>
          </div>
        </div>

        <SmartAnalytics loans={loans} />

        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg">Your Loans</h2>
          <button className="text-blue-600 text-sm font-medium">See all</button>
        </div>

        <div className="bg-white rounded-[1.7rem] p-3 shadow-sm flex items-center gap-3 mb-3">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            value={loanSearch}
            onChange={(event) => setLoanSearch(event.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            placeholder="Search loan or bank"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {filterTypes.map((type) => {
            const isActive = activeFilter === type;

            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "bg-white text-gray-500 shadow-sm"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredLoans.map((loan, index) => {
            const Icon = getLoanIcon(loan.type);
            const progress = getLoanProgress(loan);
            const dueStatus = getLoanDueStatus(loan);
            const dueText = dueStatus.isOverdue
              ? "Overdue"
              : dueStatus.isDueSoon
                ? `Due soon: ${formatDueDate(dueStatus.date)}`
                : `Next due: ${formatDueDate(dueStatus.date)}`;
            const dueClass = dueStatus.isOverdue
              ? "text-red-600"
              : dueStatus.isDueSoon
                ? "text-orange-600"
                : "text-blue-600";

            return (
              <button
                key={loan.id || `${loan.name}-${loan.bank}-${index}`}
                onClick={() => setSelectedLoanId(loan.id)}
                className="w-full bg-white rounded-[1.7rem] p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-600 rounded-2xl p-3">
                    <Icon size={20} />
                  </div>

                  <div className="text-left">
                    <h3 className="font-semibold">{loan.name}</h3>
                    <p className="text-gray-500 text-sm">{loan.bank}</p>
                    <p className={`text-xs font-medium ${dueClass}`}>{dueText}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <h3 className="font-semibold">{showBalance ? `RM ${Math.round(loan.amount / 1000)}k` : hiddenTiny}</h3>
                    <p className="text-blue-600 text-sm">{formatProgress(progress)}% Paid</p>
                  </div>
                  <ProgressRing value={progress} />
                </div>
              </button>
            );
          })}

          {!filteredLoans.length && (
            <div className="bg-white rounded-[1.7rem] p-5 shadow-sm text-center">
              <p className="text-gray-500 text-sm">No loans found</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[340px] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl px-6 py-4 flex justify-between items-center border border-white">
          <Home className="text-blue-600" />
          <Wallet className="text-gray-400" />
          <button onClick={() => setShowAddLoan(true)} className="bg-blue-600 rounded-full p-4 text-white shadow-lg shadow-blue-200 active:scale-95 transition">
            <Plus size={24} />
          </button>
          <FileText className="text-gray-400" />
          <button onClick={() => setShowSettings(true)} className="text-gray-400 active:scale-95 transition">
            <MoreHorizontal />
          </button>
        </div>
      </div>

      {selectedLoan && (
        <div className="modal-backdrop fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
          <div className="modal-sheet bg-white w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-2xl font-semibold">{selectedLoan.name}</h2>
                <p className="text-gray-500">{selectedLoan.bank}</p>
              </div>

              <button onClick={() => setSelectedLoanId(null)} className="bg-gray-100 rounded-full p-2">
                <X size={20} />
              </button>
            </div>

            <div className="bg-blue-50 rounded-[1.7rem] p-5 mb-4 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Outstanding Balance</p>
                <h3 className="text-2xl font-bold">{formatRM(selectedLoan.amount)}</h3>
              </div>
              <ProgressRing value={getLoanProgress(selectedLoan)} size={72} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">Monthly</p>
                <h3 className="font-semibold">{formatRM(selectedLoan.monthly)}</h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-gray-500 text-sm">Next Payment</p>
                <h3 className={`font-semibold ${
                  selectedLoanDueStatus?.isOverdue
                    ? "text-red-600"
                    : selectedLoanDueStatus?.isDueSoon
                      ? "text-orange-600"
                      : ""
                }`}>
                  {selectedLoanDueStatus?.isOverdue ? "Overdue" : formatDueDate(selectedLoanDueStatus.date)}
                </h3>
                <p className={`text-xs mt-1 ${
                  selectedLoanDueStatus?.isOverdue
                    ? "text-red-600"
                    : selectedLoanDueStatus?.isDueSoon
                      ? "text-orange-600"
                      : "text-blue-600"
                }`}>
                  {selectedLoanDueStatus?.isOverdue
                    ? `${selectedLoanDueStatus.overdueDays} days overdue`
                    : `${selectedLoanDueStatus?.daysRemaining || 0} days remaining`}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <p className="text-gray-500 text-sm">Installment credit</p>
              <h3 className="font-semibold text-blue-600">{formatRM(selectedLoan.installmentCredit || 0)}</h3>
            </div>

            {selectedLoan.repaymentType === "flexi" && (
              <button
                onClick={() => setCalculatorLoan(selectedLoan)}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold active:scale-[0.98] transition mb-5"
              >
                Extra Payment Calculator
              </button>
            )}

            <button
              onClick={() => setPaymentLoan(selectedLoan)}
              className="w-full bg-blue-50 text-blue-600 rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition mb-5"
            >
              <Plus size={18} />
              Add Payment
            </button>

            <div className="h-40 mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => setEditingLoan(selectedLoan)}
                className="bg-gray-100 text-gray-800 rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <Pencil size={18} />
                Edit
              </button>

              <button
                onClick={() => handleDeleteLoan(selectedLoan)}
                className="bg-red-50 text-red-600 rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>

            <div className="mt-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Payment History</h3>
                <p className="text-gray-400 text-xs">{selectedLoan.payments?.length || 0} records</p>
              </div>

              <div className="space-y-3">
                {(selectedLoan.payments || []).map((payment) => (
                  <div key={payment.id} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-gray-500 text-sm">{payment.date}</p>
                        <p className="font-semibold text-lg">{formatRM(payment.amount)}</p>
                        <p className="text-gray-500 text-sm truncate">{payment.notes || "No notes"}</p>
                      </div>
                      <button
                        onClick={() => handleDeletePayment(selectedLoan.id, payment)}
                        className="bg-red-50 text-red-600 rounded-full p-2 h-fit active:scale-95 transition shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-white rounded-2xl p-3">
                        <p className="text-gray-400 text-xs">Interest</p>
                        <p className="text-sm font-semibold">{formatRM(payment.interestPortion)}</p>
                      </div>

                      <div className="bg-white rounded-2xl p-3">
                        <p className="text-gray-400 text-xs">Principal</p>
                        <p className="text-sm font-semibold">{formatRM(payment.principalPortion)}</p>
                      </div>
                    </div>

                    {(payment.extraPayment > 0 || payment.paymentType === "extra-principal" || (payment.repaymentType === "fixed" && payment.monthsAdvanced > 0)) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          payment.repaymentType === "fixed"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                          {payment.repaymentType === "fixed" ? "Advance payment" : "Extra principal payment"}
                        </div>

                        {payment.repaymentType === "fixed" && payment.coveredDueStart && (
                          <p className="text-xs text-gray-500">
                            Covers: {formatFullDueDate(payment.coveredDueStart)}
                            {payment.coveredDueEnd && payment.coveredDueEnd !== payment.coveredDueStart
                              ? ` - ${formatFullDueDate(payment.coveredDueEnd)}`
                              : ""}
                          </p>
                        )}

                        {payment.repaymentType === "fixed" && (
                          <p className="text-xs text-gray-500">
                            Total months covered: {payment.monthsAdvanced}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {!selectedLoan.payments?.length && (
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-gray-500 text-sm">No payments recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddLoan && (
        <LoanFormModal onClose={() => setShowAddLoan(false)} onSave={handleSaveLoan} />
      )}

      {editingLoan && (
        <LoanFormModal loan={editingLoan} onClose={() => setEditingLoan(null)} onSave={handleUpdateLoan} />
      )}

      {calculatorLoan && (
        <ExtraPaymentModal loan={calculatorLoan} onClose={() => setCalculatorLoan(null)} />
      )}

      {paymentLoan && (
        <PaymentModal loan={paymentLoan} onClose={() => setPaymentLoan(null)} onSave={handleSavePayment} />
      )}

      {showSettings && (
        <SettingsModal
          reminderEnabled={reminderEnabled}
          onEnableReminders={handleEnableReminders}
          onResetData={handleResetData}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
