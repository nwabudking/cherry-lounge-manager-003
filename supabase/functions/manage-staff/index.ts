import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  action: "create" | "delete" | "update" | "update-email";
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  userId?: string;
  newEmail?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Starting manage-staff function");
    console.log("URL exists:", !!supabaseUrl);
    console.log("Service key exists:", !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the requesting user is authorized
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const tokenParts = token.split(".").length;
    console.log("Token length:", token.length, "token parts:", tokenParts);
    
    // Use the admin client to verify the JWT
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log("Auth result - error:", authError?.message, "user:", userData?.user?.id);
    
    if (authError || !userData?.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({
          error: "Invalid token",
          details: authError?.message,
          token_info: { length: token.length, parts: tokenParts },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const requestingUser = userData.user;

    // Check if requesting user has admin privileges
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    const allowedRoles = ["super_admin", "admin", "manager"];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestingUserRole = roleData.role;

    // Role hierarchy helper - returns roles that the requesting user can assign
    const getAssignableRoles = (userRole: string): string[] => {
      switch (userRole) {
        case "super_admin":
          // Super admin can assign all roles
          return ["super_admin", "admin", "manager", "cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
        case "admin":
          // Admin can assign manager and below, but NOT super_admin or admin
          return ["manager", "cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
        case "manager":
          // Manager can assign staff roles only, NOT admin or super_admin
          return ["cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
        default:
          return [];
      }
    };

    const body: CreateUserRequest = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, fullName, role } = body;
      
      console.log("Create staff request - email:", email, "role:", role);
      console.log("Requesting user role:", requestingUserRole);
      
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if requesting user can assign this role
      const assignableRoles = getAssignableRoles(requestingUserRole);
      console.log("Assignable roles for", requestingUserRole, ":", assignableRoles);
      
      if (role && !assignableRoles.includes(role)) {
        console.log("Role not assignable:", role);
        return new Response(JSON.stringify({ 
          error: `You don't have permission to assign the ${role} role` 
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create user with admin API
      console.log("Creating auth user...");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("User created:", newUser.user.id);

      // Upsert profile (trigger may have already created it)
      console.log("Upserting profile...");
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: newUser.user.id,
        email,
        full_name: fullName,
      }, { onConflict: 'id' });
      
      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }

      // Assign role (single role per user)
      if (role) {
        console.log("Assigning role:", role);

        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert(
            {
              user_id: newUser.user.id,
              role,
            },
            { onConflict: "user_id" }
          );

        if (roleError) {
          console.error("Role assignment error:", roleError);
          return new Response(JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Role assigned successfully:", role);
      }

      console.log("Staff creation successful");
      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { userId } = body;
      
      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-deletion
      if (userId === requestingUser.id) {
        return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete user (this cascades to profiles and roles)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { userId, fullName, role } = body;
      
      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check role assignment permissions
      if (role) {
        const assignableRoles = getAssignableRoles(requestingUserRole);
        if (!assignableRoles.includes(role)) {
          return new Response(JSON.stringify({ 
            error: `You don't have permission to assign the ${role} role` 
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if trying to modify a user with higher/equal role
        const { data: targetRoleData } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (targetRoleData) {
          const roleHierarchy = ["super_admin", "admin", "manager", "cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
          const requestingRoleIndex = roleHierarchy.indexOf(requestingUserRole);
          const targetRoleIndex = roleHierarchy.indexOf(targetRoleData.role);
          
          // Can't modify users with higher or equal role (except super_admin can modify everyone)
          if (requestingUserRole !== "super_admin" && targetRoleIndex <= requestingRoleIndex) {
            return new Response(JSON.stringify({ 
              error: `You don't have permission to modify this user's role` 
            }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Update profile
      if (fullName !== undefined) {
        await supabaseAdmin.from("profiles").update({ full_name: fullName }).eq("id", userId);
      }

      // Update role (single role per user)
      if (role) {
        const { error: roleUpsertError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id" });

        if (roleUpsertError) {
          return new Response(JSON.stringify({ error: roleUpsertError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-email") {
      const { userId, newEmail } = body;
      
      console.log("Update email request - userId:", userId, "newEmail:", newEmail);
      
      if (!userId || !newEmail) {
        console.log("Missing userId or newEmail");
        return new Response(JSON.stringify({ error: "User ID and new email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only super_admin can update emails
      if (requestingUserRole !== "super_admin") {
        console.log("Non-super_admin tried to update email:", requestingUserRole);
        return new Response(JSON.stringify({ error: "Only super admin can update user emails" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update auth user email
      console.log("Updating auth user email...");
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      });

      if (updateAuthError) {
        console.error("Auth update error:", updateAuthError);
        return new Response(JSON.stringify({ error: updateAuthError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile email
      console.log("Updating profile email...");
      const { error: profileError } = await supabaseAdmin.from("profiles").update({ email: newEmail }).eq("id", userId);
      
      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      console.log("Email update successful");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
