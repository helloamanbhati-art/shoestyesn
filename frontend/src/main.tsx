
  import { createRoot } from "react-dom/client";
  import { ClerkProvider } from "@clerk/react";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const root = createRoot(document.getElementById("root")!);
  if (!publishableKey) {
    root.render(
      <main style={{ fontFamily: 'sans-serif', padding: 32 }}>
        <h1>Storefront configuration needed</h1>
        <p>Set VITE_CLERK_PUBLISHABLE_KEY and restart the frontend.</p>
      </main>,
    );
  } else {
    root.render(
      <ClerkProvider
        publishableKey={publishableKey}
        fallback={
          <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', fontFamily: 'sans-serif' }}>
            <p>Loading Shoe Style…</p>
          </main>
        }
      >
        <App />
      </ClerkProvider>,
    );
  }

