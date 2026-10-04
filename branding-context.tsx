import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from './config';
import { AuthContext } from './auth-context';
import { colors as defaultColors } from './theme';
import type { Id } from './config';

type BrandingData = {
logoUrl?: string;
primaryColor: string;
secondaryColor: string;
accentColor: string;
displayName?: string;
welcomeMessage?: string;
brandStatement?: string;
supportEmail?: string;
supportPhone?: string;
};

type FeatureFlags = {
wellnessEnabled: boolean;
conflictResolutionEnabled: boolean;
quizEnabled: boolean;
};

type BrandingContextType = {
branding: BrandingData;
features: FeatureFlags;
brandedColors: typeof defaultColors;
};

const defaultBranding: BrandingData = {
primaryColor: defaultColors.primary,
secondaryColor: defaultColors.secondary,
accentColor: defaultColors.accent,
};

const defaultFeatures: FeatureFlags = {
wellnessEnabled: true,
conflictResolutionEnabled: true,
quizEnabled: true,
};

const BrandingCtx = createContext<BrandingContextType>({
branding: defaultBranding,
features: defaultFeatures,
brandedColors: defaultColors,
});

export function BrandingProvider({ children }: { children?: any }) {
const authContext = useContext(AuthContext);
const user = authContext?.user;
const companyId = user?.companyId as Id<"companies"> | undefined;

const brandingData = useQuery(
api.users.getCompanyBranding,
companyId ? { companyId } : "skip"
);
const featuresData = useQuery(
api.users.getCompanyFeatures,
companyId ? { companyId } : "skip"
);

const branding = brandingData || defaultBranding;
const features = featuresData || defaultFeatures;

const brandedColors = useMemo(() => ({
...defaultColors,
primary: branding.primaryColor || defaultColors.primary,
secondary: branding.secondaryColor || defaultColors.secondary,
accent: branding.accentColor || defaultColors.accent,
}), [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

const value = useMemo(() => ({
branding,
features,
brandedColors,
}), [branding, features, brandedColors]);

return (
<BrandingCtx.Provider value={value}>
{children}
</BrandingCtx.Provider>
);
}

export function useBranding() {
return useContext(BrandingCtx);
}