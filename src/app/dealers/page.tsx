"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { getDealers } from "@/lib/api";
import type { Dealer } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function statusVariant(status: string) {
  switch (status) {
    case "active":
    case "compliant":
    case "valid":
      return "success" as const;
    case "pending":
    case "expiring_soon":
      return "warning" as const;
    case "suspended":
    case "non_compliant":
    case "expired":
    case "declined":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export default function DealersPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadDealers() {
    setLoading(true);
    setError("");
    try {
      const data = await getDealers();
      setDealers(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dealers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDealers();
  }, []);

  const filtered = useMemo(() => {
    let result = dealers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.business_name.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.contact_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((d) => {
        if (statusFilter === "active") return d.is_active;
        if (statusFilter === "inactive") return !d.is_active;
        return d.compliance_status === statusFilter;
      });
    }
    return result;
  }, [dealers, search, statusFilter]);

  return (
    <AdminShell
      title="Dealers"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Dealers" }]}
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dealers..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="non_compliant">Non-Compliant</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadDealers} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadDealers}>
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {dealers.length === 0
                    ? "No dealers found"
                    : "No dealers match your filters"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((dealer) => (
                <TableRow
                  key={dealer.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dealers/${dealer.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{dealer.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dealer.contact_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{dealer.email}</TableCell>
                  <TableCell>
                    <Badge variant={dealer.is_active ? "success" : "secondary"}>
                      {dealer.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(dealer.compliance_status)}>
                      {dealer.compliance_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(dealer.insurance_status)}>
                      {dealer.insurance_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(dealer.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {filtered.length} of {dealers.length} dealers
      </p>
    </AdminShell>
  );
}
