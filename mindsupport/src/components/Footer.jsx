import { Brain, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  const footerLinks = {
    Platform: [
      { name: "Wellness Dashboard", href: "/wellness" },
      { name: "Resources", href: "/resources" },
      { name: "Counselling", href: "/counselling" },
      { name: "Peer Support", href: "/peer" },
    ],
    Support: [
      { name: "Help Center", href: "/resources" },
      { name: "Contact Us", href: "#contact" },
      { name: "Crisis Support", href: "#crisis" },
      { name: "FAQ", href: "#faq" },
    ],
    Legal: [
      { name: "Privacy Policy", href: "#legal" },
      { name: "Terms of Service", href: "#legal" },
      { name: "Data Protection", href: "#legal" },
      { name: "Accessibility", href: "#legal" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "https://www.facebook.com", label: "Facebook" },
    { icon: Twitter, href: "https://x.com", label: "X" },
    { icon: Instagram, href: "https://www.instagram.com", label: "Instagram" },
    { icon: Linkedin, href: "https://www.linkedin.com", label: "LinkedIn" },
  ];

  const scrollToSection = (href) => {
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFooterLink = (event, href) => {
    if (href.startsWith("/")) {
      event.preventDefault();
      navigate(href);
      return;
    }

    if (href.startsWith("#")) {
      event.preventDefault();
      scrollToSection(href);
    }
  };

  return (
    <footer className="reveal-on-scroll bg-gradient-to-t from-background via-muted/5 to-background border-t border-glass-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div id="contact" className="grid scroll-mt-28 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <div className="motion-icon-pop p-2 rounded-lg bg-gradient-primary glow-primary">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold gradient-text">MindSupport</span>
            </div>

            <p className="text-foreground/70 mb-6 leading-relaxed">
              Empowering students with confidential mental health support, professional counseling,
              and community connections for better academic and personal wellbeing.
            </p>

            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 text-foreground/60">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@mindsupport.edu" className="hover:text-foreground transition-colors">
                  support@mindsupport.edu
                </a>
              </div>
              <div className="flex items-center space-x-3 text-foreground/60">
                <Phone className="h-4 w-4" />
                <a href="tel:1800636825" className="hover:text-foreground transition-colors">
                  24/7 Crisis Hotline: 1-800-MENTAL
                </a>
              </div>
              <div className="flex items-center space-x-3 text-foreground/60">
                <MapPin className="h-4 w-4" />
                <span>Available to students worldwide</span>
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div
              key={category}
              id={category === "Legal" ? "legal" : category === "Support" ? "help" : undefined}
              className="scroll-mt-28 lg:col-span-1"
            >
              <h3 className="text-lg font-semibold text-foreground mb-6">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={(event) => handleFooterLink(event, link.href)}
                      className="text-foreground/60 hover:text-foreground transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-glass-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-foreground/60 text-sm">
              &copy; 2024 MindSupport. All rights reserved. | Mental Health Support Platform for Students
            </div>

            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="motion-button p-2 rounded-lg bg-glass/30 border border-glass-border/30 text-foreground/60 hover:text-foreground hover:bg-glass/50 transition-all duration-200"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div id="crisis" className="mt-8 scroll-mt-28 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-center text-sm text-foreground/80 mb-2">
              <strong>Important:</strong> This platform does not replace medical or psychiatric treatment.
            </p>
            <p className="text-center text-sm text-foreground/80">
              <strong>Crisis Support:</strong> If you&apos;re experiencing a mental health emergency,
              please contact professional services immediately, call your local emergency number, or use a crisis helpline.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
