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

  const res = await fetch(`${process.env.BACKEND_URL}/api/relations?shop=${shop}`);
  const { relations, currentPlan } = await res.json();

  return json({
    relations: relations || [],
    currentPlan: currentPlan || {},
    shop,
    appUrl: process.env.HOST,
  });
}

export default function Admin() {
  const { relations, currentPlan, shop, appUrl } = useLoaderData();
  const [syncStatus, setSyncStatus] = useState({ show: false, message: "", type: "" });
  const [syncProgress, setSyncProgress] = useState({ show: false, value: 0 });
  const [syncHint, setSyncHint] = useState(false);
  const [syncBtnState, setSyncBtnState] = useState({ disabled: false, label: "Sync Now", loading: false });
  const [resetBtnState, setResetBtnState] = useState({ disabled: false, label: "Reset", loading: false });
  const confirmationModalRef = useRef(null);
  const confirmMessageRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const evtSourceRef = useRef(null);

  useEffect(() => {
    // Load Bootstrap JS
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
    script.async = true;
    
    script.onload = () => {
      // Initialize Bootstrap modal after script loads
      if (confirmationModalRef.current) {
        const bootstrap = window.bootstrap || window.Bootstrap;
        if (bootstrap) {
          window.confirmationModal = new bootstrap.Modal(confirmationModalRef.current);
        }
      }
    };
    
    document.body.appendChild(script);

    return () => {
      // Cleanup EventSource on unmount
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const confirmAction = (message, onConfirm) => {
    if (confirmMessageRef.current) {
      confirmMessageRef.current.textContent = message;
      if (window.confirmationModal) {
        window.confirmationModal.show();
        if (confirmBtnRef.current) {
          confirmBtnRef.current.onclick = () => {
            window.confirmationModal.hide();
            onConfirm();
          };
        }
      } else {
        // Fallback to native confirm if Bootstrap modal not loaded
        if (window.confirm(message)) {
          onConfirm();
        }
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
      fetch(`${process.env.BACKEND_URL}/sync-collections?shop=${shop}`).catch(() => {});

      // Listen for real-time progress
      const evtSource = new EventSource(`${process.env.BACKEND_URL}/sync-stream?shop=${shop}`);
      evtSourceRef.current = evtSource;

      evtSource.onmessage = (e) => {
        const { progress } = JSON.parse(e.data);
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
      };

      evtSource.onerror = () => {
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

      fetch(`${process.env.BACKEND_URL}/cleanup-collections?shop=${shop}`)
        .then(() => {
          setResetBtnState({ disabled: false, label: "Done!", loading: false });
          setTimeout(() => window.location.reload(), 1000);
        })
        .catch(() => {
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
