import React, { useState } from "react";
import Button from "./ui/Button"; // ✅ your UI button
import { paymentsApi } from "../lib/paymentsApi";
import { postForm } from "../lib/postForm";

export default function EsewaPayButton({ planId, label = "Pay with eSewa" }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handlePay() {
    try {
      setErr("");
      setLoading(true);

      const { formUrl, fields } = await paymentsApi.initiateEsewaSubscription(planId);

      // Save tx uuid so pending page can poll
      if (fields?.transaction_uuid) {
        localStorage.setItem("last_esewa_tx_uuid", fields.transaction_uuid);
      }

      // Redirect to eSewa via POST
      postForm(formUrl, fields);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to initiate payment");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handlePay} disabled={loading || !planId}>
        {loading ? "Starting payment..." : label}
      </Button>

      {err ? <div style={{ marginTop: 8, color: "crimson" }}>{err}</div> : null}
    </div>
  );
}
