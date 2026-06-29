"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Upload,
  Eye,
  Trash2,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";
import {
  createBusiness,
  getBusinessDetail,
  updateBusiness,
  deleteBusinessAttachment,
  validateBusinessUniqueness,
  getRegistrationOptions,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  confirmRegistration,
  getBusinessOptions,
  getMyBusinessProfile,
  sendBusinessProfileEmailOtp,
  verifyBusinessProfileEmailOtp,
  updateMyBusinessProfile,
  getAccessToken,
  checkEmailExists,
  type BusinessTypeCatalogItem,
} from "../services/api";
import { IndustrySearchSelect } from "./IndustrySearchSelect";
import { SearchSelect } from "./SearchSelect";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useAddress } from "../hooks/useAddress";
import { LocalizedDateInput } from "./LocalizedDateInput";

export interface CreateEnterpriseProps {
  businessTypes: string[];
  businessTypeOptions?: BusinessTypeCatalogItem[];
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  mode?: "create" | "edit" | "view";
  enterpriseId?: number;
  isRegistration?: boolean;
  isProfileEdit?: boolean;
  onProfileSavingChange?: (isSaving: boolean) => void;
}

interface AttachmentState {
  file: File | null;
  name: string;
  url: string;
  id?: number;
}

export const CreateEnterprise: React.FC<CreateEnterpriseProps> = ({
  businessTypes,
  businessTypeOptions = [],
  onSave,
  onCancel,
  showToast,
  mode = "create",
  enterpriseId,
  isRegistration = false,
  isProfileEdit = false,
  onProfileSavingChange,
}) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountModalData, setAccountModalData] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const isReadOnly = mode === "view";

  const [types, setTypes] = useState<string[]>(businessTypes || []);
  const [typeOptions, setTypeOptions] =
    useState<BusinessTypeCatalogItem[]>(businessTypeOptions);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpTimer, setOtpTimer] = useState(300);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  // States for Profile Edit Email Change
  const [showProfileOtpModal, setShowProfileOtpModal] = useState(false);
  const [showNewEmailModal, setShowNewEmailModal] = useState(false);
  const [newEmailValue, setNewEmailValue] = useState("");
  const [newEmailError, setNewEmailError] = useState("");
  const [isSavingNewEmail, setIsSavingNewEmail] = useState(false);

  useEffect(() => {
    if (!types.length || !typeOptions.length) {
      const fetchOptions = async () => {
        try {
          const isTokenPresent = getAccessToken();
          const res = isTokenPresent
            ? await getBusinessOptions()
            : await getRegistrationOptions();

          if (res.success && res.data?.businessTypes) {
            setTypes(res.data.businessTypes);
            setTypeOptions(res.data.businessTypeOptions || []);
          }
        } catch (err) {
          showToast(
            err instanceof Error
              ? err.message
              : "Không thể tải danh sách loại hình doanh nghiệp",
            "error",
          );
        }
      };
      fetchOptions();
    }
  }, [types.length, typeOptions.length, showToast]);

  useEffect(() => {
    if (businessTypes && businessTypes.length > 0) {
      setTypes(businessTypes);
    }
    if (businessTypeOptions.length > 0) {
      setTypeOptions(businessTypeOptions);
    }
  }, [businessTypes, businessTypeOptions]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((showOtpModal || showProfileOtpModal) && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, showProfileOtpModal, otpTimer]);

  // Form Fields State
  const [formData, setFormData] = useState({
    businessName: "",
    taxCode: "",
    businessType: "",
    businessTypeId: 0,
    industryCode: "",
    industryName: "",
    industryId: 0,
    licenseIssueDate: "",
    provinceCity: "",
    wardCommune: "",
    address: "",
    foreignName: "",
    email: "",
    agencyPhone: "",
    operatingProvinceCity: "",
    operatingWardCommune: "",
    businessLocation: "",
    representativeName: "",
    representativePhone: "",
    isActive: true,
  });

  const registeredAddress = useAddress(formData.provinceCity);
  const operatingAddress = useAddress(formData.operatingProvinceCity);

  useEffect(() => {
    const err =
      registeredAddress.provincesError ||
      registeredAddress.wardsError ||
      operatingAddress.provincesError ||
      operatingAddress.wardsError;
    if (err) {
      showToast(err, "error");
    }
  }, [
    registeredAddress.provincesError,
    registeredAddress.wardsError,
    operatingAddress.provincesError,
    operatingAddress.wardsError,
    showToast,
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localEnterpriseId, setLocalEnterpriseId] = useState<
    number | undefined
  >(enterpriseId);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

  // Attachments State
  const [attachments, setAttachments] = useState<
    Record<string, AttachmentState>
  >({
    gpkd: { file: null, name: "", url: "" },
    gtk: { file: null, name: "", url: "" },
  });

  useEffect(() => {
    if (isProfileEdit) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const res = await getMyBusinessProfile();
          if (res.success && res.data) {
            const ent = res.data;
            setFormData({
              businessName: ent.businessName || "",
              taxCode: ent.taxCode || "",
              businessType: ent.businessType || "",
              businessTypeId: ent.businessTypeId || 0,
              industryCode: ent.industryCode || "",
              industryName: ent.industryName || "",
              industryId: ent.industryId || 0,
              licenseIssueDate: ent.licenseIssueDate || "",
              provinceCity: ent.provinceCity || "",
              wardCommune: ent.wardCommune || "",
              address: ent.address || "",
              foreignName: ent.foreignName || "",
              email: ent.email || "",
              agencyPhone: ent.agencyPhone || "",
              operatingProvinceCity:
                ent.operatingProvinceCity || ent.provinceCity || "",
              operatingWardCommune:
                ent.operatingWardCommune || ent.wardCommune || "",
              businessLocation: ent.businessLocation || "",
              representativeName: ent.representativeName || "",
              representativePhone: ent.representativePhone || "",
              isActive: ent.isActive ?? true,
            });
            if (ent.id) {
              setLocalEnterpriseId(ent.id);
            }

            // Map attachments
            const nextAttachments: Record<string, AttachmentState> = {
              gpkd: { file: null, name: "", url: "" },
              gtk: { file: null, name: "", url: "" },
            };

            if (ent.attachments && ent.attachments.length > 0) {
              ent.attachments.forEach((att) => {
                if (att.displayName === "Giấy phép kinh doanh") {
                  nextAttachments.gpkd = {
                    file: null,
                    name: att.originalName,
                    url: att.fileUrl,
                    id: att.id,
                  };
                } else if (att.displayName === "Giấy tờ khác") {
                  nextAttachments.gtk = {
                    file: null,
                    name: att.originalName,
                    url: att.fileUrl,
                    id: att.id,
                  };
                }
              });
            }
            setAttachments(nextAttachments);
          } else {
            showToast("Không thể tải chi tiết doanh nghiệp", "error");
          }
        } catch (error) {
          showToast(
            error instanceof Error ? error.message : "Tải chi tiết thất bại",
            "error",
          );
        } finally {
          setIsLoadingDetails(false);
        }
      };

      fetchDetails();
    } else if ((mode === "edit" || mode === "view") && enterpriseId) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const res = await getBusinessDetail(enterpriseId);
          if (res.success && res.data) {
            const ent = res.data;
            setFormData({
              businessName: ent.businessName || "",
              taxCode: ent.taxCode || "",
              businessType: ent.businessType || "",
              businessTypeId: ent.businessTypeId || 0,
              industryCode: ent.industryCode || "",
              industryName: ent.industryName || "",
              industryId: ent.industryId || 0,
              licenseIssueDate: ent.licenseIssueDate || "",
              provinceCity: ent.provinceCity || "",
              wardCommune: ent.wardCommune || "",
              address: ent.address || "",
              foreignName: ent.foreignName || "",
              email: ent.email || "",
              agencyPhone: ent.agencyPhone || "",
              operatingProvinceCity:
                ent.operatingProvinceCity || ent.provinceCity || "",
              operatingWardCommune:
                ent.operatingWardCommune || ent.wardCommune || "",
              businessLocation: ent.businessLocation || "",
              representativeName: ent.representativeName || "",
              representativePhone: ent.representativePhone || "",
              isActive: ent.isActive ?? true,
            });
            if (ent.id) {
              setLocalEnterpriseId(ent.id);
            }

            // Map attachments
            const nextAttachments: Record<string, AttachmentState> = {
              gpkd: { file: null, name: "", url: "" },
              gtk: { file: null, name: "", url: "" },
            };

            if (ent.attachments && ent.attachments.length > 0) {
              ent.attachments.forEach((att) => {
                if (att.displayName === "Giấy phép kinh doanh") {
                  nextAttachments.gpkd = {
                    file: null,
                    name: att.originalName,
                    url: att.fileUrl,
                    id: att.id,
                  };
                } else if (att.displayName === "Giấy tờ khác") {
                  nextAttachments.gtk = {
                    file: null,
                    name: att.originalName,
                    url: att.fileUrl,
                    id: att.id,
                  };
                }
              });
            }
            setAttachments(nextAttachments);
          } else {
            showToast("Không thể tải chi tiết doanh nghiệp", "error");
          }
        } catch (error) {
          showToast(
            error instanceof Error ? error.message : "Tải chi tiết thất bại",
            "error",
          );
        } finally {
          setIsLoadingDetails(false);
        }
      };

      fetchDetails();
    }
  }, [mode, enterpriseId, isProfileEdit]);

  // File Upload Reference and Target
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Realtime validation for specific fields
    if (name === "taxCode") {
      const cleanVal = value.replace(/[^0-9-]/g, "");
      setFormData((prev) => ({ ...prev, taxCode: cleanVal }));

      if (!cleanVal) {
        setErrors((prev) => ({
          ...prev,
          taxCode: "Mã số thuế không được để trống",
        }));
      } else if (!/^\d{10}(-\d{3})?$/.test(cleanVal)) {
        setErrors((prev) => ({
          ...prev,
          taxCode: "Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số",
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.taxCode;
          return next;
        });
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Cascading ward changes when province changes
      if (name === "provinceCity") {
        next.wardCommune = "";
      } else if (name === "operatingProvinceCity") {
        next.operatingWardCommune = "";
      }
      return next;
    });

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Upload trigger
  const handleUploadClick = (key: string) => {
    setUploadTarget(key);
    fileInputRef.current?.click();
  };

  // Upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadTarget) return;

    const file = files[0];
    const validMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!validMimeTypes.includes(file.type)) {
      showToast("Chỉ được phép tải lên file PDF, Word hoặc hình ảnh.", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Kích thước tệp đính kèm vượt quá giới hạn 10 MB.", "error");
      return;
    }

    const url = URL.createObjectURL(file);
    setAttachments((prev) => ({
      ...prev,
      [uploadTarget]: {
        file,
        name: file.name,
        url,
      },
    }));
    showToast(`Tải lên tệp ${file.name} thành công!`, "success");
    setUploadTarget(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete attachment trigger confirm modal
  const handleDeleteAttachment = (key: string) => {
    setDeleteConfirmKey(key);
  };

  const executeDeleteAttachment = async (key: string) => {
    const att = attachments[key];
    const targetEnterpriseId = localEnterpriseId || enterpriseId;
    if (att.id && mode === "edit" && targetEnterpriseId) {
      try {
        const response = await deleteBusinessAttachment(
          targetEnterpriseId,
          att.id,
        );
        if (response.success) {
          showToast("Xóa file thành công", "success");
        } else {
          showToast(response.message || "Xóa tệp thất bại", "error");
          return;
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Xóa tệp thất bại",
          "error",
        );
        return;
      }
    } else if (!att.id) {
      showToast("Xóa file thành công", "success");
    }

    setAttachments((prev) => ({
      ...prev,
      [key]: { file: null, name: "", url: "", id: undefined },
    }));
  };

  // Open Preview
  const handlePreviewClick = (key: string) => {
    const item = attachments[key];
    const fileUrl = item.file ? item.url : item.url;
    const fileName = item.name;
    if (fileUrl) {
      const previewUrl = `/department/dashboard/view-document?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`;
      window.open(previewUrl, "_blank");
    }
  };

  // Start the email change flow by verifying the current email first
  const handleStartEmailChange = async () => {
    if (isSavingNewEmail) return;

    setNewEmailValue("");
    setNewEmailError("");
    setIsSavingNewEmail(true);
    try {
      const res = await sendBusinessProfileEmailOtp();
      if (res.success) {
        showToast(res.message || "Đã gửi mã OTP về email hiện tại", "success");
        setOtpValue("");
        setOtpTimer(res.data?.expiresInSeconds || 300);
        setShowProfileOtpModal(true);
      } else {
        throw new Error(res.message || "Gửi mã OTP thất bại");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gửi mã OTP thất bại",
        "error",
      );
    } finally {
      setIsSavingNewEmail(false);
    }
  };

  // Validate and save the new email after the current email has been verified
  const handleSaveNewEmail = async () => {
    const email = newEmailValue.trim();
    if (!email) {
      setNewEmailError("Email không được để trống");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewEmailError("Email không hợp lệ");
      return;
    }
    if (email.toLowerCase() === formData.email.toLowerCase()) {
      setNewEmailError("Email mới phải khác email hiện tại");
      return;
    }
    
    setIsSavingNewEmail(true);
    setNewEmailError("");
    try {
      const res = await checkEmailExists(email);
      if (res.data?.exists) {
        setNewEmailError("Email mới đã tồn tại trên hệ thống, vui lòng kiểm tra lại dữ liệu");
        showToast("Email mới đã tồn tại trên hệ thống, vui lòng kiểm tra lại dữ liệu", "error");
        return;
      }
      setFormData((prev) => ({ ...prev, email }));
      setShowNewEmailModal(false);
      setNewEmailValue("");
      showToast("Thay đổi email tạm thời. Vui lòng hoàn tất chỉnh sửa và ấn Xác nhận chỉnh sửa ở bước 2 để lưu thay đổi.", "success");
    } catch (err) {
      setNewEmailError(err instanceof Error ? err.message : "Kiểm tra email trùng lặp thất bại");
    } finally {
      setIsSavingNewEmail(false);
    }
  };

  // Verify the current email before allowing a new email to be entered
  const handleVerifyProfileOtp = async () => {
    setIsVerifyingOtp(true);
    try {
      const res = await verifyBusinessProfileEmailOtp(otpValue);
      if (res.success) {
        showToast(res.message || "Xác thực OTP thành công", "success");
        setShowProfileOtpModal(false);
        setNewEmailValue("");
        setNewEmailError("");
        setShowNewEmailModal(true);
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Mã OTP không chính xác hoặc đã hết hạn",
        "error",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 1 Validation & Proceed
  const handleNextStep = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Tên doanh nghiệp không được để trống";
    }

    const txCode = formData.taxCode.replace(/\s/g, "");
    if (!txCode) {
      newErrors.taxCode = "Mã số thuế không được để trống";
    } else if (!/^\d{10}(-\d{3})?$/.test(txCode)) {
      newErrors.taxCode =
        "Mã số thuế phải gồm 10 chữ số, hoặc mã đơn vị phụ thuộc dạng 10 số - 3 số. Ví dụ: 0100109106-001";
    }

    if (!formData.businessType) {
      newErrors.businessType = "Vui lòng chọn loại hình kinh doanh";
    }

    if (!formData.industryCode) {
      newErrors.industryCode = "Vui lòng chọn ngành nghề kinh doanh chính";
    }

    if (!formData.licenseIssueDate) {
      newErrors.licenseIssueDate = "Vui lòng chọn ngày cấp GPKD";
    } else {
      const d = new Date(formData.licenseIssueDate);
      if (d.getTime() > Date.now()) {
        newErrors.licenseIssueDate =
          "Ngày cấp GPKD không được lớn hơn ngày hiện tại";
      }
    }

    if (!formData.provinceCity) {
      newErrors.provinceCity = "Vui lòng chọn tỉnh/thành phố ĐKKD";
    }

    if (!formData.wardCommune) {
      newErrors.wardCommune = "Vui lòng chọn phường/xã ĐKKD";
    }

    const email = formData.email.trim();
    if (!email) {
      newErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email không hợp lệ";
    }

    const agencyPhone = formData.agencyPhone.trim();
    if (
      agencyPhone &&
      !/^(0|\+84)(\d{9,10})$/.test(agencyPhone.replace(/\s/g, ""))
    ) {
      newErrors.agencyPhone = "Số điện thoại cơ quan không hợp lệ";
    }

    const representativePhone = formData.representativePhone.trim();
    if (
      representativePhone &&
      !/^(0|\+84)(\d{9,10})$/.test(representativePhone.replace(/\s/g, ""))
    ) {
      newErrors.representativePhone =
        "Số điện thoại liên hệ người đứng đầu không hợp lệ";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      showToast(firstError, "error");
      return;
    }

    if (isRegistration) {
      setIsSubmitting(true);
      try {
        const otpRes = await sendRegistrationOtp({ email, taxCode: txCode });
        if (otpRes.success) {
          setOtpValue("");
          setOtpTimer(300);
          setShowOtpModal(true);
        } else {
          throw new Error(otpRes.message || "Gửi OTP thất bại");
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Gửi OTP thất bại";
        showToast(errorMsg, "error");
        if (errorMsg.includes("Mã số thuế") || errorMsg.includes("MST")) {
          setErrors((prev) => ({ ...prev, taxCode: errorMsg }));
        } else {
          setErrors((prev) => ({ ...prev, email: errorMsg }));
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Check uniqueness through the business domain so this flow does not
    // require permission to view the user-management module.
    if (!isProfileEdit) {
      try {
        await validateBusinessUniqueness({
          taxCode: txCode,
          email,
          businessId: mode === "edit" ? enterpriseId : undefined,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Kiểm tra thông tin doanh nghiệp thất bại";
        const normalizedMessage = message.toLowerCase();

        if (
          normalizedMessage.includes("mã số thuế") ||
          normalizedMessage.includes("tài khoản đăng nhập")
        ) {
          setErrors((prev) => ({ ...prev, taxCode: message }));
        } else if (normalizedMessage.includes("email")) {
          setErrors((prev) => ({ ...prev, email: message }));
        }

        showToast(message, "error");
        return;
      }
    }

    setStep(2);
  };

  // Step 2 Submission to Backend API
  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (isProfileEdit) {
      onProfileSavingChange?.(true);
    }
    try {
      const fd = new FormData();
      fd.append("businessName", formData.businessName.trim());
      if (!isProfileEdit) {
        fd.append("taxCode", formData.taxCode.replace(/\s/g, ""));
      }
      fd.append("businessType", formData.businessType);
      if (formData.businessTypeId > 0) {
        fd.append("businessTypeId", String(formData.businessTypeId));
      }
      fd.append("industryCode", formData.industryCode);
      fd.append("industryName", formData.industryName);
      if (formData.industryId > 0) {
        fd.append("industryId", String(formData.industryId));
      }
      fd.append("licenseIssueDate", formData.licenseIssueDate);
      fd.append("provinceCity", formData.provinceCity);
      fd.append("wardCommune", formData.wardCommune);
      fd.append("address", formData.address.trim());
      fd.append("foreignName", formData.foreignName.trim());
      fd.append("email", formData.email.trim());
      fd.append("agencyPhone", formData.agencyPhone.trim());
      fd.append("operatingProvinceCity", formData.operatingProvinceCity);
      fd.append("operatingWardCommune", formData.operatingWardCommune);
      fd.append("businessLocation", formData.businessLocation.trim());
      fd.append("representativeName", formData.representativeName.trim());
      fd.append("representativePhone", formData.representativePhone.trim());
      if (!isRegistration && !isProfileEdit) {
        fd.append("isActive", String(formData.isActive));
      }

      // Build attachments list and names metadata
      const filesToSend: File[] = [];
      const namesToSend: string[] = [];

      if (attachments.gpkd.file) {
        filesToSend.push(attachments.gpkd.file);
        namesToSend.push("Giấy phép kinh doanh");
      }
      if (attachments.gtk.file) {
        filesToSend.push(attachments.gtk.file);
        namesToSend.push("Giấy tờ khác");
      }

      filesToSend.forEach((file) => {
        fd.append("attachments", file);
      });

      if (namesToSend.length > 0) {
        fd.append("attachmentNames", JSON.stringify(namesToSend));
      }

      if (isProfileEdit) {
        const response = await updateMyBusinessProfile(fd);
        if (response.success) {
          showToast("Cập nhật doanh nghiệp thành công", "success");
          setStep(1);
          await onSave();
        } else {
          throw new Error(response.message || "Cập nhật doanh nghiệp thất bại");
        }
      } else if (isRegistration) {
        const response = await confirmRegistration(fd);
        if (response.success) {
          const accInfo = response.data?.accountInfo || {
            username: formData.taxCode.replace(/\s/g, ""),
            password: "12345678",
          };
          setAccountModalData(accInfo);
        } else {
          throw new Error(
            response.message || "Đăng ký tài khoản doanh nghiệp thất bại",
          );
        }
      } else if (mode === "edit" && enterpriseId) {
        const response = await updateBusiness(enterpriseId, fd);
        if (response.success) {
          showToast("Cập nhật doanh nghiệp thành công", "success");
          await onSave();
        } else {
          throw new Error(response.message || "Cập nhật doanh nghiệp thất bại");
        }
      } else {
        const response = await createBusiness(fd);
        if (response.success) {
          const accInfo = response.data?.accountInfo || {
            username: formData.taxCode.replace(/\s/g, ""),
            password: "12345678",
          };
          setAccountModalData(accInfo);
        } else {
          throw new Error(response.message || "Tạo doanh nghiệp thất bại");
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "";
      showToast(
        errorMsg ||
          (isRegistration
            ? "Đăng ký tài khoản doanh nghiệp thất bại"
            : mode === "edit"
              ? "Cập nhật doanh nghiệp thất bại"
              : "Thêm mới doanh nghiệp thất bại"),
        "error",
      );

      const newErrors: Record<string, string> = {};
      if (
        errorMsg.includes("Mã số thuế") ||
        errorMsg.toLowerCase().includes("taxcode") ||
        errorMsg.includes("đăng nhập")
      ) {
        newErrors.taxCode = errorMsg;
        setStep(1);
      } else if (
        errorMsg.includes("Email") ||
        errorMsg.toLowerCase().includes("email")
      ) {
        newErrors.email = errorMsg;
        setStep(isRegistration ? 1 : 2);
      } else if (
        errorMsg.includes("Tên doanh nghiệp") ||
        errorMsg.toLowerCase().includes("businessname")
      ) {
        newErrors.businessName = errorMsg;
        setStep(1);
      } else if (
        errorMsg.includes("số điện thoại") ||
        errorMsg.includes("Số điện thoại") ||
        errorMsg.includes("SĐT")
      ) {
        newErrors.representativePhone = errorMsg;
        setStep(1);
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }
    } finally {
      setIsSubmitting(false);
      if (isProfileEdit) {
        onProfileSavingChange?.(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between border-t-4 border-emerald-600 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-50 select-none">
          {isRegistration
            ? "Đăng ký tài khoản doanh nghiệp"
            : mode === "view"
              ? "Chi tiết doanh nghiệp"
              : mode === "edit"
                ? "Chỉnh sửa doanh nghiệp"
                : "Thêm mới doanh nghiệp"}
        </h2>
      </div>

      {/* Wizard Step Indicator */}
      {mode !== "view" && (
        <div className="flex items-center w-full gap-4 py-4 select-none bg-transparent border-0 shadow-none">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-blue-600 text-white">
              {step > 1 ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : "1"}
            </div>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Thông tin doanh nghiệp
            </span>
          </div>

          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />

          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2
                  ? "bg-blue-600 text-white"
                  : "bg-slate-400 dark:bg-zinc-800 text-white"
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-bold ${
                step === 2
                  ? "text-zinc-800 dark:text-zinc-200"
                  : "text-slate-400 dark:text-zinc-500"
              }`}
            >
              {isRegistration ? "Xác nhận thông tin" : "Xác nhận chỉnh sửa"}
            </span>
          </div>

          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        </div>
      )}

      {step === 1 ? (
        /* =======================================================
           STEP 1: INPUT INFORMATION
           ======================================================= */
        <div className="flex flex-col gap-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
          />

          <div className="flex-1 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-340px)] pr-2 -mr-2 flex flex-col gap-6 pb-2">
            {/* Section 1: Thông tin doanh nghiệp */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <h3 className="text-sm font-bold text-[#1e3a8a] dark:text-[#93c5fd] uppercase tracking-wider select-none border-b border-zinc-50 dark:border-zinc-900 pb-2 mb-4">
                Thông tin doanh nghiệp
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* Tên doanh nghiệp */}
                <div
                  className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                    errors.businessName
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-zinc-200 dark:border-zinc-800"
                  } ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label
                    className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                      errors.businessName
                        ? "text-red-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    Tên doanh nghiệp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                    placeholder={isReadOnly ? "" : "Nhập tên doanh nghiệp"}
                  />
                </div>

                {/* Mã số thuế */}
                <div
                  className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                    errors.taxCode
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-zinc-200 dark:border-zinc-800"
                  } ${mode === "edit" || isReadOnly || isProfileEdit ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label
                    className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                      errors.taxCode
                        ? "text-red-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    Mã số thuế <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    name="taxCode"
                    value={formData.taxCode}
                    onChange={handleInputChange}
                    disabled={mode === "edit" || isReadOnly || isProfileEdit}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 font-mono disabled:cursor-not-allowed"
                    placeholder={isReadOnly ? "" : "Nhập mã số thuế"}
                  />
                </div>

                {/* Loại hình kinh doanh */}
                <SearchSelect
                  label="Loại hình kinh doanh"
                  value={formData.businessType}
                  options={types.map((t) => ({ value: t, label: t }))}
                  placeholder="Chọn loại hình"
                  onChange={(val) => {
                    const selected = typeOptions.find(
                      (item) => item.name === val,
                    );
                    setFormData((prev) => ({
                      ...prev,
                      businessType: val,
                      businessTypeId:
                        selected?.id && selected.id > 0 ? selected.id : 0,
                    }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.businessType;
                      return next;
                    });
                  }}
                  error={!!errors.businessType}
                  required
                  disabled={isReadOnly}
                />

                {/* Ngành nghề kinh doanh chính */}
                <div className="w-full">
                  <IndustrySearchSelect
                    value={formData.industryCode}
                    error={!!errors.industryCode}
                    disabled={isReadOnly}
                    onChange={(code: string, name: string, id?: number) => {
                      setFormData((prev) => ({
                        ...prev,
                        industryCode: code,
                        industryName: name,
                        industryId: id && id > 0 ? id : 0,
                      }));
                      if (errors.industryCode) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.industryCode;
                          return next;
                        });
                      }
                    }}
                  />
                </div>

                {/* Ngày cấp GPKD */}
                <div
                  className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                    errors.licenseIssueDate
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-zinc-200 dark:border-zinc-800"
                  } ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : "cursor-pointer"}`}
                >
                  <label
                    className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold pointer-events-none ${
                      errors.licenseIssueDate
                        ? "text-red-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    Ngày cấp GPKD <span className="text-red-500">*</span>
                  </label>
                  <LocalizedDateInput
                    name="licenseIssueDate"
                    value={formData.licenseIssueDate}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    ariaLabel="Ngày cấp GPKD"
                  />
                </div>

                {/* Tỉnh/Thành phố ĐKKD */}
                <SearchSelect
                  label="Tỉnh/Thành phố ĐKKD"
                  value={formData.provinceCity}
                  options={registeredAddress.provinces.map((p) => ({
                    value: p.name,
                    label: p.name,
                  }))}
                  placeholder={
                    registeredAddress.isLoadingProvinces
                      ? "Đang tải danh sách..."
                      : registeredAddress.provincesError
                        ? "Không thể tải danh sách Tỉnh/Thành phố"
                        : "Chọn Tỉnh/Thành phố"
                  }
                  onChange={(val) => handleSelectChange("provinceCity", val)}
                  error={!!errors.provinceCity}
                  required
                  disabled={
                    isReadOnly ||
                    registeredAddress.isLoadingProvinces ||
                    !!registeredAddress.provincesError
                  }
                />

                {/* Phường/Xã ĐKKD */}
                <SearchSelect
                  label="Phường/Xã ĐKKD"
                  value={formData.wardCommune}
                  options={registeredAddress.wards.map((w) => ({
                    value: w.name,
                    label: w.name,
                  }))}
                  placeholder={
                    registeredAddress.isLoadingWards
                      ? "Đang tải phường/xã..."
                      : registeredAddress.wardsError
                        ? "Không thể tải danh sách Phường/Xã"
                        : !formData.provinceCity
                          ? "Vui lòng chọn Tỉnh/Thành phố trước"
                          : registeredAddress.wards.length === 0
                            ? "Không có dữ liệu Phường/Xã"
                            : "Chọn phường/xã"
                  }
                  onChange={(val) => handleSelectChange("wardCommune", val)}
                  error={!!errors.wardCommune}
                  required
                  disabled={
                    !formData.provinceCity ||
                    isReadOnly ||
                    registeredAddress.isLoadingWards ||
                    !!registeredAddress.wardsError ||
                    registeredAddress.wards.length === 0
                  }
                />

                {/* Địa chỉ đăng ký */}
                <div
                  className={`relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 md:col-span-2 xl:col-span-2 ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                    placeholder={
                      isReadOnly ? "" : "Nhập địa chỉ trụ sở đăng ký"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Thông tin liên hệ */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
              <h3 className="text-sm font-bold text-[#1e3a8a] dark:text-[#93c5fd] uppercase tracking-wider select-none border-b border-zinc-50 dark:border-zinc-900 pb-2 mb-4">
                Thông tin liên hệ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {/* Tên tiếng nước ngoài */}
                <div
                  className={`relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                    Tên viết bằng tiếng nước ngoài
                  </label>
                  <input
                    type="text"
                    name="foreignName"
                    value={formData.foreignName}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                    placeholder={
                      isReadOnly ? "" : "Nhập tên viết bằng tiếng nước ngoài"
                    }
                  />
                </div>

                {/* Email */}
                <div
                  className={`relative border rounded-xl px-4 py-2 flex items-center justify-between focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                    errors.email
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-zinc-200 dark:border-zinc-800"
                  } ${isReadOnly || isProfileEdit ? "bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <label
                      className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                        errors.email
                          ? "text-red-500"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isReadOnly || isProfileEdit}
                      className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                      placeholder={isReadOnly ? "" : "vna@gmail.com"}
                    />
                  </div>
                  {isProfileEdit && !isReadOnly && (
                    <button
                      type="button"
                      onClick={handleStartEmailChange}
                      disabled={isSavingNewEmail}
                      className="text-blue-600 hover:text-blue-700 text-xs font-bold transition-colors cursor-pointer select-none pl-2 flex-shrink-0 disabled:cursor-not-allowed disabled:text-zinc-400"
                    >
                      Thay đổi
                    </button>
                  )}
                </div>

                {/* Số điện thoại cơ quan */}
                <div
                  className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                    errors.agencyPhone
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-zinc-200 dark:border-zinc-800"
                  } ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label
                    className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                      errors.agencyPhone
                        ? "text-red-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    Số điện thoại cơ quan
                  </label>
                  <input
                    type="text"
                    name="agencyPhone"
                    value={formData.agencyPhone}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 font-mono disabled:cursor-not-allowed"
                    placeholder={isReadOnly ? "" : "Nhập số điện thoại cơ quan"}
                  />
                </div>

                {/* Tỉnh/TP hoạt động KD */}
                <SearchSelect
                  label="Tỉnh/TP hoạt động KD"
                  value={formData.operatingProvinceCity}
                  options={operatingAddress.provinces.map((p) => ({
                    value: p.name,
                    label: p.name,
                  }))}
                  placeholder={
                    operatingAddress.isLoadingProvinces
                      ? "Đang tải danh sách..."
                      : operatingAddress.provincesError
                        ? "Không thể tải danh sách Tỉnh/Thành phố"
                        : "Chọn Tỉnh/Thành phố"
                  }
                  onChange={(val) =>
                    handleSelectChange("operatingProvinceCity", val)
                  }
                  disabled={
                    isReadOnly ||
                    operatingAddress.isLoadingProvinces ||
                    !!operatingAddress.provincesError
                  }
                />

                {/* Phường/Xã hoạt động KD */}
                <SearchSelect
                  label="Phường/xã hoạt động KD"
                  value={formData.operatingWardCommune}
                  options={operatingAddress.wards.map((w) => ({
                    value: w.name,
                    label: w.name,
                  }))}
                  placeholder={
                    operatingAddress.isLoadingWards
                      ? "Đang tải phường/xã..."
                      : operatingAddress.wardsError
                        ? "Không thể tải danh sách Phường/Xã"
                        : !formData.operatingProvinceCity
                          ? "Vui lòng chọn Tỉnh/Thành phố trước"
                          : operatingAddress.wards.length === 0
                            ? "Không có dữ liệu Phường/Xã"
                            : "Chọn phường/xã"
                  }
                  onChange={(val) =>
                    handleSelectChange("operatingWardCommune", val)
                  }
                  disabled={
                    !formData.operatingProvinceCity ||
                    isReadOnly ||
                    operatingAddress.isLoadingWards ||
                    !!operatingAddress.wardsError ||
                    operatingAddress.wards.length === 0
                  }
                />

                {/* Địa điểm kinh doanh */}
                <div
                  className={`relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                    Địa điểm kinh doanh
                  </label>
                  <input
                    type="text"
                    name="businessLocation"
                    value={formData.businessLocation}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                    placeholder={
                      isReadOnly ? "" : "Nhập địa điểm hoạt động kinh doanh"
                    }
                  />
                </div>

                {/* Người đứng đầu doanh nghiệp */}
                <div
                  className={`relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                    Người đứng đầu doanh nghiệp
                  </label>
                  <input
                    type="text"
                    name="representativeName"
                    value={formData.representativeName}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                    placeholder={isReadOnly ? "" : "Nhập tên người đứng đầu"}
                  />
                </div>

                {/* SĐT liên hệ người đứng đầu */}
                <div
                  className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                    errors.representativePhone
                      ? "border-red-500 ring-1 ring-red-500"
                      : "border-zinc-200 dark:border-zinc-800"
                  } ${isReadOnly ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                >
                  <label
                    className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                      errors.representativePhone
                        ? "text-red-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    SĐT liên hệ người đứng đầu
                  </label>
                  <input
                    type="text"
                    name="representativePhone"
                    value={formData.representativePhone}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 font-mono disabled:cursor-not-allowed"
                    placeholder={isReadOnly ? "" : "Nhập số điện thoại"}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: File đính kèm */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-[#1e3a8a] dark:text-[#93c5fd] uppercase tracking-wider select-none border-b border-zinc-50 dark:border-zinc-900 pb-2 mb-4">
                File đính kèm
              </h3>

              <div className="overflow-x-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-zinc-150 dark:border-zinc-800 select-none text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="p-3.5">Tên file</th>
                      <th className="p-3.5">Thông tin file</th>
                      <th className="p-3.5 w-32 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* GPKD File Row */}
                    <tr className="border-b border-zinc-100 dark:border-zinc-850 text-xs font-semibold text-zinc-700 dark:text-zinc-350">
                      <td className="p-3.5 font-bold">Giấy phép kinh doanh</td>
                      <td className="p-3.5 font-mono text-zinc-500">
                        {attachments.gpkd.name || "Chưa tải lên file"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              (attachments.gpkd.file || attachments.gpkd.url) &&
                              handlePreviewClick("gpkd")
                            }
                            disabled={
                              !attachments.gpkd.file && !attachments.gpkd.url
                            }
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-green-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                            title="Xem file"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          {mode !== "view" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUploadClick("gpkd")}
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-blue-600 cursor-pointer transition-all"
                                title="Tải lên file"
                              >
                                <Upload className="w-4.5 h-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  (attachments.gpkd.file ||
                                    attachments.gpkd.url) &&
                                  handleDeleteAttachment("gpkd")
                                }
                                disabled={
                                  !attachments.gpkd.file &&
                                  !attachments.gpkd.url
                                }
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                                title="Xóa file"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* GTK File Row */}
                    <tr className="text-xs font-semibold text-zinc-700 dark:text-zinc-350">
                      <td className="p-3.5 font-bold">Giấy tờ khác</td>
                      <td className="p-3.5 font-mono text-zinc-500">
                        {attachments.gtk.name || "Chưa tải lên file"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              (attachments.gtk.file || attachments.gtk.url) &&
                              handlePreviewClick("gtk")
                            }
                            disabled={
                              !attachments.gtk.file && !attachments.gtk.url
                            }
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-green-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                            title="Xem file"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          {mode !== "view" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUploadClick("gtk")}
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-blue-600 cursor-pointer transition-all"
                                title="Tải lên file"
                              >
                                <Upload className="w-4.5 h-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  (attachments.gtk.file ||
                                    attachments.gtk.url) &&
                                  handleDeleteAttachment("gtk")
                                }
                                disabled={
                                  !attachments.gtk.file && !attachments.gtk.url
                                }
                                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                                title="Xóa file"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div
            className={`sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 z-40 flex items-center justify-end gap-6 border-t border-zinc-200 dark:border-zinc-800 p-4 md:py-5 md:px-6 rounded-b-[24px] select-none font-bold text-sm ${
              isRegistration
                ? "bg-slate-50 dark:bg-zinc-900"
                : "bg-white dark:bg-zinc-950"
            }`}
          >
            {mode === "view" ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Đóng
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* =======================================================
           STEP 2: CONFIRM INFORMATION
           ======================================================= */
        <div className="flex flex-col gap-6">
          <div className="flex-1 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-340px)] pr-2 -mr-2 flex flex-col gap-6 pb-2">
            {/* Card Thông tin hồ sơ */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
              <h3 className="text-sm font-bold text-[#1e3a8a] dark:text-[#93c5fd] uppercase tracking-wider select-none border-b border-zinc-50 dark:border-zinc-900 pb-2 mb-4">
                Thông tin hồ sơ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-y-4 gap-x-10 text-sm">
                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Mã số thuế :
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.taxCode}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Tên doanh nghiệp :
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.businessName}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Tên viết bằng tiếng nước ngoài :
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.foreignName || "-"}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Ngày cấp GPKD:
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.licenseIssueDate
                    ? formData.licenseIssueDate.split("-").reverse().join("/")
                    : "-"}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Email
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.email}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Loại hình kinh doanh:
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.businessType}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Ngành nghề kinh doanh
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.industryCode
                    ? `${formData.industryCode} - ${formData.industryName}`
                    : "-"}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Địa chỉ đăng ký giấy phép kinh doanh :
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {[
                    formData.address,
                    formData.wardCommune,
                    formData.provinceCity,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Địa điểm kinh doanh :
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {[
                    formData.businessLocation,
                    formData.operatingWardCommune || formData.wardCommune,
                    formData.operatingProvinceCity || formData.provinceCity,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  Người đứng đầu doanh nghiệp
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.representativeName || "-"}
                </div>

                <div className="font-semibold text-[#333333] dark:text-zinc-300">
                  SĐT người đứng đầu
                </div>
                <div className="font-medium text-[#333333] dark:text-zinc-200">
                  {formData.representativePhone || "-"}
                </div>
              </div>
            </div>

            {/* Attachments Preview List */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="overflow-x-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-zinc-150 dark:border-zinc-800 select-none text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="p-3.5">Tên file</th>
                      <th className="p-3.5">Thông tin file</th>
                      <th className="p-3.5 w-24 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-100 dark:border-zinc-850 text-xs font-semibold text-zinc-700 dark:text-zinc-350">
                      <td className="p-3.5 font-bold">Giấy phép kinh doanh</td>
                      <td className="p-3.5 font-mono text-zinc-500">
                        {attachments.gpkd.name || "Không đính kèm"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              (attachments.gpkd.file || attachments.gpkd.url) &&
                              handlePreviewClick("gpkd")
                            }
                            disabled={
                              !attachments.gpkd.file && !attachments.gpkd.url
                            }
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-slate-400 hover:text-green-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                            title="Xem file"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr className="text-xs font-semibold text-zinc-700 dark:text-zinc-350">
                      <td className="p-3.5 font-bold">Giấy tờ khác</td>
                      <td className="p-3.5 font-mono text-zinc-500">
                        {attachments.gtk.name || "Không đính kèm"}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              (attachments.gtk.file || attachments.gtk.url) &&
                              handlePreviewClick("gtk")
                            }
                            disabled={
                              !attachments.gtk.file && !attachments.gtk.url
                            }
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-slate-400 hover:text-green-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-all"
                            title="Xem file"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div
            className={`sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 z-40 flex items-center justify-end gap-6 border-t border-zinc-200 dark:border-zinc-800 p-4 md:py-5 md:px-6 rounded-b-[24px] select-none font-bold text-sm ${
              isRegistration
                ? "bg-slate-50 dark:bg-zinc-900"
                : "bg-white dark:bg-zinc-950"
            }`}
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trở về
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {accountModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[20px] w-full max-w-[420px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header màu xanh */}
            <div className="bg-blue-600 dark:bg-blue-700 text-white py-4 text-center font-bold text-lg select-none tracking-wide">
              Thông tin tài khoản
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
              <ul className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-350">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                  <span>
                    Tài khoản:{" "}
                    <strong className="text-zinc-900 dark:text-white font-extrabold">
                      {accountModalData.username}
                    </strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                  <span>
                    Mật khẩu:{" "}
                    <strong className="text-zinc-900 dark:text-white font-extrabold">
                      {accountModalData.password}
                    </strong>
                  </span>
                </li>
              </ul>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setAccountModalData(null);
                    onSave(); // Đóng popup và đóng màn hình đăng ký quay lại danh sách
                  }}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountModalData(null);
                    showToast("Khai báo thành công", "success");
                    onSave(); // Đóng popup, đóng màn hình và refresh danh sách
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div
            onClick={() => setShowOtpModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[24px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-8 gap-6">
            {/* Title */}
            <div className="flex flex-col gap-2 items-center text-center">
              <h3 className="text-[#2563eb] text-xl font-extrabold tracking-wide uppercase">
                Xác thực email
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed max-w-[320px]">
                Chúng tôi đã gửi mã xác minh qua số email <br />
                <strong className="text-zinc-900 dark:text-zinc-200 font-extrabold break-all">
                  {formData.email}
                </strong>{" "}
                <br />
                Bạn vui lòng kiểm tra và điền mã xác thực
              </p>
            </div>

            {/* OTP Input Field */}
            <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all">
              <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                OTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="otp"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-base font-bold text-center tracking-[0.5em] pt-2 pb-0.5"
                placeholder="------"
              />
            </div>

            {/* Timer and Resend Prompt */}
            <div className="flex flex-col gap-1.5 items-center select-none text-xs font-bold">
              <span className="text-[#2563eb] text-sm">
                {Math.floor(otpTimer / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(otpTimer % 60).toString().padStart(2, "0")}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">
                Chưa nhận được mã?{" "}
                <button
                  type="button"
                  disabled={otpTimer > 0 || isResendingOtp}
                  onClick={async () => {
                    setIsResendingOtp(true);
                    try {
                      const res = await sendRegistrationOtp({
                        email: formData.email,
                        taxCode: formData.taxCode,
                      });
                      if (res.success) {
                        showToast(
                          res.message || "Đã gửi lại mã OTP thành công",
                          "success",
                        );
                        setOtpTimer(300);
                        setOtpValue("");
                      } else {
                        throw new Error(res.message);
                      }
                    } catch (err) {
                      showToast(
                        err instanceof Error
                          ? err.message
                          : "Gửi lại OTP thất bại",
                        "error",
                      );
                    } finally {
                      setIsResendingOtp(false);
                    }
                  }}
                  className={`underline cursor-pointer ${
                    otpTimer > 0
                      ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed no-underline"
                      : "text-[#2563eb] hover:text-[#1d4ed8]"
                  }`}
                >
                  Gửi lại
                </button>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={isVerifyingOtp || otpValue.length < 6}
                onClick={async () => {
                  setIsVerifyingOtp(true);
                  try {
                    const res = await verifyRegistrationOtp({
                      email: formData.email,
                      otp: otpValue,
                    });
                    if (res.success) {
                      showToast(
                        res.message || "Xác thực OTP thành công",
                        "success",
                      );
                      setShowOtpModal(false);
                      setStep(2); // Advance to the confirmation step!
                    } else {
                      throw new Error(res.message);
                    }
                  } catch (err) {
                    showToast(
                      err instanceof Error
                        ? err.message
                        : "Mã OTP không chính xác hoặc đã hết hạn",
                      "error",
                    );
                  } finally {
                    setIsVerifyingOtp(false);
                  }
                }}
                className="w-full py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm shadow-md shadow-blue-500/10 active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xác nhận...</span>
                  </>
                ) : (
                  "Xác nhận"
                )}
              </button>

              <button
                type="button"
                disabled={isVerifyingOtp}
                onClick={() => setShowOtpModal(false)}
                className="w-full py-3 text-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-sm cursor-pointer transition-colors active:scale-99 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div
            onClick={() => setShowProfileOtpModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[32px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-8 gap-6">
            {/* Title */}
            <div className="flex flex-col gap-2 items-center text-center">
              <h3 className="text-[#2563eb] text-xl md:text-2xl font-black uppercase tracking-tight">
                THAY ĐỔI EMAIL
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed">
                Chúng tôi đã gửi mã xác minh qua số email cũ <br />
                <strong className="text-zinc-900 dark:text-zinc-100 font-extrabold text-base my-0.5 block break-all">
                  {formData.email}
                </strong>
                <span>Bạn vui lòng kiểm tra và điền mã xác thực</span>
              </p>
            </div>

            {/* OTP Input Field */}
            <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all">
              <label className="absolute -top-2.5 left-4 bg-white dark:bg-zinc-950 px-1 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                OTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="otp"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-lg font-bold text-center tracking-[0.5em] py-2 placeholder:font-normal placeholder:tracking-[0.4em] placeholder:text-zinc-400"
                placeholder="- - - - - -"
              />
            </div>

            {/* Timer and Resend Prompt */}
            <div className="flex flex-col gap-1 items-center select-none text-sm font-medium">
              <span className="text-[#2563eb] text-xl font-extrabold tracking-tight">
                {Math.floor(otpTimer / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(otpTimer % 60).toString().padStart(2, "0")}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">
                Chưa nhận được mã?{" "}
                <button
                  type="button"
                  disabled={otpTimer > 0 || isResendingOtp}
                  onClick={async () => {
                    setIsResendingOtp(true);
                    try {
                      const res = await sendBusinessProfileEmailOtp();
                      if (res.success) {
                        showToast(
                          res.message || "Đã gửi lại mã OTP thành công",
                          "success",
                        );
                        setOtpTimer(300);
                        setOtpValue("");
                      } else {
                        throw new Error(res.message);
                      }
                    } catch (err) {
                      showToast(
                        err instanceof Error
                          ? err.message
                          : "Gửi lại OTP thất bại",
                        "error",
                      );
                    } finally {
                      setIsResendingOtp(false);
                    }
                  }}
                  className={`font-semibold text-zinc-400 underline hover:text-[#2563eb] cursor-pointer ${
                    otpTimer > 0
                      ? "cursor-not-allowed no-underline text-zinc-300 dark:text-zinc-700"
                      : "hover:text-blue-600"
                  }`}
                >
                  Gửi lại
                </button>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={isVerifyingOtp || otpValue.length < 6}
                onClick={handleVerifyProfileOtp}
                className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-base shadow-sm active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-[#8eaefc] disabled:opacity-70 disabled:cursor-not-allowed ${
                  isVerifyingOtp || otpValue.length < 6 ? "" : "bg-[#2563eb] hover:bg-[#1d4ed8]"
                }`}
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xác nhận...</span>
                  </>
                ) : (
                  "Xác nhận"
                )}
              </button>

              <button
                type="button"
                disabled={isVerifyingOtp}
                onClick={() => setShowProfileOtpModal(false)}
                className="w-full py-1 text-center text-zinc-600 hover:text-zinc-900 font-extrabold text-base cursor-pointer transition-colors active:scale-99 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div
            onClick={() => setShowNewEmailModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[24px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col p-8 gap-6">
            {/* Title */}
            <div className="flex flex-col gap-2 items-center text-center">
              <h3 className="text-[#2563eb] text-xl font-extrabold tracking-wide uppercase">
                Thay đổi email
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed max-w-[320px]">
                Vui lòng nhập email mới
              </p>
            </div>

            {/* Email Input Field */}
            <div
              className={`relative border rounded-xl px-4 py-2.5 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                newEmailError
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <label
                className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                  newEmailError
                    ? "text-red-500"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="newEmail"
                value={newEmailValue}
                onChange={(e) => {
                  setNewEmailValue(e.target.value);
                  if (newEmailError) setNewEmailError("");
                }}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
                placeholder="vnagroup01@gmail.com"
              />
            </div>

            {newEmailError && (
              <p className="text-red-500 text-xs font-bold -mt-3 text-center">
                {newEmailError}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={isSavingNewEmail}
                onClick={handleSaveNewEmail}
                className="w-full py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm shadow-md shadow-blue-500/10 active:scale-99 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingNewEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  "Lưu"
                )}
              </button>

              <button
                type="button"
                disabled={isSavingNewEmail}
                onClick={() => setShowNewEmailModal(false)}
                className="w-full py-3 text-center text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-sm cursor-pointer transition-colors active:scale-99 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteConfirmKey !== null}
        onClose={() => setDeleteConfirmKey(null)}
        onConfirm={async () => {
          if (deleteConfirmKey) {
            await executeDeleteAttachment(deleteConfirmKey);
            setDeleteConfirmKey(null);
          }
        }}
        title="Xác nhận xóa tệp đính kèm"
        description="Bạn có chắc chắn muốn xóa tệp đính kèm này không? Hành động này sẽ xóa vĩnh viễn tệp đính kèm khỏi cơ sở dữ liệu và không thể hoàn tác."
      />
    </div>
  );
};
