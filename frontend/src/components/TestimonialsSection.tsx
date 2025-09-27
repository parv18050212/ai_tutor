import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "High School Student",
    content: "The AI tutor helped me improve my math grades from C to A+ in just one semester. The personalized explanations made all the difference!",
    rating: 5,
    initials: "SC",
    subject: "Mathematics"
  },
  {
    name: "Marcus Johnson",
    role: "College Freshman", 
    content: "As someone with dyslexia, I love how the AI adapts to my learning needs. The audio explanations and visual aids are incredibly helpful.",
    rating: 5,
    initials: "MJ",
    subject: "Physics"
  },
  {
    name: "Emma Rodriguez",
    role: "Graduate Student",
    content: "The 24/7 availability is a game-changer. I can get help with complex chemistry problems even at 2 AM before exams!",
    rating: 5,
    initials: "ER", 
    subject: "Chemistry"
  },
  {
    name: "David Park",
    role: "Homeschool Student",
    content: "The progress tracking keeps me motivated, and my parents love seeing detailed reports of my learning journey.",
    rating: 5,
    initials: "DP",
    subject: "Biology"
  },
  {
    name: "Aisha Patel",
    role: "Online Learner",
    content: "The accessibility features are outstanding. Voice commands and screen reader compatibility make learning so much easier for me.",
    rating: 5,
    initials: "AP",
    subject: "History"
  },
  {
    name: "Jake Thompson",
    role: "Adult Learner",
    content: "Coming back to education after 10 years was daunting, but the AI tutor made it feel manageable and even enjoyable.",
    rating: 5,
    initials: "JT",
    subject: "Computer Science"
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            What Students Are <span className="bg-gradient-primary bg-clip-text text-transparent">Saying</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of students who have transformed their learning experience
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="group hover:shadow-glow-secondary transition-all duration-300 border border-border bg-card/50 backdrop-blur-sm"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                
                <blockquote className="text-muted-foreground leading-relaxed mb-6 italic">
                  "{testimonial.content}"
                </blockquote>
                
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} • {testimonial.subject}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background" />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">
              Join 10,000+ happy students
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}