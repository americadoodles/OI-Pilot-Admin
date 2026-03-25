"use client";

import { useEffect, useState, useMemo } from "react";
import { RefreshCw, Search, DollarSign, TrendingUp, Percent } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFinancingApplications, getAdminStats } from "@/lib/api";
import type { FinancingApp, AdminStats } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

function statusVariant(status: string) {
  switch (status) {
    case "funded":
    case "approved":
      return "success" as const;
    case "pending":
    case "submitted":
      return "warning" as const;
    case "declined":
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default function FinancingPage() {
  const [apps, setApps] = useState<FinancingApp[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [appsData, statsData] = await Promise.all([
        getFinancingApplications(),
        getAdminStats().catch(() => null),
      ]);
      setApps(appsData.items);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load financing data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let result = apps;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.customer_name.toLowerCase().includes(q) ||
          (a.dealer_name && a.dealer_name.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    return result;
  }, [apps, search, statusFilter]);

  const totalFunded = useMemo(
    () =>
      apps
        .filter((a) => a.status === "funded")
        .reduce((sum, a) => sum + (a.loan_amount ?? 0), 0),
    [apps]
  );

  return (
    <AdminShell
      title="Financing"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Financing" }]}
    >
      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funded</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-7 w-24 animate-pulse rounded bg-muted" />
              ) : (
                formatCurrency(totalFunded)
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-muted" />
              ) : (
                stats?.financing_applications ?? apps.length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penetration Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-7 w-16 animate-pulse rounded bg-muted" />
              ) : stats && stats.financing_applications > 0 ? (
                `${((stats.opulent_financing_count / stats.financing_applications) * 100).toFixed(1)}%`
              ) : (
                "0%"
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kickbacks</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <div className="h-7 w-20 animate-pulse rounded bg-muted" />
              ) : (
                formatCurrency(stats?.total_kickbacks ?? 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer or dealer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="funded">Funded</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Dealer</TableHead>
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
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No financing applications found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.customer_name}</TableCell>
                  <TableCell className="text-sm">{app.dealer_name ?? "--"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                  </TableCell>
                  <TableCell>{app.loan_amount ? formatCurrency(app.loan_amount) : "--"}</TableCell>
                  <TableCell>{app.apr ? `${app.apr}%` : "--"}</TableCell>
                  <TableCell>{app.term_months ? `${app.term_months}mo` : "--"}</TableCell>
                  <TableCell>
                    {app.monthly_payment ? formatCurrency(app.monthly_payment) : "--"}
                  </TableCell>
                  <TableCell>
                    {app.dealer_kickback ? formatCurrency(app.dealer_kickback) : "--"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(app.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {filtered.length} of {apps.length} applications
      </p>
    </AdminShell>
  );
}
