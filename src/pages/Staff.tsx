import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StaffTable } from "@/components/staff/StaffTable";
import { AddEditStaffDialog } from "@/components/staff/AddEditStaffDialog";
import { DeleteStaffDialog } from "@/components/staff/DeleteStaffDialog";
import type { AppRole } from "@/contexts/AuthContext";

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
  const queryClient = useQueryClient();
  
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]));
      
      return profiles?.map((profile) => ({
        ...profile,
        role: roleMap.get(profile.id) || null,
      })) as StaffMember[];
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; role: AppRole }) => {
      const { data: result, error } = await supabase.functions.invoke("manage-staff", {
        body: {
          action: "create",
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Staff Created", description: "New staff member added successfully." });
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      setIsAddEditDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: { userId: string; fullName: string; role: AppRole }) => {
      const { data: result, error } = await supabase.functions.invoke("manage-staff", {
        body: {
          action: "update",
          userId: data.userId,
          fullName: data.fullName,
          role: data.role,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Staff Updated", description: "Staff member updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      setIsAddEditDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke("manage-staff", {
        body: {
          action: "delete",
          userId,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Staff Deleted", description: "Staff member removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      setIsDeleteDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredStaff = staffMembers.filter((staff) => {
    const matchesSearch = 
      !searchQuery ||
      staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const canManageStaff = currentUserRole === "super_admin" || currentUserRole === "manager";

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

  const handleSaveStaff = (data: { email?: string; password?: string; fullName: string; role: AppRole }) => {
    if (isEditing && selectedStaff) {
      updateStaffMutation.mutate({
        userId: selectedStaff.id,
        fullName: data.fullName,
        role: data.role,
      });
    } else if (data.email && data.password) {
      createStaffMutation.mutate({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
      });
    }
  };

  return (
    <div className="space-y-6">
      <StaffHeader
        staffCount={staffMembers.length}
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
      />

      <DeleteStaffDialog
        staff={selectedStaff}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => selectedStaff && deleteStaffMutation.mutate(selectedStaff.id)}
        isDeleting={deleteStaffMutation.isPending}
      />
    </div>
  );
};

export default Staff;
