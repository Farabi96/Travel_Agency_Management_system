
import { useCallback, useEffect, useState } from "react";
import { getRefunds, updateRefund } from "../services/api";

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const badgeStyle = (status) => {
  const styles = {
    PENDING: "bg-amber-100 text-amber-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-red-100 text-red-800",
    NOT_REQUIRED: "bg-slate-100 text-slate-700",
  };

  return styles[status] || "bg-slate-100 text-slate-700";
};

export default function RefundManagement() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [references, setReferences] = useState({});
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState("ALL");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getRefunds();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load refunds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  async function changeStatus(refund, status) {
    if (busyId !== null) return;

    if (status === "COMPLETED") {
      if (!references[refund.refund_id]?.trim()) {
        setError("Enter the transaction reference before completing.");
        return;
      }

      const confirmed = window.confirm(
        "Confirm that the refund has actually been transferred to the customer."
      );

      if (!confirmed) return;
    }

    setBusyId(refund.refund_id);
    setError("");
    setMessage("");

    try {
      await updateRefund(refund.refund_id, {
        refund_status: status,
        transaction_reference:
          references[refund.refund_id]?.trim() || undefined,
        notes: notes[refund.refund_id]?.trim() || undefined,
      });

      setMessage(`Refund #${refund.refund_id} updated successfully.`);
      await loadRefunds();
    } catch (err) {
      setError(err.message || "Could not update the refund.");
    } finally {
      setBusyId(null);
    }
  }

  const visibleRefunds = refunds.filter(
    (refund) => filter === "ALL" || refund.refund_status === filter
  );

  const pendingCount = refunds.filter(
    (refund) => refund.refund_status === "PENDING"
  ).length;

  const pendingAmount = refunds
    .filter((refund) =>
      ["PENDING", "PROCESSING"].includes(refund.refund_status)
    )
    .reduce((sum, refund) => sum + Number(refund.refund_amount || 0), 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Refund Management
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review cancellation refunds and record refund transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRefunds}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pending refunds</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {pendingCount}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Pending / processing amount
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {money(pendingAmount)}
            </p>
          </section>
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "NOT_REQUIRED"].map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  filter === status
                    ? "bg-teal-700 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            )
          )}
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-500">Loading refunds...</p>
        ) : visibleRefunds.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No refunds found for this status.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {visibleRefunds.map((refund) => {
              const terminal = ["COMPLETED", "NOT_REQUIRED"].includes(
                refund.refund_status
              );
              const zeroRefund = Number(refund.refund_amount || 0) <= 0;
              const isBusy = busyId === refund.refund_id;

              return (
                <section
                  key={refund.refund_id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Refund #{refund.refund_id}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Booking #{refund.booking_id}
                        {refund.booking_reference
                          ? ` · ${refund.booking_reference}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Customer: {refund.customer_name || "Unknown"}
                      </p>
                    </div>

                    <span
                      className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle(refund.refund_status)}`}
                    >
                      {refund.refund_status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Amount paid</p>
                      <p className="mt-1 font-semibold">{money(refund.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Refund rate</p>
                      <p className="mt-1 font-semibold">
                        {Number(refund.refund_percentage || 0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Refund due</p>
                      <p className="mt-1 text-lg font-bold text-teal-700">
                        {money(refund.refund_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <p>{refund.policy_reason}</p>
                    <p className="mt-1">
                      Days before travel: {refund.days_before_travel}
                    </p>
                    {refund.transaction_reference && (
                      <p className="mt-1 break-all">
                        Transaction reference: {refund.transaction_reference}
                      </p>
                    )}
                  </div>

                  {!terminal && !zeroRefund && (
                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Transaction reference
                        </label>
                        <input
                          value={references[refund.refund_id] ?? refund.transaction_reference ?? ""}
                          onChange={(event) =>
                            setReferences((current) => ({
                              ...current,
                              [refund.refund_id]: event.target.value,
                            }))
                          }
                          placeholder="Enter bank or payment transaction ID"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Admin notes
                        </label>
                        <textarea
                          value={notes[refund.refund_id] ?? refund.notes ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [refund.refund_id]: event.target.value,
                            }))
                          }
                          rows={2}
                          placeholder="Optional notes about this refund"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {refund.refund_status !== "PROCESSING" && (
                          <button
                            type="button"
                            disabled={isBusy || busyId !== null}
                            onClick={() => changeStatus(refund, "PROCESSING")}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isBusy ? "Saving..." : "Process Refund"}
                          </button>
                        )}

                        {refund.refund_status !== "FAILED" && (
                          <button
                            type="button"
                            disabled={isBusy || busyId !== null}
                            onClick={() => changeStatus(refund, "FAILED")}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Mark Failed
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy || busyId !== null}
                          onClick={() => changeStatus(refund, "COMPLETED")}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  )}

                  {zeroRefund && refund.refund_status !== "NOT_REQUIRED" && (
                    <p className="mt-4 text-sm text-slate-500">
                      No refund is due under the cancellation policy.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
