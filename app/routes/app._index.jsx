// import { redirect } from "@remix-run/node";

// export async function loader() {
//   return redirect("/admin");
// }

// app/routes/app._index.jsx
import { useEffect, useState } from "react";
import { Page, Layout, Spinner, Text } from "@shopify/polaris";
import { Link } from "@remix-run/react";

export default function Index() {
  const [isNew, setIsNew] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const handleUploadSuccess = () => {
    setIsNew(!isNew);
  };


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get("shop");
    if (!shop) {
      setIsCheckingAuth(false);
      return;
    }

    fetch(`https://subcollection.allgovjobs.com/backend/api/check-auth?shop=${shop}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.authorized) {
          const installUrl = `https://subcollection.allgovjobs.com/backend/shopify?shop=${shop}`;
          if (window.top !== window.self) {
            window.top.location.href = installUrl;
          } else {
            window.location.href = installUrl;
          }
        } else {
          setIsAuthorized(true);
        }
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

  if (isCheckingAuth) {
    // prevent UI flash — show loader while checking token
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spinner accessibilityLabel="Loading" size="large" />
        <Text variant="bodyLg" as="p" tone="subdued" style={{ marginLeft: "8px" }}>
          Verifying authentication...
        </Text>
      </div>
    );
  }

  if (!isAuthorized) {
    // Don’t render UI; either loading or about to redirect
    return null;
  }

  return (
    <div style={{
      fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'",
      padding: 28,
      maxWidth: 980,
      margin: "24px auto",
      color: "#111"
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>sub-collection-app (Dev)</h1>
          <p style={{ margin: "6px 0 0", color: "#555" }}>Simple development launcher for your Remix + Nest Shopify app</p>
        </div>
        <div style={{ textAlign: "right", color: "#666", fontSize: 13 }}>
        </div>
      </header>

      <main style={{ background: "#fafafa", padding: 18, borderRadius: 8, border: "1px solid #eee" }}>
        <p style={{ marginTop: 0 }}>
          Use these quick actions while developing. Replace or extend this UI later with your real app screens.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>

          {/* <a
            href={`${backendUrl}/api/check-auth?shop=${shop}`}
            target="_blank"
            rel="noreferrer"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #888", background: "#fff", color: "#444", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Check Auth (backend)
          </a> */}

          <Link to="/auth/login" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#333", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Auth Login
          </Link>
        </div>

        <section style={{ marginTop: 8 }}>
          <h3 style={{ margin: "8px 0" }}>Status</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {/* <li>Backend: <strong>{backendUrl}</strong></li> */}
            <li>Installed pages: <strong>/admin</strong>, <strong>/auth/*</strong></li>
          </ul>
        </section>

        <section style={{ marginTop: 14 }}>
          <h3 style={{ margin: "8px 0" }}>Notes</h3>
          <ol style={{ margin: "8px 0 0 20px", color: "#444" }}>
            <li>This is a placeholder UI — replace with your real app UI later.</li>
            <li>If your app is embedded in Shopify admin, use the <code>openInTop</code> button to force top-level navigation for installs.</li>
            <li>To test API calls, open the "Check Auth (backend)" link in a new tab.</li>
          </ol>
        </section>
      </main>

      <footer style={{ marginTop: 18, color: "#666", fontSize: 13 }}>
        <div>Built for dev — edit <code>app/routes/app._index.jsx</code> to change this page.</div>
      </footer>
    </div>
  );
}
