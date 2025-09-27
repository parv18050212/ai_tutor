import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageSquare, BookOpen, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: CheckCircle,
    title: "Sign Up & Tell Us About You",
    description: "Quick onboarding to understand your learning style, accessibility needs, and academic goals.",
    step: "01"
  },
  {
    icon: MessageSquare,
    title: "Chat with Your AI Tutor",
    description: "Ask questions, get explanations, and receive personalized help in any subject, anytime.",
    step: "02"
  },
  {
    icon: BookOpen,
    title: "Practice & Learn",
    description: "Work through interactive exercises and quizzes tailored to your pace and learning preferences.",
    step: "03"
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    description: "Monitor your improvement with detailed analytics and celebrate your achievements.",
    step: "04"
  }
];

export default function HowItWorksSection() {
  return (
    <section className="py-20 px-6 bg-gradient-subtle">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It <span className="bg-gradient-primary bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started with your personalized AI tutor in just a few simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className="group relative hover:shadow-glow-primary transition-all duration-500 border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full flex items-center justify-center">
                <span className="text-primary font-bold text-sm">{step.step}</span>
              </div>
              
              <CardContent className="p-8 text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(100%+1rem)] w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}