"use client";

import { useEffect, useState, useMemo } from "react";
import { RefreshCw, Search } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
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
import { getConsignedVehicles } from "@/lib/api";
import type { ConsignedVehicle } from "@/lib/api";
import { formatCurrency, formatDate, daysFromNow } from "@/lib/utils";

function statusVariant(status: string) {
  switch (status) {
    case "sold":
      return "success" as const;
    case "on_lot":
    case "in_transit":
      return "warning" as const;
    case "returned":
    case "penalty":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default function ConsignmentPage() {
  const [vehicles, setVehicles] = useState<ConsignedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadVehicles() {
    setLoading(true);
    setError("");
    try {
      const data = await getConsignedVehicles();
      setVehicles(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const filtered = useMemo(() => {
    let result = vehicles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.vin.toLowerCase().includes(q) ||
          (v.dealer_name && v.dealer_name.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((v) => v.status === statusFilter);
    }
    return result;
  }, [vehicles, search, statusFilter]);

  return (
    <AdminShell
      title="Consignment"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Consignment" }]}
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by VIN or dealer..."
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
              <SelectItem value="on_lot">On Lot</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadVehicles}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadVehicles}>
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VIN</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Window End</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead>Penalty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No vehicles found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => {
                const days = daysFromNow(v.sales_window_end);
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.vin}</TableCell>
                    <TableCell className="text-sm">{v.dealer_name ?? "--"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(v.delivery_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(v.sales_window_end)}</TableCell>
                    <TableCell>
                      {days !== null ? (
                        <span
                          className={
                            days < 0
                              ? "font-medium text-destructive"
                              : days <= 7
                              ? "font-medium text-amber-600"
                              : days <= 14
                              ? "text-amber-500"
                              : "text-emerald-600"
                          }
                        >
                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                        </span>
                      ) : (
                        "--"
                      )}
                    </TableCell>
                    <TableCell>
                      {v.penalty_amount ? (
                        <span className="font-medium text-destructive">
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

      <p className="mt-2 text-xs text-muted-foreground">
        {filtered.length} of {vehicles.length} vehicles
      </p>
    </AdminShell>
  );
}
