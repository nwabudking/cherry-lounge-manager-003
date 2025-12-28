import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffMember } from "@/pages/Staff";
import type { AppRole } from "@/contexts/AuthContext";

interface AddEditStaffDialogProps {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    email?: string;
    password?: string;
    fullName: string;
    role: AppRole;
    newEmail?: string;
  }) => void;
  isSaving: boolean;
  isEditing: boolean;
  currentUserRole?: AppRole | null;
}

const allRoles: { value: AppRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "bar_staff", label: "Bar Staff" },
  { value: "kitchen_staff", label: "Kitchen Staff" },
  { value: "inventory_officer", label: "Inventory Officer" },
  { value: "accountant", label: "Accountant" },
];

// Get assignable roles based on current user's role
const getAssignableRoles = (userRole?: AppRole | null): { value: AppRole; label: string }[] => {
  if (!userRole) return [];
  
  switch (userRole) {
    case "super_admin":
      // Super admin can assign all roles
      return allRoles;
    case "admin":
      // Admin can assign manager and below, but NOT super_admin or admin
      return allRoles.filter(r => !["super_admin", "admin"].includes(r.value));
    case "manager":
      // Manager can assign staff roles only, NOT admin or super_admin
      return allRoles.filter(r => !["super_admin", "admin", "manager"].includes(r.value));
    default:
      return [];
  }
};

export const AddEditStaffDialog = ({
  staff,
  open,
  onOpenChange,
  onSave,
  isSaving,
  isEditing,
  currentUserRole,
}: AddEditStaffDialogProps) => {
  const assignableRoles = getAssignableRoles(currentUserRole);
  const defaultRole = assignableRoles.length > 0 ? assignableRoles[assignableRoles.length - 1].value : "cashier";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: defaultRole,
    newEmail: "",
  });

  const canUpdateEmail = currentUserRole === "super_admin" && isEditing;

  // Check if the staff's current role is in assignable roles (for display purposes)
  const staffRoleInAssignable = staff?.role && assignableRoles.some(r => r.value === staff.role);

  useEffect(() => {
    if (staff && isEditing) {
      setFormData({
        email: staff.email || "",
        password: "",
        fullName: staff.full_name || "",
        // Keep current role if not assignable (user can't change it)
        role: (staff.role as AppRole) || defaultRole,
        newEmail: staff.email || "",
      });
    } else {
      setFormData({
        email: "",
        password: "",
        fullName: "",
        role: defaultRole,
        newEmail: "",
      });
    }
  }, [staff, isEditing, open, defaultRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      const emailChanged = canUpdateEmail && formData.newEmail !== staff?.email;
      onSave({
        fullName: formData.fullName,
        role: formData.role,
        newEmail: emailChanged ? formData.newEmail : undefined,
      });
    } else {
      onSave({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
      });
    }
  };

  // For editing, always valid (name is optional). For creating, email and password required.
  const isValid = isEditing 
    ? true
    : formData.email.trim() !== "" && formData.password.length >= 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update staff member details and role"
              : "Create a new staff account with login credentials"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </>
          )}

          {canUpdateEmail && (
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.newEmail}
                onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                placeholder="staff@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Changing email will update login credentials
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            {isEditing && !staffRoleInAssignable ? (
              // Show current role as read-only if user can't change it
              <Input
                value={allRoles.find(r => r.value === staff?.role)?.label || staff?.role || "Unknown"}
                disabled
                className="bg-muted"
              />
            ) : (
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !isValid}>
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create Staff"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
