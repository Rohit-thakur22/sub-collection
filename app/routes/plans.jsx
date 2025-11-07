import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import plansStyles from "../styles/plans.css?url";

export const links = () => [
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
  },
  {
    rel: "stylesheet",
    href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
  },
  { rel: "stylesheet", href: plansStyles },
];

export const meta = () => {
  return [
    { title: "Plans" },
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
  ];
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = 'sub-collection-testing-2.myshopify.com';

  const backendUrl = process.env.BACKEND_URL || "https://subcollection.allgovjobs.com/";
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
        },
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
    <div className="plans-container">
      <div className="plans-header">
        <h1 className="plans-title">
          <i className="fas fa-crown me-2"></i>
          Available Plans
        </h1>
        <p className="plans-subtitle">Choose the perfect plan for {shop}</p>
      </div>

      <div className="plans-grid">
        {plans?.map((plan) => (
          <div key={plan._id} className="plan-card-wrapper">
            <div
              className={`plan-card ${currentPlan?.name === plan.name ? "current-plan" : ""}`}
            >
              {currentPlan?.name === plan.name && (
                <div className="current-badge">
                  <i className="fas fa-check-circle me-1"></i>
                  Current Plan
                </div>
              )}
              <div className="plan-card-body">
                <div className="plan-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">
                    <span className="price-amount">{plan.price}</span>
                    <span className="price-currency">{plan.currency}</span>
                    <span className="price-interval">/{plan.interval}</span>
                  </div>
                </div>

                <div className="plan-features">
                  <div className="feature-item">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    <span>
                      <strong>Collection Limit:</strong>{" "}
                      {typeof plan.collection_limit !== "undefined"
                        ? plan.collection_limit
                        : "Unlimited"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="plan-card-footer">
                {currentPlan?.name === plan.name ? (
                  <button className="btn btn-secondary w-100" disabled>
                    <i className="fas fa-check me-2"></i>
                    Current Plan
                  </button>
                ) : (
                  <button
                    className="btn btn-primary w-100 choose-plan-btn"
                    data-shop={shop}
                    data-plan-id={plan._id}
                    onClick={() => handlePurchase(plan._id)}
                  >
                    <i className="fas fa-arrow-right me-2"></i>
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
