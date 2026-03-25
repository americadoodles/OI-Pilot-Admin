"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  DollarSign,
  Car,
  FileText,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminStats, getInsuranceAlerts } from "@/lib/api";
import type { AdminStats, InsuranceAlert } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<InsuranceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [statsData, alertsData] = await Promise.all([
        getAdminStats(),
        getInsuranceAlerts().catch(() => [] as InsuranceAlert[]),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AdminShell title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : stats ? (
          <>
            <StatCard
              title="Total Dealers"
              value={stats.total_dealers}
              icon={Users}
              description={`${stats.active_dealers} active`}
            />
            <StatCard
              title="Active Subscriptions"
              value={stats.active_subscriptions}
              icon={CreditCard}
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats.total_monthly_revenue)}
              icon={DollarSign}
            />
            <StatCard
              title="Vehicles on Lot"
              value={stats.vehicles_on_lot}
              icon={Car}
              description={`${stats.vehicles_sold} sold`}
            />
            <StatCard
              title="Pending Applications"
              value={stats.pending_applications}
              icon={FileText}
            />
          </>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Financing Overview */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financing Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Applications</span>
                  <span className="font-medium">{stats.financing_applications}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Opulent Financing</span>
                  <span className="font-medium">{stats.opulent_financing_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Penetration Rate</span>
                  <span className="font-medium">
                    {stats.financing_applications > 0
                      ? ((stats.opulent_financing_count / stats.financing_applications) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Kickbacks</span>
                  <span className="font-medium">{formatCurrency(stats.total_kickbacks)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Penalties</span>
                  <span className="font-medium text-destructive">{formatCurrency(stats.total_penalties)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insurance Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Insurance Alerts</CardTitle>
            {alerts.length > 0 && (
              <Badge variant="warning">{alerts.length} alert{alerts.length !== 1 ? "s" : ""}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No insurance alerts
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.dealer_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={
                          alert.alert_level === "critical"
                            ? "h-4 w-4 text-destructive"
                            : "h-4 w-4 text-amber-500"
                        }
                      />
                      <div>
                        <p className="text-sm font-medium">{alert.business_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.days_until_expiry <= 0
                            ? "Expired"
                            : `Expires in ${alert.days_until_expiry} days`}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={alert.alert_level === "critical" ? "destructive" : "warning"}
                    >
                      {alert.alert_level}
                    </Badge>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">
                    +{alerts.length - 5} more alerts
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
