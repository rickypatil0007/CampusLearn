import Link from "next/link";
import { Logo } from "@/components/branding/logo";

const COLUMNS = [
  { title: "Product", links: [{ href: "/features", label: "Features" }, { href: "/about", label: "About" }] },
  { title: "Legal", links: [{ href: "/privacy", label: "Privacy Policy" }, { href: "/terms", label: "Terms of Service" }] },
  { title: "Support", links: [{ href: "/contact", label: "Contact" }] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo showTagline />
          <p className="mt-4 text-xs text-muted-foreground">Thakur College of Engineering and Technology</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="font-mono-label text-muted-foreground">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} CampusLearn · TCET. Registration is available only for verified @tcetmumbai.in institutional email addresses.
      </div>
    </footer>
  );
}
