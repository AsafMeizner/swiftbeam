// "use client";

// import { useEffect } from "react";

// export default function DevToolsLoader() {
//   useEffect(() => {
//     // Only load dev tools in development
//     if (process.env.NODE_ENV === "development") {
//       import("@/utils/devConsole").then(() => {
//         // Dev console is automatically attached to window
//         console.log("🛠️  Dev tools loaded! Use swiftbeamDev.help() for commands.");
//       }).catch((error) => {
//         console.error("Failed to load dev tools:", error);
//       });
//     }
//   }, []);

//   // This component doesn't render anything
//   return null;
// }
