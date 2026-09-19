import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserRound, Stethoscope, CalendarDays, FileText,
  CreditCard, Percent, Settings, ChevronLeft, ChevronRight, Activity, LogOut,
  Home, Search, Star, Users, BarChart3, Bell, Building2, Clock, Calendar, CalendarClock, DollarSign, FileUp, Download, TestTube, AlertTriangle, Menu, X, Bed, Pill, FlaskConical, Hospital, Heart, Brain, Syringe, ClipboardList, ShieldCheck, Baby, Ambulance, IndianRupee, History, Flag, ShoppingCart, Megaphone, Settings2, Truck, Microscope, HelpCircle, MapPinned, User, Bookmark, Upload, TrendingUp, FileCheck, Tags, Headset, Shield, Tag, MapPin, Globe, Package, RotateCcw, Bot, Video, MessageCircle, Phone, CheckCircle2, Car, UserCheck, Scale, Briefcase
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/lib/settings';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import NotificationBell from './NotificationBell';

const navConfig = {
  superadmin: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/dashboard'        },
    { icon: Bot, labelKey: 'nav.chatWithAI', path: '/ai-chat' },
    { icon: ShieldCheck,     labelKey: 'nav.superAdminPanel',  path: '/superadmin'       },
    { icon: TrendingUp,      labelKey: 'nav.saOverview',       path: '/superadmin/overview' },
    { icon: Clock,           labelKey: 'nav.saPending',        path: '/superadmin/pending' },
    { icon: Building2,       labelKey: 'nav.saFacilities',     path: '/superadmin/facilities' },
    { icon: BarChart3,       labelKey: 'nav.saStats',          path: '/superadmin/stats' },
    { icon: Users,           labelKey: 'nav.saUsers',          path: '/superadmin/users' },
    { icon: Flag,            labelKey: 'nav.saModeration',     path: '/superadmin/moderation' },
    { icon: AlertTriangle,   labelKey: 'nav.saDisputes',       path: '/superadmin/disputes' },
    { icon: DollarSign,      labelKey: 'nav.saRevenue',        path: '/superadmin/revenue' },
    { icon: FileCheck,       labelKey: 'nav.verifyTransaction', path: '/verify-transaction' },
    { icon: FileCheck,       labelKey: 'nav.saLicenses',       path: '/superadmin/licenses' },
    { icon: Tags,            labelKey: 'nav.saCategories',     path: '/superadmin/categories' },
    { icon: FileText,        labelKey: 'nav.saCatalog',        path: '/superadmin/catalog' },
    { icon: History,         labelKey: 'nav.saAudit',          path: '/superadmin/audit' },
    { icon: Megaphone,       labelKey: 'nav.saBroadcast',      path: '/superadmin/broadcast' },
    { icon: Headset,         labelKey: 'nav.saTickets',        path: '/superadmin/tickets' },
    { icon: Settings,        labelKey: 'nav.saSettings',       path: '/superadmin/settings' },
    { icon: Shield,          labelKey: 'nav.saTeam',           path: '/superadmin/team' },
    { icon: Tag,             labelKey: 'nav.saPromotions',     path: '/superadmin/promotions' },
    { icon: Download,        labelKey: 'nav.saExport',         path: '/superadmin/export' },
    { icon: MapPin,          labelKey: 'nav.saCities',         path: '/superadmin/cities' },
    { icon: Truck,           labelKey: 'nav.deliveryPartners',  path: '/superadmin/delivery-partners' },
    { icon: Ambulance,       labelKey: 'nav.vehicleRides',      path: '/admin/vehicle-rides' },
    { icon: UserCheck,       labelKey: 'nav.hospitalAssistants', path: '/admin/assistants' },
    { icon: Scale,           labelKey: 'nav.legalServices',      path: '/admin/lawyers' },
    { icon: FileText,        labelKey: 'nav.saLegal',          path: '/superadmin/legal' },
    { icon: Settings,        labelKey: 'nav.saIntegrations',   path: '/superadmin/integrations' },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'    },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/settings'         },
    { icon: History,         labelKey: 'nav.auditLogs',        path: '/audit-logs'       },
  ],
  hospital_admin: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/dashboard'        },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat'          },
    // Consultation Channels
    { icon: MapPin,          labelKey: 'nav.inPersonAppointments', path: '/doctor/home-visit' },
    { icon: Video,           labelKey: 'nav.videoCalls',        path: '/doctor/video-calls' },
    { icon: Phone,           labelKey: 'nav.calls',             path: '/doctor/calls'     },
    { icon: MessageCircle,   labelKey: 'nav.messages',          path: '/doctor/chat'      },
    // 4 Appointment Tabs
    { icon: Clock,           labelKey: 'nav.approveAppointments', path: '/doctor/appointments/approve' },
    { icon: CalendarClock,   labelKey: 'nav.upcomingAppointments', path: '/doctor/appointments/upcoming' },
    { icon: CalendarDays,    labelKey: 'nav.todayAppointments', path: '/appointments'     },
    { icon: History,         labelKey: 'nav.appointmentHistory', path: '/doctor/appointments/history' },
    // Clinical & Administrative Management
    { icon: Users,           labelKey: 'nav.manageUsers',      path: '/admin/users'      },
    { icon: Stethoscope,     labelKey: 'nav.manageDoctors',    path: '/admin/doctors'    },
    { icon: UserRound,       labelKey: 'nav.managePatients',   path: '/patients'         },
    { icon: FileText,        labelKey: 'nav.medicalRecords',   path: '/records'          },
    { icon: CreditCard,      labelKey: 'nav.billing',          path: '/billing'          },
    { icon: FileCheck,       labelKey: 'nav.verifyTransaction', path: '/verify-transaction' },
    { icon: ShieldCheck,     labelKey: 'nav.prescriptionVerification', path: '/admin/prescription-verification' },
    { icon: Building2,       labelKey: 'nav.departments',      path: '/admin/departments'},
    { icon: Bed,             labelKey: 'nav.bedManagement',    path: '/admin/beds'       },
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
    { icon: FlaskConical,    labelKey: 'nav.testCatalog',      path: '/admin/test-catalog' },
    { icon: Stethoscope,     labelKey: 'nav.doctorConsultation', path: '/doctor-consultation' },
    { icon: Star,            labelKey: 'nav.reviews',          path: '/admin/reviews'    },
    { icon: BarChart3,       labelKey: 'nav.analytics',        path: '/admin/analytics'  },
    { icon: AlertTriangle,   labelKey: 'nav.emergency',        path: '/admin/emergency'  },
    { icon: Ambulance,       labelKey: 'nav.vehicleRides',      path: '/admin/vehicle-rides' },
    { icon: UserCheck,       labelKey: 'nav.hospitalAssistants', path: '/admin/assistants' },
    { icon: Scale,           labelKey: 'nav.legalServices',      path: '/admin/lawyers' },
    { icon: FileUp,          labelKey: 'nav.importExport',     path: '/import-export'    },
    { icon: Settings2,       labelKey: 'nav.hospitalSettings', path: '/admin/hospital-settings' },
    { icon: Megaphone,       labelKey: 'nav.announcements',    path: '/admin/announcements' },
    { icon: Calendar,        labelKey: 'nav.leaveManagement',  path: '/admin/leave-requests' },
    { icon: CalendarClock,   labelKey: 'nav.scheduleManage',   path: '/admin/schedule-manage' },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'    },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/settings'         },
    { icon: Globe,           labelKey: 'nav.platformSettings',  path: '/superadmin/overview' },
    { icon: History,         labelKey: 'nav.auditLogs',        path: '/audit-logs'       },
  ],
  clinic_doctor: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',         path: '/clinic/dashboard'     },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat'              },
    // Consultation Channels
    { icon: MapPin,          labelKey: 'nav.inPersonAppointments', path: '/clinic/home-visit' },
    { icon: Video,           labelKey: 'nav.videoCalls',        path: '/clinic/video-calls'   },
    { icon: Phone,           labelKey: 'nav.calls',             path: '/clinic/calls'         },
    { icon: MessageCircle,   labelKey: 'nav.messages',          path: '/clinic/chat'          },
    // 3 Offline Appointment Tabs
    { icon: Clock,           labelKey: 'nav.approveOfflineAppointments', path: '/clinic/appointments/approve' },
    { icon: CheckCircle2,    labelKey: 'nav.approvedOfflineAppointments', path: '/clinic/appointments' },
    { icon: History,         labelKey: 'nav.offlineAppointmentHistory', path: '/clinic/appointments/history' },
    // 3 Online Appointment Tabs
    { icon: Globe,           labelKey: 'nav.approveOnlineAppointments', path: '/clinic/online-appointments?tab=approve' },
    { icon: Video,           labelKey: 'nav.approvedOnlineAppointments', path: '/clinic/online-appointments?tab=approved' },
    { icon: CalendarDays,    labelKey: 'nav.onlineAppointmentHistory', path: '/clinic/online-appointments?tab=history' },
    { icon: Calendar,        labelKey: 'nav.mySchedule',        path: '/clinic/schedule'      },
    { icon: UserRound,       labelKey: 'nav.myPatients',        path: '/clinic/patients'      },
    { icon: FileText,        labelKey: 'nav.consultations',     path: '/clinic/consultations' },
    { icon: Pill,            labelKey: 'nav.prescriptions',     path: '/clinic/prescriptions' },
    { icon: FlaskConical,    labelKey: 'nav.clinicTests',       path: '/clinic/tests'         },
    { icon: TestTube,        labelKey: 'nav.testRequests',      path: '/clinic/test-requests' },
    { icon: IndianRupee,     labelKey: 'nav.feesPricing',       path: '/clinic/fees'          },
    { icon: DollarSign,      labelKey: 'nav.myEarnings',        path: '/clinic/earnings'      },
    { icon: CreditCard,      labelKey: 'nav.paymentHistory',    path: '/clinic/payment-history' },
    { icon: FileCheck,       labelKey: 'nav.verifyTransaction', path: '/verify-transaction'   },
    { icon: Hospital,        labelKey: 'nav.clinicManagement',  path: '/clinic/management'    },
    { icon: Users,           labelKey: 'nav.staffManagement',   path: '/clinic/staff'         },
    { icon: Star,            labelKey: 'nav.myReviews',         path: '/clinic/reviews'       },
    { icon: Bell,            labelKey: 'nav.notifications',     path: '/clinic/notifications' },
    { icon: Settings,        labelKey: 'nav.clinicSettings',    path: '/clinic/settings'      },
    { icon: Globe,           labelKey: 'nav.platformSettings',  path: '/clinic/platform-settings' },
    { icon: History,         labelKey: 'nav.auditLogs',         path: '/audit-logs'           },
  ],
  doctor: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',         path: '/dashboard'            },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat'              },
    // Consultation Channels
    { icon: MapPin,          labelKey: 'nav.inPersonAppointments', path: '/doctor/home-visit' },
    { icon: Video,           labelKey: 'nav.videoCalls',        path: '/doctor/video-calls'   },
    { icon: Phone,           labelKey: 'nav.calls',             path: '/doctor/calls'         },
    { icon: MessageCircle,   labelKey: 'nav.messages',          path: '/doctor/chat'          },
    // 3 Offline Appointment Tabs
    { icon: Clock,           labelKey: 'nav.approveOfflineAppointments', path: '/doctor/appointments/approve' },
    { icon: CheckCircle2,    labelKey: 'nav.approvedOfflineAppointments', path: '/doctor/appointments' },
    { icon: History,         labelKey: 'nav.offlineAppointmentHistory', path: '/doctor/appointments/history' },
    // 3 Online Appointment Tabs
    { icon: Globe,           labelKey: 'nav.approveOnlineAppointments', path: '/doctor/online-appointments?tab=approve' },
    { icon: Video,           labelKey: 'nav.approvedOnlineAppointments', path: '/doctor/online-appointments?tab=approved' },
    { icon: CalendarDays,    labelKey: 'nav.onlineAppointmentHistory', path: '/doctor/online-appointments?tab=history' },
    { icon: Calendar,        labelKey: 'nav.mySchedule',        path: '/doctor/schedule'      },
    { icon: CalendarClock,   labelKey: 'nav.leaveRequests',     path: '/doctor/leave-requests'},
    { icon: UserRound,       labelKey: 'nav.myPatients',        path: '/doctor/patients'      },
    { icon: FileText,        labelKey: 'nav.consultations',     path: '/doctor/consultations' },
    { icon: Pill,            labelKey: 'nav.prescriptions',     path: '/doctor/prescriptions' },
    { icon: FlaskConical,    labelKey: 'nav.testResults',       path: '/doctor/test-results'  },
    { icon: TestTube,        labelKey: 'nav.lab',               path: '/lab'                  },
    { icon: Download,        labelKey: 'nav.reports',           path: '/reports'              },
    { icon: DollarSign,      labelKey: 'nav.myEarnings',        path: '/doctor/earnings'      },
    { icon: FileCheck,       labelKey: 'nav.verifyTransaction', path: '/verify-transaction'   },
    { icon: Star,            labelKey: 'nav.myReviews',         path: '/doctor/reviews'       },
    { icon: AlertTriangle,   labelKey: 'nav.emergency',         path: '/doctor/emergency'     },
    { icon: Bell,            labelKey: 'nav.notifications',     path: '/notifications'        },
    { icon: UserRound,       labelKey: 'nav.myProfile',         path: '/doctor/profile'       },
    { icon: Settings,        labelKey: 'nav.settings',          path: '/settings'             },
    { icon: History,         labelKey: 'nav.auditLogs',         path: '/audit-logs'           },
  ],
  lab_owner: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/lab-business/dashboard' },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat'              },
    // 4 Booking / Sample Stages
    { icon: Clock,           labelKey: 'nav.approveAppointments', path: '/lab-business/appointments' },
    { icon: CalendarClock,   labelKey: 'nav.upcomingAppointments', path: '/lab-business/bookings'    },
    { icon: CalendarDays,    labelKey: 'nav.todayAppointments', path: '/lab-business/appointments' },
    { icon: Syringe,         labelKey: 'nav.sampleCollection', path: '/lab-business/samples'         },
    { icon: Pill,            labelKey: 'nav.prescriptionQueue',path: '/lab-business/prescriptions'  },
    { icon: FlaskConical,    labelKey: 'nav.labTests',         path: '/lab-business/tests'          },
    { icon: ClipboardList,   labelKey: 'nav.labPackages',      path: '/lab-business/packages'       },
    { icon: Microscope,      labelKey: 'nav.labEquipment',     path: '/lab-business/equipment'      },
    { icon: CreditCard,      labelKey: 'nav.billing',          path: '/lab-business/billing'        },
    { icon: FileCheck,       labelKey: 'nav.verifyTransaction', path: '/verify-transaction'         },
    { icon: BarChart3,       labelKey: 'nav.analytics',        path: '/lab-business/analytics'      },
    { icon: Star,            labelKey: 'nav.reviews',          path: '/lab-business/reviews'        },
    { icon: Users,           labelKey: 'nav.staffManagement',  path: '/lab-business/staff'          },
    { icon: Download,        labelKey: 'nav.reports',          path: '/lab-business/reports'        },
    { icon: Settings2,       labelKey: 'nav.labSettings',      path: '/lab-business/settings'       },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'               },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/settings'                    },
    { icon: Globe,           labelKey: 'nav.platformSettings',  path: '/superadmin/overview'         },
    { icon: History,         labelKey: 'nav.auditLogs',        path: '/audit-logs'                  },
  ],
  pharmacy_owner: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/pharmacy-business/dashboard' },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat'                     },
    // Pharmacy Operations Sequence
    { icon: ShoppingCart,    labelKey: 'nav.pharmacyOrders',   path: '/pharmacy-business/orders'    },
    { icon: Pill,            labelKey: 'nav.inventory',        path: '/pharmacy-business/inventory' },
    { icon: FileText,        labelKey: 'nav.prescriptionQueue',path: '/pharmacy-business/prescriptions' },
    { icon: Truck,           labelKey: 'nav.deliveries',       path: '/pharmacy-business/delivery'  },
    { icon: Percent,         labelKey: 'nav.offers',           path: '/pharmacy-business/offers'    },
    { icon: ClipboardList,   labelKey: 'nav.returns',          path: '/pharmacy-business/returns'   },
    { icon: Users,           labelKey: 'nav.staffManagement',  path: '/pharmacy-business/staff'     },
    { icon: BarChart3,       labelKey: 'nav.analytics',        path: '/pharmacy-business/analytics' },
    { icon: Star,            labelKey: 'nav.reviews',          path: '/pharmacy-business/reviews'   },
    { icon: Download,        labelKey: 'nav.reports',          path: '/reports'                     },
    { icon: FileCheck,       labelKey: 'nav.verifyTransaction', path: '/verify-transaction'         },
    { icon: Settings2,       labelKey: 'nav.pharmacySettings', path: '/pharmacy-business/settings'  },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'               },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/settings'                    },
    { icon: Globe,           labelKey: 'nav.platformSettings',  path: '/superadmin/overview'         },
    { icon: History,         labelKey: 'nav.auditLogs',        path: '/audit-logs'                  },
  ],
  patient: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',             path: '/dashboard'                  },
    { icon: Bot,             labelKey: 'nav.chatWithAI',           path: '/ai-chat'                    },
    // 5 Consultation Modes: In Clinic/Hospital -> Home Visits -> Video Calls -> Voice Calls -> Messages
    { icon: Building2,       labelKey: 'nav.myAppointments',        path: '/patient/appointments'       },
    { icon: MapPin,          labelKey: 'nav.inPersonAppointments',  path: '/patient/home-visit'         },
    { icon: Video,           labelKey: 'nav.videoCalls',           path: '/patient/video-calls'        },
    { icon: Phone,           labelKey: 'nav.calls',                path: '/patient/calls'              },
    { icon: MessageCircle,   labelKey: 'nav.messages',             path: '/patient/chat'               },
    // Healthcare Services & Records
    { icon: TestTube,        labelKey: 'nav.myTestBookings',        path: '/patient/bookings'           },
    { icon: ShoppingCart,    labelKey: 'nav.myMedicineOrders',      path: '/patient/medicine-orders'    },
    { icon: Pill,            labelKey: 'nav.myPrescriptions',       path: '/patient/prescriptions'      },
    { icon: Download,        labelKey: 'nav.myReports',             path: '/patient/reports'            },
    { icon: Upload,          labelKey: 'nav.upload',                 path: '/upload'                     },
    { icon: Bookmark,        labelKey: 'nav.favorites',              path: '/patient/favorites'          },
    { icon: History,         labelKey: 'nav.bookingHistory',        path: '/patient/booking-history'    },
    { icon: Ambulance,       labelKey: 'nav.myRides',               path: '/patient/rides'              },
    { icon: Car,             labelKey: 'nav.findVehicle',           path: '/find-vehicle'               },
    { icon: UserCheck,       labelKey: 'nav.myAssistants',          path: '/patient/assistants'         },
    { icon: Users,           labelKey: 'nav.bookAssistant',         path: '/book-assistant'             },
    { icon: Scale,           labelKey: 'nav.myLawyers',             path: '/patient/lawyers'            },
    { icon: Scale,           labelKey: 'nav.findLawyer',            path: '/find-lawyer'                },
    // ❤️ My Health (expandable parent section)
    { icon: Pill,            labelKey: 'nav.medicineReminders',     path: '/patient/medicine-reminders', isHealth: true },
    { icon: Activity,        labelKey: 'nav.myVitals',              path: '/patient/vitals',             isHealth: true },
    { icon: Heart,           labelKey: 'nav.carePlans',             path: '/patient/care-plans',         isHealth: true },
    { icon: IndianRupee,     labelKey: 'nav.paymentHistory',        path: '/patient/history'            },
    { icon: MapPinned,       labelKey: 'nav.addresses',             path: '/patient/addresses'          },
    { icon: Bell,            labelKey: 'nav.notifications',         path: '/notifications'              },
    { icon: Ambulance,       labelKey: 'nav.emergency',             path: '/patient/emergency'          },
    { icon: Star,            labelKey: 'nav.myReviews',             path: '/patient/reviews'            },
    { icon: User,            labelKey: 'nav.profileSettings',       path: '/patient/profile'            },
    { icon: HelpCircle,      labelKey: 'nav.support',               path: '/patient/support'            },
    { icon: Users,           labelKey: 'nav.family',                 path: '/patient/family'             },
    { icon: RotateCcw,       labelKey: 'nav.refunds',                path: '/patient/refunds'            },
    { icon: Settings,        labelKey: 'nav.platformSettings',       path: '/patient/settings'           },
  ],
  delivery_boy: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/dashboard'            },
    { icon: Bot, labelKey: 'nav.chatWithAI', path: '/ai-chat' },
    { icon: Package,         labelKey: 'nav.myDeliveries',     path: '/delivery/orders'      },
    { icon: History,         labelKey: 'nav.history',          path: '/delivery/history'     },
    { icon: IndianRupee,     labelKey: 'nav.earnings',         path: '/delivery/earnings'    },
    { icon: MapPin,          labelKey: 'nav.deliveryZone',     path: '/delivery/zone'        },
    { icon: Star,            labelKey: 'nav.myReviews',        path: '/delivery/reviews'     },
    { icon: FileText,        labelKey: 'nav.myDocuments',      path: '/delivery/documents'   },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications'        },
    { icon: User,            labelKey: 'nav.profileSettings',  path: '/delivery/settings'    },
  ],
  rider: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/rider/dashboard'            },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat'                    },
    { icon: Bell,            labelKey: 'nav.rideRequests',     path: '/rider/dashboard?tab=requests' },
    { icon: MapPin,          labelKey: 'nav.activeRide',       path: '/rider/dashboard?tab=active' },
    { icon: History,         labelKey: 'nav.rideHistory',      path: '/rider/dashboard?tab=history' },
    { icon: IndianRupee,     labelKey: 'nav.earnings',         path: '/rider/dashboard?tab=earnings' },
    { icon: Ambulance,       labelKey: 'nav.vehicleDetails',   path: '/rider/dashboard?tab=vehicle' },
    { icon: FileText,        labelKey: 'nav.myDocuments',      path: '/rider/dashboard?tab=documents' },
    { icon: Star,            labelKey: 'nav.myReviews',        path: '/rider/dashboard?tab=ratings' },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/rider/dashboard?tab=settings' },
  ],
  assistant: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',         path: '/assistant/dashboard' },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat' },
    { icon: Bell,            labelKey: 'nav.assistantRequests', path: '/assistant/dashboard?tab=requests' },
    { icon: Clock,           labelKey: 'nav.activeShift',       path: '/assistant/dashboard?tab=active' },
    { icon: History,         labelKey: 'nav.shiftHistory',      path: '/assistant/dashboard?tab=history' },
    { icon: IndianRupee,     labelKey: 'nav.assistantEarnings', path: '/assistant/dashboard?tab=earnings' },
    { icon: UserRound,       labelKey: 'nav.assistantProfile',  path: '/assistant/dashboard?tab=profile' },
    { icon: Bell,            labelKey: 'nav.notifications',    path: '/notifications' },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/settings' },
  ],
  lawyer: [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard',         path: '/lawyer/dashboard' },
    { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat' },
    { icon: Bell,            labelKey: 'nav.lawyerRequests',   path: '/lawyer/dashboard?tab=requests' },
    { icon: Scale,           labelKey: 'nav.activeCase',       path: '/lawyer/dashboard?tab=active' },
    { icon: History,         labelKey: 'nav.caseHistory',      path: '/lawyer/dashboard?tab=cases' },
    { icon: IndianRupee,     labelKey: 'nav.lawyerEarnings',   path: '/lawyer/dashboard?tab=earnings' },
    { icon: Briefcase,       labelKey: 'nav.practiceProfile',  path: '/lawyer/dashboard?tab=profile' },
    { icon: ShieldCheck,     labelKey: 'nav.verificationDocs', path: '/lawyer/dashboard?tab=documents' },
    { icon: Star,            labelKey: 'nav.myReviews',        path: '/lawyer/dashboard?tab=reviews' },
    { icon: Settings,        labelKey: 'nav.settings',         path: '/lawyer/dashboard?tab=settings' },
  ],
};

const roleBadgeColor = { hospital_admin: 'bg-primary/20 text-primary', doctor: 'bg-info/20 text-info', patient: 'bg-success/20 text-success', clinic_doctor: 'bg-warning/20 text-warning', lab_owner: 'bg-purple-500/20 text-purple-600', pharmacy_owner: 'bg-rose-500/20 text-rose-600', delivery_boy: 'bg-blue-500/20 text-blue-600', rider: 'bg-teal-500/20 text-teal-600', assistant: 'bg-emerald-500/20 text-emerald-600', lawyer: 'bg-indigo-500/20 text-indigo-600' };


function SidebarContent({ collapsed, onToggleCollapse, onNavClick }: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoHome = () => { navigate('/'); onNavClick?.(); };
  const handleLogout = () => { logout(); navigate('/login'); onNavClick?.(); };

  const navItems = navConfig[user?.role] || navConfig.patient;
  const language = user?.settings?.language || 'en';
  const [myHealthOpen, setMyHealthOpen] = useState(true);

  return (
    <div className={`flex flex-col h-full bg-sidebar text-sidebar-foreground ${collapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
        <img src="/logo.png" alt="FindMedi Logo" className="w-12 h-12 object-contain drop-shadow-md flex-shrink-0 rounded-xl" />
        {!collapsed && (
          <div>
            <h1 className="font-heading text-base font-bold text-sidebar-primary-foreground leading-none">FindMedi</h1>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Portal</p>
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
        {navItems.map((item: any, idx: number) => {
          const { icon: Icon, labelKey, path, isHealth } = item;
          const currentFull = location.pathname + (location.search || '');
          let isActive = false;
          if (path.includes('?tab=approve')) {
            isActive = location.pathname.includes('/online-appointments') && (location.search === '?tab=approve' || location.search === '?tab=pending' || !location.search);
          } else if (path.includes('?tab=approved')) {
            isActive = location.pathname.includes('/online-appointments') && (location.search === '?tab=approved' || location.search === '?tab=today' || location.search === '?tab=upcoming');
          } else if (path.includes('?tab=history')) {
            isActive = location.pathname.includes('/online-appointments') && (location.search === '?tab=history' || location.search === '?tab=complete');
          } else if (path === '/clinic/appointments' || path === '/doctor/appointments') {
            isActive = (location.pathname === path || location.pathname === `${path}/upcoming` || location.pathname === `${path}/approved`) && !location.search;
          } else if (path.includes('?')) {
            isActive = currentFull === path;
          } else {
            isActive = location.pathname === path;
          }
          const label = t(labelKey, language);

          const isFirstHealth = isHealth && (idx === 0 || !navItems[idx - 1]?.isHealth);

          if (isHealth && !myHealthOpen && !collapsed && !isActive) {
            return isFirstHealth ? (
              <div key="health-header-collapsed" className="pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setMyHealthOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>My Health</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
                </button>
              </div>
            ) : null;
          }

          return (
            <React.Fragment key={`${path}-${labelKey}-${idx}`}>
              {isFirstHealth && (
                <div className="pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setMyHealthOpen(!myHealthOpen)}
                    title={collapsed ? "My Health" : undefined}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      {!collapsed && <span>My Health</span>}
                    </span>
                    {!collapsed && (
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${myHealthOpen ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                </div>
              )}
              <Link to={path} onClick={onNavClick}
                title={collapsed ? label : undefined}
                className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''} ${isHealth && !collapsed ? 'ml-2 pl-3 border-l border-rose-500/30' : ''}`}>
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${!isActive ? 'group-hover:scale-110 transition-transform' : ''}`} />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </Link>
            </React.Fragment>
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
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">Mobile navigation sidebar</SheetDescription>
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
