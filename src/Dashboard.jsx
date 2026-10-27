import { useState } from "react";
import { getInitialStudents } from "./mockData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import jsPDF from "jspdf";

export default function Dashboard({ user, onLogout }) {
  const isStudent = user.role === "student";

  const [studentName, setStudentName] = useState(isStudent ? user.studentName : "");
  const [rollNumber, setRollNumber] = useState(isStudent ? user.rollNumber : "");
  const [password] = useState(isStudent ? user.password || "" : "");
  const [subject, setSubject] = useState("");
  
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-10");

  const [students, setStudents] = useState(getInitialStudents);
  const [foundStudent, setFoundStudent] = useState(null);
  const [rangeRecords, setRangeRecords] = useState([]);
  
  const [editingDate, setEditingDate] = useState(null);
  const [editAttendance, setEditAttendance] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const searchAttendance = () => {
    if (!studentName || !rollNumber || !subject || (!startDate && !endDate)) {
      setErrorMessage("Please fill Student Name, Roll Number, Subject, and at least one Date.");
      setFoundStudent(null);
      setRangeRecords([]);
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setErrorMessage("Start Date cannot be greater than End Date.");
      setRangeRecords([]);
      return;
    }

    const student = students.find(
      (s) =>
        s.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() &&
        s.rollNumber === rollNumber &&
        (isStudent ? s.password === password : true)
    );

    if (!student) {
      setFoundStudent(null);
      setRangeRecords([]);
      setErrorMessage(`No student found for "${studentName}" (Roll No: ${rollNumber}).`);
      return;
    }

    const allAttendanceDates = student.attendance || {};
    const filteredRecords = [];

    Object.keys(allAttendanceDates).forEach((d) => {
      let isMatch = false;
      if (startDate && !endDate && d === startDate) isMatch = true;
      else if (!startDate && endDate && d === endDate) isMatch = true;
      else if (startDate && endDate && d >= startDate && d <= endDate) isMatch = true;

      if (isMatch) {
        const statusForSubject = allAttendanceDates[d]?.[subject];
        if (statusForSubject) {
          filteredRecords.push({ date: d, status: statusForSubject });
        }
      }
    });

    if (filteredRecords.length === 0) {
      setFoundStudent(student);
      setRangeRecords([]);
      setErrorMessage(`No attendance records found for the selected date(s) in ${subject}.`);
      return;
    }

    setFoundStudent(student);
    setRangeRecords(filteredRecords);
    setEditingDate(null);
    setErrorMessage("");
  };

  const saveAttendanceForDate = (dateToUpdate) => {
    if (!foundStudent || !subject || !dateToUpdate || !editAttendance) return;

    const oldAttendance = foundStudent.attendance?.[dateToUpdate]?.[subject];
    const newAttendance = editAttendance;

    if (oldAttendance === newAttendance) {
      setEditingDate(null);
      return;
    }

    let change = 0;
    if (oldAttendance === "Present" && newAttendance === "Absent") change = -1;
    if (oldAttendance === "Absent" && newAttendance === "Present") change = 1;

    let updatedStudentObj = null;

    setStudents((prevStudents) => {
      const updatedStudents = prevStudents.map((s) => {
        if (s.rollNumber !== foundStudent.rollNumber) return s;
        
        const updated = {
          ...s,
          [subject]: {
            ...s[subject],
            attendedLecture: s[subject].attendedLecture + change
          },
          attendance: {
            ...s.attendance,
            [dateToUpdate]: {
              ...s.attendance[dateToUpdate],
              [subject]: newAttendance
            }
          }
        };
        updatedStudentObj = updated;
        return updated;
      });

      localStorage.setItem("portal_students_data", JSON.stringify(updatedStudents));
      return updatedStudents;
    });

    if (updatedStudentObj) {
      setFoundStudent(updatedStudentObj);
    }

    setRangeRecords((prev) =>
      prev.map((rec) => (rec.date === dateToUpdate ? { ...rec, status: newAttendance } : rec))
    );
    setEditingDate(null);
  };

  const getSubjectStats = () => {
    if (!foundStudent || !subject) return null;
    
    const currentStudent = students.find((s) => s.rollNumber === foundStudent.rollNumber) || foundStudent;
    const subjectData = currentStudent[subject];
    if (!subjectData) return null;

    const totalLecture = subjectData.totalLecture;
    const attendedLecture = subjectData.attendedLecture;
    const presentPct = totalLecture > 0 ? Math.round((attendedLecture / totalLecture) * 100) : 0;
    const absentPct = 100 - presentPct;

    const category = presentPct >= 75 ? "Regular" : presentPct >= 60 ? "Sub-Regular" : "Not Regular";
    const status = presentPct >= 75 ? "Safe" : presentPct >= 60 ? "Warning" : "Critical";

    return { totalLecture, attendedLecture, presentPct, absentPct, category, status };
  };

  const stats = getSubjectStats();

  // 📊 4 Parameters in Single Chart Data Preparation
  const presentCount = rangeRecords.filter(r => r.status === "Present").length;
  const absentCount = rangeRecords.filter(r => r.status === "Absent").length;

  const chartData = stats ? [
    { name: "Attended", count: stats.attendedLecture, color: "#3b82f6" }, 
    { name: "Total", count: stats.totalLecture, color: "#8b5cf6" },       
    { name: "Present", count: presentCount, color: "#22c55e" },       
    { name: "Absent", count: absentCount, color: "#ef4444" }          
  ] : [];

  // 📥 Download PDF Report Function using jsPDF
  const downloadPDFReport = () => {
    if (!foundStudent || !stats) return;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Student Attendance Report", 20, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Student Name: ${foundStudent.studentName}`, 20, 35);
    doc.text(`Roll Number: ${foundStudent.rollNumber}`, 20, 45);
    doc.text(`Subject: ${subject}`, 20, 55);
    doc.text(`Total Attended: ${stats.attendedLecture} / ${stats.totalLecture}`, 20, 65);
    doc.text(`Present Rate: ${stats.presentPct}%`, 20, 75);
    doc.text(`Status Category: ${stats.category} (${stats.status})`, 20, 85);

    doc.text("Attendance Records by Date:", 20, 105);
    let yPos = 115;
    rangeRecords.forEach((rec, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${index + 1}. Date: ${rec.date}  --->  Status: ${rec.status}`, 20, yPos);
      yPos += 10;
    });

    doc.save(`${foundStudent.studentName}_${subject}_Attendance.pdf`);
  };

  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">🎓</div>
          <div className="brand-text">
            <span>EduPortal</span>
            <small>v2.4 Management</small>
          </div>
        </div>

        <div className="sidebar-menu">
          <div className="menu-label">Main Navigation</div>
          <a href="#dashboard" className="menu-item active">
            <span className="icon">📊</span> Dashboard
          </a>
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {isStudent ? user.studentName.charAt(0).toUpperCase() : "T"}
          </div>
          <div className="user-info">
            <span className="name">{isStudent ? user.studentName : "Teacher Account"}</span>
            <span className="role">{isStudent ? `Roll No: ${user.rollNumber}` : "Faculty Member"}</span>
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div className="header-title">
            <h1>Attendance Overview</h1>
            <p>Real-time academic performance & records dashboard</p>
          </div>
          <div className="header-actions">
            <span className="badge-pill">{isStudent ? "Student Mode" : "Teacher Mode"}</span>
            <button onClick={onLogout} className="pro-logout-btn">
              <span>Sign Out</span> 🚪
            </button>
          </div>
        </header>

        <div className="portal-body">
          <div className="pro-card search-card">
            <div className="card-top">
              <h3>Search Criteria</h3>
              <p>Filter data by student details, subject, and date range</p>
            </div>

            <div className="pro-form-grid">
              <div className="field-group">
                <label>Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  readOnly={isStudent}
                  className={isStudent ? "readonly-field" : ""}
                />
              </div>

              <div className="field-group">
                <label>Roll Number</label>
                <input
                  type="number"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  readOnly={isStudent}
                  className={isStudent ? "readonly-field" : ""}
                />
              </div>

              <div className="field-group">
                <label>Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {["AWD", "WFS", "ASP.NET", "Linux", "SE"].map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="field-group">
                <label>End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {errorMessage && <div className="pro-alert-error">{errorMessage}</div>}

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={searchAttendance} className="pro-btn-primary" style={{ flex: 1 }}>
                View Attendance
              </button>
              {foundStudent && stats && (
                <button onClick={downloadPDFReport} style={{ backgroundColor: "#4f46e5", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
                  📥 Download PDF Report
                </button>
              )}
            </div>
          </div>

          {foundStudent && rangeRecords.length > 0 && stats && (
            <div className="pro-results">
              <div className="pro-card table-card">
                <div className="table-responsive">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Roll No.</th>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Attendance</th>
                        {!isStudent && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rangeRecords.map((record) => {
                        const isRowEditing = editingDate === record.date;
                        return (
                          <tr key={record.date}>
                            <td className="fw-bold">{foundStudent.studentName}</td>
                            <td>{foundStudent.rollNumber}</td>
                            <td><span className="sub-badge">{subject}</span></td>
                            <td>{record.date.split("-").reverse().join("-")}</td>
                            <td>
                              {!isRowEditing ? (
                                <span className={`table-status ${record.status.toLowerCase()}`}>
                                  {record.status}
                                </span>
                              ) : (
                                <select
                                  value={editAttendance}
                                  onChange={(e) => setEditAttendance(e.target.value)}
                                  className="attendance-edit-select"
                                >
                                  <option value="Present">Present</option>
                                  <option value="Absent">Absent</option>
                                </select>
                              )}
                            </td>
                            {!isStudent && (
                              <td>
                                {!isRowEditing ? (
                                  <button
                                    onClick={() => {
                                      setEditingDate(record.date);
                                      setEditAttendance(record.status);
                                    }}
                                    className="edit-attendance-btn"
                                  >
                                    ✏️ Edit
                                  </button>
                                ) : (
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button onClick={() => setEditingDate(null)} className="cancel-edit-btn">
                                      Cancel
                                    </button>
                                    <button onClick={() => saveAttendanceForDate(record.date)} className="save-attendance-btn">
                                      Save
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="attendance-analysis-heading" style={{ marginTop: "30px" }}>
                <h3>Attendance Analysis & Performance</h3>
                <p>Overall performance breakdown and metrics</p>
              </div>

              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-icon blue">📚</div>
                  <div className="metric-data">
                    <span className="label">Total Attended Lectures</span>
                    <span className="val">
                      {stats.attendedLecture} / {stats.totalLecture}
                      <br />
                      <small>Lectures</small>
                    </span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon green">📈</div>
                  <div className="metric-data">
                    <span className="label">Present Rate</span>
                    <span className="val green">{stats.presentPct}%</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon red">📉</div>
                  <div className="metric-data">
                    <span className="label">Absent Rate</span>
                    <span className="val red">{stats.absentPct}%</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-icon purple">🎯</div>
                  <div className="metric-data">
                    <span className="label">Category Status</span>
                    <span className={`status-tag ${stats.status.toLowerCase()}`}>
                      {stats.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* 📊 Complete Performance Overview Bar Graph Component */}
              <div className="pro-card" style={{ marginTop: "20px", padding: "20px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h4 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "600" }}>Complete Performance Overview</h4>
                  <span style={{ fontSize: "12px", background: "#e0e7ff", color: "#4f46e5", padding: "4px 10px", borderRadius: "20px", fontWeight: "600" }}>
                    {subject} Subject
                  </span>
                </div>
                
                <div style={{ width: "100%", height: "300px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 13 }} axisLine={{ stroke: "#cbd5e1" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 13 }} axisLine={{ stroke: "#cbd5e1" }} />
                      <Tooltip 
                        contentStyle={{ background: "#1e293b", color: "#fff", borderRadius: "8px", border: "none" }}
                        formatter={(value) => [`${value} Count`, "Value"]}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={50}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}