"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Pencil } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStateConfigs, upsertStateConfig } from "@/lib/api";
import type { StateConfig } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const [configs, setConfigs] = useState<StateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editState, setEditState] = useState<StateConfig | null>(null);
  const [editForm, setEditForm] = useState({
    licensing_status: "",
    sales_tax_model: "",
    min_garage_liability: "",
    min_lot_coverage: "",
    min_test_drive_coverage: "",
    compliance_notes: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  async function loadConfigs() {
    setLoading(true);
    setError("");
    try {
      const data = await getStateConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load state configs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  function openEdit(config: StateConfig) {
    setEditState(config);
    setEditForm({
      licensing_status: config.licensing_status,
      sales_tax_model: config.sales_tax_model,
      min_garage_liability: config.min_garage_liability?.toString() ?? "",
      min_lot_coverage: config.min_lot_coverage?.toString() ?? "",
      min_test_drive_coverage: config.min_test_drive_coverage?.toString() ?? "",
      compliance_notes: config.compliance_notes ?? "",
      is_active: config.is_active,
    });
    setEditDialog(true);
  }

  async function handleSave() {
    if (!editState) return;
    setSaving(true);
    setError("");
    try {
      await upsertStateConfig(editState.state_code, {
        licensing_status: editForm.licensing_status,
        sales_tax_model: editForm.sales_tax_model,
        min_garage_liability: editForm.min_garage_liability
          ? Number(editForm.min_garage_liability)
          : null,
        min_lot_coverage: editForm.min_lot_coverage
          ? Number(editForm.min_lot_coverage)
          : null,
        min_test_drive_coverage: editForm.min_test_drive_coverage
          ? Number(editForm.min_test_drive_coverage)
          : null,
        compliance_notes: editForm.compliance_notes || null,
        is_active: editForm.is_active,
      });
      setEditDialog(false);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save state config");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Settings"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">State Licensing Configurations</h2>
          <p className="text-sm text-muted-foreground">
            Manage licensing requirements and insurance minimums by state
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConfigs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadConfigs}>
            Retry
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Licensing</TableHead>
              <TableHead>Tax Model</TableHead>
              <TableHead>Garage Liability</TableHead>
              <TableHead>Lot Coverage</TableHead>
              <TableHead>Test Drive</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No state configurations found
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.state_code}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{config.state_code}</p>
                      <p className="text-xs text-muted-foreground">{config.state_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        config.licensing_status === "active"
                          ? "success"
                          : config.licensing_status === "pending"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {config.licensing_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{config.sales_tax_model}</TableCell>
                  <TableCell className="text-sm">
                    {config.min_garage_liability
                      ? formatCurrency(config.min_garage_liability)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {config.min_lot_coverage
                      ? formatCurrency(config.min_lot_coverage)
                      : "--"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {config.min_test_drive_coverage
                      ? formatCurrency(config.min_test_drive_coverage)
                      : "--"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.is_active ? "success" : "secondary"}>
                      {config.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(config)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{configs.length} states configured</p>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit {editState?.state_name} ({editState?.state_code})
            </DialogTitle>
            <DialogDescription>
              Update state licensing configuration and insurance requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Licensing Status</Label>
                <Select
                  value={editForm.licensing_status}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, licensing_status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sales Tax Model</Label>
                <Select
                  value={editForm.sales_tax_model}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, sales_tax_model: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destination">Destination</SelectItem>
                    <SelectItem value="origin">Origin</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Garage Liability</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editForm.min_garage_liability}
                  onChange={(e) =>
                    setEditForm({ ...editForm, min_garage_liability: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Lot Coverage</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editForm.min_lot_coverage}
                  onChange={(e) =>
                    setEditForm({ ...editForm, min_lot_coverage: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Test Drive</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editForm.min_test_drive_coverage}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      min_test_drive_coverage: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Compliance Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={editForm.compliance_notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, compliance_notes: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Label>Active</Label>
              <Select
                value={editForm.is_active ? "true" : "false"}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, is_active: v === "true" })
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
