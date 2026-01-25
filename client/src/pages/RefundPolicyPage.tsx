import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RefundPolicyPage() {
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
          <h1 className="text-3xl font-serif text-foreground mb-8">Refund & Cancellation Policy</h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Last Updated:</strong> January 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">1. Subscription Cancellation</h2>
            <p className="text-muted-foreground mb-4">
              You may cancel your subscription at any time. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your subscription will remain active until the end of your current billing period.</li>
              <li>You will continue to have access to all premium features until the subscription expires.</li>
              <li>No further charges will be made to your payment method after cancellation.</li>
              <li>Your account will revert to free membership status once the subscription period ends.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">2. How to Cancel</h2>
            <p className="text-muted-foreground mb-4">
              To cancel your subscription:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Log into your Formal Findings account.</li>
              <li>Navigate to your Account Settings or Subscription page.</li>
              <li>Click "Cancel Subscription" and follow the prompts.</li>
              <li>You will receive a confirmation email once cancellation is processed.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Alternatively, you may contact our support team at support@formalfindings.com to request cancellation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">3. Refund Policy</h2>
            <p className="text-muted-foreground mb-4">
              <strong>General Policy:</strong> Due to the nature of digital subscription services, all payments are generally non-refundable once processed.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Exceptions:</strong> We may consider refund requests in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Technical Issues:</strong> If you experienced significant technical problems that prevented you from accessing premium features, and our support team was unable to resolve the issue.</li>
              <li><strong>Duplicate Charges:</strong> If you were charged multiple times for the same subscription period in error.</li>
              <li><strong>Unauthorized Charges:</strong> If charges were made without your authorization (subject to verification).</li>
              <li><strong>First-Time Subscribers:</strong> New subscribers may request a refund within 3 days of their initial subscription if they are unsatisfied with the service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">4. Requesting a Refund</h2>
            <p className="text-muted-foreground mb-4">
              To request a refund, please contact our support team with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your account email address</li>
              <li>The date of the charge</li>
              <li>The reason for your refund request</li>
              <li>Any relevant documentation (screenshots, transaction IDs, etc.)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Refund requests will be reviewed within 5-7 business days. If approved, refunds will be processed to the original payment method within 10 business days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">5. Subscription Tiers</h2>
            <p className="text-muted-foreground mb-4">
              This policy applies to all subscription tiers:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>The Tailored Circle (Premium):</strong> $19.99/month</li>
              <li><strong>The Krug Society (Platinum):</strong> $49.99/month</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">6. Prorated Refunds</h2>
            <p className="text-muted-foreground mb-4">
              We do not offer prorated refunds for partial months of service. When you cancel, you will retain access to premium features until the end of your current billing cycle.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">7. Account Termination</h2>
            <p className="text-muted-foreground mb-4">
              If your account is terminated due to violation of our Terms of Service:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>No refund will be provided for the current billing period.</li>
              <li>Any unused subscription time will be forfeited.</li>
              <li>Future charges will be cancelled automatically.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We reserve the right to modify this refund and cancellation policy at any time. Changes will be effective immediately upon posting to this page. Your continued use of the service after changes are posted constitutes acceptance of the modified policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-serif text-foreground mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about this policy or need assistance with cancellation or refunds, please contact us:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> support@formalfindings.com
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-8">
            <p className="text-sm text-muted-foreground">
              By subscribing to Formal Findings, you acknowledge that you have read and agree to this Refund & Cancellation Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
