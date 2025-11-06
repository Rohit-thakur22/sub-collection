// app/routes/admin.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/admin.css";

export const links = () => [
  { rel: "stylesheet", href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" },
  { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
  { rel: "stylesheet", href: styles },
];

export const meta = () => {
  return [
    { title: "Parent-Child Collection View" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const backendUrl = process.env.BACKEND_URL || "https://subcollection.allgovjobs.com";
  const res = await fetch(`${backendUrl}/api/relations?shop=${shop}`);
  const { relations, currentPlan } = await res.json();

  return json({
    relations: relations || [],
    currentPlan: currentPlan || {},
    shop,
    appUrl: process.env.HOST,
    backendUrl,
  });
}

export default function Admin() {
  const { relations, currentPlan, shop, appUrl, backendUrl } = useLoaderData();
  const [syncStatus, setSyncStatus] = useState({ show: false, message: "", type: "" });
  const [syncProgress, setSyncProgress] = useState({ show: false, value: 0 });
  const [syncHint, setSyncHint] = useState(false);
  const [syncBtnState, setSyncBtnState] = useState({ disabled: false, label: "Sync Now", loading: false });
  const [resetBtnState, setResetBtnState] = useState({ disabled: false, label: "Reset", loading: false });
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const confirmationModalRef = useRef(null);
  const confirmMessageRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const evtSourceRef = useRef(null);
  const modalInstanceRef = useRef(null);

  useEffect(() => {
    // Check if Bootstrap is already loaded
    const initModal = () => {
      if (confirmationModalRef.current && !modalInstanceRef.current) {
        const bootstrap = window.bootstrap;
        if (bootstrap && bootstrap.Modal) {
          try {
            modalInstanceRef.current = new bootstrap.Modal(confirmationModalRef.current, {
              backdrop: true,
              keyboard: true,
            });
            setBootstrapReady(true);
            console.log("Bootstrap modal initialized successfully");
          } catch (err) {
            console.error("Failed to initialize Bootstrap modal:", err);
          }
        }
      }
    };

    // Try to initialize immediately if Bootstrap is already loaded
    if (window.bootstrap && window.bootstrap.Modal) {
      // Small delay to ensure DOM is ready
      setTimeout(initModal, 50);
    } else {
      // Load Bootstrap JS if not already loaded
      const existingScript = document.querySelector('script[src*="bootstrap"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        script.async = false; // Load synchronously to ensure it's ready
        script.onload = () => {
          // Small delay to ensure Bootstrap is fully initialized
          setTimeout(initModal, 100);
        };
        script.onerror = () => {
          console.error("Failed to load Bootstrap script");
        };
        document.body.appendChild(script);
      } else {
        // Wait a bit if script exists but bootstrap not yet available
        const checkBootstrap = setInterval(() => {
          if (window.bootstrap && window.bootstrap.Modal) {
            initModal();
            clearInterval(checkBootstrap);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkBootstrap);
          if (!modalInstanceRef.current) {
            console.warn("Bootstrap modal initialization timeout - using fallback");
          }
        }, 5000);
      }
    }

    return () => {
      // Cleanup EventSource on unmount
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
      }
      // Cleanup modal instance
      if (modalInstanceRef.current) {
        try {
          modalInstanceRef.current.dispose();
        } catch (err) {
          console.error("Error disposing modal:", err);
        }
      }
    };
  }, []);

  const confirmAction = (message, onConfirm) => {
    // Set message
    if (confirmMessageRef.current) {
      confirmMessageRef.current.textContent = message;
    }

    // Remove previous event listeners by cloning the button
    if (confirmBtnRef.current) {
      const newBtn = confirmBtnRef.current.cloneNode(true);
      confirmBtnRef.current.parentNode.replaceChild(newBtn, confirmBtnRef.current);
      confirmBtnRef.current = newBtn;
    }

    // Try to use Bootstrap modal
    if (modalInstanceRef.current && bootstrapReady) {
      // Set up confirm button handler
      if (confirmBtnRef.current) {
        const handleConfirm = () => {
          modalInstanceRef.current.hide();
          onConfirm();
        };
        confirmBtnRef.current.onclick = handleConfirm;
      }
      
      // Show modal
      try {
        modalInstanceRef.current.show();
      } catch (err) {
        console.error("Error showing modal:", err);
        // Fallback to native confirm
        if (window.confirm(message)) {
          onConfirm();
        }
      }
    } else {
      // Fallback to native confirm if Bootstrap modal not ready
      if (window.confirm(message)) {
        onConfirm();
      }
    }
  };

  const handleSync = () => {
    confirmAction("Are you sure? This will create collections in your Shopify store.", () => {
      setSyncHint(true);
      setSyncStatus({ show: false, message: "", type: "" });
      setSyncBtnState({ disabled: true, label: "Syncing...", loading: true });
      setSyncProgress({ show: true, value: 0 });

      // Start sync (fire and forget)
      fetch(`${backendUrl}/sync-collections?shop=${shop}`)
        .catch((err) => {
          console.error("Sync request failed:", err);
          setSyncStatus({ show: true, message: "Failed to start sync. Please try again.", type: "danger" });
          setSyncBtnState({ disabled: false, label: "Sync Now", loading: false });
          setSyncHint(false);
          setSyncProgress({ show: false, value: 0 });
        });

      // Listen for real-time progress
      const evtSource = new EventSource(`${backendUrl}/sync-stream?shop=${shop}`);
      evtSourceRef.current = evtSource;

      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const progress = data.progress || 0;
          setSyncProgress({ show: true, value: progress });

          if (progress >= 100) {
            evtSource.close();
            evtSourceRef.current = null;
            setSyncBtnState({ disabled: false, label: "Sync Now", loading: false });
            setSyncStatus({ show: true, message: "Sync completed successfully.", type: "success" });
            setSyncHint(false);
            setSyncProgress({ show: false, value: 0 });
            setTimeout(() => window.location.reload(), 6000);
          }
        } catch (err) {
          console.error("Error parsing progress:", err);
        }
      };

      evtSource.onerror = (err) => {
        console.error("EventSource error:", err);
        evtSource.close();
        evtSourceRef.current = null;
        setSyncStatus({ show: true, message: "Sync failed or connection lost.", type: "danger" });
        setSyncBtnState({ disabled: false, label: "Sync Now", loading: false });
        setSyncHint(false);
        setSyncProgress({ show: false, value: 0 });
      };
    });
  };

  const handleReset = () => {
    confirmAction("Are you sure? This will delete all parent-child collection relationships.", () => {
      setResetBtnState({ disabled: true, label: "Resetting...", loading: true });

      fetch(`${backendUrl}/cleanup-collections?shop=${shop}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          setResetBtnState({ disabled: false, label: "Done!", loading: false });
          setTimeout(() => window.location.reload(), 1000);
        })
        .catch((err) => {
          console.error("Reset failed:", err);
          setResetBtnState({ disabled: false, label: "Reset", loading: false });
          alert("Reset failed. Please try again.");
        });
    });
  };

  return (
    <div className="container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="shopify-green">Parent & Child Collection Relations</h1>

        {currentPlan?.name === "Basic" && (
          <a href={`${appUrl}/plans?shop=${shop}`} className="btn btn-dark" id="plan-btn">
            <span id="plan-label">Explore Plans</span>
          </a>
        )}

        <button
          id="reset-btn"
          className="btn btn-danger"
          onClick={handleReset}
          disabled={resetBtnState.disabled}
        >
          <span id="reset-label">{resetBtnState.label}</span>
          {resetBtnState.loading && (
            <span
              id="reset-spinner"
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          )}
        </button>

        <button
          id="sync-btn"
          className="btn btn-success"
          onClick={handleSync}
          disabled={syncBtnState.disabled}
        >
          <span id="sync-label">{syncBtnState.label}</span>
          {syncBtnState.loading && (
            <span
              id="sync-spinner"
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          )}
        </button>
      </div>

      {syncHint && (
        <div id="sync-hint" className="text-muted mb-2">
          ⏳ This may take a few minutes. You can safely close this window or continue working — the sync will
          continue in the background.
        </div>
      )}

      {/* Progress bar */}
      {syncProgress.show && (
        <div className="progress mb-3" id="sync-progress-container">
          <div
            id="sync-progress-bar"
            className="progress-bar"
            role="progressbar"
            style={{ width: `${syncProgress.value}%` }}
            aria-valuenow={syncProgress.value}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {syncProgress.value}%
          </div>
        </div>
      )}

      {syncStatus.show && (
        <div id="sync-status" className={`alert alert-${syncStatus.type}`}>
          {syncStatus.message}
        </div>
      )}

      {!relations?.length && (
        <div className="alert alert-warning">No parent-child collections found.</div>
      )}

      {relations?.map((rel) => (
        <div key={rel.parent.id} className="collection-card">
          <h4>
            <strong>{rel.parent.title}</strong>
            <a
              href={`https://${shop}/admin/collections/${rel.parent.id}`}
              style={{ float: "right", color: "#007bff", textDecoration: "none", fontSize: "14px" }}
              target="_blank"
              rel="noreferrer"
              title="Edit collection"
            >
              <i className="fas fa-pen"></i>
            </a>
          </h4>

          {rel.children.map((child) => (
            <div key={child.id} className="child-item">
              <div className="d-flex justify-content-between">
                <div>
                  <strong>{child.title}</strong>
                  <br />
                  Tag: <code>{child.tag}</code>
                  <br />
                  Redirect: <code>{child.redirect}</code>
                </div>
                <a
                  href={`https://${shop}/admin/collections/${child.id}`}
                  style={{ color: "#555", textDecoration: "none", fontSize: "14px" }}
                  target="_blank"
                  rel="noreferrer"
                  title="Edit collection"
                >
                  <i className="fas fa-pen"></i>
                </a>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Confirmation Modal */}
      <div
        className="modal fade"
        id="confirmationModal"
        tabIndex="-1"
        aria-labelledby="confirmationModalLabel"
        aria-hidden="true"
        ref={confirmationModalRef}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="confirmationModalLabel">
                Please Confirm
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body" id="confirmationMessage" ref={confirmMessageRef}>
              {/* Dynamic message injected here */}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" className="btn btn-primary" id="confirmActionBtn" ref={confirmBtnRef}>
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
