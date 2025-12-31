-- Create activity_logs table for tracking major activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- 'inventory_add', 'inventory_remove', 'inventory_update', 'inventory_delete', 'user_add', 'user_delete', 'user_update'
  entity_type TEXT NOT NULL, -- 'inventory_item', 'user', 'supplier'
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Managers and above can view activity logs
CREATE POLICY "Managers can view activity logs"
ON public.activity_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'accountant'::app_role)
);

-- Staff with permissions can insert activity logs
CREATE POLICY "Staff can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'inventory_officer'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);