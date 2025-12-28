import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Shield, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import logoImage from '@/assets/logo.png';
import { getEnvironmentConfig } from '@/lib/db/environment';
import apiClient from '@/lib/api/client';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface SystemStatus {
  initialized: boolean;
  hasSuperAdmin: boolean;
  needsSetup: boolean;
}

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const config = getEnvironmentConfig();

  // Check system status on mount
  useEffect(() => {
    checkSystemStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const checkSystemStatus = async () => {
    setIsCheckingStatus(true);
    
    // For Supabase mode - RLS blocks unauthenticated queries
    // Default to login mode since setup requires backend coordination
    if (config.mode === 'supabase' || config.supabaseAvailable) {
      // In Supabase/Lovable mode, always show login (super_admin created via Supabase dashboard or migration)
      setSystemStatus({ initialized: true, hasSuperAdmin: true, needsSetup: false });
    } else {
      // For MySQL/Docker mode, use REST API to check if setup is needed
      try {
        const response = await apiClient.get('/bootstrap/status');
        setSystemStatus(response.data);
      } catch (error) {
        console.error('Failed to check system status:', error);
        setSystemStatus({ initialized: false, hasSuperAdmin: false, needsSetup: true });
      }
    }
    
    setIsCheckingStatus(false);
  };

  const validate = (isSetup: boolean = false) => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (isSetup && !fullName.trim()) {
      newErrors.fullName = 'Full name is required for initial setup';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Initial super-admin setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate(true)) return;
    
    setIsLoading(true);
    
    try {
      if (config.mode === 'supabase' || config.supabaseAvailable) {
        // For Supabase: Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error('Failed to create account');

        // Create profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: fullName,
        });

        // Assign super_admin role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'super_admin',
        });

        toast({
          title: 'Setup Complete!',
          description: 'Super admin account created. You are now logged in.',
        });

        // Refresh status
        await checkSystemStatus();
        navigate('/dashboard', { replace: true });
      } else {
        // For MySQL/Docker: Use REST API
        const response = await apiClient.post('/bootstrap/setup-admin', {
          email,
          password,
          full_name: fullName,
        });

        if (response.data.success) {
          toast({
            title: 'Setup Complete!',
            description: 'Super admin account created. Please sign in.',
          });
          
          await checkSystemStatus();
          setPassword('');
        }
      }
    } catch (error: any) {
      const message = error.message || error.response?.data?.error || 'Setup failed';
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Regular login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate(false)) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message === 'Invalid login credentials' 
            ? 'Invalid email or password. Please try again.'
            : error.message,
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking system status
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking system status...</p>
        </div>
      </div>
    );
  }

  const needsSetup = systemStatus?.needsSetup ?? false;

  return (
    <div className="min-h-screen flex items-center justify-center gradient-dark p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      
      <Card className="w-full max-w-md relative z-10 glass-dark border-border/50 animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={logoImage} alt="Cherry Dining & Lounge" className="h-20 w-auto object-contain" />
          </div>
          <div>
            {needsSetup ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Initial Setup</span>
                </div>
                <CardDescription className="text-muted-foreground">
                  Create your super admin account to get started
                </CardDescription>
              </>
            ) : (
              <CardDescription className="text-muted-foreground">
                Staff Login
              </CardDescription>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={needsSetup ? handleSetup : handleLogin} className="space-y-4">
            {needsSetup && (
              <>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      This is a one-time setup. The account you create will have full system access.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={needsSetup ? 'Create a strong password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full gradient-cherry text-primary-foreground hover:opacity-90 transition-opacity glow-cherry-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {needsSetup ? 'Creating Account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {needsSetup && <Shield className="w-4 h-4 mr-2" />}
                  {needsSetup ? 'Create Super Admin Account' : 'Sign In'}
                </>
              )}
            </Button>
          </form>
          
          {!needsSetup && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Contact your administrator if you need an account.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
