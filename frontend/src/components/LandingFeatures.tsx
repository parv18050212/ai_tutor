import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Accessibility, TrendingUp, Clock, Shield, Zap, Users, BookOpen } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Learning",
    description: "Advanced artificial intelligence that understands your learning patterns and adapts in real-time to maximize your potential.",
    badge: "Smart",
    gradient: "from-blue-500/20 to-purple-500/20"
  },
  {
    icon: Accessibility,
    title: "Universal Accessibility", 
    description: "Comprehensive support for all learners including screen readers, voice commands, dyslexia-friendly fonts, and customizable interfaces.",
    badge: "Inclusive",
    gradient: "from-green-500/20 to-teal-500/20"
  },
  {
    icon: TrendingUp,
    title: "Progress Analytics",
    description: "Detailed insights into your learning journey with personalized recommendations and goal tracking to keep you motivated.",
    badge: "Insights",
    gradient: "from-orange-500/20 to-red-500/20"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Your AI tutor never sleeps. Get help with homework, prepare for exams, or explore new topics anytime, anywhere.",
    badge: "Always On",
    gradient: "from-indigo-500/20 to-blue-500/20"
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your learning data is protected with enterprise-grade security. We never share your information with third parties.",
    badge: "Secure",
    gradient: "from-purple-500/20 to-pink-500/20"
  },
  {
    icon: BookOpen,
    title: "All Subjects",
    description: "From elementary math to graduate-level research, our AI covers every subject with expert-level knowledge and patience.",
    badge: "Complete",
    gradient: "from-cyan-500/20 to-blue-500/20"
  }
];

const additionalFeatures = [
  "Interactive quizzes and practice problems",
  "Multi-language support",
  "Parent and educator dashboards",
  "Offline study materials",
  "Integration with popular learning platforms",
  "Custom study schedules and reminders"
];

export default function LandingFeatures() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
            <Zap className="w-4 h-4 mr-2" />
            Powered by Advanced AI
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built for Every <span className="bg-gradient-primary bg-clip-text text-transparent">Learner</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our comprehensive AI tutoring platform adapts to your unique learning style, accessibility needs, and academic goals
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group hover:shadow-glow-primary transition-all duration-500 border border-border bg-card/50 backdrop-blur-sm overflow-hidden relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <CardContent className="p-8 text-center relative z-10">
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary/20">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 text-xs bg-primary/20 text-primary border-primary/30"
                  >
                    {feature.badge}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Additional Features Grid */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold text-foreground mb-4">Plus Much More</h3>
          <p className="text-muted-foreground mb-8">Everything you need for a complete learning experience</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {additionalFeatures.map((feature, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border hover:bg-card/50 transition-colors duration-200"
            >
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-gradient-primary/10 border border-primary/20 backdrop-blur-sm">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">Join thousands of successful students today</span>
          </div>
        </div>
      </div>
    </section>
  );
}