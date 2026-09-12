import React, { useState, useEffect, useCallback } from 'react';
import {
  applicationsApi,
  Application,
  CategoryItem,
  EducationFinanceScheme,
} from '../../api/applications.api';
import { geographyApi, StateItem, DistrictItem, PincodeValidationResult } from '../../api/geography.api';
import { documentsApi } from '../../api/documents.api';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Save,
  Send,
  Building2,
  GraduationCap,
  MapPin,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Lock,
  UploadCloud,
  Eye,
  ExternalLink,
  Coins,
  Award,
  CreditCard,
  Printer,
  Receipt,
  Check,
  Info,
} from 'lucide-react';
import CouponApplyWidget from './CouponApplyWidget';
import { CouponValidationResponse } from '../../api/coupons.api';

interface ApplicationWorkflowFormProps {
  applicationId: string;
  onSubmitted?: () => void;
  onBack?: () => void;
}

export const ApplicationWorkflowForm: React.FC<ApplicationWorkflowFormProps> = ({
  applicationId,
  onSubmitted,
  onBack,
}) => {
  // Page Lifecycle State
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('UPI');
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<any>(null);
  const [blockingReason, setBlockingReason] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);

  // Application & Progress Data
  const [appData, setAppData] = useState<Application | null>(null);
  const [progress, setProgress] = useState<any>(null);

  // Master Data
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [financeSchemes, setFinanceSchemes] = useState<EducationFinanceScheme[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // --- Form States ---
  // Step 1: Personal Info
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [category, setCategory] = useState<string>('GENERAL');
  const [country, setCountry] = useState<string>('India');
  const [mobile, setMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [parentMobile, setParentMobile] = useState<string>('');
  const [parentEmail, setParentEmail] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [registrationNumber, setRegistrationNumber] = useState<string>('');

  // Step 2: Academic Info & Address
  const [educationLevel, setEducationLevel] = useState<string>('12th');
  const [tenthBoard, setTenthBoard] = useState<string>('');
  const [tenthMarks, setTenthMarks] = useState<string>('');
  const [tenthPassingYear, setTenthPassingYear] = useState<string>('');
  const [tenthSchool, setTenthSchool] = useState<string>('');

  const [twelfthBoard, setTwelfthBoard] = useState<string>('');
  const [twelfthStream, setTwelfthStream] = useState<string>('');
  const [twelfthMarks, setTwelfthMarks] = useState<string>('');
  const [twelfthPassingYear, setTwelfthPassingYear] = useState<string>('');
  const [twelfthSchool, setTwelfthSchool] = useState<string>('');

  const [hasDiploma, setHasDiploma] = useState<boolean>(false);
  const [diplomaCollege, setDiplomaCollege] = useState<string>('');
  const [diplomaCourse, setDiplomaCourse] = useState<string>('');
  const [diplomaPercentage, setDiplomaPercentage] = useState<string>('');
  const [diplomaPassingYear, setDiplomaPassingYear] = useState<string>('');

  const [hasGraduation, setHasGraduation] = useState<boolean>(false);
  const [graduationCollege, setGraduationCollege] = useState<string>('');
  const [graduationCourse, setGraduationCourse] = useState<string>('');
  const [graduationPercentage, setGraduationPercentage] = useState<string>('');
  const [graduationPassingYear, setGraduationPassingYear] = useState<string>('');

  // Step 4: Address
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [commCity, setCommCity] = useState<string>('');
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [pinValidation, setPinValidation] = useState<PincodeValidationResult | null>(null);
  const [validatingPin, setValidatingPin] = useState<boolean>(false);

  // Step 6: Declarations & Financial Assistance
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [declarationAccepted, setDeclarationAccepted] = useState<boolean>(false);
  const [verificationConsent, setVerificationConsent] = useState<boolean>(false);
  const [communicationConsent, setCommunicationConsent] = useState<boolean>(false);

  // Financial Assistance
  const [financePreference, setFinancePreference] = useState<'DIRECT_PAYMENT' | 'STATE_SCHEME' | 'SCHOLARSHIP' | 'BOTH'>('DIRECT_PAYMENT');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [scholarshipRemarks, setScholarshipRemarks] = useState<string>('');

  // Step 7: Quota & Fee Payment
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);
  const [isFeePaidLocally, setIsFeePaidLocally] = useState<boolean>(false);
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    orderId?: string;
    paymentId?: string;
    payableAmount?: number;
    baseFee?: number;
    discountAmount?: number;
  } | null>(null);

  // Read-only state for submitted applications
  const isReadOnly =
    appData?.status === 'SUBMITTED' ||
    appData?.status === 'UNDER_REVIEW' ||
    appData?.status === 'APPROVED' ||
    appData?.status === 'ADMISSION_CONFIRMED';

  // 1. Initial Load of Master Data & Progress
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Master Categories
      try {
        const catRes = await applicationsApi.getCategories();
        setCategories(catRes.data || []);
      } catch (err) {
        console.warn('Failed to load categories master data', err);
      }

      // Load States for Address
      try {
        const stateList = await geographyApi.getStates();
        setStates(stateList || []);
      } catch (err) {
        console.warn('Failed to load states', err);
      }

      // Load Progress
      const pRes = await applicationsApi.getProgress(applicationId);
      const progressData = pRes.data;
      setProgress(progressData);

      // Load Applications List for the current app
      const myAppsRes = await applicationsApi.findMyApplications();
      const appsList: Application[] = Array.isArray(myAppsRes.data)
        ? myAppsRes.data
        : (myAppsRes.data as any).applications || [];
      const current = appsList.find((a) => a.id === applicationId);

      if (current) {
        setAppData(current);
        const formData: any = current.formData || {};
        const stu = progressData.studentDetails || {};
        const prof = stu.profile || {};

        // Populate Step 1: Personal Info
        setFullName(formData.personalInfo?.fullName || stu.fullName || '');
        setDob(
          formData.personalInfo?.dob
            ? new Date(formData.personalInfo.dob).toISOString().split('T')[0]
            : prof.dob
            ? new Date(prof.dob).toISOString().split('T')[0]
            : ''
        );
        setGender(formData.personalInfo?.gender || prof.gender || '');
        setCategory(formData.personalInfo?.category || prof.category || 'GENERAL');
        // Authoritative application contact snapshot:
        setMobile(formData.personalInfo?.mobile || current.user?.mobile || stu.mobile || '');
        setEmail(formData.personalInfo?.email || current.user?.email || stu.email || '');
        setParentMobile(formData.personalInfo?.parentMobile || prof.parentContact || '');
        setParentEmail(formData.personalInfo?.parentEmail || prof.parentEmail || '');
        setStudentId(stu.studentId || '');
        setRegistrationNumber(stu.registrationNumber || '');

        // Populate Step 2: Academic Info
        const acad = formData.academicInfo || {};
        const initialLevel =
          acad.educationLevel ||
          prof.highestEducation ||
          current.course?.level ||
          '12th';
        setEducationLevel(initialLevel);
        setTenthBoard(acad.tenthBoard || prof.tenthBoard || '');
        setTenthMarks(acad.tenthMarks !== undefined ? String(acad.tenthMarks) : prof.tenthMarks !== undefined ? String(prof.tenthMarks) : '');
        setTenthPassingYear(acad.tenthPassingYear ? String(acad.tenthPassingYear) : prof.tenthPassingYear ? String(prof.tenthPassingYear) : '');
        setTenthSchool(acad.tenthSchool || prof.tenthSchool || '');

        setTwelfthBoard(acad.twelfthBoard || prof.twelfthBoard || '');
        setTwelfthStream(acad.twelfthStream || prof.twelfthStream || 'Science');
        setTwelfthMarks(acad.twelfthMarks !== undefined ? String(acad.twelfthMarks) : prof.twelfthMarks !== undefined ? String(prof.twelfthMarks) : '');
        setTwelfthPassingYear(acad.twelfthPassingYear ? String(acad.twelfthPassingYear) : prof.twelfthPassingYear ? String(prof.twelfthPassingYear) : '');
        setTwelfthSchool(acad.twelfthSchool || prof.twelfthSchool || '');

        if (acad.diplomaCollege || prof.diplomaCollege) {
          setHasDiploma(true);
          setDiplomaCollege(acad.diplomaCollege || prof.diplomaCollege || '');
          setDiplomaCourse(acad.diplomaCourse || prof.diplomaCourse || '');
          setDiplomaPercentage(acad.diplomaPercentage !== undefined ? String(acad.diplomaPercentage) : prof.diplomaPercentage ? String(prof.diplomaPercentage) : '');
          setDiplomaPassingYear(acad.diplomaPassingYear ? String(acad.diplomaPassingYear) : prof.diplomaPassingYear ? String(prof.diplomaPassingYear) : '');
        }

        if (acad.graduationCollege || prof.graduationCollege) {
          setHasGraduation(true);
          setGraduationCollege(acad.graduationCollege || prof.graduationCollege || '');
          setGraduationCourse(acad.graduationCourse || prof.graduationCourse || '');
          setGraduationPercentage(acad.graduationPercentage !== undefined ? String(acad.graduationPercentage) : prof.graduationPercentage ? String(prof.graduationPercentage) : '');
          setGraduationPassingYear(acad.graduationPassingYear ? String(acad.graduationPassingYear) : prof.graduationPassingYear ? String(prof.graduationPassingYear) : '');
        }

        // Populate Step 4: Address
        const addr = formData.address || {};
        const commStreet = addr.streetAddress || formData.communicationAddress || prof.address || '';
        const commC = addr.city || formData.communicationCity || prof.city || '';
        const commS = addr.state || formData.communicationState || prof.state || '';
        const commD = addr.district || formData.communicationDistrict || prof.district || '';
        const commP = addr.pincode || formData.communicationPincode || prof.pincode || '';

        setStreetAddress(commStreet);
        setCommCity(commC);
        setSelectedStateId(commS);
        setSelectedDistrictId(commD);
        setPincode(commP);

        // Populate Step 5: Declarations & Finance from persisted backend state
        const decl = formData.declaration || {};
        const declItems: any[] = Array.isArray(decl.items) ? decl.items : [];
        const itemMap = new Map<string, any>(declItems.map((it: any) => [it.type, it]));

        const isPriv = itemMap.has('PRIVACY_POLICY')
          ? Boolean(itemMap.get('PRIVACY_POLICY').accepted)
          : Boolean(decl.privacyAccepted || decl.privacyPolicyAccepted);

        const isTerms = itemMap.has('TERMS_CONDITIONS')
          ? Boolean(itemMap.get('TERMS_CONDITIONS').accepted)
          : Boolean(decl.termsAccepted);

        const isAuth = itemMap.has('AUTHENTICITY')
          ? Boolean(itemMap.get('AUTHENTICITY').accepted)
          : Boolean(decl.declarationAccepted || decl.studentDeclarationAccepted);

        const isVerify = itemMap.has('VERIFICATION_AUTH')
          ? Boolean(itemMap.get('VERIFICATION_AUTH').accepted)
          : Boolean(decl.verificationConsent || decl.verificationAccepted);

        const isComm = itemMap.has('COMMUNICATION_CONSENT')
          ? Boolean(itemMap.get('COMMUNICATION_CONSENT').accepted)
          : Boolean(decl.communicationConsent || decl.communicationAccepted);

        setPrivacyAccepted(isPriv);
        setTermsAccepted(isTerms);
        setDeclarationAccepted(isAuth);
        setVerificationConsent(isVerify);
        setCommunicationConsent(isComm);

        const fin = formData.financialAssistance || {};
        if (fin.preference) {
          setFinancePreference(fin.preference);
          setSelectedSchemeId(fin.schemeId || fin.schemeCode || '');
          setScholarshipRemarks(fin.remarks || '');
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Dependent Districts Loading when State changes
  useEffect(() => {
    if (!selectedStateId) {
      setDistricts([]);
      return;
    }

    const loadDistricts = async () => {
      try {
        const dList = await geographyApi.getDistricts(selectedStateId);
        setDistricts(dList || []);
      } catch (err) {
        console.warn('Failed to load districts for state', selectedStateId, err);
      }
    };
    loadDistricts();
  }, [selectedStateId]);

  // Load Education Finance Schemes based on Student State
  useEffect(() => {
    const loadSchemes = async () => {
      try {
        const res = await applicationsApi.getEducationFinanceSchemes({
          state: selectedStateId || 'Bihar',
        });
        setFinanceSchemes(res.data || []);
      } catch (err) {
        console.warn('Failed to load finance schemes', err);
      }
    };
    loadSchemes();
  }, [selectedStateId]);

  // Authoritative PIN Code Validation on change/blur
  const handleValidatePincode = useCallback(async (pinToTest?: string) => {
    const pin = pinToTest !== undefined ? pinToTest : pincode;
    if (!pin || pin.trim().length !== 6) {
      setPinValidation(null);
      return;
    }

    if (!selectedStateId && !selectedDistrictId) {
      setPinValidation(null);
      return;
    }

    try {
      setValidatingPin(true);
      const res = await geographyApi.validatePincode(
        selectedStateId,
        selectedDistrictId,
        pin.trim()
      );
      setPinValidation(res);
    } catch (err: any) {
      setPinValidation({
        isValid: false,
        message: err?.response?.data?.message || 'PIN code validation failed.',
      });
    } finally {
      setValidatingPin(false);
    }
  }, [pincode, selectedStateId, selectedDistrictId]);

  useEffect(() => {
    if (pincode && pincode.trim().length === 6 && selectedStateId) {
      handleValidatePincode(pincode);
    } else {
      setPinValidation(null);
    }
  }, [pincode, selectedStateId, selectedDistrictId, handleValidatePincode]);

  // Save Draft Handler
  const handleSaveDraft = async (targetSection?: string) => {
    if (isReadOnly) return true;

    try {
      setSaving(true);
      setError(null);

      // Validate Academic ranges if provided
      if (tenthMarks && (Number(tenthMarks) < 0 || Number(tenthMarks) > 100)) {
        setError('10th Marks percentage must be between 0 and 100');
        setSaving(false);
        return false;
      }
      if (twelfthMarks && (Number(twelfthMarks) < 0 || Number(twelfthMarks) > 100)) {
        setError('12th Marks percentage must be between 0 and 100');
        setSaving(false);
        return false;
      }

      // Check PIN validation if on Step 2 (Academic & Address)
      if (activeStep === 2 && pincode) {
        if (pinValidation && !pinValidation.isValid) {
          setError(pinValidation.message || 'PIN Code does not belong to the selected district.');
          setSaving(false);
          return false;
        }
      }

      const selectedScheme = financeSchemes.find((s) => s.id === selectedSchemeId || s.schemeCode === selectedSchemeId);

      const payload = {
        section: targetSection || `Step ${activeStep}`,
        communicationAddress: streetAddress,
        communicationCity: commCity,
        communicationDistrict: selectedDistrictId,
        communicationState: selectedStateId,
        communicationPincode: pincode,
        personalInfo: {
          fullName,
          dob,
          gender,
          category,
          country,
          mobile,
          email,
          parentMobile,
          parentEmail,
          state: selectedStateId,
          district: selectedDistrictId,
          pincode,
        },
        academicInfo: {
          educationLevel,
          tenthBoard,
          tenthMarks: tenthMarks ? Number(tenthMarks) : undefined,
          tenthPassingYear: tenthPassingYear ? Number(tenthPassingYear) : undefined,
          tenthSchool,
          twelfthBoard,
          twelfthStream,
          twelfthMarks: twelfthMarks ? Number(twelfthMarks) : undefined,
          twelfthPassingYear: twelfthPassingYear ? Number(twelfthPassingYear) : undefined,
          twelfthSchool,
          ...(hasDiploma ? {
            diplomaCollege,
            diplomaCourse,
            diplomaPercentage: diplomaPercentage ? Number(diplomaPercentage) : undefined,
            diplomaPassingYear: diplomaPassingYear ? Number(diplomaPassingYear) : undefined,
          } : {}),
          ...(hasGraduation ? {
            graduationCollege,
            graduationCourse,
            graduationPercentage: graduationPercentage ? Number(graduationPercentage) : undefined,
            graduationPassingYear: graduationPassingYear ? Number(graduationPassingYear) : undefined,
          } : {}),
        },
        address: {
          streetAddress,
          city: commCity,
          district: selectedDistrictId,
          state: selectedStateId,
          pincode,
        },
        financialAssistance: {
          preference: financePreference,
          schemeId: selectedScheme?.id,
          schemeCode: selectedScheme?.schemeCode,
          schemeName: selectedScheme?.schemeName,
          maximumFinancing: selectedScheme?.maximumFinancing,
          remarks: scholarshipRemarks,
        },
        declaration: {
          privacyAccepted,
          privacyVersion: 'v1.2',
          termsAccepted,
          termsVersion: 'v2.0',
          declarationAccepted,
          verificationConsent,
          communicationConsent,
          acceptedAt: new Date().toISOString(),
        },
      };

      const res = await applicationsApi.saveDraft(applicationId, payload);
      setLastSavedText(`Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setSuccessMessage('Draft saved successfully with live backend synchronization.');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh progress
      const pRes = await applicationsApi.getProgress(applicationId);
      setProgress(pRes.data);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save application draft.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step Navigation with validation (5 STEPS)
  const handleNext = async () => {
    // Validate Current Step
    if (activeStep === 1) {
      if (!fullName.trim()) {
        setError('Full Name is required');
        return;
      }
    } else if (activeStep === 2) {
      if (!tenthBoard.trim()) {
        setError('10th Board is required.');
        return;
      }
      if (!tenthMarks || isNaN(Number(tenthMarks)) || Number(tenthMarks) < 0 || Number(tenthMarks) > 100) {
        setError('Valid 10th marks percentage (0-100) is required.');
        return;
      }
      const isLevel10th = educationLevel === '10th';
      const isLevelDiploma = educationLevel === 'Diploma';
      if (!isLevel10th && !isLevelDiploma) {
        if (!twelfthBoard.trim()) {
          setError('12th Board is required.');
          return;
        }
        if (!twelfthMarks || isNaN(Number(twelfthMarks)) || Number(twelfthMarks) < 0 || Number(twelfthMarks) > 100) {
          setError('Valid 12th marks percentage (0-100) is required.');
          return;
        }
      }
      if (isLevelDiploma) {
        if (!diplomaCollege.trim() || !diplomaCourse.trim()) {
          setError('Diploma college and specialization/course are required.');
          return;
        }
        if (diplomaPercentage && (isNaN(Number(diplomaPercentage)) || Number(diplomaPercentage) < 0 || Number(diplomaPercentage) > 100)) {
          setError('Valid Diploma percentage (0-100) is required.');
          return;
        }
      }
      if (!selectedStateId) {
        setError('Please select your State.');
        return;
      }
      if (!selectedDistrictId) {
        setError('Please select your District.');
        return;
      }
      if (!pincode || pincode.trim().length !== 6) {
        setError('Please enter a valid 6-digit PIN Code.');
        return;
      }
      if (pinValidation && !pinValidation.isValid) {
        setError(pinValidation.message || 'PIN Code does not belong to the selected district.');
        return;
      }
    } else if (activeStep === 4) {
      const summary = progress?.documentChecklist?.summary;
      if (summary && !summary.isComplete) {
        setError(`Please upload all required documents before proceeding. (${summary.missingCount} missing)`);
        return;
      }
    } else if (activeStep === 5) {
      if (!declarationAccepted || !privacyAccepted || !termsAccepted || !verificationConsent || !communicationConsent) {
        setError('Please accept all required declarations, privacy policy, and consent checkboxes.');
        return;
      }
    }

    const saved = await handleSaveDraft(`Step ${activeStep}`);
    if (saved && activeStep < 5) {
      setActiveStep(activeStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Inline Document Upload Handler for Step 5
  const handleFileUpload = async (type: string, file: File, docId?: string) => {
    try {
      if (file.size > 300 * 1024) {
        setError('File size must not exceed 300 KB.');
        return;
      }
      setUploadingDocType(type);
      setError(null);
      if (docId) {
        await documentsApi.replace(docId, file);
      } else {
        await documentsApi.upload(type, file, applicationId, type.replace(/_/g, ' '));
      }
      setSuccessMessage(`Document "${type.replace(/_/g, ' ')}" uploaded successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh progress & checklist
      const pRes = await applicationsApi.getProgress(applicationId);
      setProgress(pRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploadingDocType(null);
    }
  };

  const isNextFree = progress?.quotaInfo?.isFreeSubmission ?? true;
  const freeRemaining = progress?.quotaInfo?.freeRemaining ?? 3;

  // Single Action Final Submission & Authoritative Payment Handler
  const handleFinalSubmitAndPay = async () => {
    setError(null);
    setBlockingReason(null);
    setPaymentNotice(null);

    // 1. Mandatory Declarations Validation
    const missingClientDeclarations: string[] = [];
    if (!privacyAccepted) missingClientDeclarations.push('Privacy Policy Agreement (Version v1.2)');
    if (!termsAccepted) missingClientDeclarations.push('Terms & Conditions of Admission (Version v2.0)');
    if (!declarationAccepted) missingClientDeclarations.push('Authenticity of Information & Documents');
    if (!verificationConsent) missingClientDeclarations.push('Verification & Institutional Record Check Authorization');

    if (missingClientDeclarations.length > 0) {
      const msg = `Please accept all required statutory declarations before final submission: ${missingClientDeclarations.join(', ')}`;
      setBlockingReason(msg);
      setError(msg);
      return;
    }

    const declarationPayload = {
      privacyAccepted,
      privacyVersion: 'v1.2',
      termsAccepted,
      termsVersion: 'v2.0',
      declarationAccepted,
      verificationConsent,
      communicationConsent,
      acceptedAt: new Date().toISOString(),
    };

    // Auto-save Step 5 draft to synchronize authoritative backend state
    try {
      const selectedScheme = financeSchemes.find((s: any) => s.id === selectedSchemeId || s.schemeCode === selectedSchemeId);
      await applicationsApi.saveDraft(applicationId, {
        section: 'Step 5',
        declaration: declarationPayload,
        financialAssistance: {
          preference: financePreference,
          schemeId: selectedScheme?.id,
          schemeCode: selectedScheme?.schemeCode,
          schemeName: selectedScheme?.schemeName,
          maximumFinancing: selectedScheme?.maximumFinancing,
          remarks: scholarshipRemarks,
        },
      });
    } catch (saveErr) {
      console.warn('Draft auto-save notice:', saveErr);
    }

    // Refresh authoritative progress from backend
    let currentProgress = progress;
    try {
      const pRes = await applicationsApi.getProgress(applicationId);
      currentProgress = pRes.data;
      setProgress(currentProgress);
    } catch (pErr) {
      console.warn('Failed to refresh progress', pErr);
    }

    // 2. Authoritative readiness check from refreshed progress
    if (currentProgress && !currentProgress.isOfferingActive) {
      const msg = 'This program is no longer accepting applications.';
      setBlockingReason(msg);
      setError(msg);
      return;
    }

    if (currentProgress && !currentProgress.isReadyToSubmit && currentProgress.missingRequirements?.length > 0) {
      const msg = `Application is incomplete: ${currentProgress.missingRequirements.join('; ')}`;
      setBlockingReason(msg);
      setError(msg);
      return;
    }

    // 3. Prevent duplicate click if already in flight (Idempotency)
    if (submitting || paymentProcessing) {
      return;
    }

    // Statutory declarations validation
    if (!declarationAccepted) {
      const msg = 'Please accept the declaration confirming all information provided is accurate.';
      setError(msg);
      setBlockingReason(msg);
      return;
    }
    if (!termsAccepted) {
      const msg = 'Please accept the terms and conditions to proceed with submission.';
      setError(msg);
      setBlockingReason(msg);
      return;
    }
    if (!privacyAccepted) {
      const msg = 'Please accept the privacy policy to proceed with submission.';
      setError(msg);
      setBlockingReason(msg);
      return;
    }

    setSubmitting(true);
    setError(null);
    setBlockingReason(null);
    setPaymentNotice(null);

    // 4. Authoritative Backend Payment Initiation
    let paymentInitData: any = null;
    try {
      const initRes = await applicationsApi.initiatePayment(applicationId, {
        couponCode: appliedCoupon?.code,
        declaration: declarationPayload,
      });
      paymentInitData = initRes.data;
    } catch (initErr: any) {
      const missing = initErr?.response?.data?.missingRequirements || initErr?.response?.data?.missingDeclarations;
      let msg = initErr?.response?.data?.message || initErr?.message || 'Unable to start payment. Please try again.';
      if (Array.isArray(missing) && missing.length > 0) {
        msg = `Application is incomplete: ${missing.join('; ')}`;
      }
      setError(msg);
      setBlockingReason(msg);
      setSubmitting(false);
      return;
    }

    // CASE A — FINAL PAYABLE = ₹0 (Free Quota or 100% Coupon)
    if (paymentInitData?.isZeroAmount || paymentInitData?.payableAmount === 0) {
      try {
        const res: any = await applicationsApi.submitApplication(
          applicationId,
          true,
          'v2.0',
          appliedCoupon?.code,
          undefined,
          undefined,
          {
            financialAssistance: {
              preference: financePreference,
              schemeId: selectedSchemeId,
              remarks: scholarshipRemarks,
            },
          },
          declarationPayload,
          paymentInitData.paymentId,
          paymentInitData.orderId
        );

        const appObj = res.data?.data || res.data?.application || appData;
        const publicAppCode = res.data?.applicationNumber || appObj?.applicationNumber || appObj?.applicationId || applicationId;
        const receiptNo = res.data?.receiptNumber || `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

        setSubmissionReceipt({
          applicationCode: publicAppCode,
          receiptNumber: receiptNo,
          originalAmount: paymentInitData.baseFee || 1500,
          discount: paymentInitData.discountAmount || (paymentInitData.isFreeQuota ? (paymentInitData.baseFee || 1500) : (appliedCoupon?.discountAmount || 0)),
          coupon: appliedCoupon?.code || (paymentInitData.isFreeQuota ? 'FREE_APPLICATION_QUOTA' : 'FEE_WAIVER'),
          netAmount: 0,
          paymentMethod: paymentInitData.isFreeQuota ? 'FREE APPLICATION QUOTA (₹0)' : '100% COUPON WAIVER (₹0)',
          transactionReference: res.data?.transactionId || `TXN_SETTLED_${Date.now()}`,
          studentId: appData?.userId || (appData as any)?.user?.id || 'N/A',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          paymentStatus: 'COMPLETED / WAIVED',
          collegeName: appData?.college?.name || 'Partner College',
          courseName: appData?.course?.name || 'Academic Program',
        });

        setSuccessMessage('Application Submitted Successfully');
        await fetchInitialData();
      } catch (err: any) {
        const missing = err?.response?.data?.missingDeclarations || err?.response?.data?.missing;
        let msg = err?.response?.data?.message || err?.message || 'Failed to submit application.';
        if (Array.isArray(missing) && missing.length > 0) {
          msg = `Required statutory declarations missing: ${missing.join(', ')}`;
        }
        setError(msg);
        setBlockingReason(msg);
      } finally {
        setSubmitting(false);
      }
    } else {
      // CASE B — FINAL PAYABLE > ₹0 (Opens Authoritative Payment Gateway Window)
      setPendingPaymentInfo({
        orderId: paymentInitData?.orderId,
        paymentId: paymentInitData?.paymentId,
        payableAmount: paymentInitData?.payableAmount,
        baseFee: paymentInitData?.baseFee,
        discountAmount: paymentInitData?.discountAmount,
      });
      setSubmitting(false);
      setShowPaymentModal(true);
    }
  };

  // Complete Payment and Atomically Submit
  const handleExecutePayment = async () => {
    if (paymentProcessing) return;

    try {
      setPaymentProcessing(true);
      setError(null);
      setBlockingReason(null);
      setPaymentNotice(null);

      const txnRef = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const finalPayable = pendingPaymentInfo?.payableAmount ?? (appliedCoupon ? appliedCoupon.finalAmount : 1500);

      const declarationPayload = {
        privacyAccepted,
        privacyVersion: 'v1.2',
        termsAccepted,
        termsVersion: 'v2.0',
        declarationAccepted,
        verificationConsent,
        communicationConsent,
        acceptedAt: new Date().toISOString(),
      };

      const res: any = await applicationsApi.submitApplication(
        applicationId,
        true,
        'v2.0',
        appliedCoupon?.code,
        txnRef,
        txnRef,
        {
          paymentMethod: selectedPaymentMethod,
          financialAssistance: {
            preference: financePreference,
            schemeId: selectedSchemeId,
            remarks: scholarshipRemarks,
          },
        },
        declarationPayload,
        pendingPaymentInfo?.paymentId,
        pendingPaymentInfo?.orderId
      );

      const appObj = res.data?.data || res.data?.application || appData;
      const publicAppCode = res.data?.applicationNumber || appObj?.applicationNumber || appObj?.applicationId || applicationId;
      const receiptNo = res.data?.receiptNumber || `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      setSubmissionReceipt({
        applicationCode: publicAppCode,
        receiptNumber: receiptNo,
        originalAmount: pendingPaymentInfo?.baseFee || 1500,
        discount: pendingPaymentInfo?.discountAmount || (appliedCoupon?.discountAmount || 0),
        coupon: appliedCoupon?.code || 'NONE',
        netAmount: finalPayable,
        paymentMethod: selectedPaymentMethod,
        transactionReference: txnRef,
        studentId: appData?.userId || (appData as any)?.user?.id || 'N/A',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        paymentStatus: 'COMPLETED / SUCCESS',
        collegeName: appData?.college?.name || 'Partner College',
        courseName: appData?.course?.name || 'Academic Program',
      });

      setSuccessMessage('Application and payment processed successfully!');
      setShowPaymentModal(false);
      await fetchInitialData();
    } catch (err: any) {
      const missing = err?.response?.data?.missingDeclarations || err?.response?.data?.missing;
      let msg = err?.response?.data?.message || err?.message || 'Payment processing or submission failed.';
      if (Array.isArray(missing) && missing.length > 0) {
        msg = `Required statutory declarations missing: ${missing.join(', ')}`;
      }
      setError(msg);
      setBlockingReason(msg);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleCancelPayment = () => {
    setShowPaymentModal(false);
    setPaymentNotice('Payment was not completed. Your application remains pending payment.');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <RefreshCw className="w-8 h-8 text-[#4A7B5B] animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700">Loading your application details...</p>
        <p className="text-xs text-gray-400 mt-1">Connecting to authoritative PostgreSQL admission records</p>
      </div>
    );
  }

  if (submissionReceipt) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 max-w-3xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-950">Application Submitted Successfully</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Your admission application for <strong>{submissionReceipt.courseName}</strong> at <strong>{submissionReceipt.collegeName}</strong> has been officially logged in the Central Admission Registry.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold font-mono">
            Application Code: {submissionReceipt.applicationCode}
          </div>
        </div>

        {/* Authoritative Settlement Receipt Card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#4A7B5B]" />
              <span className="text-sm font-black text-gray-900">Official Settlement Receipt</span>
            </div>
            <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border">
              {submissionReceipt.receiptNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Original Amount</span>
              <span className="font-bold text-gray-900">₹{submissionReceipt.originalAmount?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Discount / Waiver</span>
              <span className="font-bold text-emerald-700">₹{submissionReceipt.discount?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Coupon Applied</span>
              <span className="font-mono font-bold text-slate-800">{submissionReceipt.coupon}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Net Amount</span>
              <span className="font-black text-base text-[#4A7B5B]">₹{submissionReceipt.netAmount?.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
              <span className="font-bold text-gray-900">{submissionReceipt.paymentMethod}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Status</span>
              <span className="font-bold text-emerald-700">{submissionReceipt.paymentStatus}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Student ID</span>
              <span className="font-mono font-bold text-slate-800 truncate block">{submissionReceipt.studentId}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Transaction Reference</span>
              <span className="font-mono font-bold text-slate-800 truncate block">{submissionReceipt.transactionReference}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Submission Date</span>
              <span className="font-bold text-gray-900">{submissionReceipt.date}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (onSubmitted) onSubmitted();
              if (onBack) onBack();
            }}
            className="flex-1 py-3 px-6 bg-[#4A7B5B] hover:bg-[#3d6b4d] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> View in My Applications
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-[#2D5A3C] text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 uppercase tracking-wider">
                Application #{appData?.applicationNumber || appData?.applicationId || appData?.id}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isReadOnly ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-400 text-amber-950'
              }`}>
                {appData?.status || 'DRAFT'}
              </span>
            </div>
            <h2 className="text-2xl font-black">
              {appData?.course?.name || 'Academic Program'}
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">
              {appData?.college?.name} • Academic Session 2026-2027
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastSavedText && (
              <span className="text-xs text-emerald-100/80 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {lastSavedText}
              </span>
            )}
            {!isReadOnly && (
              <button
                onClick={() => handleSaveDraft(`Step ${activeStep}`)}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 transition-all shadow-sm"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-white text-[#2D5A3C] hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm"
              >
                My Applications
              </button>
            )}
          </div>
        </div>

        {/* Quota Notice Banner */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <span>
              {isNextFree
                ? `🎉 Free Application Quota: You have ${freeRemaining} free submission${freeRemaining > 1 ? 's' : ''} remaining.`
                : 'Application Quota: First 3 free applications have been used. Standard application fee applies.'}
            </span>
          </div>
          <span className="font-bold text-amber-300">
            {isNextFree ? '₹0 FREE' : '₹1,500'}
          </span>
        </div>
      </div>

      {/* Error & Success Feedback Alerts */}
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-rose-800 text-sm flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-emerald-800 text-sm flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* 2. Interactive Stepper Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { step: 1, label: '1. Personal Info', icon: FileText },
            { step: 2, label: '2. Academic & Address', icon: GraduationCap },
            { step: 3, label: '3. Program Summary', icon: Building2 },
            { step: 4, label: '4. Documents & Finance', icon: FileCheck },
            { step: 5, label: '5. Declaration & Review', icon: ShieldCheck },
          ].map((item) => {
            const isCompleted = activeStep > item.step;
            const isCurrent = activeStep === item.step;
            const Icon = item.icon;

            return (
              <button
                key={item.step}
                onClick={() => {
                  handleSaveDraft(`Switch to Step ${item.step}`);
                  setActiveStep(item.step);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-[#4A7B5B] text-white shadow-md'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  isCurrent ? 'bg-white text-[#4A7B5B]' : isCompleted ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : item.step}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Form Body */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">

        {/* ========================================================================= */}
        {/* STEP 1: PERSONAL INFORMATION */}
        {/* ========================================================================= */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#4A7B5B]" /> Personal Information
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Pre-filled from your Student Profile. Permitted edits automatically sync with your master profile.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {studentId && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#E8F3EC] text-[#4A7B5B] font-mono font-bold">
                    Student ID: {studentId}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full legal name"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none font-medium"
                />
              </div>

              {/* 2. Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={isReadOnly}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none"
                />
              </div>

              {/* 3. Gender */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={isReadOnly}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* 4. Category (Master Data Driven) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Student Category (Reservation & Quota) <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={isReadOnly}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none bg-white font-semibold text-[#0F172A]"
                >
                  {categories.length > 0 ? (
                    categories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label} {c.isReservation ? '• Reservation' : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="GENERAL">General / Open Merit (UR)</option>
                      <option value="OBC">Other Backward Class (OBC)</option>
                      <option value="SC">Scheduled Caste (SC)</option>
                      <option value="ST">Scheduled Tribe (ST)</option>
                      <option value="EWS">Economically Weaker Section (EWS)</option>
                    </>
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Selecting OBC, SC, ST, or EWS will automatically request supporting caste/reservation certificates in Step 5.
                </p>
              </div>

              {/* 5. Country */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country / Nationality</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none"
                />
              </div>

              {/* 6. Mobile (Pre-filled, immutable) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobile Number (Primary Identity)
                </label>
                <input
                  type="text"
                  disabled
                  value={mobile || 'Not provided'}
                  className="w-full p-3 bg-gray-50 border rounded-xl text-gray-600 font-mono font-medium"
                />
              </div>

              {/* 7. Email Address (Pre-filled, immutable) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Primary Identity)
                </label>
                <input
                  type="email"
                  disabled
                  value={email || 'Not provided'}
                  className="w-full p-3 bg-gray-50 border rounded-xl text-gray-600 font-mono font-medium"
                />
              </div>

              {/* 8. Parent / Guardian Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Parent / Guardian Mobile Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  disabled={isReadOnly}
                  value={parentMobile}
                  onChange={(e) => setParentMobile(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none font-mono text-sm"
                />
              </div>

              {/* 9. Parent / Guardian Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Parent / Guardian Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  disabled={isReadOnly}
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent.guardian@example.com"
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none text-sm"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4A7B5B] flex-shrink-0" />
              <span>
                Personal security rule: Sensitive KYC data (PAN / Passport) are strictly isolated and not displayed on general admission applications.
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: ACADEMIC & ADDRESS INFORMATION */}
        {/* ========================================================================= */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#4A7B5B]" /> Academic Qualifications & Address
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Select your highest qualifying level, provide your marks, and confirm your verified communication address.
              </p>
            </div>

            {/* Qualifying / Highest Education Level Selector */}
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Qualifying / Highest Education Level <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isReadOnly}
                value={educationLevel}
                onChange={(e) => {
                  const val = e.target.value;
                  setEducationLevel(val);
                  if (val === 'Diploma') {
                    setHasDiploma(true);
                  }
                }}
                className="w-full sm:w-80 p-2.5 bg-white border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B] font-bold text-slate-800 text-sm"
              >
                <option value="10th">10th / Secondary (Matriculation)</option>
                <option value="12th">12th / Higher Secondary / Intermediate</option>
                <option value="Diploma">Diploma / Polytechnic</option>
                <option value="Graduation">Undergraduate / Graduation</option>
                <option value="Post-Graduation">Postgraduate / Masters</option>
              </select>
              <p className="text-xs text-gray-500">
                Form requirements (10th, 12th, or Diploma) and document checklists adapt dynamically based on your chosen level.
              </p>
            </div>

            {/* 10th Standard */}
            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">10</span>
                Secondary / 10th Standard Examination <span className="text-rose-500 text-xs font-bold">* Required for all applicants</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Board / Council <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={tenthBoard}
                    onChange={(e) => setTenthBoard(e.target.value)}
                    placeholder="e.g. CBSE, ICSE, BSEB"
                    className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Percentage / CGPA <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={isReadOnly}
                    value={tenthMarks}
                    onChange={(e) => setTenthMarks(e.target.value)}
                    placeholder="e.g. 84.5"
                    className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B] font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Passing Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    value={tenthPassingYear}
                    onChange={(e) => setTenthPassingYear(e.target.value)}
                    placeholder="e.g. 2021"
                    className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">School / Institution</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={tenthSchool}
                    onChange={(e) => setTenthSchool(e.target.value)}
                    placeholder="School Name"
                    className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                  />
                </div>
              </div>
            </div>

            {/* 12th Standard - Conditional based on educationLevel */}
            {educationLevel === '10th' ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>12th Details Not Required:</strong> You have selected 10th / Matriculation as your qualifying education level. 12th details and marksheet are not required.
                </span>
              </div>
            ) : educationLevel === 'Diploma' ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>12th Details Optional for Diploma:</strong> Since you have completed a Diploma, 12th details are optional.
                </span>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#4A7B5B] text-white flex items-center justify-center text-xs">12</span>
                  Senior Secondary / 12th Standard Examination <span className="text-rose-500 text-xs font-bold">* Required</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Board / Council <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={twelfthBoard}
                      onChange={(e) => setTwelfthBoard(e.target.value)}
                      placeholder="e.g. CBSE, ISC, BSEB"
                      className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stream <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={twelfthStream}
                      onChange={(e) => setTwelfthStream(e.target.value)}
                      className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                    >
                      <option value="Science">Science</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Humanity / Arts">Humanity / Arts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Percentage <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={isReadOnly}
                      value={twelfthMarks}
                      onChange={(e) => setTwelfthMarks(e.target.value)}
                      placeholder="e.g. 78.2"
                      className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B] font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Passing Year <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={twelfthPassingYear}
                      onChange={(e) => setTwelfthPassingYear(e.target.value)}
                      placeholder="e.g. 2023"
                      className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">College / School</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={twelfthSchool}
                      onChange={(e) => setTwelfthSchool(e.target.value)}
                      placeholder="College Name"
                      className="w-full p-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Diploma Section */}
            <div className={`border rounded-2xl p-4 space-y-3 ${educationLevel === 'Diploma' ? 'bg-emerald-50/30 border-emerald-300' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasDiplomaCheckbox"
                    checked={hasDiploma || educationLevel === 'Diploma'}
                    onChange={(e) => {
                      if (educationLevel !== 'Diploma') {
                        setHasDiploma(e.target.checked);
                      }
                    }}
                    disabled={isReadOnly || educationLevel === 'Diploma'}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  <label htmlFor="hasDiplomaCheckbox" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Polytechnic / Diploma Details {educationLevel === 'Diploma' ? <span className="text-rose-500 font-bold">* Required for Diploma Level</span> : '(Lateral Entry candidates)'}
                  </label>
                </div>
              </div>

              {(hasDiploma || educationLevel === 'Diploma') && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Diploma Course / Specialization {educationLevel === 'Diploma' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={diplomaCourse}
                      onChange={(e) => setDiplomaCourse(e.target.value)}
                      placeholder="e.g. Mechanical Engineering"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Polytechnic College / Institute {educationLevel === 'Diploma' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={diplomaCollege}
                      onChange={(e) => setDiplomaCollege(e.target.value)}
                      placeholder="College Name"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Percentage / CGPA {educationLevel === 'Diploma' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={diplomaPercentage}
                      onChange={(e) => setDiplomaPercentage(e.target.value)}
                      placeholder="e.g. 74.5"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      Passing Year {educationLevel === 'Diploma' && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={diplomaPassingYear}
                      onChange={(e) => setDiplomaPassingYear(e.target.value)}
                      placeholder="e.g. 2024"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Graduation Section */}
            <div className="border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasGraduationCheckbox"
                    checked={hasGraduation || educationLevel === 'Graduation' || educationLevel === 'Post-Graduation'}
                    onChange={(e) => {
                      if (educationLevel !== 'Graduation' && educationLevel !== 'Post-Graduation') {
                        setHasGraduation(e.target.checked);
                      }
                    }}
                    disabled={isReadOnly || educationLevel === 'Graduation' || educationLevel === 'Post-Graduation'}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B]"
                  />
                  <label htmlFor="hasGraduationCheckbox" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Undergraduate / Graduation Details {educationLevel === 'Post-Graduation' ? '(Required for PG Courses)' : '(Optional)'}
                  </label>
                </div>
              </div>

              {(hasGraduation || educationLevel === 'Graduation' || educationLevel === 'Post-Graduation') && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-sm">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Degree / Course</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={graduationCourse}
                      onChange={(e) => setGraduationCourse(e.target.value)}
                      placeholder="e.g. B.Sc / B.Tech"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">University / College</label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={graduationCollege}
                      onChange={(e) => setGraduationCollege(e.target.value)}
                      placeholder="University Name"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Percentage / CGPA</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={graduationPercentage}
                      onChange={(e) => setGraduationPercentage(e.target.value)}
                      placeholder="e.g. 72.0"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Passing Year</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      value={graduationPassingYear}
                      onChange={(e) => setGraduationPassingYear(e.target.value)}
                      placeholder="e.g. 2025"
                      className="w-full p-2 border rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Address Details & Authoritative PIN Code Verification */}
            <div className="pt-6 border-t space-y-4">
              <div>
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#4A7B5B]" /> Permanent & Communication Address
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your 6-digit Indian PIN code must correspond to the selected District and State.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                {/* State Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={selectedStateId}
                    onChange={(e) => {
                      setSelectedStateId(e.target.value);
                      setSelectedDistrictId('');
                      setPinValidation(null);
                    }}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none bg-white font-semibold"
                  >
                    <option value="">Select State</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    {!states.length && (
                      <>
                        <option value="Bihar">Bihar</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Jharkhand">Jharkhand</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Delhi">Delhi</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Dependent District Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={isReadOnly || !selectedStateId}
                    value={selectedDistrictId}
                    onChange={(e) => {
                      setSelectedDistrictId(e.target.value);
                      setPinValidation(null);
                    }}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none bg-white font-semibold disabled:bg-gray-100"
                  >
                    <option value="">{selectedStateId ? 'Select District' : 'Select State First'}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                    {!districts.length && selectedStateId === 'Bihar' && (
                      <>
                        <option value="Buxar">Buxar</option>
                        <option value="Patna">Patna</option>
                        <option value="Sitamarhi">Sitamarhi</option>
                        <option value="Muzaffarpur">Muzaffarpur</option>
                        <option value="Gaya">Gaya</option>
                      </>
                    )}
                    {!districts.length && selectedStateId === 'Karnataka' && (
                      <>
                        <option value="Chikkaballapura">Chikkaballapura</option>
                        <option value="Bangalore Urban">Bangalore Urban</option>
                        <option value="Kolar">Kolar</option>
                        <option value="Mysore">Mysore</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Street Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Street Address (House/Flat No, Landmark, Village/Locality) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Enter house/flat number, road, locality"
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    City / Town / Post Office
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={commCity}
                    onChange={(e) => setCommCity(e.target.value)}
                    placeholder="Enter city or post office"
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-[#4A7B5B] outline-none"
                  />
                </div>

                {/* 6-Digit Indian PIN Code with Live Authoritative Validation */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    PIN Code (6 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      disabled={isReadOnly}
                      value={pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPincode(val);
                      }}
                      onBlur={() => handleValidatePincode()}
                      placeholder="e.g. 802101 or 562101"
                      className={`w-full p-3 border rounded-xl focus:ring-2 outline-none font-mono font-bold ${
                        pinValidation
                          ? pinValidation.isValid
                            ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20 text-emerald-950'
                            : 'border-rose-500 focus:ring-rose-500 bg-rose-50/20 text-rose-950'
                          : 'focus:ring-[#4A7B5B]'
                      }`}
                    />
                    {validatingPin && (
                      <div className="absolute right-3 top-3.5">
                        <RefreshCw className="w-4 h-4 text-[#4A7B5B] animate-spin" />
                      </div>
                    )}
                    {pinValidation && pinValidation.isValid && !validatingPin && (
                      <div className="absolute right-3 top-3.5 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Validation Status Message */}
                  {pinValidation && (
                    <div
                      className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        pinValidation.isValid
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 font-medium'
                      }`}
                    >
                      {pinValidation.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>{pinValidation.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: PROGRAM SUMMARY (READ ONLY) */}
        {/* ========================================================================= */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#4A7B5B]" /> Selected Program Offering (Read-Only)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Your application is tied to this specific college, course, and branch offering.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 text-sm space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Target Institution</span>
                <span className="font-black text-gray-900 text-base">
                  {appData?.college?.name || appData?.formData?.preferences?.preferredCollege || "Not Selected (Pending Counselor Guidance)"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Selected Course & Level</span>
                <span className="font-bold text-gray-900">
                  {appData?.course?.name} ({appData?.course?.level || 'Undergraduate'})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 pb-3 gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Branch / Specialization</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full text-xs">
                  {appData?.branch?.name || appData?.branchName || 'Core Specialization'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Admission Session</span>
                <span className="font-mono font-bold text-slate-800">2026-2027</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Need to apply for a different College or Course?</p>
                <p className="text-amber-800 mt-0.5">
                  Each college and course application is an independent ERP entity. You can start a new application from College Discovery anytime. Your free quota (first 3 applications) applies automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DOCUMENTS & FINANCE */}
        {/* ========================================================================= */}
        {activeStep === 4 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Part 1: Dynamic Documents Checklist */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-[#4A7B5B]" /> Required Documents Checklist
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Dynamically determined based on qualification level ({educationLevel}) and student category ({category}).
                  </p>
                </div>

                {progress?.documentChecklist?.summary && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-3 py-1.5 rounded-full ${
                      progress.documentChecklist.summary.isComplete
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {progress.documentChecklist.summary.uploadedCount} of {progress.documentChecklist.summary.totalRequired} Required Uploaded
                    </span>
                  </div>
                )}
              </div>

              {/* Note: Uploaded != Verified & 300 KB limit */}
              <div className="p-3.5 rounded-xl bg-[#E8F3EC] border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#4A7B5B] flex-shrink-0" />
                <span>
                  Upload clearly scanned copies or clear photos (max 300 KB per document). Documents will be verified by admission officers during document review.
                </span>
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                {(progress?.documentChecklist?.checklist || []).map((docItem: any) => {
                  const isUploaded = docItem.status === 'UPLOADED' || docItem.status === 'UNDER_VERIFICATION' || docItem.status === 'VERIFIED';
                  const isVerified = docItem.status === 'VERIFIED';
                  const isRejected = docItem.status === 'REJECTED';
                  const isUploading = uploadingDocType === docItem.type;

                  return (
                    <div
                      key={docItem.type}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isVerified
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isUploaded
                          ? 'bg-blue-50/30 border-blue-200'
                          : docItem.isRequired
                          ? 'bg-white border-amber-200 shadow-sm'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{docItem.name}</span>
                          {docItem.isRequired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              Required
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Optional
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : isUploaded
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {docItem.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{docItem.description}</p>
                        {docItem.fileName && (
                          <p className="text-xs text-gray-600 font-mono flex items-center gap-1">
                            📄 {docItem.fileName}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {docItem.fileUrl && (
                          <a
                            href={docItem.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </a>
                        )}

                        {!isReadOnly && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(docItem.type, file, docItem.documentId);
                                }
                              }}
                            />
                            <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4A7B5B] hover:bg-[#3B6349] text-white text-xs font-bold transition-all shadow-sm">
                              {isUploading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5" />
                              )}
                              {isUploaded ? 'Replace' : 'Upload'}
                            </span>
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Part 2: Education Financing & Scholarship Preference */}
            <div className="space-y-4 pt-6 border-t">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" /> Education Financing & Scholarship Preferences
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Do you require financial assistance, government student credit cards, or scholarship opportunities?
                </p>
              </div>

              {/* Preference Radio Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'DIRECT_PAYMENT',
                    title: 'Self Payment / Direct',
                    desc: 'I will pay institution fees directly without loans or credit cards.',
                  },
                  {
                    id: 'STATE_SCHEME',
                    title: 'State Student Credit Scheme',
                    desc: 'Explore Bihar BSCC/DRCC, WB SCC, or Jharkhand GSCC financing.',
                  },
                  {
                    id: 'SCHOLARSHIP',
                    title: 'Scholarship Opportunities',
                    desc: 'Consider me for institutional and government merit scholarships.',
                  },
                  {
                    id: 'BOTH',
                    title: 'Both (Finance Scheme + Scholarship)',
                    desc: 'Connect with both state credit schemes and scholarship assistance.',
                  },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => !isReadOnly && setFinancePreference(opt.id as any)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      financePreference === opt.id
                        ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900">{opt.title}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        financePreference === opt.id ? 'border-[#4A7B5B] bg-[#4A7B5B]' : 'border-gray-300'
                      }`}>
                        {financePreference === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </div>
                ))}
              </div>

              {/* Dynamic State Scheme Selection if STATE_SCHEME or BOTH */}
              {(financePreference === 'STATE_SCHEME' || financePreference === 'BOTH') && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      Eligible Schemes for {selectedStateId || 'Your State'}
                    </h4>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Centralized Scheme Master
                    </span>
                  </div>

                  <div className="space-y-3">
                    {financeSchemes.map((scheme) => (
                      <div
                        key={scheme.id}
                        onClick={() => !isReadOnly && setSelectedSchemeId(scheme.id)}
                        className={`p-4 rounded-xl border bg-white cursor-pointer transition-all space-y-2 ${
                          selectedSchemeId === scheme.id
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-sm text-gray-900">{scheme.schemeName}</span>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Up to ₹{(scheme.maximumFinancing / 100000).toFixed(1)} Lakhs
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{scheme.description}</p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 pt-1">
                          <span><strong>Interest:</strong> {scheme.interestRate}</span>
                          <span>•</span>
                          <span><strong>Moratorium:</strong> {scheme.moratoriumPeriod}</span>
                        </div>
                        {scheme.officialUrl && (
                          <a
                            href={scheme.officialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline pt-1"
                          >
                            Official Guidelines <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scholarship Remarks */}
              {(financePreference === 'SCHOLARSHIP' || financePreference === 'BOTH') && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Scholarship Preference & Remarks (Family Income, Merit, Special Category)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReadOnly}
                    value={scholarshipRemarks}
                    onChange={(e) => setScholarshipRemarks(e.target.value)}
                    placeholder="e.g. Seeking tuition fee waiver under merit criteria. Family annual income is under ₹2.5 LPA."
                    className="w-full p-2.5 border rounded-xl bg-white text-xs outline-none focus:ring-2 focus:ring-[#4A7B5B]"
                  />
                </div>
              )}
            </div>

            {/* Part 3: Fee & Quota Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">Application Fee & Quota Check</h4>
                  <p className="text-xs text-slate-400">
                    {isNextFree
                      ? `First 3 applications are ₹0 Free. You have ${freeRemaining} free remaining.`
                      : 'Standard application submission fee.'}
                  </p>
                </div>
                <span className="text-xl font-black text-amber-400">
                  {isNextFree ? '₹0 FREE' : appliedCoupon ? `₹${appliedCoupon.finalAmount}` : '₹1,500'}
                </span>
              </div>

              {!isNextFree && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <CouponApplyWidget
                    transactionAmount={1500}
                    applicableScope="APPLICATION_FEE"
                    collegeId={appData?.collegeId}
                    courseId={appData?.courseId}
                    appliedCoupon={appliedCoupon}
                    onCouponApplied={(c) => setAppliedCoupon(c)}
                    onCouponRemoved={() => setAppliedCoupon(null)}
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="feePaidCheckbox"
                      checked={isFeePaidLocally}
                      onChange={(e) => setIsFeePaidLocally(e.target.checked)}
                      className="w-4 h-4 rounded text-[#4A7B5B]"
                    />
                    <label htmlFor="feePaidCheckbox" className="text-xs text-slate-300 cursor-pointer">
                      I authorize processing of application fee of {appliedCoupon ? `₹${appliedCoupon.finalAmount}` : '₹1,500'}
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: DECLARATION & FINAL REVIEW */}
        {/* ========================================================================= */}
        {activeStep === 5 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#4A7B5B]" /> Application Review & Declaration
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Carefully review all 4 application sections and accept the statutory declarations before final submission.
              </p>
            </div>

            {/* Comprehensive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Student Profile */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                  <span>Student Profile</span>
                  <button onClick={() => setActiveStep(1)} className="text-[#4A7B5B] hover:underline text-xs font-bold">Edit</button>
                </h4>
                <p><strong>Name:</strong> {fullName || 'Not provided'}</p>
                <p><strong>Category:</strong> {category}</p>
                <p><strong>Gender:</strong> {gender || 'Not provided'}</p>
                <p><strong>DOB:</strong> {dob || 'Not provided'}</p>
                <p><strong>Mobile:</strong> {mobile}</p>
                <p><strong>Email:</strong> {email}</p>
                {parentMobile && <p><strong>Parent Mobile:</strong> {parentMobile}</p>}
                {parentEmail && <p><strong>Parent Email:</strong> {parentEmail}</p>}
              </div>

              {/* Card 2: Academic & Address Profile */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                  <span>Academic & Address</span>
                  <button onClick={() => setActiveStep(2)} className="text-[#4A7B5B] hover:underline text-xs font-bold">Edit</button>
                </h4>
                <p><strong>Qualifying Level:</strong> {educationLevel}</p>
                <p><strong>10th:</strong> {tenthBoard} ({tenthMarks}%) • {tenthPassingYear}</p>
                {educationLevel !== '10th' && (
                  <p><strong>12th:</strong> {twelfthBoard} ({twelfthStream}) • {twelfthMarks}% • {twelfthPassingYear}</p>
                )}
                {(hasDiploma || educationLevel === 'Diploma') && (
                  <p><strong>Diploma:</strong> {diplomaCourse} ({diplomaPercentage}%) • {diplomaPassingYear}</p>
                )}
                <p className="border-t pt-1"><strong>Address:</strong> {streetAddress || 'Not provided'}, {selectedDistrictId || ''}, {selectedStateId || ''} - {pincode}</p>
              </div>

              {/* Card 3: Target Offering */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 border-b pb-1 text-sm">
                  Program Offering (Read-Only)
                </h4>
                <p><strong>College:</strong> {appData?.college?.name}</p>
                <p><strong>Course:</strong> {appData?.course?.name}</p>
                <p><strong>Specialization:</strong> {appData?.branch?.name || appData?.branchName || 'Core'}</p>
                <p><strong>Academic Session:</strong> 2026-2027</p>
              </div>

              {/* Card 4: Documents & Finance Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 border-b pb-1 text-sm flex items-center justify-between">
                  <span>Documents & Finance</span>
                  <button onClick={() => setActiveStep(4)} className="text-[#4A7B5B] hover:underline text-xs font-bold">Edit</button>
                </h4>
                <p>
                  <strong>Documents:</strong> {progress?.documentChecklist?.summary?.uploadedCount || 0} of {progress?.documentChecklist?.summary?.totalRequired || 0} required uploaded
                </p>
                <p>
                  <strong>Finance Scheme:</strong> {financePreference === 'DIRECT_PAYMENT' ? 'Direct Self Payment' : financePreference === 'STATE_SCHEME' ? `State Scheme (${selectedSchemeId || 'Selected'})` : financePreference === 'SCHOLARSHIP' ? 'Scholarship Consideration' : 'Scheme + Scholarship'}
                </p>
                <p>
                  <strong>Fee Settlement:</strong> <span className="font-bold text-emerald-700">{isNextFree ? '₹0 FREE (3 Free Applications Quota)' : appliedCoupon ? `₹${appliedCoupon.finalAmount}` : '₹1,500'}</span>
                </p>
              </div>
            </div>

            {/* Legal Declarations & Consents */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#4A7B5B]" /> Statutory Declarations & Legal Consents
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Please read and accept all statutory declarations and consent agreements to complete your submission.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Privacy Policy */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 hover:border-emerald-300 transition-colors">
                  <input
                    type="checkbox"
                    id="privacyCheckbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="privacyCheckbox" className="text-xs text-gray-700 cursor-pointer">
                    <span className="font-bold text-gray-900">Privacy Policy Agreement (Version v1.2) <span className="text-rose-500">*</span></span>
                    <p className="text-gray-500 mt-0.5">
                      I have read and consent to Swayam Admission's Privacy Policy regarding data storage, admission processing, and secure communication.
                    </p>
                  </label>
                </div>

                {/* 2. Terms & Conditions */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 hover:border-emerald-300 transition-colors">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="termsCheckbox" className="text-xs text-gray-700 cursor-pointer">
                    <span className="font-bold text-gray-900">Terms & Conditions of Admission (Version v2.0) <span className="text-rose-500">*</span></span>
                    <p className="text-gray-500 mt-0.5">
                      I agree to the terms governing counseling, quota allocation, document verification, and admission processing rules.
                    </p>
                  </label>
                </div>

                {/* 3. Student Declaration */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 hover:border-emerald-300 transition-colors">
                  <input
                    type="checkbox"
                    id="declarationCheckbox"
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="declarationCheckbox" className="text-xs text-gray-700 cursor-pointer">
                    <span className="font-bold text-gray-900">Authenticity of Information & Documents <span className="text-rose-500">*</span></span>
                    <p className="text-gray-500 mt-0.5">
                      I solemnly affirm that all credentials, marks, certificates, and address details submitted in this application are authentic. I understand that submission of fraudulent data leads to immediate cancellation of admission and statutory reporting.
                    </p>
                  </label>
                </div>

                {/* 4. Verification Consent */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 hover:border-emerald-300 transition-colors">
                  <input
                    type="checkbox"
                    id="verifyCheckbox"
                    checked={verificationConsent}
                    onChange={(e) => setVerificationConsent(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="verifyCheckbox" className="text-xs text-gray-700 cursor-pointer">
                    <span className="font-bold text-gray-900">Verification & Institutional Record Check Authorization <span className="text-rose-500">*</span></span>
                    <p className="text-gray-500 mt-0.5">
                      I authorize Swayam Admission and the target college to verify my academic mark sheets, caste certificates, and identity records with examining boards.
                    </p>
                  </label>
                </div>

                {/* 5. Communication Consent */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-start gap-3 hover:border-emerald-300 transition-colors">
                  <input
                    type="checkbox"
                    id="commCheckbox"
                    checked={communicationConsent}
                    onChange={(e) => setCommunicationConsent(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded text-[#4A7B5B] focus:ring-[#4A7B5B] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="commCheckbox" className="text-xs text-gray-700 cursor-pointer">
                    <span className="font-bold text-gray-900">SMS, Email & WhatsApp Counseling Updates <span className="text-rose-500">*</span></span>
                    <p className="text-gray-500 mt-0.5">
                      I consent to receive important application status alerts, counseling schedules, and verification notifications.
                    </p>
                  </label>
                </div>
              </div>
            </div>

            {/* Single Final Submit Trigger Button: Exactly "Submit & Pay" */}
            {!isReadOnly && (
              <div className="pt-6 flex flex-col items-end gap-3">
                {blockingReason && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold max-w-lg animate-fadeIn shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{blockingReason}</span>
                  </div>
                )}
                {paymentNotice && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold max-w-lg animate-fadeIn shadow-2xs">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{paymentNotice}</span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Authoritative Total</span>
                    <span className="text-base font-black text-[#4A7B5B]">
                      {isNextFree ? '₹0 FREE (Quota)' : appliedCoupon ? `₹${appliedCoupon.finalAmount}` : '₹1,500'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleFinalSubmitAndPay}
                    disabled={submitting || paymentProcessing}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#2D5A3C] hover:from-emerald-700 hover:to-[#22442D] text-white font-bold text-sm flex items-center gap-2.5 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting || paymentProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Submit & Pay
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Bottom Stepper Controls (Next / Prev / Save Draft) */}
        <div className="pt-6 border-t flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={activeStep === 1}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={() => handleSaveDraft(`Step ${activeStep}`)}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#4A7B5B] text-[#4A7B5B] hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </button>
            )}

            {activeStep < 5 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#4A7B5B] hover:bg-[#3B6349] text-white text-xs font-bold transition-all shadow-md"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. Authoritative Payment Gateway Modal (for > ₹0 payable) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#4A7B5B] flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Submit & Pay Application Fee</h3>
                  <p className="text-[11px] text-gray-500">Secure Central Admission Payment Gateway</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelPayment}
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Application & Program Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Application Code:</span>
                <span className="font-mono font-bold text-slate-900">{appData?.applicationNumber || appData?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target College:</span>
                <span className="font-bold text-slate-900 text-right truncate max-w-[220px]">{appData?.college?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Program:</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[220px]">{appData?.course?.name}</span>
              </div>
            </div>

            {/* Fee Breakdown Table */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Base Application Fee:</span>
                <span className="font-semibold">₹{(pendingPaymentInfo?.baseFee || 1500).toLocaleString()}</span>
              </div>
              {(appliedCoupon || (pendingPaymentInfo?.discountAmount ?? 0) > 0) && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}:</span>
                  <span className="font-bold">-₹{(pendingPaymentInfo?.discountAmount ?? appliedCoupon?.discountAmount ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-emerald-200 flex justify-between items-center">
                <span className="font-bold text-gray-900 text-sm">Net Payable Amount:</span>
                <span className="font-black text-xl text-[#4A7B5B]">
                  ₹{(pendingPaymentInfo?.payableAmount ?? (appliedCoupon ? appliedCoupon.finalAmount : 1500) ?? 1500).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI / QR', icon: '📱' },
                  { id: 'DEBIT_CARD', label: 'Cards', icon: '💳' },
                  { id: 'NET_BANKING', label: 'Net Banking', icon: '🏦' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(pm.id)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedPaymentMethod === pm.id
                        ? 'border-[#4A7B5B] bg-emerald-50/70 text-[#4A7B5B] font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{pm.icon}</div>
                    <div className="text-xs">{pm.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={paymentProcessing}
                className="w-1/3 py-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel / Pay Later
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={paymentProcessing}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-[#2D5A3C] hover:from-emerald-700 hover:to-[#22442D] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {paymentProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Pay ₹{(pendingPaymentInfo?.payableAmount ?? (appliedCoupon ? appliedCoupon.finalAmount : 1500) ?? 1500).toLocaleString()} & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ApplicationWorkflowForm;
