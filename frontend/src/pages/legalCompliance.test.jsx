/**
 * Document 13 — Legal Document Drafts (Starting Templates)
 * Statutory Compliance Test Suite validating:
 * 1. Terms of Service (IT Act Sec 79 Intermediary, NMC Telemed, Emergency Protocol)
 * 2. Privacy Policy (DPDP Act 2023, ABDM Consent, Telemetry Purge, DPO Office)
 * 3. Medical & Emergency Disclaimer (Good Samaritan Sec 134A, 112/108 routing)
 * 4. Cancellation & Refund Policy (2-Hour slot rules, Emergency Standby Fee, 48h Pharmacy rules)
 * 5. Grievance Redressal (Nodal Grievance Officer, IT Rules 2021 Rule 3(2) SLAs)
 * 6. Telemedicine Consent & Patient Rights Charter
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Legal Page Imports
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import Disclaimer from './Disclaimer';
import RefundPolicy from './RefundPolicy';
import GrievanceRedressal from './GrievanceRedressal';
import TelemedicineConsent from './TelemedicineConsent';
import PatientRights from './PatientRights';
import PublicFooter from '@/components/PublicFooter';

describe('Document 13 — Statutory Legal Compliance & Policy Pages', () => {
  describe('1. Terms of Service (Spec 13 §1)', () => {
    it('declares Technology Intermediary status, NMC Telemedicine adherence, and Emergency Disclaimers', () => {
      render(
        <MemoryRouter>
          <TermsOfService />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument();
      expect(screen.getByText(/Medical Disclaimers & Emergency Protocols/i)).toBeInTheDocument();
      expect(screen.getByText(/112 or 108/i)).toBeInTheDocument();
      expect(screen.getByText(/Healthcare Provider Responsibilities & Onboarding/i)).toBeInTheDocument();
      expect(screen.getByText(/Good Samaritan Legal Shield/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 134A of the Motor Vehicles \(Amendment\) Act 2019/i)).toBeInTheDocument();
    });
  });

  describe('2. Privacy Policy (Spec 13 §2 — DPDP Act 2023 & ABDM)', () => {
    it('declares compliance with DPDP Act 2023, ABDM consent architecture, and telemetry auto-purge', () => {
      render(
        <MemoryRouter>
          <PrivacyPolicy />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
      expect(screen.getByText(/Digital Personal Data Protection \(DPDP\) Act 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/Ayushman Bharat Digital Mission \(ABDM\) & ABHA Consent/i)).toBeInTheDocument();
      expect(screen.getByText(/Telemetry Auto-Purge/i)).toBeInTheDocument();
      expect(screen.getByText(/30 days/i)).toBeInTheDocument();
    });
  });

  describe('3. Medical & Emergency Disclaimer (Spec 13 §6)', () => {
    it('declares Intermediary status under IT Act Sec 79 and prominent acute emergency hotlines', () => {
      render(
        <MemoryRouter>
          <Disclaimer />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Medical & Emergency Disclaimer/i })).toBeInTheDocument();
      expect(screen.getByText(/Acute Life-Threatening Emergencies/i)).toBeInTheDocument();
      expect(screen.getByText(/Dial 108 \(National Ambulance\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Dial 112 \(All-India Emergency\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Technology Intermediary Status \(IT Act Sec 79\)/i)).toBeInTheDocument();
    });
  });

  describe('4. Cancellation & Refund Policy (Spec 13 §4)', () => {
    it('specifies slot cancellation rules, emergency standby fees, and medicine return conditions', () => {
      render(
        <MemoryRouter>
          <RefundPolicy />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Cancellation & Refund Policy/i })).toBeInTheDocument();
      expect(screen.getByText(/In-Clinic & Telemedicine Doctor Appointments/i)).toBeInTheDocument();
      expect(screen.getByText(/Cancellation > 2 Hours Prior to Slot/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Flying Doctor & Ambulance SOS Dispatches/i)).toBeInTheDocument();
      expect(screen.getByText(/₹250 standby compensation fee/i)).toBeInTheDocument();
      expect(screen.getByText(/Drugs and Cosmetics Act, 1940/i)).toBeInTheDocument();
      expect(screen.getByText(/Eligible for 48h Return/i)).toBeInTheDocument();
    });
  });

  describe('5. Grievance Redressal Policy (Spec 13 §8)', () => {
    it('declares statutory redressal mandate under IT Rules 2021 Rule 3(2) and publishes officer contacts', () => {
      render(
        <MemoryRouter>
          <GrievanceRedressal />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Grievance Redressal & DPO Office/i })).toBeInTheDocument();
      expect(screen.getByText(/Statutory Redressal Mandate/i)).toBeInTheDocument();
      expect(screen.getByText(/Rule 3\(2\) of the Information Technology/i)).toBeInTheDocument();
      expect(screen.getByText(/grievance@findmedi.in/i)).toBeInTheDocument();
      expect(screen.getByText(/dpo@findmedi.in/i)).toBeInTheDocument();
    });
  });

  describe('6. Telemedicine Consent & Patient Rights (Spec 13 §9)', () => {
    it('renders Telemedicine Practice Guidelines notice and Patient Rights Charter', () => {
      render(
        <MemoryRouter>
          <TelemedicineConsent />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Telemedicine & Digital Health Consent/i })).toBeInTheDocument();
      expect(screen.getByText(/Telemedicine Practice Guidelines \(March 25, 2020\)/i)).toBeInTheDocument();
    });

    it('renders Patient Rights Charter with confidentiality and consent guarantees', () => {
      render(
        <MemoryRouter>
          <PatientRights />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Charter of Patient Rights & Responsibilities/i })).toBeInTheDocument();
      expect(screen.getByText(/Right to Adequate Information/i)).toBeInTheDocument();
      expect(screen.getByText(/Right to Emergency Medical Care/i)).toBeInTheDocument();
      expect(screen.getByText(/Right to Privacy & Dignity/i)).toBeInTheDocument();
    });
  });

  describe('7. Public Footer Compliance Strip (Spec 13 §11)', () => {
    it('renders persistent links to all statutory legal policies across the site', () => {
      render(
        <MemoryRouter>
          <PublicFooter />
        </MemoryRouter>
      );

      expect(screen.getByText(/Privacy Policy \(DPDP 2023\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Disclaimer \(Sec 134A\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Refunds & Standby Fees/i)).toBeInTheDocument();
      expect(screen.getByText(/Grievance & DPO Office/i)).toBeInTheDocument();
      expect(screen.getByText(/Telemedicine Consent \(NMC 2020\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Patient Rights Charter/i)).toBeInTheDocument();
    });
  });
});
