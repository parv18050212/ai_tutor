import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Star, Users, Zap } from "lucide-react";
import heroImage from "@/assets/hero-learning.jpg";

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Enhanced Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{ backgroundImage: `url(${heroImage})` }}
        role="img"
        aria-label="Students learning with AI technology"
      />
      
      {/* Multiple Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-background" />
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0z' /%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
        {/* Social Proof Badge */}
        <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors duration-300">
          <Star className="w-4 h-4 mr-2 fill-current" />
          Trusted by 10,000+ students worldwide
        </Badge>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground mb-8 leading-tight">
          Learn Smarter with{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent animate-glow">
            Atypical Academy
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Accessible. Personalized. Available 24/7. Transform your learning experience with AI that adapts to your unique needs.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button 
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold shadow-glow-primary hover:shadow-glow-secondary transition-all duration-300 hover:scale-105"
            aria-label="Start your personalized learning journey"
          >
            <Link to="/auth">
              <Zap className="w-5 h-5 mr-2" />
              Start Learning Free
            </Link>
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            className="bg-background/50 backdrop-blur-sm border-border hover:bg-accent hover:text-accent-foreground px-8 py-4 text-lg transition-all duration-300 hover:scale-105"
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>
        
        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>10K+ Active Students</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary fill-current" />
            <span>4.9/5 Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>24/7 Available</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced Floating Elements */}
      <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-accent/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-primary/40 rounded-full animate-float" style={{ animationDelay: '4s' }} />
      <div className="absolute top-2/3 right-1/4 w-5 h-5 bg-secondary/20 rounded-full animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-1/3 right-2/3 w-2 h-2 bg-primary/50 rounded-full animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
}