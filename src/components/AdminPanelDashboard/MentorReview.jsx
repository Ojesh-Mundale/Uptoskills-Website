// <<< paste these lines at the very top of src/components/adminpanel/MentorReview.jsx >>>
const RAW_API = process.env.REACT_APP_API_URL ?? "";
// Force localhost backend for local dev if env is empty
const API_BASE = RAW_API.replace(/\/$/, "") || "http://localhost:5000";

function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}
// <<< end paste >>>

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Star, User, Plus, Trash2 } from "lucide-react";

/** Robust fetch + JSON parsing helper (same as Project.jsx) */
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const contentType = res.headers.get("content-type") || "";
  let payload = null;

  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch (e) {
      payload = null;
    }
  } else {
    try {
      payload = await res.text();
    } catch (e) {
      payload = null;
    }
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && payload.message
        ? payload.message
        : `Request failed: ${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return payload;
}

function MentorReview() {
  const [mentorReviews, setMentorReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverHealthy, setServerHealthy] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const [newReviewMentor, setNewReviewMentor] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    const ac = new AbortController();

    const fetchAll = async () => {
      setError(null);
      setLoading(true);

      // health check
      try {
        const h = await fetch(apiUrl("/health"), { signal: ac.signal });
        setServerHealthy(h.ok);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Health check failed:", err);
          setServerHealthy(false);
        }
      }

      try {
        const data = await fetchJSON(apiUrl("/api/mentor-reviews"), { signal: ac.signal });
        if (mountedRef.current) setMentorReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch mentor reviews:", err);
          if (mountedRef.current) setError(err.message || "Could not load reviews");
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      mountedRef.current = false;
      ac.abort();
    };
  }, []);

  const addMentorReview = async () => {
    setError(null);
    const mentor = newReviewMentor.trim();
    const feedback = newReviewText.trim();
    const rating = parseFloat(newReviewRating);

    if (!mentor || !feedback || Number.isNaN(rating)) {
      setError("Mentor, feedback and numeric rating are required.");
      return;
    }
    if (rating < 0 || rating > 5) {
      setError("Rating must be between 0 and 5.");
      return;
    }

    try {
      const created = await fetchJSON(apiUrl("/api/mentor-reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentor, feedback, rating }),
      });
      setMentorReviews((prev) => [...prev, created]);
      setNewReviewMentor("");
      setNewReviewText("");
      setNewReviewRating("");
    } catch (err) {
      console.error("Add review error:", err);
      setError(err.message || "Failed to add review");
    }
  };

  const removeMentorReview = async (id) => {
    setError(null);
    const prev = mentorReviews;
    setMentorReviews((p) => p.filter((r) => r.id !== id));
    try {
      await fetchJSON(apiUrl(`/api/mentor-reviews/${id}`), { method: "DELETE" });
    } catch (err) {
      console.error("Delete review error:", err);
      setError(err.message || "Failed to delete review");
      setMentorReviews(prev);
    }
  };

  const renderStars = (rating) => {
    const rounded = Math.round(rating);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rounded ? "text-warning fill-warning" : "text-muted-foreground"}`}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-foreground">{rating}</span>
      </div>
    );
  };

  return (
    <main className="p-4 sm:p-6 flex flex-col gap-6">
      <motion.h2
        className="text-2xl font-bold text-foreground mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        Mentor Reviews
      </motion.h2>

      {!serverHealthy && (
        <div className="p-3 rounded-md bg-yellow-100 text-yellow-900">
          Server appears unreachable. Check backend is running and CORS is enabled.
        </div>
      )}

      <motion.div className="stat-card p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-xl font-bold text-foreground mb-4">Add New Review</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Mentor Name</label>
            <input type="text" placeholder="Mentor Name" value={newReviewMentor} onChange={(e) => setNewReviewMentor(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Review Text</label>
            <input type="text" placeholder="Review Text" value={newReviewText} onChange={(e) => setNewReviewText(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Rating (0-5)</label>
            <input type="number" placeholder="Rating (0-5)" value={newReviewRating} onChange={(e) => setNewReviewRating(e.target.value)} min="0" max="5" step="0.1" className="input-field" />
          </div>
        </div>

        <motion.button onClick={addMentorReview} className="btn-primary flex items-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Plus className="w-4 h-4" />
          Add Review
        </motion.button>
      </motion.div>

      {error && <div className="text-sm text-red-500">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading reviews...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentorReviews.map((review, idx) => (
            <motion.div
              key={review.id}
              className="stat-card p-6 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ scale: 1.02, y: -4 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-accent">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground">{review.mentor}</h4>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-muted-foreground mt-1" />
                <p className="text-muted-foreground italic leading-relaxed">"{review.feedback}"</p>
              </div>

              <div className="flex items-center justify-between">
                {renderStars(review.rating)}
                <button
                  onClick={() => removeMentorReview(review.id)}
                  className="ml-4 btn-secondary flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}

export default MentorReview;
