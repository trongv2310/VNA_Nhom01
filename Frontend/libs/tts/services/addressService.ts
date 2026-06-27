import { Province, Ward } from "../models/address";

const API_BASE_URL = "https://provinces.open-api.vn/api/v2";

let provincesCache: Province[] | null = null;
let provincesPromise: Promise<Province[]> | null = null;

const wardsCache: Record<number, Ward[] | undefined> = {};
const wardsPromises: Record<number, Promise<Ward[]> | undefined> = {};

export const addressService = {
  /**
   * Fetches all provinces. Uses cached data if available.
   */
  async getProvinces(): Promise<Province[]> {
    if (provincesCache) {
      return provincesCache;
    }
    if (provincesPromise) {
      return provincesPromise;
    }

    provincesPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/p/`);
        if (!response.ok) {
          throw new Error(`API trả về mã lỗi: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("API trả về danh sách Tỉnh/Thành phố trống");
        }
        provincesCache = data;
        return data;
      } catch (error) {
        provincesPromise = null; // Clear promise on error to allow retry
        throw error;
      }
    })();

    return provincesPromise;
  },

  /**
   * Fetches wards for a specific province code. Uses cached data if available.
   */
  async getWards(provinceCode: number): Promise<Ward[]> {
    if (wardsCache[provinceCode]) {
      return wardsCache[provinceCode];
    }
    if (wardsPromises[provinceCode]) {
      return wardsPromises[provinceCode];
    }

    wardsPromises[provinceCode] = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/p/${provinceCode}?depth=2`);
        if (!response.ok) {
          throw new Error(`API trả về mã lỗi: ${response.status}`);
        }
        const data = await response.json();
        const wards = data?.wards;
        if (!Array.isArray(wards)) {
          throw new Error("Không thể tìm thấy danh sách Phường/Xã cho tỉnh này");
        }
        wardsCache[provinceCode] = wards;
        return wards;
      } catch (error) {
        delete wardsPromises[provinceCode]; // Clear promise on error to allow retry
        throw error;
      }
    })();

    return wardsPromises[provinceCode];
  }
};
