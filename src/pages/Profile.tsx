import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
      if (error) throw error;
      await refreshUser();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Profile</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-2"><AvatarImage src={user?.avatar_url || undefined} /><AvatarFallback className="bg-primary/10 text-primary text-2xl">{initials}</AvatarFallback></Avatar>
            <div><p className="font-medium">{user?.full_name || 'No name'}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Update your details</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <Button type="submit" disabled={isUpdating}>{isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
