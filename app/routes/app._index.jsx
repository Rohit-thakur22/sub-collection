import { useEffect, useState } from "react";
import { Page, Layout, Spinner, Text } from "@shopify/polaris";
import { redirect } from "@remix-run/node";

export async function loader() {
  return null; // NO redirect here; redirect AFTER auth check on client
}

export default function Index() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
          // Redirect for install
          if (window.top !== window.self) {
            window.top.location.href = installUrl;
          } else {
            window.location.href = installUrl;
          }
        } else {
          setIsAuthorized(true);

          // After successful authorization → redirect to /admin
          window.location.href = "/admin";
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
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spinner size="large" />
        <Text style={{ marginLeft: 8 }}>Verifying authentication...</Text>
      </div>
    );
  }

  return null; // UI never loads on this page; it redirects.
}
