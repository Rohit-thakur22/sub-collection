import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import styles from "../styles/plans.css";

export const links = () => [
  { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" },
  { rel: "stylesheet", href: styles },
];

export const meta = () => {
  return [
    { title: "Plans" },
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
  ];
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const backendUrl = process.env.BACKEND_URL || "https://subcollection.allgovjobs.com";
  const plansRes = await fetch(`${backendUrl}/api/plans?shop=${shop}`);
  const { plans, currentPlan } = await plansRes.json();

  return json({ plans, currentPlan, shop, backendUrl });
}

export default function Plans() {
  const { plans, currentPlan, shop, backendUrl } = useLoaderData();

  async function handlePurchase(planId) {
    try {
      const response = await fetch(
        `${backendUrl}/plans/purchase?shop=${encodeURIComponent(shop)}&planId=${encodeURIComponent(planId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      } else {
        alert("Failed to get billing confirmation URL.");
      }
    } catch (error) {
      console.error("Error during purchase:", error);
      alert("Error initiating purchase. Please try again.");
    }
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-center">Available Plans for {shop}</h2>

      <div className="row g-4 justify-content-center">
        {plans?.map((plan) => (
          <div key={plan._id} className="col-md-4">
            <div className="card plan-card h-100">
              <div className="card-body d-flex flex-column justify-content-between">
                <div>
                  <h5 className="plan-name">{plan.name}</h5>
                  <p className="plan-price">
                    {plan.price} {plan.currency} / {plan.interval}
                  </p>
                  <p className="text-muted mb-1">
                    Collection Limit:{" "}
                    {typeof plan.collection_limit !== "undefined"
                      ? plan.collection_limit
                      : "Unlimited"}
                  </p>
                </div>
              </div>

              <div className="card-footer text-center">
                {currentPlan?.name === plan.name ? (
                  <button className="btn btn-secondary w-100" disabled>
                    Current Plan
                  </button>
                ) : (
                  <button
                    className="btn btn-dark w-100 choose-plan-btn"
                    data-shop={shop}
                    data-plan-id={plan._id}
                    onClick={() => handlePurchase(plan._id)}
                  >
                    Choose Plan
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
