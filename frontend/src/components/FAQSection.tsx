import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the AI tutor adapt to my learning style?",
    answer: "Our AI analyzes your interactions, response patterns, and feedback to customize explanations, pacing, and teaching methods. It considers your accessibility needs, preferred learning modalities (visual, auditory, kinesthetic), and academic level to provide the most effective tutoring experience."
  },
  {
    question: "What subjects and grade levels do you support?",
    answer: "We support all major subjects from elementary through graduate level, including Mathematics, Science (Physics, Chemistry, Biology), English, History, Computer Science, and more. Our AI adapts content complexity based on your academic level and learning goals."
  },
  {
    question: "How does the accessibility support work?",
    answer: "Our platform includes comprehensive accessibility features: screen reader compatibility, keyboard navigation, voice commands, adjustable text size and contrast, dyslexia-friendly fonts, audio explanations, visual aids, and customizable interface elements to accommodate various learning differences and disabilities."
  },
  {
    question: "Is my data and privacy protected?",
    answer: "Absolutely. We use enterprise-grade security measures to protect your personal information and learning data. We never share your data with third parties, and you have full control over your privacy settings. All communications are encrypted and stored securely."
  },
  {
    question: "Can I track my learning progress?",
    answer: "Yes! Our platform provides detailed analytics including performance trends, time spent on different topics, strength and weakness identification, goal tracking, and personalized recommendations for improvement. Parents and educators can also access progress reports with proper permissions."
  },
  {
    question: "How much does it cost?",
    answer: "We offer flexible pricing plans to suit different needs, including a free tier with basic features, student discounts, and institutional licenses. Contact us for detailed pricing information and to find the plan that works best for you."
  },
  {
    question: "Can I use this alongside my regular classes?",
    answer: "Definitely! Our AI tutor is designed to complement your existing education, not replace it. It can help with homework, exam preparation, concept clarification, and provide additional practice. Many students use it to get ahead in their coursework or catch up on challenging topics."
  },
  {
    question: "What if I need help outside of regular hours?",
    answer: "That's one of our key advantages! Our AI tutor is available 24/7, so you can get help whenever you need it - late night study sessions, early morning review, or weekend exam prep. No appointment scheduling required."
  }
];

export default function FAQSection() {
  return (
    <section className="py-20 px-6 bg-gradient-subtle">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked <span className="bg-gradient-primary bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about our AI tutoring platform
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border rounded-lg bg-card/50 backdrop-blur-sm px-6 hover:shadow-glow-primary transition-all duration-300"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Still have questions? We're here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@aitutor.com" 
              className="inline-flex items-center justify-center px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors duration-200"
            >
              Email Support
            </a>
            <a 
              href="/contact" 
              className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors duration-200"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}