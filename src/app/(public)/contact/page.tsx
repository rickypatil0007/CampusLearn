import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Contact</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        For account issues, contact your Department Administrator. For general institutional queries, reach out to
        Thakur College of Engineering and Technology directly.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-foreground normal-case text-base"><Mail className="h-4 w-4 text-primary" /> Email</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">support@tcetmumbai.in</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-foreground normal-case text-base"><MapPin className="h-4 w-4 text-primary" /> Campus</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Thakur College of Engineering and Technology, Mumbai</CardContent>
        </Card>
      </div>
    </div>
  );
}
