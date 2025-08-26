"use client";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChalkboardTeacher,
  faGraduationCap,
  faChartLine,
  faUserFriends,
  faCog,
  faBell,
  faCalculator,
} from "@fortawesome/free-solid-svg-icons";

export default function DashboardGlass() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="logo">EduGlass</div>
        <nav>
          <a href="#" className="nav-item active">
            <FontAwesomeIcon icon={faChalkboardTeacher} />
            Dashboard
          </a>
          <a href="#" className="nav-item">
            <FontAwesomeIcon icon={faGraduationCap} />
            Courses
          </a>
          <a href="#" className="nav-item">
            <FontAwesomeIcon icon={faChartLine} />
            Analytics
          </a>
          <a href="#" className="nav-item">
            <FontAwesomeIcon icon={faUserFriends} />
            Students
          </a>
          <a href="#" className="nav-item">
            <FontAwesomeIcon icon={faCog} />
            Settings
          </a>
        </nav>
      </aside>
      {/* Main Content */}
      <main style={{ padding: "3rem", animation: "fadeIn 0.5s ease-in" }}>
        <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <h1 className="glass" style={{ padding: "1rem", borderRadius: "12px" }}>Welcome, Professor Smith</h1>
          <div className="user-menu" style={{ display: "flex", alignItems: "center" }}>
            <FontAwesomeIcon icon={faBell} style={{ marginRight: "1.5rem", color: "var(--text)" }} />
            <img src="/assets/images/edueronLogo.png" alt="User" className="avatar glass" />
          </div>
        </div>
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card glass">
            <h3>Active Students</h3>
            <div className="value" style={{ fontSize: "2.5rem", margin: "1rem 0" }}>2,456</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "80%" }}></div>
            </div>
          </div>
          <div className="stat-card glass">
            <h3>Course Completion</h3>
            <div className="value" style={{ fontSize: "2.5rem", margin: "1rem 0" }}>78%</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "78%" }}></div>
            </div>
          </div>
          <div className="stat-card glass">
            <h3>New Enrollment</h3>
            <div className="value" style={{ fontSize: "2.5rem", margin: "1rem 0" }}>327</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "65%" }}></div>
            </div>
          </div>
        </div>
        {/* Courses Section */}
        <div className="courses-grid" style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <div className="course-card glass">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3>Advanced Mathematics</h3>
              <FontAwesomeIcon icon={faCalculator} style={{ color: "var(--primary)" }} />
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "65%" }}></div>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
              <span>34 Students</span>
              <span>12 Lessons</span>
            </div>
          </div>
          {/* Add more course cards as needed */}
        </div>
      </main>
    </div>
  );
} 