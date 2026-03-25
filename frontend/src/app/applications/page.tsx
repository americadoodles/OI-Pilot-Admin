"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDealers, approveDealer } from "@/lib/api";
import type { Dealer } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function ApplicationsPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dialog, setDialog] = useState<{
    open: boolean;
    action: "approve" | "decline";
    dealer: Dealer | null;
  }>({ open: false, action: "approve", dealer: null });
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadApplications() {
    setLoading(true);
    setError("");
    try {
      const data = await getDealers({ status: "pending" });
      setDealers(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function handleAction() {
    if (!dialog.dealer) return;
    setActionLoading(true);
    try {
      await approveDealer(dialog.dealer.id, dialog.action, notes || undefined);
      setDialog({ open: false, action: "approve", dealer: null });
      setNotes("");
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminShell
      title="Pending Applications"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Applications" }]}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {dealers.length} pending application{dealers.length !== 1 ? "s" : ""}
        </p>
        <Button variant="outline" size="sm" onClick={loadApplications}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadApplications}>
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : dealers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No pending applications
                </TableCell>
              </TableRow>
            ) : (
              dealers.map((dealer) => (
                <TableRow key={dealer.id}>
                  <TableCell className="font-medium">{dealer.business_name}</TableCell>
                  <TableCell>{dealer.contact_name}</TableCell>
                  <TableCell className="text-sm">{dealer.email}</TableCell>
                  <TableCell className="text-sm">{dealer.phone ?? "--"}</TableCell>
                  <TableCell className="text-sm">
                    {[dealer.city, dealer.state].filter(Boolean).join(", ") || "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(dealer.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setDialog({ open: true, action: "approve", dealer })
                        }
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setDialog({ open: true, action: "decline", dealer })
                        }
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve / Decline Dialog */}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ ...dialog, open: false });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.action === "approve" ? "Approve" : "Decline"} Application
            </DialogTitle>
            <DialogDescription>
              {dialog.action === "approve"
                ? `Approve ${dialog.dealer?.business_name} to begin onboarding.`
                : `Decline the application from ${dialog.dealer?.business_name}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">{dialog.dealer?.business_name}</p>
              <p className="text-xs text-muted-foreground">{dialog.dealer?.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-notes">Notes (optional)</Label>
              <Textarea
                id="action-notes"
                placeholder="Add review notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ ...dialog, open: false })}>
              Cancel
            </Button>
            <Button
              variant={dialog.action === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </span>
              ) : dialog.action === "approve" ? (
                "Approve"
              ) : (
                "Decline"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
