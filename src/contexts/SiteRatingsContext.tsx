import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAttestations } from "../hooks/useAttestations";
import { useWeb3AuthContext } from "./Web3AuthContext";
import { useToast } from "@chakra-ui/react";
import { isValidFlagUrl, getActiveTabUrl } from "../utils/helpers";

interface SiteRatingsContextType {
  currentUrl: string;
  isValidUrl: boolean;
  siteRatings: {
    safeCount: number;
    unsafeCount: number;
    totalRatings: number;
  } | null;
  userRating: boolean | null;
  loading: boolean;
  loadSiteRatings: (url: string) => Promise<void>;
  rateSite: (isSafe: boolean) => Promise<void>;
}

const SiteRatingsContext = createContext<SiteRatingsContextType | undefined>(
  undefined
);

export const useSiteRatings = () => {
  const context = useContext(SiteRatingsContext);
  if (!context) {
    throw new Error("useSiteRatings must be used within a SiteRatingsProvider");
  }
  return context;
};

export const SiteRatingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [siteRatings, setSiteRatings] = useState<{
    safeCount: number;
    unsafeCount: number;
    totalRatings: number;
  } | null>(null);
  const [userRating, setUserRating] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { createAttestation, getAttestations, getLatestAttestationForUser } =
    useAttestations();

  const { userData, ethAddress } = useWeb3AuthContext();
  const toast = useToast();

  const SAFETY_RATING_SCHEMA_ID = import.meta.env
    .VITE_ATTESTATION_SAFETY_RATING_ID;

  const loadSiteRatings = useCallback(
    async (url: string) => {
      if (!SAFETY_RATING_SCHEMA_ID || !url) return;
      setLoading(true);
      try {
        const attestations = await getAttestations(
          SAFETY_RATING_SCHEMA_ID,
          url.toLowerCase()
        );

        const uniqueUsers = new Set(attestations.map((a: any) => a.signer));
        let safeCount = 0;
        let unsafeCount = 0;

        for (const user of uniqueUsers) {
          const latestAttestation = await getLatestAttestationForUser(
            SAFETY_RATING_SCHEMA_ID,
            url.toLowerCase(),
            user
          );

          if (latestAttestation) {
            const decodedData = latestAttestation.decodedData;
            decodedData.isSafe ? safeCount++ : unsafeCount++;
          }
        }

        setSiteRatings({
          safeCount,
          unsafeCount,
          totalRatings: safeCount + unsafeCount,
        });

        if (ethAddress) {
          const userAttestation = await getLatestAttestationForUser(
            SAFETY_RATING_SCHEMA_ID,
            url.toLowerCase(),
            ethAddress
          );

          if (userAttestation) {
            setUserRating(userAttestation.decodedData.isSafe);
          } else {
            setUserRating(null);
          }
        }
      } catch (error) {
        console.error("Error loading site ratings:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      SAFETY_RATING_SCHEMA_ID,
      ethAddress,
      getAttestations,
      getLatestAttestationForUser,
    ]
  );

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const url = await getActiveTabUrl();
      if (url) {
        const domain = new URL(url).hostname;
        setCurrentUrl(domain);
        setIsValidUrl(isValidFlagUrl(url));
        await loadSiteRatings(domain);
      } else {
        setLoading(false);
      }
    };

    initialize();
  }, [ethAddress, loadSiteRatings]);

  const rateSite = async (isSafe: boolean) => {
    if (
      !SAFETY_RATING_SCHEMA_ID ||
      !currentUrl ||
      !ethAddress ||
      !userData?.email
    ) {
      throw new Error("Missing required information to rate site");
    }

    setLoading(true);
    try {
      await createAttestation(SAFETY_RATING_SCHEMA_ID, currentUrl, {
        url: currentUrl,
        isSafe,
      });
      await loadSiteRatings(currentUrl);
      setUserRating(isSafe);

      toast({
        title: "Success",
        description: `Site rated as ${
          isSafe ? "safe" : "unsafe"
        } successfully!`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to rate site: ${(error as Error).message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: SiteRatingsContextType = {
    currentUrl,
    isValidUrl,
    siteRatings,
    userRating,
    loading,
    loadSiteRatings,
    rateSite,
  };

  return (
    <SiteRatingsContext.Provider value={value}>
      {children}
    </SiteRatingsContext.Provider>
  );
};
