import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserRound, Stethoscope, CalendarDays, FileText,
  CreditCard, Settings, ChevronLeft, ChevronRight, Activity, LogOut,
  Home, Search, Star, Users, BarChart3, Bell, Building2, Clock, Calendar, DollarSign, FileUp, Download, TestTube, AlertTriangle, Menu, X, Bed, Pill, FlaskConical, Hospital, Heart, Brain, Syringe, ClipboardList, ShieldCheck, Baby, Ambulance, IndianRupee, History, Flag, ShoppingCart, Megaphone, Settings2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/settings';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import NotificationBell from './NotificationBell';

const navConfig = {
  superadmin: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/dashboard'        },
    { icon: Building2,       labelKey: 'nav.hospitals',        path: '/superadmin'       },
    { icon: Users,           labelKey: 'nav.manageUsers',      path: '/admin/users'      },
    { icon: History,         labelKey: 'nav.auditLogs',        path: '/superadmin'       },
    { icon: DollarSign,      labelKey: 'nav.revenue',          path: '/superadmin'       },
    { icon: Flag,            labelKey: 'nav.moderation',       path: '/superadmin'       },
    { icon: Stethoscope,     labelKey: 'nav.manageDoctors',    path: '/admin/doctors'    },
    { icon: UserRound,       labelKey: 'nav.managePatients',   path: '/patients'         },
    { icon: CalendarDays,    labelKey: 'nav.appointments',     path: '/appointments'     },
    { icon: FileText,        labelKey: 'nav.medicalRecords',   path: '/records'          },
    { icon: CreditCard,      labelKey: 'nav.billing',          path: '/billing'          },
    { icon: BarChart3,       labelKey: 'nav.analytics',        path: '/admin/analytics'  },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/superadmin'       },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'    },
  ],
  admin: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/dashboard'        },
    { icon: Users,           labelKey: 'nav.manageUsers',      path: '/admin/users'      },
    { icon: Stethoscope,     labelKey: 'nav.manageDoctors',    path: '/admin/doctors'    },
    { icon: UserRound,       labelKey: 'nav.managePatients',   path: '/patients'         },
    { icon: CalendarDays,    labelKey: 'nav.appointments',     path: '/appointments'     },
    { icon: FileText,        labelKey: 'nav.medicalRecords',   path: '/records'          },
    { icon: CreditCard,      labelKey: 'nav.billing',          path: '/billing'          },
    { icon: Pill,            labelKey: 'nav.prescriptionQueue', path: '/admin/prescriptions' },
    { icon: Building2,       labelKey: 'nav.departments',      path: '/admin/departments'},
    { icon: Star,            labelKey: 'nav.reviews',          path: '/admin/reviews'    },
    { icon: BarChart3,       labelKey: 'nav.analytics',        path: '/admin/analytics'  },
    { icon: AlertTriangle,   labelKey: 'nav.emergency',        path: '/admin/emergency'  },
    { icon: Bed,             labelKey: 'nav.bedManagement',    path: '/admin/beds'       },
    { icon: FlaskConical,    labelKey: 'nav.testCatalog',      path: '/admin/test-catalog' },
    { icon: TestTube,        labelKey: 'nav.diagnostic',        path: '/admin/diagnostic' },
    { icon: Hospital,        labelKey: 'nav.ipd',              path: '/ipd'              },
    { icon: Activity,        labelKey: 'nav.ot',               path: '/ot'               },
    { icon: Users,           labelKey: 'nav.staff',            path: '/staff'            },
    { icon: Heart,           labelKey: 'nav.bloodBank',         path: '/bloodbank'        },
    { icon: Activity,        labelKey: 'nav.physiotherapy',     path: '/physio'           },
    { icon: Brain,           labelKey: 'nav.mentalHealth',      path: '/mentalhealth'     },
    { icon: Baby,            labelKey: 'nav.dietKitchen',       path: '/diet'             },
    { icon: ClipboardList,   labelKey: 'nav.housekeeping',      path: '/housekeeping'     },
    { icon: Activity,        labelKey: 'nav.triage',            path: '/triage'           },
    { icon: Clock,           labelKey: 'nav.opdToken',          path: '/opd-token'        },
    { icon: Activity,        labelKey: 'nav.radiology',         path: '/radiology'        },
    { icon: Ambulance,       labelKey: 'nav.nursing',           path: '/nursing'          },
    { icon: Pill,            labelKey: 'nav.pharmacy',          path: '/pharmacy'         },
    { icon: FileText,        labelKey: 'nav.inventory',         path: '/inventory'        },
    { icon: Download,        labelKey: 'nav.reports',          path: '/reports'          },
    { icon: Syringe,         labelKey: 'nav.lab',              path: '/lab'              },
    { icon: Stethoscope,     labelKey: 'nav.doctorConsultation', path: '/doctor-consultation' },
    { icon: FileUp,          labelKey: 'nav.importExport',     path: '/import-export'    },
    { icon: Settings2,       labelKey: 'nav.hospitalSettings', path: '/admin/hospital-settings' },
    { icon: Megaphone,       labelKey: 'nav.announcements',    path: '/admin/announcements' },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'    },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/settings'         },
  ],
  clinic_doctor: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',         path: '/clinic/dashboard'     },
    { icon: CalendarDays,    labelKey: 'nav.myAppointments',    path: '/clinic/appointments'  },
    { icon: Clock,           labelKey: 'nav.mySchedule',        path: '/clinic/schedule'      },
    { icon: IndianRupee,     labelKey: 'nav.feesPricing',       path: '/clinic/fees'          },
    { icon: UserRound,       labelKey: 'nav.myPatients',        path: '/clinic/patients'      },
    { icon: Pill,            labelKey: 'nav.prescriptions',     path: '/clinic/prescriptions' },
    { icon: FlaskConical,    labelKey: 'nav.clinicTests',       path: '/clinic/tests'         },
    { icon: FileText,        labelKey: 'nav.consultations',     path: '/clinic/consultations' },
    { icon: Hospital,        labelKey: 'nav.clinicManagement',  path: '/clinic/management'    },
    { icon: CreditCard,      labelKey: 'nav.billing',           path: '/clinic/billing'       },
    { icon: DollarSign,      labelKey: 'nav.myEarnings',        path: '/clinic/earnings'      },
    { icon: Star,            labelKey: 'nav.myReviews',         path: '/clinic/reviews'       },
    { icon: Users,           labelKey: 'nav.staffManagement',   path: '/clinic/staff'         },
    { icon: Bell,            labelKey: 'nav.notifications',     path: '/clinic/notifications' },
    { icon: Settings,        labelKey: 'nav.clinicSettings',    path: '/clinic/settings'      },
  ],
  doctor: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',       path: '/dashboard'           },
    { icon: CalendarDays,    labelKey: 'nav.myAppointments',  path: '/doctor/appointments' },
    { icon: UserRound,       labelKey: 'nav.myPatients',      path: '/doctor/patients'     },
    { icon: FileText,        labelKey: 'nav.consultations',   path: '/doctor/consultations'},
    { icon: Pill,            labelKey: 'nav.prescriptions',   path: '/doctor/prescriptions'},
    { icon: Clock,           labelKey: 'nav.mySchedule',      path: '/doctor/schedule'     },
    { icon: Calendar,        labelKey: 'nav.leaveRequests',   path: '/doctor/leave-requests'},
    { icon: Download,        labelKey: 'nav.reports',         path: '/reports'             },
    { icon: FlaskConical,    labelKey: 'nav.testResults',     path: '/doctor/test-results' },
    { icon: TestTube,        labelKey: 'nav.lab',             path: '/lab'                 },
    { icon: Star,            labelKey: 'nav.myReviews',       path: '/doctor/reviews'      },
    { icon: DollarSign,      labelKey: 'nav.myEarnings',      path: '/doctor/earnings'     },
    { icon: AlertTriangle,   labelKey: 'nav.emergency',       path: '/doctor/emergency'    },
    { icon: Bell,            labelKey: 'nav.notifications',   path: '/notifications'       },
    { icon: UserRound,       labelKey: 'nav.myProfile',       path: '/doctor/profile'      },
    { icon: Settings,        labelKey: 'nav.settings',        path: '/settings'            },
  ],
  patient: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',       path: '/dashboard'            },
    { icon: Building2,       labelKey: 'nav.findHospital',    path: '/hospitals'            },
    { icon: Search,          labelKey: 'nav.findDoctors',     path: '/clinic-doctors'      },
    { icon: CalendarDays,    labelKey: 'nav.myAppointments',  path: '/patient/appointments' },
    { icon: TestTube,        labelKey: 'nav.labServices',     path: '/patient/services'     },
    { icon: AlertTriangle,   labelKey: 'nav.emergency',       path: '/patient/emergency'    },
    { icon: FileText,        labelKey: 'nav.medicalRecords',  path: '/patient/records'      },
    { icon: FileUp,          labelKey: 'nav.uploadFiles',     path: '/upload'               },
    { icon: Download,        labelKey: 'nav.myReports',       path: '/patient/reports'      },
    { icon: CreditCard,      labelKey: 'nav.myBilling',       path: '/patient/billing'      },
    { icon: Pill,            labelKey: 'nav.myPrescriptions', path: '/patient/prescriptions' },
    { icon: ShoppingCart,    labelKey: 'nav.myMedicineOrders', path: '/patient/medicine-orders' },
    { icon: DollarSign,      labelKey: 'nav.payments',        path: '/patient/payment'      },
    { icon: Star,            labelKey: 'nav.myReviews',       path: '/patient/reviews'      },
    { icon: Bell,            labelKey: 'nav.notifications',   path: '/notifications'        },
    { icon: Settings,        labelKey: 'nav.settings',        path: '/settings'             },
  ],
};

const roleBadgeColor = { admin: 'bg-primary/20 text-primary', doctor: 'bg-info/20 text-info', patient: 'bg-success/20 text-success', clinic_doctor: 'bg-warning/20 text-warning' };

function SidebarContent({ collapsed, onToggleCollapse, onNavClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoHome = () => { navigate('/'); onNavClick?.(); };
  const handleLogout = () => { logout(); navigate('/login'); onNavClick?.(); };

  const navItems = navConfig[user?.role] || navConfig.patient;
  const language = user?.settings?.language || 'en';

  return (
    <div className={`flex flex-col h-full bg-sidebar text-sidebar-foreground ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-sidebar-primary/30">
          <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-heading text-base font-bold text-sidebar-primary-foreground leading-none">MediCore</h1>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">HMS Portal</p>
          </div>
        )}
      </div>

      {/* User card */}
      {!collapsed && user && (
        <div className="mx-3 mt-3 p-3 bg-sidebar-accent/60 rounded-xl border border-sidebar-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${roleBadgeColor[user.role] || 'bg-muted text-muted-foreground'}`}>
                {t(`role.${user.role}`, language)}
              </span>
            </div>
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav min-h-0 flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overscroll-contain">
        {navItems.map(({ icon: Icon, labelKey, path }) => {
          const isActive = location.pathname === path;
          const label = t(labelKey, language);
          return (
            <Link key={path} to={path} onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!isActive ? 'group-hover:scale-110 transition-transform' : ''}`} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-2 pb-4 border-t border-sidebar-border pt-3 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <button onClick={handleGoHome}
          title={collapsed ? t('nav.home', language) : undefined}
          className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}>
          <Home className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-sm">{t('nav.home', language)}</span>}
        </button>
        <button onClick={handleLogout}
          title={collapsed ? t('common.logout', language) : undefined}
          className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-sm">{t('common.logout', language)}</span>}
        </button>
      </div>

      {/* Collapse Toggle - desktop only */}
      {onToggleCollapse && (
        <button onClick={onToggleCollapse}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 max-md:hidden">
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <button onClick={() => setSheetOpen(true)}
          className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-sidebar text-sidebar-foreground flex items-center justify-center shadow-lg hover:bg-sidebar-accent transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-r border-sidebar-border">
            <SidebarContent collapsed={false} onNavClick={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="sidebar-motion fixed left-0 top-0 h-screen z-50 shadow-2xl transition-all duration-300 max-md:hidden">
      <SidebarContent collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
    </aside>
  );
}
// 1
