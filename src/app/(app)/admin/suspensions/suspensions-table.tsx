"use client";

import { useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleSuspensionAction } from "./_actions";
import { formatRole } from "@/lib/utils";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_suspended: boolean;
  student_id: string | null;
};

export function SuspensionsTable({ users }: { users: User[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (userId: string, isSuspended: boolean) => {
    const reason = isSuspended ? "Unsuspend user" : prompt("Enter reason for suspension:");
    if (!isSuspended && !reason) return;

    startTransition(async () => {
      const res = await toggleSuspensionAction({ userId, reason: reason || "Manual toggle" });
      if (res.ok) {
        toast.success(`User ${isSuspended ? "unsuspended" : "suspended"} successfully.`);
      } else {
        toast.error(res.error);
      }
    });
  };

  if (!users.length) {
    return <p className="text-sm text-muted-foreground">No users found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.full_name}
                {u.student_id && <div className="text-xs text-muted-foreground">{u.student_id}</div>}
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{formatRole(u.role)}</TableCell>
              <TableCell>
                {u.is_suspended ? (
                  <Badge variant="destructive">Suspended</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {u.role !== "super_admin" && (
                  <Button
                    variant={u.is_suspended ? "outline" : "destructive"}
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggle(u.id, u.is_suspended)}
                  >
                    {u.is_suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
