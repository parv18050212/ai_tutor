import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { ProfileDialog } from "@/components/ProfileDialog";
import { User } from "lucide-react";
import LandingHero from "@/components/LandingHero";
import LandingFeatures from "@/components/LandingFeatures";
import HowItWorksSection from "@/components/HowItWorksSection";
import StatsSection from "@/components/StatsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import LandingFooter from "@/components/LandingFooter";
import logoLight from "@/assets/atypical-academy-logo.png";
import logoDark from "@/assets/atypical-academy-logo-dark.png";


const Index = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  
  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  const logoSrc = currentTheme === 'dark' ? logoDark : logoLight;


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthed(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      window.location.href = "/auth";
    } catch (err: any) {
      toast({ title: "Sign out failed", description: err?.message ?? "Please try again." });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img 
              src={logoSrc}
              alt="Atypical Academy" 
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-foreground">Atypical Academy</span>
          </div>
          <div className="flex gap-2">
            {isAuthed ? (
              <>
                <ProfileDialog>
                  <Button variant="outline" size="icon" aria-label="User profile">
                    <User className="h-4 w-4" />
                  </Button>
                </ProfileDialog>
                <Button variant="outline" onClick={handleSignOut}>
                  Log out
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/auth">Log in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <LandingHero />
        <LandingFeatures />
        <HowItWorksSection />
        <StatsSection />
        <TestimonialsSection />
        <FAQSection />
      </main>
      
      <LandingFooter />
    </div>
  );
};

export default Index;

