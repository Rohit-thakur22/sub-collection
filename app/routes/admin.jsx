// app/routes/admin.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import styles from "../styles/admin.css";

export function links() {
  return [{ rel: "stylesheet", href: styles }];
}
export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  // Fetch data from your backend (replace with your actual API)
  const [relationsRes, planRes] = await Promise.all([
    fetch(`${process.env.API_URL}/collections?shop=${shop}`),
    fetch(`${process.env.API_URL}/current-plan?shop=${shop}`),
  ]);

  const relations = await relationsRes.json();
  const currentPlan = await planRes.json();

  return json({ relations, currentPlan, shop, appUrl: process.env.APP_URL });
}

export default function Admin() {
  const { relations, currentPlan, shop, appUrl } = useLoaderData();

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="shopify-green">Parent & Child Collection Relations</h1>

        {currentPlan?.name === "Basic" && (
          <a href={`${appUrl}/plans?shop=${shop}`} className="btn btn-dark">
            Explore Plans
          </a>
        )}

        <button id="reset-btn" className="btn btn-danger">Reset</button>
        <button id="sync-btn" className="btn btn-success">Sync Now</button>
      </div>

      {!relations.length ? (
        <div className="alert alert-warning">No parent-child collections found.</div>
      ) : (
        relations.map((rel) => (
          <div key={rel.parent.id} className="collection-card mb-3">
            <h4>
              <strong>{rel.parent.title}</strong>
              <a
                href={`https://${shop}/admin/collections/${rel.parent.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ float: "right", color: "#007bff", textDecoration: "none", fontSize: "14px" }}
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
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#555", textDecoration: "none", fontSize: "14px" }}
                  >
                    <i className="fas fa-pen"></i>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
