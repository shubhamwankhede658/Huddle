"use client";

import { createAuthClient } from "@neondatabase/auth/next";  // ← change this import
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const authClient = createAuthClient();  // ← no arguments

export function NeonAuthProvider({children}:{children:React.ReactNode}){
    const router = useRouter();
    return(
        <NeonAuthUIProvider 
          authClient={authClient} 
          defaultTheme="dark"
          navigate={router.push}
          replace={router.replace}
          onSessionChange={() => router.refresh()}
          redirectTo="/"
          Link={Link}
        >
            {children}
        </NeonAuthUIProvider>
    )
}

