import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

import { Eye, EyeOff, Loader2, BookOpen, Brain, Users } from "lucide-react";

const Auth = () => {
  // Separate states for login and signup
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState({ login: false, signup: false });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    document.title = "Login | AI Tutor Atypical Academy";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Login or sign up to AI Tutor Atypical Academy - Accessible learning for every student.");

    // Fix: Remove async from onAuthStateChange callback to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        // Defer the redirect to avoid deadlock
        setTimeout(() => {
          handlePostLoginRedirect(session.user.id);
        }, 0);
      }
    });
    
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handlePostLoginRedirect(session.user.id);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handlePostLoginRedirect = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        window.location.href = "/onboarding";
        return;
      }

      if (profile?.onboarding_completed) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/onboarding";
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      window.location.href = "/onboarding";
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      cleanupAuthState();
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ 
        title: "Google sign in failed", 
        description: err?.message || "Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      cleanupAuthState();

      const { error, data } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        throw error;
      }

      if (data.user) {
        await handlePostLoginRedirect(data.user.id);
      }
    } catch (err: any) {
      toast({ 
        title: "Sign in failed", 
        description: err?.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordStrength < 3) {
      toast({
        title: "Password too weak",
        description: "Please use at least 8 characters with a mix of letters, numbers, and symbols.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: { emailRedirectTo: redirectUrl }
      });
      
      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw error;
      }
      
      toast({ 
        title: "Check your email", 
        description: "We sent a confirmation link to finish creating your account."
      });
    } catch (err: any) {
      toast({ 
        title: "Sign up failed", 
        description: err?.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 2) return "bg-destructive";
    if (strength < 4) return "bg-accent";
    return "bg-primary";
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 2) return "Weak";
    if (strength < 4) return "Medium";
    return "Strong";
  };

  return (
    <div className="min-h-screen bg-gradient-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>


      <main className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding and features */}
          <div className="text-center lg:text-left space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AI Tutor Atypical Academy
              </h1>
              <p className="text-xl text-muted-foreground">
                Accessible learning designed for every student's unique needs
              </p>
            </div>

            <div className="grid gap-4 mt-8">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Adaptive Learning</h3>
                  <p className="text-sm text-muted-foreground">AI that adapts to your learning style</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2 rounded-full bg-secondary/10">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold">Accessibility First</h3>
                  <p className="text-sm text-muted-foreground">Built for visual, hearing, cognitive, and mobility needs</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="p-2 rounded-full bg-accent/10">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Personalized Experience</h3>
                  <p className="text-sm text-muted-foreground">Tailored to your individual learning goals</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth form */}
          <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-sm border-border/50 shadow-glow-primary">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <p className="text-muted-foreground">Sign in to continue your learning journey</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <div className="space-y-4">
                    <Button 
                      onClick={handleGoogleSignIn} 
                      variant="outline" 
                      className="w-full border-border/50 hover:bg-card/80" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue with Google
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input 
                          id="login-email" 
                          type="email" 
                          value={loginData.email} 
                          onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} 
                          className="bg-background/50"
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Input 
                            id="login-password" 
                            type={showPassword.login ? "text" : "password"} 
                            value={loginData.password} 
                            onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} 
                            className="bg-background/50 pr-10"
                            required 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(prev => ({ ...prev, login: !prev.login }))}
                          >
                            {showPassword.login ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Sign In
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <div className="space-y-4">
                    <Button 
                      onClick={handleGoogleSignIn} 
                      variant="outline" 
                      className="w-full border-border/50 hover:bg-card/80" 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue with Google
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input 
                          id="signup-email" 
                          type="email" 
                          value={signupData.email} 
                          onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))} 
                          className="bg-background/50"
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Input 
                            id="signup-password" 
                            type={showPassword.signup ? "text" : "password"} 
                            value={signupData.password} 
                            onChange={(e) => {
                              const newPassword = e.target.value;
                              setSignupData(prev => ({ ...prev, password: newPassword }));
                              setPasswordStrength(checkPasswordStrength(newPassword));
                            }} 
                            className="bg-background/50 pr-10"
                            required 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(prev => ({ ...prev, signup: !prev.signup }))}
                          >
                            {showPassword.signup ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {signupData.password && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Password strength</span>
                              <span className={passwordStrength >= 3 ? "text-primary" : passwordStrength >= 2 ? "text-accent" : "text-destructive"}>
                                {getPasswordStrengthText(passwordStrength)}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1">
                              <div 
                                className={`h-1 rounded-full transition-all ${getPasswordStrengthColor(passwordStrength)}`}
                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Create Account
                      </Button>
                    </form>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Auth;