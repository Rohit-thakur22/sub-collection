// app/routes/admin.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import styles from "../styles/plans.css";

export const links = () => [{ rel: "stylesheet", href: styles }];

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

  const handleSync = async () => {
    const confirm = window.confirm("Are you sure you want to sync collections?");
    if (!confirm) return;
    await fetch(`${process.env.BACKEND_URL}/sync-collections?shop=${shop}`);
    alert("Sync initiated!");
  };

  const handleReset = async () => {
    const confirm = window.confirm("Reset all relations?");
    if (!confirm) return;
    await fetch(`${process.env.BACKEND_URL}/cleanup-collections?shop=${shop}`);
    alert("Relations reset!");
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Parent & Child Collection Relations</h1>

        {currentPlan?.name === "Basic" && (
          <a href={`${appUrl}/plans?shop=${shop}`} className="btn btn-dark">
            Explore Plans
          </a>
        )}

        <button onClick={handleReset} className="btn btn-danger">
          Reset
        </button>
        <button onClick={handleSync} className="btn btn-success">
          Sync Now
        </button>
      </div>

      {!relations?.length && (
        <div className="alert alert-warning">No parent-child collections found.</div>
      )}

      {relations?.map((rel) => (
        <div key={rel.parent.id} className="collection-card mb-3">
          <h4>
            <strong>{rel.parent.title}</strong>
            <a
              href={`https://${shop}/admin/collections/${rel.parent.id}`}
              target="_blank"
              rel="noreferrer"
              className="edit-link"
            >
              ✏️
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
                  target="_blank"
                  rel="noreferrer"
                  className="edit-link"
                >
                  ✏️
                </a>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
