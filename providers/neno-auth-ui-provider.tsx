"use client";

import { createAuthClient } from "@neondatabase/auth";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";

const authClient = createAuthClient();

export function NeonAuthProvider({children}:{children:React.ReactNode}){
    return(
        <NeonAuthUIProvider authClient={authClient} defaultTheme="dark" >
          
            {children}
        </NeonAuthUIProvider>
    )
}




