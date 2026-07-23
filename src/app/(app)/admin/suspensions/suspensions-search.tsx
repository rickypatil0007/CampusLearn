"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SuspensionsSearch({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter();

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search users..."
        className="pl-9"
        defaultValue={defaultQuery}
        onChange={(e) => {
          const val = e.target.value;
          if (val.length > 2) {
            router.push(`/admin/suspensions?query=${encodeURIComponent(val)}`);
          } else if (val.length === 0) {
            router.push(`/admin/suspensions`);
          }
        }}
      />
    </div>
  );
}
