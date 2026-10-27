import { useState, useEffect } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import "./App.css";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("attendance_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("attendance_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("attendance_user");
    }
  }, [user]);

  return (
    <div>
      {!user ? (
        <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
      ) : (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      )}
    </div>
  );
}

export default App;