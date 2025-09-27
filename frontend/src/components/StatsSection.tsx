import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Clock, Award } from "lucide-react";
import { useEffect, useState } from "react";

const stats = [
  {
    icon: Users,
    value: 10000,
    suffix: "+",
    label: "Active Students",
    description: "Learning with AI assistance"
  },
  {
    icon: Clock,
    value: 24,
    suffix: "/7",
    label: "Available",
    description: "Round-the-clock support"
  },
  {
    icon: TrendingUp,
    value: 85,
    suffix: "%",
    label: "Grade Improvement",
    description: "Average student progress"
  },
  {
    icon: Award,
    value: 95,
    suffix: "%",
    label: "Success Rate",
    description: "Students reach their goals"
  }
];

function AnimatedCounter({ value, suffix = "", duration = 2000 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(value * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animationFrame = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`stat-${value}`);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      observer.disconnect();
    };
  }, [value, duration]);

  return (
    <span id={`stat-${value}`} className="text-4xl md:text-5xl font-bold text-primary">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function StatsSection() {
  return (
    <section className="py-20 px-6 bg-gradient-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Trusted by <span className="bg-gradient-primary bg-clip-text text-transparent">Thousands</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real results from real students using our AI tutoring platform
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card 
              key={index}
              className="group text-center hover:shadow-glow-primary transition-all duration-500 border border-border bg-card/30 backdrop-blur-sm"
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                
                <div className="mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {stat.label}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-sm font-medium text-muted-foreground">Trusted by educators at:</div>
            <div className="flex flex-wrap gap-6 text-muted-foreground text-sm">
              <span>Stanford University</span>
              <span>MIT</span>
              <span>Harvard</span>
              <span>Berkeley</span>
              <span>Oxford</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}