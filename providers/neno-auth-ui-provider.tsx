"use client";

import { createAuthClient } from "@neondatabase/auth";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";

const authClient = createAuthClient(process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL!);

export function NeonAuthProvider({children}:{children:React.ReactNode}){
    return(
        <NeonAuthUIProvider authClient={authClient} defaultTheme="dark">
          
            {children}
        </NeonAuthUIProvider>
    )
}




