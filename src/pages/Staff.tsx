import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useResetStaffPassword,
} from "@/hooks/useStaff";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StaffTable } from "@/components/staff/StaffTable";
import { AddEditStaffDialog } from "@/components/staff/AddEditStaffDialog";
import { DeleteStaffDialog } from "@/components/staff/DeleteStaffDialog";
import { ResetPasswordDialog } from "@/components/staff/ResetPasswordDialog";

export interface StaffMember {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  role: AppRole | null;
}

const Staff = () => {
  const { toast } = useToast();
  const { role: currentUserRole, user } = useAuth();

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: rawStaffMembers, isLoading } = useStaff();
  const staffMembers = Array.isArray(rawStaffMembers) ? rawStaffMembers : [];
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  const resetPasswordMutation = useResetStaffPassword();

  // Transform staff data to match expected format
  const transformedStaff: StaffMember[] = staffMembers.map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    avatar_url: s.avatar_url,
    created_at: s.created_at,
    role: s.role as AppRole | null,
  }));

  const filteredStaff = transformedStaff.filter((staff) => {
    const matchesSearch =
      !searchQuery ||
      staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || staff.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const canManageStaff = currentUserRole === "super_admin" || currentUserRole === "admin" || currentUserRole === "manager";

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setIsEditing(false);
    setIsAddEditDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsEditing(true);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsDeleteDialogOpen(true);
  };

  const handleResetPassword = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = (newPassword: string) => {
    if (selectedStaff) {
      resetPasswordMutation.mutate(
        { id: selectedStaff.id, newPassword },
        {
          onSuccess: () => {
            setIsResetPasswordDialogOpen(false);
            setSelectedStaff(null);
          },
        }
      );
    }
  };

  const handleSaveStaff = (data: {
    email?: string;
    password?: string;
    fullName: string;
    role: AppRole;
  }) => {
    if (isEditing && selectedStaff) {
      updateStaffMutation.mutate(
        {
          id: selectedStaff.id,
          data: {
            full_name: data.fullName,
            role: data.role,
          },
        },
        {
          onSuccess: () => {
            setIsAddEditDialogOpen(false);
            setSelectedStaff(null);
          },
        }
      );
    } else if (data.email && data.password) {
      createStaffMutation.mutate(
        {
          email: data.email,
          password: data.password,
          full_name: data.fullName,
          role: data.role,
        },
        {
          onSuccess: () => {
            setIsAddEditDialogOpen(false);
            setSelectedStaff(null);
          },
        }
      );
    }
  };

  const handleConfirmDelete = () => {
    if (selectedStaff) {
      deleteStaffMutation.mutate(selectedStaff.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedStaff(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <StaffHeader
        staffCount={transformedStaff.length}
        onAddStaff={handleAddStaff}
        canManage={canManageStaff}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
      />

      <StaffTable
        staff={filteredStaff}
        isLoading={isLoading}
        onEdit={handleEditStaff}
        onDelete={handleDeleteStaff}
        onResetPassword={handleResetPassword}
        canManage={canManageStaff}
        currentUserId={user?.id}
      />

      <AddEditStaffDialog
        staff={selectedStaff}
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onSave={handleSaveStaff}
        isSaving={createStaffMutation.isPending || updateStaffMutation.isPending}
        isEditing={isEditing}
        currentUserRole={currentUserRole}
      />

      <DeleteStaffDialog
        staff={selectedStaff}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteStaffMutation.isPending}
      />

      <ResetPasswordDialog
        staff={selectedStaff}
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={handleConfirmResetPassword}
        isResetting={resetPasswordMutation.isPending}
      />
    </div>
  );
};

export default Staff;
