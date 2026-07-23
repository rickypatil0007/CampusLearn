import type { Metadata } from "next";
import { Cpu } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, MetricCard } from "@/components/dashboard/metric-card";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "AI Usage" };

export default async function AiUsagePage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("ai_usage_logs")
    .select("id, feature, input_tokens, output_tokens, estimated_cost_usd, created_at, profiles:user_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const totalTokens = (logs ?? []).reduce((sum, l) => sum + l.input_tokens + l.output_tokens, 0);
  const totalCost = (logs ?? []).reduce((sum, l) => sum + Number(l.estimated_cost_usd), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Usage</h1>
        <p className="text-sm text-muted-foreground">Token consumption and estimated cost across all AI features.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Requests logged" value={logs?.length ?? 0} icon={Cpu} />
        <MetricCard label="Total tokens" value={totalTokens.toLocaleString()} />
        <MetricCard label="Estimated cost" value={`$${totalCost.toFixed(4)}`} accent />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent requests</CardTitle></CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Feature</TableHead><TableHead>Tokens</TableHead><TableHead>Cost</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                    <TableCell className="text-foreground">{(l.profiles as unknown as { full_name: string } | null)?.full_name ?? "—"}</TableCell>
                    <TableCell><span className="font-mono-label text-primary">{l.feature}</span></TableCell>
                    <TableCell className="text-muted-foreground">{l.input_tokens + l.output_tokens}</TableCell>
                    <TableCell className="text-muted-foreground">${Number(l.estimated_cost_usd).toFixed(5)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Cpu} title="No AI usage recorded yet" description="Usage appears here once AI features are used with a configured Anthropic API key." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
