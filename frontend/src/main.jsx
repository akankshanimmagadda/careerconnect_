import React, { createContext, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import axios from "./api/axios";

export const Context = createContext({
  isAuthorized: false,
});

const AppWrapper = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState({});
  const [socket, setSocket] = useState(null);

  // Check for existing token and fetch user data on mount
  useEffect(() => {
    const token = localStorage.getItem('jobToken');
    if (token) {
      // Fetch current user data to validate token
      axios.get('/api/v1/user/getuser')
        .then(({ data }) => {
          setUser(data.user);
          setIsAuthorized(true);
        })
        .catch(() => {
          // Token is invalid or expired
          localStorage.removeItem('jobToken');
          setIsAuthorized(false);
          setUser({});
        });
    }
  }, []);

  return (
    <Context.Provider
      value={{
        isAuthorized,
        setIsAuthorized,
        user,
        setUser,
        socket,
        setSocket,
      }}
    >
      <App />
    </Context.Provider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
