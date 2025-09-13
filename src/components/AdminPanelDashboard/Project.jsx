// src/components/adminpanel/Project.jsx
// <<< paste these lines at the very top of src/components/adminpanel/Project.jsx >>>
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
import { FolderOpen, User, Users, Plus, Trash2, Award } from "lucide-react";

/** Robust fetch + JSON parsing helper */
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

function Project() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [serverHealthy, setServerHealthy] = useState(true);

  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectMentor, setNewProjectMentor] = useState("");
  const [newProjectStudents, setNewProjectStudents] = useState("");

  const mountedRef = useRef(true);

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
        console.log("Fetching projects from", apiUrl("/api/projects"));
        const data = await fetchJSON(apiUrl("/api/projects"), { signal: ac.signal });
        if (mountedRef.current) setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch projects:", err);
          if (mountedRef.current) setError(err.message || "Could not load projects");
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

  const applyProjectUpdate = (id, updater) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  };

  const addProject = async () => {
    setError(null);
    const title = newProjectTitle.trim();
    const mentor = newProjectMentor.trim();
    const students = parseInt(newProjectStudents, 10) || 0;

    if (!title || !mentor) {
      setError("Project title and mentor are required.");
      return;
    }

    try {
      const created = await fetchJSON(apiUrl("/api/projects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mentor, students }),
      });
      setProjects((p) => [...p, created]);
      setNewProjectTitle("");
      setNewProjectMentor("");
      setNewProjectStudents("");
    } catch (err) {
      console.error("Add project error:", err);
      setError(err.message || "Failed to add project");
    }
  };

  const removeProject = async (id) => {
    setError(null);
    const prev = projects;
    setProjects((p) => p.filter((proj) => proj.id !== id));
    try {
      await fetchJSON(apiUrl(`/api/projects/${id}`), { method: "DELETE" });
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete project");
      setProjects(prev);
    }
  };

  const updateProjectStudents = async (id, newStudentCount) => {
    setError(null);
    const parsed = parseInt(newStudentCount, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Students must be a non-negative number.");
      return;
    }

    const prev = projects;
    applyProjectUpdate(id, (p) => ({ ...p, students: parsed }));
    setSavingId(id);
    try {
      const updated = await fetchJSON(apiUrl(`/api/projects/${id}/students`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: parsed }),
      });
      applyProjectUpdate(id, () => updated);
    } catch (err) {
      console.error("Patch students error:", err);
      setError(err.message || "Failed to update students");
      setProjects(prev);
    } finally {
      setSavingId(null);
    }
  };

  const updateProject = async (id, { title, mentor, students }) => {
    setError(null);
    if (!title || !mentor || students === undefined) {
      setError("title, mentor and students required");
      return;
    }

    const prev = projects;
    setSavingId(id);
    applyProjectUpdate(id, (p) => ({ ...p, title, mentor, students }));

    try {
      const updated = await fetchJSON(apiUrl(`/api/projects/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, mentor, students }),
      });
      applyProjectUpdate(id, () => updated);
    } catch (err) {
      console.error("Update project error:", err);
      setError(err.message || "Failed to update project");
      setProjects(prev);
    } finally {
      setSavingId(null);
    }
  };

  const ProjectCard = ({ project }) => {
    const [editingStudents, setEditingStudents] = useState(String(project.students ?? 0));
    const [localMentor, setLocalMentor] = useState(project.mentor);
    const [localTitle, setLocalTitle] = useState(project.title);
    const [isEditingFull, setIsEditingFull] = useState(false);

    useEffect(() => {
      setEditingStudents(String(project.students ?? 0));
      setLocalMentor(project.mentor);
      setLocalTitle(project.title);
    }, [project.id, project.students, project.mentor, project.title]);

    return (
      <motion.div
        className="stat-card p-6 cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-gradient-accent">
            <FolderOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEditingFull ? (
                <input
                  className="input-field p-1"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                />
              ) : (
                project.title
              )}
            </h3>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            {isEditingFull ? (
              <input
                className="input-field p-1"
                value={localMentor}
                onChange={(e) => setLocalMentor(e.target.value)}
              />
            ) : (
              <span>Mentor: {project.mentor}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                className="input-field p-1 w-20"
                value={editingStudents}
                onChange={(e) => setEditingStudents(e.target.value)}
                onBlur={() => {
                  if (editingStudents !== String(project.students ?? 0)) {
                    updateProjectStudents(project.id, editingStudents);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                disabled={savingId === project.id}
              />
              <span>Students</span>
              {savingId === project.id && <span className="text-xs ml-2">Saving...</span>}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={() => removeProject(project.id)}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={savingId === project.id}
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </motion.button>

          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {isEditingFull ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateProject(project.id, {
                      title: localTitle.trim(),
                      mentor: localMentor.trim(),
                      students: parseInt(editingStudents, 10) || 0,
                    });
                    setIsEditingFull(false);
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={savingId === project.id}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setLocalMentor(project.mentor);
                    setLocalTitle(project.title);
                    setEditingStudents(String(project.students ?? 0));
                    setIsEditingFull(false);
                    setError(null);
                  }}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditingFull(true)} className="btn-primary w-full flex items-center justify-center gap-2">
                <Award className="w-4 h-4" />
                Upskill
              </button>
            )}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <main className="p-4 sm:p-6 flex flex-col gap-6">
      <motion.h2 className="text-2xl font-bold text-foreground mb-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        Manage Projects
      </motion.h2>

      {!serverHealthy && <div className="p-3 rounded-md bg-yellow-100 text-yellow-900">Server appears unreachable. Check backend is running and CORS is enabled.</div>}

      <motion.div className="stat-card p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="text-xl font-bold text-foreground mb-4">Add New Project</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Project Title</label>
            <input type="text" value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} placeholder="Enter project title..." className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Mentor Name</label>
            <input type="text" value={newProjectMentor} onChange={(e) => setNewProjectMentor(e.target.value)} placeholder="Enter mentor name..." className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Number of Students</label>
            <input type="number" value={newProjectStudents} onChange={(e) => setNewProjectStudents(e.target.value)} placeholder="Enter number..." min="0" className="input-field" />
          </div>
        </div>
        <motion.button onClick={addProject} className="btn-primary flex items-center gap-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Plus className="w-4 h-4" />
          Add Project
        </motion.button>
      </motion.div>

      {error && <div className="text-sm text-red-500">{error}</div>}
      {loading ? <div className="text-sm text-muted-foreground">Loading projects...</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>}
    </main>
  );
}

export default Project;
