import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const ARABIC_LAST_PARA_KEY = "@quran_arabic_last_para";

export function useQuranArabicProgress() {
  const [lastPara, setLastPara] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ARABIC_LAST_PARA_KEY).then((saved) => {
      if (saved) {
        const num = parseInt(saved, 10);
        if (!isNaN(num)) setLastPara(num);
      }
    });
  }, []);

  const saveLastPara = useCallback(async (para: number) => {
    await AsyncStorage.setItem(ARABIC_LAST_PARA_KEY, String(para));
    setLastPara(para);
  }, []);

  return { lastPara, saveLastPara };
}
