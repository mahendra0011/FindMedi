import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const defaultResources = {
  en: {
    translation: {
      common: {
        appName: 'FindMedi',
        tagline: 'Care near you',
        search: 'Search doctors, clinics, tests, medicines...',
        bookNow: 'Book Now',
        viewProfile: 'View Profile',
        call: 'Call',
        emergencySos: 'Emergency SOS',
        verified: 'Verified',
        openNow: 'Open Now',
        closed: 'Closed',
        elderMode: 'Elder Mode',
        lowBandwidth: 'Low Bandwidth',
        save: 'Save',
        saved: 'Saved',
        directions: 'Directions',
        share: 'Share',
        ratings: 'Ratings',
        reviews: 'Reviews',
        experience: 'Experience',
        fee: 'Consultation Fee',
      },
      modes: {
        inClinic: 'In-Clinic',
        video: 'Video Consult',
        audio: 'Audio Call',
        homeVisit: 'Home Visit',
        chat: 'Chat',
      },
      discreet: {
        banner: 'Discreet Consultation • Private & confidential care',
        billingNote: 'Masked billing name on card / bank statements',
        quickExit: 'Quick Exit (Esc)',
      },
      consent: {
        title: 'Consent for Telehealth & Health Data Processing',
        dpdpNotice: 'In compliance with Digital Personal Data Protection (DPDP) Act, 2023',
        accept: 'I agree to the terms and privacy policy',
      },
    },
  },
  hi: {
    translation: {
      common: {
        appName: 'FindMedi',
        tagline: 'आपके पास स्वास्थ्य सेवा',
        search: 'डॉक्टर, क्लिनिक, जांच, दवाइयां खोजें...',
        bookNow: 'अपॉइंटमेंट बुक करें',
        viewProfile: 'प्रोफ़ाइल देखें',
        call: 'कॉल करें',
        emergencySos: 'आपातकालीन सहायता (SOS)',
        verified: 'सत्यापित',
        openNow: 'अभी खुला है',
        closed: 'बंद है',
        elderMode: 'बुजुर्ग मोड (बड़ा टेक्स्ट)',
        lowBandwidth: 'धीमा इंटरनेट मोड',
        save: 'सहेजें',
        saved: 'सहेजा गया',
        directions: 'दिशा-निर्देश',
        share: 'शेयर करें',
        ratings: 'रेटिंग',
        reviews: 'समीक्षाएं',
        experience: 'अनुभव',
        fee: 'परामर्श शुल्क',
      },
      modes: {
        inClinic: 'क्लिनिक में मिलें',
        video: 'वीडियो परामर्श',
        audio: 'ऑडियो कॉल',
        homeVisit: 'घर पर विजिट',
        chat: 'चैट',
      },
      discreet: {
        banner: 'गोपनीय परामर्श • पूर्णतः सुरक्षित और निजी देखभाल',
        billingNote: 'बैंक स्टेटमेंट में गोपनीय नाम दर्ज होगा',
        quickExit: 'त्वरित बाहर निकलें (Esc)',
      },
      consent: {
        title: 'टेलीहेल्थ और डेटा उपयोग की सहमति',
        dpdpNotice: 'डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम, 2023 के तहत',
        accept: 'मैं नियम व गोपनीयता नीति से सहमत हूँ',
      },
    },
  },
};

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('findmedi_lang') || 'en' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: defaultResources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already handles escaping
    },
  });

export default i18n;
