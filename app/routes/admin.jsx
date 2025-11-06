// app/routes/admin.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import adminStyles from "../styles/admin.css?url";

export const links = () => [
  { rel: "stylesheet", href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" },
  { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" },
  { rel: "stylesheet", href: adminStyles },
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
  const loaderData = useLoaderData();
  const { relations: initialRelations, currentPlan, shop, appUrl, backendUrl } = loaderData;
  const [relations, setRelations] = useState(initialRelations || []);
  const [syncStatus, setSyncStatus] = useState({ show: false, message: "", type: "" });
  const [syncProgress, setSyncProgress] = useState({ show: false, value: 0 });
  const [syncHint, setSyncHint] = useState(false);
  const [syncBtnState, setSyncBtnState] = useState({ disabled: false, label: "Sync Now", loading: false });
  const [resetBtnState, setResetBtnState] = useState({ disabled: false, label: "Reset", loading: false });
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const confirmationModalRef = useRef(null);
  const confirmMessageRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const evtSourceRef = useRef(null);
  const modalInstanceRef = useRef(null);

  // Function to refresh data from API
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${backendUrl}/api/relations?shop=${shop}`);
      const data = await res.json();
      setRelations(data.relations || []);
      console.log("Data refreshed:", data.relations);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Check if Bootstrap is already loaded
    const initModal = () => {
      if (!confirmationModalRef.current) {
        console.warn("Modal ref not ready yet");
        return;
      }
      
      if (modalInstanceRef.current) {
        console.log("Modal already initialized");
        return;
      }
      
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
      } else {
        console.warn("Bootstrap.Modal not available");
      }
    };

    // Try to initialize immediately if Bootstrap is already loaded
    if (window.bootstrap && window.bootstrap.Modal) {
      console.log("Bootstrap already loaded, initializing modal...");
      // Small delay to ensure DOM is ready
      setTimeout(initModal, 50);
    } else {
      console.log("Bootstrap not loaded, loading script...");
      // Load Bootstrap JS if not already loaded
      const existingScript = document.querySelector('script[src*="bootstrap"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
        script.async = true;
        script.onload = () => {
          console.log("Bootstrap script loaded");
          // Small delay to ensure Bootstrap is fully initialized
          setTimeout(initModal, 100);
        };
        script.onerror = () => {
          console.error("Failed to load Bootstrap script");
        };
        document.body.appendChild(script);
      } else {
        console.log("Bootstrap script already exists, waiting for it to load...");
        // Wait a bit if script exists but bootstrap not yet available
        const checkBootstrap = setInterval(() => {
          if (window.bootstrap && window.bootstrap.Modal) {
            console.log("Bootstrap now available, initializing modal...");
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
    console.log("confirmAction called with message:", message);
    console.log("Modal instance:", modalInstanceRef.current);
    console.log("Bootstrap ready:", bootstrapReady);
    
    // Set message
    if (confirmMessageRef.current) {
      confirmMessageRef.current.textContent = message;
    }

    // Try to use Bootstrap modal
    if (modalInstanceRef.current) {
      console.log("Using Bootstrap modal");
      // Set up confirm button handler - remove old listeners first
      if (confirmBtnRef.current) {
        const newBtn = confirmBtnRef.current.cloneNode(true);
        confirmBtnRef.current.parentNode.replaceChild(newBtn, confirmBtnRef.current);
        confirmBtnRef.current = newBtn;
        
        const handleConfirm = () => {
          console.log("Confirm button clicked");
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
      console.log("Bootstrap modal not available, using native confirm");
      // Fallback to native confirm if Bootstrap modal not ready
      if (window.confirm(message)) {
        onConfirm();
      }
    }
  };

  const handleSync = () => {
    console.log("Sync button clicked");
    confirmAction("Are you sure? This will create collections in your Shopify store.", () => {
      console.log("Sync confirmed, starting sync...");
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
            setSyncStatus({ show: true, message: "Sync completed successfully. Refreshing data...", type: "success" });
            setSyncHint(false);
            setSyncProgress({ show: false, value: 0 });
            
            // Refresh data immediately after sync completes
            setTimeout(async () => {
              await refreshData();
              setSyncStatus({ show: true, message: "Sync completed successfully! Data has been updated.", type: "success" });
            }, 2000);
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
    console.log("Reset button clicked");
    confirmAction("Are you sure? This will delete all parent-child collection relationships.", () => {
      console.log("Reset confirmed, starting reset...");
      setResetBtnState({ disabled: true, label: "Resetting...", loading: true });

      fetch(`${backendUrl}/cleanup-collections?shop=${shop}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          setResetBtnState({ disabled: false, label: "Done!", loading: false });
          // Refresh data after reset
          setTimeout(async () => {
            await refreshData();
          }, 500);
        })
        .catch((err) => {
          console.error("Reset failed:", err);
          setResetBtnState({ disabled: false, label: "Reset", loading: false });
          alert("Reset failed. Please try again.");
        });
    });
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-content">
          <h1 className="page-title">
            <i className="fas fa-sitemap me-2"></i>
            Parent & Child Collection Relations
          </h1>
          <p className="page-subtitle">Manage your collection hierarchy and relationships</p>
        </div>
        
        <div className="header-actions">
          {currentPlan?.name === "Basic" && (
            <a href={`${appUrl}/plans?shop=${shop}`} className="btn btn-outline-dark" id="plan-btn">
              <i className="fas fa-crown me-2"></i>
              <span id="plan-label">Explore Plans</span>
            </a>
          )}

          <button
            id="reset-btn"
            className="btn btn-outline-danger"
            onClick={handleReset}
            disabled={resetBtnState.disabled}
          >
            <i className="fas fa-trash-alt me-2"></i>
            <span id="reset-label">{resetBtnState.label}</span>
            {resetBtnState.loading && (
              <span
                id="reset-spinner"
                className="spinner-border spinner-border-sm ms-2"
                role="status"
                aria-hidden="true"
              ></span>
            )}
          </button>

          <button
            id="sync-btn"
            className="btn btn-primary"
            onClick={handleSync}
            disabled={syncBtnState.disabled}
          >
            <i className="fas fa-sync-alt me-2"></i>
            <span id="sync-label">{syncBtnState.label}</span>
            {syncBtnState.loading && (
              <span
                id="sync-spinner"
                className="spinner-border spinner-border-sm ms-2"
                role="status"
                aria-hidden="true"
              ></span>
            )}
          </button>
        </div>
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

      {isRefreshing && (
        <div className="refresh-indicator">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Refreshing data...</span>
        </div>
      )}

      {!relations?.length && !isRefreshing && (
        <div className="empty-state">
          <i className="fas fa-inbox fa-3x mb-3 text-muted"></i>
          <h3>No Collections Found</h3>
          <p className="text-muted">No parent-child collections found. Click "Sync Now" to create collections.</p>
        </div>
      )}

      <div className="collections-grid">
        {relations?.map((rel) => (
          <div key={rel.parent.id} className="collection-card">
            <div className="card-header">
              <h4 className="card-title">
                <i className="fas fa-folder-open me-2 text-primary"></i>
                <strong>{rel.parent.title}</strong>
              </h4>
              <a
                href={`https://${shop}/admin/collections/${rel.parent.id}`}
                className="edit-link"
                target="_blank"
                rel="noreferrer"
                title="Edit collection"
              >
                <i className="fas fa-external-link-alt"></i>
              </a>
            </div>

            {rel.children && rel.children.length > 0 ? (
              <div className="children-list">
                {rel.children.map((child) => (
                  <div key={child.id} className="child-item">
                    <div className="child-content">
                      <div className="child-header">
                        <h5 className="child-title">
                          <i className="fas fa-folder me-2"></i>
                          {child.title}
                        </h5>
                        <a
                          href={`https://${shop}/admin/collections/${child.id}`}
                          className="child-edit-link"
                          target="_blank"
                          rel="noreferrer"
                          title="Edit collection"
                        >
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      </div>
                      <div className="child-details">
                        <div className="detail-item">
                          <span className="detail-label">
                            <i className="fas fa-tag me-1"></i>Tag:
                          </span>
                          <code className="detail-value">{child.tag}</code>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">
                            <i className="fas fa-redo me-1"></i>Redirect:
                          </span>
                          <code className="detail-value">{child.redirect}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-children">
                <i className="fas fa-info-circle me-2"></i>
                No child collections
              </div>
            )}
          </div>
        ))}
      </div>

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
