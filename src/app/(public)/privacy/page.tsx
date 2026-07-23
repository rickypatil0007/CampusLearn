import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        This is a template policy for the CampusLearn platform and should be reviewed by TCET&apos;s administration
        and legal counsel before production use.
      </p>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-mono-label text-foreground">Information we collect</h2>
          <p className="mt-2">
            Account information (name, institutional email, department, programme, academic year, semester,
            division, roll number), content you upload (resources, assignment submissions, discussion posts), quiz
            and assignment activity, and usage data needed to operate the platform (login times, resource views and
            downloads, AI feature usage).
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">How we use it</h2>
          <p className="mt-2">
            To operate core features (dashboards, resources, quizzes, assignments, announcements, discussions), to
            enforce role-based access, to generate AI-assisted study material grounded in approved resources, and to
            maintain audit logs of sensitive administrative actions.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">AI processing</h2>
          <p className="mt-2">
            When you use AI features, relevant approved document excerpts and your question are sent to the
            configured AI provider to generate a response. Uploaded document text is treated as data, not as
            instructions, and AI usage is logged for administrative oversight.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">Data retention &amp; access</h2>
          <p className="mt-2">
            Data is retained for as long as your account is active and as required for academic and administrative
            record-keeping. Row-Level Security ensures you can only access data you are authorized to see; files are
            served through short-lived signed links rather than public URLs.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">Your choices</h2>
          <p className="mt-2">
            You can update your profile information and notification preferences from Settings at any time. Contact
            your Department Administrator for account deletion or data export requests.
          </p>
        </section>
      </div>
    </div>
  );
}
