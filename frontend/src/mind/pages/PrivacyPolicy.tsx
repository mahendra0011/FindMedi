import Navigation from "@/mind/components/Navigation";
import Footer from "@/mind/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Shield, FileText, Lock, Eye, Bell, UserCheck, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/mind/components/ui/button";

const sections = [
  {
    icon: FileText,
    title: "1. Information We Collect",
    content: [
      "Personal information: name, email, phone number, date of birth, gender",
      "Health information: mental health concerns, medical history, session notes, therapy goals",
      "Usage data: appointment history, platform activity, communication with counsellors",
      "Payment information: processed securely through our payment gateway (full card details are not stored by us)",
    ],
  },
  {
    icon: Lock,
    title: "2. How We Use Your Data",
    content: [
      "To provide counselling services and match you with appropriate therapists",
      "To schedule and manage appointments, process payments",
      "To improve our platform and personalize your experience",
      "To comply with legal obligations under Indian law (DPDP Act, 2023)",
      "Crisis detection and emergency escalation (with your safety as priority)",
    ],
  },
  {
    icon: Shield,
    title: "3. Data Protection & Encryption",
    content: [
      "All session notes are encrypted using AES-256-CBC encryption — only your assigned counsellor can decrypt them",
      "All data transmitted over HTTPS with TLS 1.3 protocol",
      "Passwords are hashed using bcrypt with 12 salt rounds",
      "Session data stored securely on MongoDB with access controls",
      "Regular security audits and vulnerability assessments",
    ],
  },
  {
    icon: Eye,
    title: "4. Who Can Access Your Data",
    content: [
      "Your assigned counsellor — only for session-related purposes",
      "Platform administrators — for technical support and compliance (with strict confidentiality agreements)",
      "Emergency contacts — only in case of a verified crisis situation",
      "We NEVER sell your personal or health data to third parties",
      "We NEVER share your data with advertisers",
    ],
  },
  {
    icon: Bell,
    title: "5. Your Rights Under DPDP Act, 2023",
    content: [
      "Right to Access: You can request a copy of all data we hold about you",
      "Right to Correction: You can update or correct inaccurate personal data",
      "Right to Erasure: You can request deletion of your data (subject to legal retention requirements)",
      "Right to Grievance Redressal: You can file complaints about data handling",
      "Right to Withdraw Consent: You can withdraw consent at any time",
      "Data portability: You can receive your data in a structured format",
    ],
  },
  {
    icon: UserCheck,
    title: "6. Data Retention",
    content: [
      "Active accounts: data retained for the duration of your account plus 3 years",
      "Deleted accounts: data anonymized within 90 days of deletion request",
      "Session notes: retained for 5 years as required for mental health practice documentation",
      "Payment records: retained for 7 years as required by Indian tax law",
      "Anonymized data may be retained longer for research purposes (you will be informed)",
    ],
  },
  {
    icon: AlertTriangle,
    title: "7. Crisis & Emergency Data Handling",
    content: [
      "If crisis keywords are detected in your messages, authorized personnel may be notified",
      "Emergency contact information may be shared with crisis helplines in imminent danger situations",
      "Crisis flags are retained in your record to ensure appropriate care continuity",
      "You will be informed of any emergency disclosure unless doing so would put you at risk",
    ],
  },
  {
    icon: Shield,
    title: "8. Security Measures",
    content: [
      "End-to-end encryption for real-time messaging",
      "Multi-factor authentication available for all accounts",
      "Regular penetration testing by certified security professionals",
      "Strict access controls with audit logging for all data access",
      "All counsellors sign NDAs and undergo privacy training",
    ],
  },
  {
    icon: FileText,
    title: "9. Contact & Grievance Officer",
    content: [
      "Data Protection Officer: privacy@mindsupport.in",
      "Grievance Officer: grievance@mindsupport.in",
      "Response time: Within 24 hours for complaints",
      "Address: MindSupport Health Pvt. Ltd., [Registered Office Address]",
      "For immediate data concerns, contact our support team at +91-XXXXXXXXXX",
    ],
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Last updated: July 2026 · Compliant with DPDP Act, 2023
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {["DPDP Act 2023", "Mental Health Data", "AES-256 Encrypted", "India"].map(tag => (
              <span key={tag} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <Card className="mb-8 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Shield className="h-5 w-5" />
              Our Commitment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600 dark:text-slate-300 space-y-3">
            <p>
              At MindSupport, your privacy is our foundation. We understand that seeking mental health support 
              requires immense trust, and we take that responsibility seriously. This policy explains how we 
              collect, use, protect, and handle your personal and health information in compliance with the 
              Digital Personal Data Protection Act (DPDP Act), 2023 of India.
            </p>
            <p className="font-medium text-purple-600 dark:text-purple-400">
              Mental health data is sensitive data. We treat it with the highest standards of security and confidentiality.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <Card key={i} className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-purple-500" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.content.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <span className="text-purple-400 mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              By using MindSupport, you agree to this Privacy Policy. If you have questions or concerns, 
              please contact our Data Protection Officer at <strong>privacy@mindsupport.in</strong>
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              DPDP Act, 2023 compliant · India · July 2026
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
