"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInsuranceAlerts, getDealers, runComplianceChecks } from "@/lib/api";
import type { InsuranceAlert, Dealer } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<InsuranceAlert[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningChecks, setRunningChecks] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [alertsData, dealersData] = await Promise.all([
        getInsuranceAlerts().catch(() => [] as InsuranceAlert[]),
        getDealers().catch(() => ({ items: [] as Dealer[], total: 0 })),
      ]);
      setAlerts(alertsData);
      setDealers(dealersData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRunChecks() {
    setRunningChecks(true);
    setError("");
    try {
      await runComplianceChecks();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run compliance checks");
    } finally {
      setRunningChecks(false);
    }
  }

  const compliantCount = dealers.filter((d) => d.compliance_status === "compliant").length;
  const nonCompliantCount = dealers.filter((d) => d.compliance_status === "non_compliant").length;
  const criticalAlerts = alerts.filter((a) => a.alert_level === "critical").length;

  return (
    <AdminShell
      title="Compliance"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Compliance" }]}
    >
      {/* Header actions */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Insurance alerts and compliance status overview
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleRunChecks} disabled={runningChecks}>
            {runningChecks ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running...
              </span>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Checks
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-muted" />
              ) : (
                dealers.length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-muted" />
              ) : (
                compliantCount
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-muted" />
              ) : (
                nonCompliantCount
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-muted" />
              ) : (
                criticalAlerts
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Alerts Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Insurance Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead>Days Until Expiry</TableHead>
                  <TableHead>Alert Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No insurance alerts. All dealers are in good standing.
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert.dealer_id}>
                      <TableCell className="font-medium">{alert.business_name}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(alert.insurance_expiry)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            alert.days_until_expiry <= 0
                              ? "font-medium text-destructive"
                              : alert.days_until_expiry <= 7
                              ? "font-medium text-amber-600"
                              : alert.days_until_expiry <= 30
                              ? "text-amber-500"
                              : ""
                          }
                        >
                          {alert.days_until_expiry <= 0
                            ? `${Math.abs(alert.days_until_expiry)} days expired`
                            : `${alert.days_until_expiry} days`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            alert.alert_level === "critical" ? "destructive" : "warning"
                          }
                        >
                          {alert.alert_level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dealer Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Insurance</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : dealers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No dealers found
                    </TableCell>
                  </TableRow>
                ) : (
                  dealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dealer.business_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dealer.contact_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={dealer.is_active ? "success" : "secondary"}
                        >
                          {dealer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dealer.compliance_status === "compliant"
                              ? "success"
                              : dealer.compliance_status === "non_compliant"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {dealer.compliance_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dealer.insurance_status === "valid"
                              ? "success"
                              : dealer.insurance_status === "expired"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {dealer.insurance_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(dealer.insurance_expiry)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
