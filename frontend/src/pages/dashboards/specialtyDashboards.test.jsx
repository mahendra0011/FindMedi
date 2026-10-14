import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('offline'))),
    post: vi.fn(() => Promise.reject(new Error('offline'))),
  },
}));

import OpticianDashboard from './OpticianDashboard';
import HomeNursingDashboard from './HomeNursingDashboard';
import WellnessDashboard from './WellnessDashboard';
import ProductVendorDashboard from './ProductVendorDashboard';
import SupportGroupHostDashboard from './SupportGroupHostDashboard';
import TrainerOrgDashboard from './TrainerOrgDashboard';
import BloodBankAdminDashboard from './BloodBankAdminDashboard';
import DialysisAdminDashboard from './DialysisAdminDashboard';
import IvfMaternityDashboard from './IvfMaternityDashboard';
import RehabAdminDashboard from './RehabAdminDashboard';
import GovtFacilityDashboard from './GovtFacilityDashboard';
import TpaAgentDashboard from './TpaAgentDashboard';
import ContentEditorDashboard from './ContentEditorDashboard';
import ModeratorDashboard from './ModeratorDashboard';
import FinanceAdminDashboard from './FinanceAdminDashboard';
import ComplianceKycDashboard from './ComplianceKycDashboard';

const SPECIALTY_DASHBOARDS = [
  { name: 'Optician', Comp: OpticianDashboard, title: "Eye Care & Optical Shop Dashboard", kpi: "Today's Eye Exams" },
  { name: 'HomeNursing', Comp: HomeNursingDashboard, title: 'Home Nursing & Care Agency Dashboard', kpi: 'Active Care Plans' },
  { name: 'Wellness', Comp: WellnessDashboard, title: 'Wellness & Holistic Centre Dashboard', kpi: "Today's Bookings" },
  { name: 'ProductVendor', Comp: ProductVendorDashboard, title: 'Health Food & Supplements Vendor Dashboard', kpi: "Today's Orders" },
  { name: 'SupportGroupHost', Comp: SupportGroupHostDashboard, title: 'Support Group & Community Programs Dashboard', kpi: 'Active Support Circles' },
  { name: 'TrainerOrg', Comp: TrainerOrgDashboard, title: 'Emergency Training & CPR Certification Dashboard', kpi: 'Active Training Batches' },
  { name: 'BloodBankAdmin', Comp: BloodBankAdminDashboard, title: 'Blood Bank & Component Inventory Dashboard', kpi: 'Total Units in Stock' },
  { name: 'DialysisAdmin', Comp: DialysisAdminDashboard, title: 'Dialysis Centre Operations Dashboard', kpi: 'Active Hemodialysis Stations' },
  { name: 'IvfMaternity', Comp: IvfMaternityDashboard, title: 'IVF & Maternity Care Operations Dashboard', kpi: 'Active ART/IVF Cycles' },
  { name: 'RehabAdmin', Comp: RehabAdminDashboard, title: 'De-Addiction & Psychiatric Rehab Dashboard', kpi: 'In-Patient Residents' },
  { name: 'GovtFacility', Comp: GovtFacilityDashboard, title: 'Government Health Facility Dashboard', kpi: "Today's Free OPD Tokens" },
  { name: 'TpaAgent', Comp: TpaAgentDashboard, title: 'Insurance & TPA Cashless Desk Dashboard', kpi: 'Pending Pre-Auth Requests' },
  { name: 'ContentEditor', Comp: ContentEditorDashboard, title: 'Health Content & Medical Review CMS Dashboard', kpi: 'Articles in Drafting' },
  { name: 'Moderator', Comp: ModeratorDashboard, title: 'Community Moderation & User Support Dashboard', kpi: 'Pending Review Flags' },
  { name: 'FinanceAdmin', Comp: FinanceAdminDashboard, title: 'Platform Finance, TDS & Payouts Dashboard', kpi: "Today's Payout Batch" },
  { name: 'ComplianceKyc', Comp: ComplianceKycDashboard, title: 'Compliance, Council Registry & KYC Dashboard', kpi: 'Pending Provider Verifications' },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.each(SPECIALTY_DASHBOARDS)('$nameDashboard', ({ Comp, title, kpi }) => {
  it('renders the role shell with title, 4 KPIs, tasks, alerts, modules, and domain tools', async () => {
    render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>,
    );
    await act(async () => {});

    expect(screen.getByTestId('role-sidebar')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(title, 'i'))).toBeInTheDocument();
    expect(screen.getAllByTestId('role-kpi')).toHaveLength(4);
    expect(screen.getByText(kpi)).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
    expect(screen.getByTestId('role-domain-modules')).toBeInTheDocument();
  });
});
