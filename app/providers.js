"use client";

import { PlatformStoreProvider } from "./platform-store";

export default function Providers({ children }) {
  return <PlatformStoreProvider>{children}</PlatformStoreProvider>;
}
