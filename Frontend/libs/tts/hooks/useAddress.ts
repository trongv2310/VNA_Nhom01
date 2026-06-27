import { useState, useEffect } from "react";
import { Province, Ward } from "../models/address";
import { addressService } from "../services/addressService";

export function useAddress(selectedProvinceName?: string) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);
  const [wardsError, setWardsError] = useState<string | null>(null);

  // Load provinces on mount
  useEffect(() => {
    let isMounted = true;
    const loadProvinces = async () => {
      setIsLoadingProvinces(true);
      setProvincesError(null);
      try {
        const data = await addressService.getProvinces();
        if (isMounted) {
          setProvinces(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setProvincesError(err.message || "Không thể tải danh sách Tỉnh/Thành phố.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProvinces(false);
        }
      }
    };
    loadProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load wards whenever selectedProvinceName or provinces list changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedProvinceName) {
      setWards([]);
      setWardsError(null);
      return;
    }

    const loadWards = async () => {
      // Find the province code from the name
      const province = provinces.find(
        (p) => p.name.trim().toLowerCase() === selectedProvinceName.trim().toLowerCase()
      );
      if (!province) {
        // If provinces are loaded but this province name is not found, clear wards
        if (provinces.length > 0) {
          setWards([]);
        }
        return;
      }

      setWards([]); // Clear existing wards immediately when starting to load new ones
      setIsLoadingWards(true);
      setWardsError(null);
      try {
        const data = await addressService.getWards(province.code);
        if (isMounted) {
          setWards(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setWardsError(err.message || "Không thể tải danh sách Phường/Xã.");
          setWards([]); // Ensure wards are cleared on error
        }
      } finally {
        if (isMounted) {
          setIsLoadingWards(false);
        }
      }
    };

    if (provinces.length > 0) {
      loadWards();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedProvinceName, provinces]);

  return {
    provinces,
    wards,
    isLoadingProvinces,
    isLoadingWards,
    provincesError,
    wardsError,
  };
}
