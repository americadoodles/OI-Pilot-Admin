"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Ban,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDealerDetail, approveDealer } from "@/lib/api";
import type { DealerDetail } from "@/lib/api";
import { formatCurrency, formatDate, daysFromNow } from "@/lib/utils";

function statusVariant(status: string) {
  switch (status) {
    case "active":
    case "compliant":
    case "valid":
    case "approved":
    case "sold":
      return "success" as const;
    case "pending":
    case "on_lot":
    case "expiring_soon":
      return "warning" as const;
    case "suspended":
    case "non_compliant":
    case "expired":
    case "declined":
    case "returned":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default function DealerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealerId = params.id as string;

  const [dealer, setDealer] = useState<DealerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "approve" | "decline" | "suspend";
    title: string;
  }>({ open: false, action: "approve", title: "" });
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadDealer() {
    setLoading(true);
    setError("");
    try {
      const data = await getDealerDetail(dealerId);
      setDealer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dealer details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDealer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerId]);

  async function handleAction() {
    setActionLoading(true);
    try {
      const apiAction = actionDialog.action === "suspend" ? "decline" : actionDialog.action;
      await approveDealer(dealerId, apiAction, actionNotes || undefined);
      await loadDealer();
      setActionDialog({ ...actionDialog, open: false });
      setActionNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  function openAction(action: "approve" | "decline" | "suspend") {
    const titles = {
      approve: "Approve Dealer",
      decline: "Decline Dealer",
      suspend: "Suspend Dealer",
    };
    setActionDialog({ open: true, action, title: titles[action] });
    setActionNotes("");
  }

  if (loading) {
    return (
      <AdminShell
        title="Dealer Details"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Dealers", href: "/dealers" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </AdminShell>
    );
  }

  if (error && !dealer) {
    return (
      <AdminShell
        title="Dealer Details"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Dealers", href: "/dealers" },
          { label: "Error" },
        ]}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-destructive">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dealers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dealers
            </Button>
            <Button onClick={loadDealer}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (!dealer) return null;

  return (
    <AdminShell
      title={dealer.business_name}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Dealers", href: "/dealers" },
        { label: dealer.business_name },
      ]}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.push("/dealers")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dealers
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>{dealer.business_name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {dealer.contact_name}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={dealer.is_active ? "success" : "destructive"}>
                {dealer.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant={statusVariant(dealer.compliance_status)}>
                {dealer.compliance_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {dealer.email}
              </div>
              {dealer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {dealer.phone}
                </div>
              )}
              {(dealer.address || dealer.city) && (
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {[dealer.address, dealer.city, dealer.state, dealer.zip_code]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Insurance Status</p>
                <Badge variant={statusVariant(dealer.insurance_status)} className="mt-1">
                  {dealer.insurance_status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Insurance Expiry</p>
                <p className="mt-1 text-sm">{formatDate(dealer.insurance_expiry)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="mt-1 text-sm">{formatDate(dealer.created_at)}</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openAction("approve")}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openAction("decline")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openAction("suspend")}
              >
                <Ban className="mr-2 h-4 w-4" />
                Suspend
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {dealer.subscription ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Package</p>
                  <p className="font-medium">{dealer.subscription.package}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tier</p>
                  <p className="text-sm">{dealer.subscription.tier}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Fee</p>
                  <p className="text-sm">
                    {dealer.subscription.monthly_fee
                      ? formatCurrency(dealer.subscription.monthly_fee)
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle Allocation</p>
                  <p className="text-sm">{dealer.subscription.vehicle_allocation ?? "--"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sales Window</p>
                  <p className="text-sm">
                    {dealer.subscription.sales_window_days
                      ? `${dealer.subscription.sales_window_days} days`
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(dealer.subscription.status)} className="mt-1">
                    {dealer.subscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Renewal Date</p>
                  <p className="text-sm">{formatDate(dealer.subscription.renewal_date)}</p>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No active subscription
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Vehicles + Financing */}
      <Tabs defaultValue="vehicles" className="mt-6">
        <TabsList>
          <TabsTrigger value="vehicles">
            Consigned Vehicles ({dealer.consigned_vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="financing">
            Financing ({dealer.financing_applications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Window End</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Sold Price</TableHead>
                  <TableHead>Penalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealer.consigned_vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No consigned vehicles
                    </TableCell>
                  </TableRow>
                ) : (
                  dealer.consigned_vehicles.map((v) => {
                    const days = daysFromNow(v.sales_window_end);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.vin}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(v.delivery_date)}</TableCell>
                        <TableCell className="text-sm">{formatDate(v.sales_window_end)}</TableCell>
                        <TableCell>
                          {days !== null && (
                            <span
                              className={
                                days < 0
                                  ? "font-medium text-destructive"
                                  : days <= 7
                                  ? "font-medium text-amber-600"
                                  : "text-emerald-600"
                              }
                            >
                              {days} days
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {v.sold_price ? formatCurrency(v.sold_price) : "--"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {v.penalty_amount ? (
                            <span className="text-destructive">
                              {formatCurrency(v.penalty_amount)}
                            </span>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="financing">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>APR</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Kickback</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealer.financing_applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No financing applications
                    </TableCell>
                  </TableRow>
                ) : (
                  dealer.financing_applications.map((fa) => (
                    <TableRow key={fa.id}>
                      <TableCell className="font-medium">{fa.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(fa.status)}>{fa.status}</Badge>
                      </TableCell>
                      <TableCell>{fa.loan_amount ? formatCurrency(fa.loan_amount) : "--"}</TableCell>
                      <TableCell>{fa.apr ? `${fa.apr}%` : "--"}</TableCell>
                      <TableCell>{fa.term_months ? `${fa.term_months}mo` : "--"}</TableCell>
                      <TableCell>
                        {fa.monthly_payment ? formatCurrency(fa.monthly_payment) : "--"}
                      </TableCell>
                      <TableCell>
                        {fa.dealer_kickback ? formatCurrency(fa.dealer_kickback) : "--"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(fa.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.title}</DialogTitle>
            <DialogDescription>
              {actionDialog.action === "approve"
                ? "Approve this dealer to begin onboarding."
                : actionDialog.action === "decline"
                ? "Decline this dealer application."
                : "Suspend this dealer account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ ...actionDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </span>
              ) : (
                actionDialog.title
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
