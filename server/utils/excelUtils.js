import XLSX from 'xlsx';
import { Parser } from 'json2csv';

export const parseExcelFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

export const exportToExcel = (data, filename = 'export') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
};

export const exportToCSV = (data, fields) => {
  const parser = new Parser({ fields });
  return parser.parse(data);
};

export const validatePatientData = (patients) => {
  const errors = [];
  const validPatients = [];
  
  patients.forEach((patient, index) => {
    const rowErrors = [];
    
    if (!patient.name && !patient.Name) {
      rowErrors.push('Name is required');
    }
    if (!patient.phone && !patient.Phone && !patient.mobile && !patient.Mobile) {
      rowErrors.push('Phone is required');
    }
    if (!patient.email && !patient.Email) {
      rowErrors.push('Email is required');
    }
    
    if (rowErrors.length > 0) {
      errors.push({ row: index + 2, errors: rowErrors });
    } else {
      validPatients.push({
        name: patient.name || patient.Name,
        email: patient.email || patient.Email,
        phone: patient.phone || patient.Phone || patient.mobile || patient.Mobile,
        age: Number(patient.age || patient.Age) || 0,
        gender: patient.gender || patient.Gender || 'Other',
        address: patient.address || patient.Address,
      });
    }
  });
  
  return { validPatients, errors };
};

export const validateDoctorData = (doctors) => {
  const errors = [];
  const validDoctors = [];
  
  doctors.forEach((doctor, index) => {
    const rowErrors = [];
    
    if (!doctor.name && !doctor.Name) {
      rowErrors.push('Name is required');
    }
    if (!doctor.specialization && !doctor.speciality && !doctor.Specialization) {
      rowErrors.push('Specialization is required');
    }
    if (!doctor.email && !doctor.Email) {
      rowErrors.push('Email is required');
    }
    
    if (rowErrors.length > 0) {
      errors.push({ row: index + 2, errors: rowErrors });
    } else {
      validDoctors.push({
        name: doctor.name || doctor.Name,
        specialization: doctor.specialization || doctor.speciality || doctor.Specialization,
        email: doctor.email || doctor.Email,
        phone: doctor.phone || doctor.Phone,
        experience: doctor.experience || doctor.Experience || 0,
        qualifications: doctor.qualifications || doctor.Qualifications || doctor.qualification || doctor.Qualification,
        fees: Number(doctor.fees || doctor.Fees || doctor.consultation_fees || doctor.ConsultationFee) || 500,
        consultation_fees: Number(doctor.consultation_fees || doctor.ConsultationFee || doctor.fees || doctor.Fees) || 500,
        approved: String(doctor.approved || doctor.Approved || '').toLowerCase() === 'true',
        initials: (doctor.name || doctor.Name || '')
          .split(' ')
          .filter(Boolean)
          .map(part => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      });
    }
  });
  
  return { validDoctors, errors };
};

export const validateBillingData = (records) => {
  const errors = [];
  const validRecords = [];
  
  records.forEach((record, index) => {
    const rowErrors = [];
    
    if (!record.patient && !record.Patient && !record.patientName && !record.PatientName && !record.patientId && !record.patient_id && !record.PatientId) {
      rowErrors.push('Patient name or patient ID is required');
    }
    if (!record.amount && !record.Amount) {
      rowErrors.push('Amount is required');
    }
    
    if (rowErrors.length > 0) {
      errors.push({ row: index + 2, errors: rowErrors });
    } else {
      validRecords.push({
        patient: record.patient || record.Patient || record.patientName || record.PatientName || record.patientId || record.patient_id || record.PatientId,
        patientId: record.patientId || record.patient_id || record.PatientId || undefined,
        doctor: record.doctor || record.Doctor || 'Imported Billing',
        service: record.service || record.Service || record.description || record.Description || 'Imported service',
        amount: parseFloat(record.amount || record.Amount),
        description: record.description || record.Description,
        status: record.status || record.Status || 'Pending',
        date: record.date || record.Date || new Date().toISOString().split('T')[0],
        dueDate: record.dueDate || record.DueDate || '',
      });
    }
  });
  
  return { validRecords, errors };
};

export const formatPatientsForExport = (patients) => {
  return patients.map(p => ({
    Name: p.name,
    Email: p.email,
    Phone: p.phone,
    Age: p.age,
    Gender: p.gender,
    Address: p.address,
    'Created At': new Date(p.createdAt).toLocaleDateString(),
  }));
};

export const formatDoctorsForExport = (doctors) => {
  return doctors.map(d => ({
    Name: d.name,
    Specialization: d.specialization,
    Email: d.email,
    Phone: d.phone,
    Experience: d.experience,
    Qualification: d.qualification,
    'Created At': new Date(d.createdAt).toLocaleDateString(),
  }));
};

export const formatBillingForExport = (billing) => {
  return billing.map(b => ({
    'Patient ID': b.patientId,
    Amount: b.amount,
    Description: b.description,
    Status: b.status,
    Date: new Date(b.date).toLocaleDateString(),
  }));
};

export const formatAppointmentsForExport = (appointments) => {
  return appointments.map(a => ({
    'Patient Name': a.patient?.name || a.patientName,
    'Doctor Name': a.doctor?.name || a.doctorName,
    Date: a.date,
    Time: a.time,
    Status: a.status,
    'Created At': new Date(a.createdAt).toLocaleDateString(),
  }));
};
