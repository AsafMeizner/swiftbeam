// src/app/error.tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="h-screen flex flex-col items-center justify-center space-y-2">
        <h2 className="text-xl font-semibold">Something went wrong!</h2>
        <p className="text-slate-600">{error.message}</p>
      </body>
    </html>
  );
}
