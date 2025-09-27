import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Github, Twitter, Linkedin, Heart, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerSections = [
  {
    title: "Product",
    links: [
      { text: "Features", href: "/features" },
      { text: "Pricing", href: "/pricing" },
      { text: "Demo", href: "/demo" },
      { text: "Updates", href: "/updates" }
    ]
  },
  {
    title: "Support",
    links: [
      { text: "Help Center", href: "/help" },
      { text: "Contact Us", href: "/contact" },
      { text: "Status", href: "/status" },
      { text: "Community", href: "/community" }
    ]
  },
  {
    title: "Company",
    links: [
      { text: "About", href: "/about" },
      { text: "Careers", href: "/careers" },
      { text: "Blog", href: "/blog" },
      { text: "Press", href: "/press" }
    ]
  },
  {
    title: "Legal",
    links: [
      { text: "Privacy Policy", href: "/privacy" },
      { text: "Terms of Service", href: "/terms" },
      { text: "Cookie Policy", href: "/cookies" },
      { text: "GDPR", href: "/gdpr" }
    ]
  }
];

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com/AtypicalAcademy", label: "Twitter" },
  { icon: Github, href: "https://github.com/atypical-academy", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com/company/atypical-academy", label: "LinkedIn" }
];

const contactInfo = [
  { icon: Mail, text: "support@atypicalacademy.com", href: "mailto:support@atypicalacademy.com" },
  { icon: Phone, text: "+1 (555) 123-4567", href: "tel:+15551234567" },
  { icon: MapPin, text: "San Francisco, CA", href: "#" }
];

export default function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative py-16 px-6 border-t border-border bg-gradient-subtle backdrop-blur-sm">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Atypical Academy
            </h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Empowering every student to reach their potential through accessible, personalized AI-powered education.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              {contactInfo.map((contact, index) => (
                <a
                  key={index}
                  href={contact.href}
                  className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <contact.icon className="w-4 h-4" />
                  {contact.text}
                </a>
              ))}
            </div>
          </div>
          
          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index} className="lg:col-span-1">
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {section.title}
              </h4>
              <nav className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <Link
                    key={linkIndex}
                    to={link.href}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    aria-label={`Go to ${link.text} page`}
                  >
                    {link.text}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
        
        {/* Newsletter Section */}
        <div className="border-t border-border pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Stay Updated
              </h4>
              <p className="text-sm text-muted-foreground">
                Get the latest features and educational content delivered to your inbox.
              </p>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Button size="sm" className="px-6">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom Section */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© 2024 Atypical Academy. Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>for learners everywhere.</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            
            {/* Scroll to Top */}
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToTop}
              className="bg-background/50 backdrop-blur-sm hover:bg-accent"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>
    </footer>
  );
}