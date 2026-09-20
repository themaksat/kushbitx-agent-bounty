import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { NightlyWalletAdapter } from "@solana/wallet-adapter-nightly";
import { useMemo, type ReactNode } from "react";
import { COOKIE_RPC, COOKIE_WS } from "../lib/cookie";

import "@solana/wallet-adapter-react-ui/styles.css";

export function CookieWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new NightlyWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={COOKIE_RPC} config={{ commitment: "confirmed", wsEndpoint: COOKIE_WS }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
