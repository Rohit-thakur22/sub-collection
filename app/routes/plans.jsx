// app/routes/plans.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import styles from "../styles/plans.css";
export function links() {
  return [{ rel: "stylesheet", href: styles }];
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const [plansRes, currentPlanRes] = await Promise.all([
    fetch(`${process.env.API_URL}/plans?shop=${shop}`),
    fetch(`${process.env.API_URL}/current-plan?shop=${shop}`),
  ]);

  const plans = await plansRes.json();
  const currentPlan = await currentPlanRes.json();

  return json({ plans, currentPlan, shop });
}

export default function Plans() {
  const { plans, currentPlan, shop } = useLoaderData();

  async function handlePurchase(planId) {
    try {
      const response = await fetch(
        `/plans/purchase?shop=${encodeURIComponent(shop)}&planId=${encodeURIComponent(planId)}`
      );

      const data = await response.json();
      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      } else {
        alert("Failed to get billing confirmation URL.");
      }
    } catch (err) {
      console.error(err);
      alert("Error initiating purchase. Please try again.");
    }
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-center">Available Plans for {shop}</h2>

      <div className="row g-4 justify-content-center">
        {plans.map((plan) => (
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
                    {plan.collection_limit ?? "Unlimited"}
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
                    className="btn btn-dark w-100"
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
