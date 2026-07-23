import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Terms of Service</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        This is a template policy for the CampusLearn platform and should be reviewed by TCET&apos;s administration
        and legal counsel before production use.
      </p>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-mono-label text-foreground">Eligibility</h2>
          <p className="mt-2">
            CampusLearn is available only to holders of a valid @tcetmumbai.in institutional email address. All new
            registrations are provisioned with the Student role; Faculty, Class Representative, Department
            Administrator, and Super Administrator roles are granted only by an authorized administrator or faculty
            member.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">Acceptable use</h2>
          <p className="mt-2">
            You agree to upload only content you have the right to share, to not attempt to bypass approval
            workflows or access controls, to not misuse AI features to generate or extract information you are not
            authorized to access, and to not attempt to gain elevated permissions.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">Academic integrity</h2>
          <p className="mt-2">
            Quiz and assignment submissions must represent your own work unless collaboration is explicitly
            permitted. AI-generated study material is a study aid and should be verified against original course
            material — it is not a substitute for your own understanding or a guarantee of accuracy.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">Account suspension</h2>
          <p className="mt-2">
            Department and Super Administrators may suspend accounts that violate these terms, institutional policy,
            or applicable law. Suspended accounts lose access until reinstated by an administrator.
          </p>
        </section>
        <section>
          <h2 className="font-mono-label text-foreground">Changes</h2>
          <p className="mt-2">These terms may be updated from time to time; continued use of CampusLearn after changes constitutes acceptance.</p>
        </section>
      </div>
    </div>
  );
}
