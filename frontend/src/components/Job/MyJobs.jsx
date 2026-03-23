import axios from "../../api/axios";
import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaCheck } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";
import { Context } from "../../main";
import { useNavigate } from "react-router-dom";

const MyJobs = () => {
  const [myJobs, setMyJobs] = useState([]);
  const [editingMode, setEditingMode] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const { isAuthorized, user } = useContext(Context);

  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthorized || (user && user.role !== "Employer")) {
      navigateTo("/");
    }
  }, [isAuthorized, user, navigateTo]);

  //Fetching all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data } = await axios.get(
          "/api/v1/job/getmyjobs",
          { withCredentials: true }
        );
        setMyJobs(data.myJobs);
      } catch (error) {
        toast.error(error.response.data.message);
        setMyJobs([]);
      }
    };
    fetchJobs();
  }, []);
  if (!isAuthorized || (user && user.role !== "Employer")) {
    navigateTo("/");
  }

  //Function For Enabling Editing Mode
  const handleEnableEdit = (jobId) => {
    //Here We Are Giving Id in setEditingMode because We want to enable only that job whose ID has been send.
    setEditingMode(jobId);
  };

  //Function For Disabling Editing Mode
  const handleDisableEdit = () => {
    setEditingMode(null);
  };

  //Function For Updating The Job
  const handleUpdateJob = async (jobId) => {
    const jobToUpdate = myJobs.find((job) => job._id === jobId);
    const updatedJob = { ...jobToUpdate };
    if (typeof updatedJob.techStack === "string") {
      updatedJob.techStack = updatedJob.techStack.split(",").map(s => s.trim()).filter(s => s !== "");
    }
    await axios
      .put(`/api/v1/job/update/${jobId}`, updatedJob, {
      })
      .then((res) => {
        toast.success(res.data.message);
        setEditingMode(null);
      })
      .catch((error) => {
        toast.error(error.response.data.message);
      });
  };

  //Function For Deleting Job
  const handleDeleteJob = async (jobId) => {
    await axios
      .delete(`/api/v1/job/delete/${jobId}`, {
      })
      .then((res) => {
        toast.success(res.data.message);
        setMyJobs((prevJobs) => prevJobs.filter((job) => job._id !== jobId));
      })
      .catch((error) => {
        toast.error(error.response.data.message);
      });
  };

  const handleInputChange = (jobId, field, value) => {
    // Update the job object in the jobs state with the new value
    setMyJobs((prevJobs) =>
      prevJobs.map((job) =>
        job._id === jobId ? { ...job, [field]: value } : job
      )
    );
  };

  const filteredJobs = myJobs.filter((job) => {
    if (statusFilter === "All") return true;
    return (job.status || "Pending") === statusFilter;
  });

  return (
    <section className="myJobs page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
          <h1>Manage Your Job Postings</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontWeight: 700, color: "#334155" }}>Approval Status</label>
            <select
              className="searchInput"
              style={{ margin: 0, minWidth: "180px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {filteredJobs.length > 0 ? (
          <div className="banner">
            {filteredJobs.map((element) => (
              <div className="card" key={element._id}>
                <div className="content">
                  <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-end" }}>
                    <span
                      className={`badge ${element.status === "Approved" ? "accepted" : element.status === "Rejected" ? "rejected" : "applied"}`}
                      style={{
                        background: element.status === "Approved" ? "#dcfce7" : element.status === "Rejected" ? "#fee2e2" : "#dbeafe",
                      }}
                    >
                      {element.status || "Pending"}
                    </span>
                  </div>
                  <div className="short_fields">
                    <div>
                      <span>Job Title</span>
                      <input
                        type="text"
                        disabled={editingMode !== element._id}
                        value={element.title}
                        onChange={(e) => handleInputChange(element._id, "title", e.target.value)}
                      />
                    </div>
                    <div>
                      <span>Category</span>
                      <select
                        value={element.category}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "category", e.target.value)}
                      >
                        <option value="Graphics & Design">Graphics & Design</option>
                        <option value="Mobile App Development">Mobile App Development</option>
                        <option value="Frontend Web Development">Frontend Web Development</option>
                        <option value="MERN Stack Development">MERN STACK Development</option>
                        <option value="Account & Finance">Account & Finance</option>
                        <option value="Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Video Animation">Video Animation</option>
                        <option value="MEAN Stack Development">MEAN STACK Development</option>
                        <option value="MEVN Stack Development">MEVN STACK Development</option>
                        <option value="Data Entry Operator">Data Entry Operator</option>
                      </select>
                    </div>
                    <div>
                      <span>Location (City, Country)</span>
                      <div style={{ display: "flex", gap: "10px", flexDirection: "row" }}>
                        <input
                          type="text"
                          disabled={editingMode !== element._id}
                          value={element.city}
                          placeholder="City"
                          onChange={(e) => handleInputChange(element._id, "city", e.target.value)}
                        />
                        <input
                          type="text"
                          disabled={editingMode !== element._id}
                          value={element.country}
                          placeholder="Country"
                          onChange={(e) => handleInputChange(element._id, "country", e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <span>Salary Configuration</span>
                      {element.fixedSalary ? (
                        <input
                          type="number"
                          disabled={editingMode !== element._id}
                          value={element.fixedSalary}
                          placeholder="Fixed Salary"
                          onChange={(e) => handleInputChange(element._id, "fixedSalary", e.target.value)}
                        />
                      ) : (
                        <div style={{ display: "flex", gap: "10px", flexDirection: "row" }}>
                          <input
                            type="number"
                            disabled={editingMode !== element._id}
                            value={element.salaryFrom}
                            placeholder="From"
                            onChange={(e) => handleInputChange(element._id, "salaryFrom", e.target.value)}
                          />
                          <input
                            type="number"
                            disabled={editingMode !== element._id}
                            value={element.salaryTo}
                            placeholder="To"
                            onChange={(e) => handleInputChange(element._id, "salaryTo", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <span>Visibility Status</span>
                      <select
                        value={element.expired}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "expired", e.target.value)}
                      >
                        <option value={false}>Active / Live</option>
                        <option value={true}>Expired / Hidden</option>
                      </select>
                    </div>
                    <div>
                      <span>Work Mode</span>
                      <select
                        value={element.workMode}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "workMode", e.target.value)}
                      >
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </div>
                    <div>
                      <span>Company Type</span>
                      <select
                        value={element.companyType}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "companyType", e.target.value)}
                      >
                        <option value="Startup">Startup</option>
                        <option value="MNC">MNC</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <span>Tech Stack (comma separated)</span>
                      <input
                        type="text"
                        disabled={editingMode !== element._id}
                        value={Array.isArray(element.techStack) ? element.techStack.join(", ") : element.techStack}
                        onChange={(e) => handleInputChange(element._id, "techStack", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="long_field">
                    <div>
                      <span>Job Description</span>
                      <textarea
                        rows={8}
                        value={element.description}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "description", e.target.value)}
                      />
                    </div>
                    <div>
                      <span>Full Address</span>
                      <textarea
                        rows={3}
                        value={element.location}
                        disabled={editingMode !== element._id}
                        onChange={(e) => handleInputChange(element._id, "location", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="button_wrapper">
                  {editingMode === element._id ? (
                    <>
                      <button onClick={() => handleUpdateJob(element._id)} className="check_btn" title="Save Changes">
                        <FaCheck />
                      </button>
                      <button onClick={() => handleDisableEdit()} className="cross_btn" title="Cancel">
                        <RxCross2 />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleEnableEdit(element._id)} className="edit_btn">
                      Edit Details
                    </button>
                  )}
                  <button onClick={() => handleDeleteJob(element._id)} className="delete_btn">
                    Delete Posting
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "50px" }}>
            <p style={{ color: "#64748b", fontSize: "1.1rem" }}>
              {myJobs.length > 0
                ? `No jobs found for ${statusFilter} status.`
                : "You haven't posted any jobs yet. Start by creating your first job posting!"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MyJobs;


