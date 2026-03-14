const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getPackageName = () => {
  if (IS_DEV) return "com.livequran.dev";
  if (IS_PREVIEW) return "com.livequran.preview";
  return "com.livequran";
};

const getAppName = () => {
  if (IS_DEV) return "Live Quran (Dev)";
  if (IS_PREVIEW) return "Live Quran (Preview)";
  return "Live Quran";
};

export default {
  expo: {
    name: getAppName(),
    slug: "live-quran",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "livequran",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: getPackageName(),
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      package: getPackageName(),
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          android: {
            newArchEnabled: true,
          },
          ios: {
            newArchEnabled: true,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        "projectId": "b600580f-4278-4000-a60a-aef1086892c1"
      },
    },
  },
};
