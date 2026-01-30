import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-serif text-foreground mb-8">Privacy Policy</h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Last Updated:</strong> January 2026
          </p>

          <p className="text-muted-foreground mb-6">
            Formal Findings ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">1. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-foreground mb-3">Personal Information</h3>
            <p className="text-muted-foreground mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Email address and password (encrypted)</li>
              <li>Display name and profile information you choose to provide</li>
              <li>Date of birth (for age verification purposes)</li>
              <li>Profile photos you upload</li>
              <li>Physical description information (optional)</li>
              <li>Health information you voluntarily provide (optional, self-reported)</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">Location Data</h3>
            <p className="text-muted-foreground mb-4">
              With your consent, we collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Geographic location data to show you nearby members</li>
              <li>Location data is intentionally "fuzzed" (randomized within approximately 500 feet) to protect your exact location</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-3">Usage Data</h3>
            <p className="text-muted-foreground mb-4">
              We automatically collect:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device information and browser type</li>
              <li>IP address and access times</li>
              <li>Pages viewed and features used</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Create and manage your account</li>
              <li>Enable you to connect with other members</li>
              <li>Display your profile to other members (based on your privacy settings)</li>
              <li>Process subscription payments</li>
              <li>Send service-related communications</li>
              <li>Verify age eligibility (21+ requirement)</li>
              <li>Enforce our terms of service and community guidelines</li>
              <li>Improve our services and develop new features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">3. Information Sharing</h2>
            <p className="text-muted-foreground mb-4">
              We share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>With Other Members:</strong> Profile information you make public is visible to other authenticated members.</li>
              <li><strong>Service Providers:</strong> We use third-party services for payment processing (Stripe), hosting, and analytics.</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our legal rights.</li>
              <li><strong>With Your Consent:</strong> When you explicitly agree to share information.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Passwords are encrypted using industry-standard bcrypt hashing</li>
              <li>All data transmission is encrypted via HTTPS/TLS</li>
              <li>Password reset tokens are hashed before storage</li>
              <li>Session data is securely stored and managed</li>
              <li>Regular security reviews and updates</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">5. Your Privacy Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-out:</strong> Disable location sharing or other optional features</li>
              <li><strong>Withdraw Consent:</strong> Revoke previously given consent</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at privacy@formalfindings.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">6. Photo Privacy</h2>
            <p className="text-muted-foreground mb-4">
              We provide controls over your photos:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You can mark photos as public or private</li>
              <li>Private photos are only visible to you</li>
              <li>You control who can view your virtual wardrobe</li>
              <li>Screenshot protection features are enabled for premium members</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">7. Messaging Privacy</h2>
            <p className="text-muted-foreground mb-4">
              Your messages are:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Stored securely and only accessible to conversation participants</li>
              <li>Protected with screenshot deterrent features for premium members</li>
              <li>Not shared with third parties except as required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">8. Health Information</h2>
            <p className="text-muted-foreground mb-4">
              Any health information you provide (such as HIV status or PrEP usage) is:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Entirely voluntary and self-reported</li>
              <li>Not verified by Formal Findings</li>
              <li>Only visible to other members if you choose to display it</li>
              <li>Stored with the same security measures as other personal data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">9. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintain your session and keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze site usage and improve our services</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can control cookies through your browser settings, but some features may not function properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">10. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain your data as follows:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
              <li><strong>Deleted Accounts:</strong> Upon account deletion, we remove your personal data within 30 days, except where retention is required by law</li>
              <li><strong>Backup Systems:</strong> Data may persist in backup systems for up to 90 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">11. Age Requirement</h2>
            <p className="text-muted-foreground mb-4">
              Formal Findings is intended for users who are 21 years of age or older. We do not knowingly collect information from anyone under 21. If you believe we have collected information from someone under 21, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">12. International Users</h2>
            <p className="text-muted-foreground mb-4">
              Our services are hosted in the United States. If you access our services from outside the United States, your information may be transferred to and processed in the United States, where data protection laws may differ from your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> privacy@formalfindings.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
