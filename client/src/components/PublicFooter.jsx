import { Link } from 'react-router-dom';
import { Activity, Phone, Mail, MapPin } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-card border-t border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 font-heading font-bold text-xl text-foreground mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              MediCore
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Revolutionizing healthcare management with cutting-edge automation and interconnected modules for a seamless experience.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>+91 1800-123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>contact@medicore.in</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Bengaluru, Karnataka</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/hospitals" className="hover:text-primary transition-colors">Find Hospital</Link></li>
              <li><Link to="/clinic-doctors" className="hover:text-primary transition-colors">Find Clinic</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Book Appointment</Link></li>
            </ul>
          </div>

          {/* For Patients */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">For Patients</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/patient/appointments" className="hover:text-primary transition-colors">My Appointments</Link></li>
              <li><Link to="/patient/records" className="hover:text-primary transition-colors">Medical Records</Link></li>
              <li><Link to="/patient/history" className="hover:text-primary transition-colors">Billing</Link></li>
              <li><Link to="/patient/emergency" className="hover:text-primary transition-colors">Emergency</Link></li>
            </ul>
          </div>

          {/* For Hospitals */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">For Hospitals</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/join-platform" className="hover:text-primary transition-colors">Register Your Facility</Link></li>
              <li><Link to="/login" className="hover:text-primary transition-colors">Hospital Login</Link></li>
              <li><Link to="/doctor-setup" className="hover:text-primary transition-colors">Join as Doctor</Link></li>
              <li><Link to="/signup" className="hover:text-primary transition-colors">Create Account</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; 2026 MediCore Healthcare. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-primary transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
