import { useState } from "react";
import { getInitialStudents } from "./mockData";

export default function Login({ onLoginSuccess }) {
  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState({
    studentName: "",
    rollNumber: "",
    teacherEmail: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    const STUDENTS_DATA = getInitialStudents();

    if (role === "student") {
      const { studentName, rollNumber, password } = formData;
      if (!studentName.trim() || !rollNumber.trim() || !password.trim()) {
        setError("Please enter Student Name, Roll Number, and Password.");
        return;
      }

      const match = STUDENTS_DATA.find(
        (s) =>
          s.studentName.toLowerCase().trim() === studentName.trim().toLowerCase() &&
          s.rollNumber === rollNumber.trim() &&
          s.password === password.trim()
      );

      if (match) {
        onLoginSuccess({ role: "student", ...match });
      } else {
        setError("Invalid Student Name, Roll Number, or Password!");
      }
    } else {
      if (
        formData.teacherEmail === "teacher@college.ac.in" &&
        formData.password === "password123"
      ) {
        onLoginSuccess({ role: "teacher", studentName: "", rollNumber: "", password: "" });
      } else {
        setError("Invalid Teacher Credentials!");
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <div className="login-header-text">
            <h1>Login</h1>
            <p>Enter your account details</p>
          </div>

          <div className="role-pills">
            <button
              type="button"
              className={`pill ${role === "student" ? "active" : ""}`}
              onClick={() => { setRole("student"); setError(""); setFormData({ ...formData, password: "" }); }}
            >
              Student
            </button>
            <button
              type="button"
              className={`pill ${role === "teacher" ? "active" : ""}`}
              onClick={() => { setRole("teacher"); setError(""); setFormData({ ...formData, password: "" }); }}
            >
              Teacher
            </button>
          </div>

          <form onSubmit={handleLogin} className="clean-form">
            {error && <div className="error-badge">{error}</div>}

            {role === "student" ? (
              <>
                <div className="input-field">
                  <input
                    type="text"
                    name="studentName"
                    placeholder="Enter Student Name (e.g. Sunny)"
                    value={formData.studentName}
                    onChange={handleChange}
                  />
                </div>
                <div className="input-field">
                  <input
                    type="number"
                    name="rollNumber"
                    placeholder="Enter Roll Number (e.g. 92)"
                    value={formData.rollNumber}
                    onChange={handleChange}
                  />
                </div>
              </>
            ) : (
              <div className="input-field">
                <input
                  type="email"
                  name="teacherEmail"
                  placeholder="Email ID (teacher@college.ac.in)"
                  value={formData.teacherEmail}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="input-field password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <span className="toggle-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "👁️" : "🙈"}
              </span>
            </div>

            <button type="submit" className="primary-btn">Login</button>
          </form>
        </div>

        <div className="login-right">
          <div className="banner-text">
            <h2>Welcome <span>to Student Portal</span></h2>
            <p>Login to access your account</p>
          </div>
        </div>
      </div>
    </div>
  );
}