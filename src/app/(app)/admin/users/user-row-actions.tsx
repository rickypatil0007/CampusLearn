"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignRoleAction, suspendUserAction } from "../_actions/academic";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/permissions/roles";

export function UserRowActions({ userId, name, isSuspended, currentRole }: { userId: string; name: string; isSuspended: boolean; currentRole: Role }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`}><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRoleDialogOpen(true)}>Change role</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              startTransition(async () => {
                const result = await suspendUserAction(userId, !isSuspended);
                if (!result.ok) { toast.error(result.error); return; }
                toast.success(isSuspended ? "Account reactivated." : "Account suspended.");
                router.refresh();
              })
            }
          >
            {isSuspended ? "Reactivate account" : "Suspend account"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change role for {name}</DialogTitle></DialogHeader>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await assignRoleAction({ userId, role: selectedRole });
                  if (!result.ok) { toast.error(result.error); return; }
                  toast.success("Role updated.");
                  setRoleDialogOpen(false);
                  router.refresh();
                })
              }
            >
              {isPending ? "Saving…" : "Save role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
