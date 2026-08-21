import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from '../pages/auth/Login';
import RoleGuard from './RoleGuard';
import { ROLE_KEYS } from '../utils/roleRedirect';

import FieldExecutiveDashboard from '../apps/field-executive/Dashboard';
import TeleCallerDashboard from '../apps/tele-caller/Dashboard';
import DealerDashboard from '../apps/dealer/Dashboard';
import LoanApplicationForm from '../apps/dealer/LoanApplicationForm';
import CustomerPaymentDashboard from '../apps/customer-payment/Dashboard';

import AccountingLayout from '../layouts/AccountingLayout';
import ChartOfAccounts from '../pages/accounting/ChartOfAccounts';
import CashBook from '../pages/accounting/CashBook';
import BankBook from '../pages/accounting/BankBook';
import JournalEntry from '../pages/accounting/JournalEntry';
import ExpenseManagement from '../pages/accounting/ExpenseManagement';
import IncomeEntry from '../pages/accounting/IncomeEntry';
import GSTReports from '../pages/accounting/GSTReports';
import ProfitLoss from '../pages/accounting/ProfitLoss';
import BalanceSheet from '../pages/accounting/BalanceSheet';

// WIREFRAME routing structure. RoleGuard checks logged-in user's role
// against `allow` and redirects to /login if it doesn't match.

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* --- Role-based apps --- */}
        <Route
          path="/app/field-executive/*"
          element={
            <RoleGuard allow={[ROLE_KEYS.FIELD_EXECUTIVE, ROLE_KEYS.ADMIN]}>
              <FieldExecutiveDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/app/tele-caller/*"
          element={
            <RoleGuard allow={[ROLE_KEYS.TELE_CALLER, ROLE_KEYS.ADMIN]}>
              <TeleCallerDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/app/dealer/*"
          element={
            <RoleGuard allow={[ROLE_KEYS.DEALER, ROLE_KEYS.ADMIN]}>
              <Routes>
                <Route index element={<DealerDashboard />} />
                <Route path="new-application" element={<LoanApplicationForm />} />
              </Routes>
            </RoleGuard>
          }
        />
        <Route
          path="/app/customer-payment/*"
          element={
            <RoleGuard allow={[ROLE_KEYS.CUSTOMER, ROLE_KEYS.ADMIN]}>
              <CustomerPaymentDashboard />
            </RoleGuard>
          }
        />

        {/* --- Accounting & Finance module (admin/accounts staff only) --- */}
        <Route
          path="/app/accounting"
          element={
            <RoleGuard allow={[ROLE_KEYS.ADMIN]}>
              <AccountingLayout />
            </RoleGuard>
          }
        >
          <Route index element={<Navigate to="chart-of-accounts" replace />} />
          <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
          <Route path="cash-book" element={<CashBook />} />
          <Route path="bank-book" element={<BankBook />} />
          <Route path="journal-entry" element={<JournalEntry />} />
          <Route path="expense-management" element={<ExpenseManagement />} />
          <Route path="income-entry" element={<IncomeEntry />} />
          <Route path="gst-reports" element={<GSTReports />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="balance-sheet" element={<BalanceSheet />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
