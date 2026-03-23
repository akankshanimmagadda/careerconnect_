import React, { useContext, useState } from "react";
import { Context } from "../../main";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import toast from "react-hot-toast";
import { GiHamburgerMenu } from "react-icons/gi";
import { AiOutlineClose, AiOutlineHome, AiOutlineUser, AiOutlineLogout } from "react-icons/ai";
import { FaUserShield } from "react-icons/fa";
import { MdOutlineWorkOutline, MdOutlinePostAdd, MdOutlineSaveAlt } from "react-icons/md";
import { TbAnalyze } from "react-icons/tb";
import { HiOutlineClipboardList } from "react-icons/hi";
import { RiChatSmile2Line, RiRobotLine } from "react-icons/ri";
import { BsFileEarmarkText } from "react-icons/bs";
import API_BASE_URL from "../../config";

const Navbar = () => {
  const [show, setShow] = useState(false);
  const { isAuthorized, setIsAuthorized, user, setUser } = useContext(Context);
  const navigateTo = useNavigate();
  const location = useLocation();
  const isInMockInterviewSession = location.pathname.startsWith("/mock-interview/");

  const emitInterviewViolation = () => {
    window.dispatchEvent(new CustomEvent("mock-interview-violation", {
      detail: { type: "navigation" }
    }));
  };

  const handleProtectedNavigation = (event) => {
    if (isInMockInterviewSession) {
      event.preventDefault();
      emitInterviewViolation();
      toast.error("Navigation is not allowed during mock interview.");
      return;
    }
    setShow(false);
  };

  const handleLogout = async () => {
    try {
      const response = await axios.get("/api/v1/user/logout");
      // Clear token from localStorage
      localStorage.removeItem('jobToken');
      toast.success(response.data.message);
      setIsAuthorized(false);
      setUser({});
      navigateTo("/login");
    } catch (error) {
      // Clear token even if logout fails
      localStorage.removeItem('jobToken');
      toast.error(error.response?.data?.message || "Logout failed");
      setIsAuthorized(false);
      setUser({});
      navigateTo("/login");
    }
  };

  const handleLogoutClick = () => {
    if (isInMockInterviewSession) {
      emitInterviewViolation();
      toast.error("Logout is not allowed during mock interview.");
      return;
    }
    handleLogout();
  };

  return (
    <nav className={isAuthorized ? "navbarShow" : "navbarHide"}>
      <div className="container">
        <div className="logo">
        </div>
        <ul className={!show ? "menu" : "show-menu menu"}>
          <li>
            <Link to={"/"} onClick={handleProtectedNavigation}>
              <AiOutlineHome /> HOME
            </Link>
          </li>
          <li>
            <Link to={"/job/getall"} onClick={handleProtectedNavigation}>
              <MdOutlineWorkOutline /> ALL JOBS
            </Link>
          </li>
          {user && user.role && user.role.toLowerCase() !== "admin" ? (
            <li>
              <Link to={"/applications/me"} onClick={handleProtectedNavigation}>
                <HiOutlineClipboardList /> {user.role === "Employer"
                  ? "APPLICANTS"
                  : "MY APPLICATIONS"}
              </Link>
            </li>
          ) : null}
          {user && user.role === "Employer" ? (
            <>
              <li>
                <Link to={"/job/post"} onClick={handleProtectedNavigation}>
                  <MdOutlinePostAdd /> POST JOB
                </Link>
              </li>
              <li>
                <Link to={"/job/me"} onClick={handleProtectedNavigation}>
                  <MdOutlineWorkOutline /> MY JOBS
                </Link>
              </li>
            </>
          ) : null}

          {user && user.role && user.role.toLowerCase() === "admin" ? (
            <li>
              <Link to={"/admin/dashboard"} onClick={handleProtectedNavigation}>
                <FaUserShield /> ADMIN
              </Link>
            </li>
          ) : null}

          {user && user.role === "Job Seeker" ? (
            <>
              <li>
                <Link to={"/analyzer"} onClick={handleProtectedNavigation}>
                  <TbAnalyze /> ANALYZER
                </Link>
              </li>
              <li>
                <Link to={"/resume-prepare"} onClick={handleProtectedNavigation}>
                  <BsFileEarmarkText /> RESUME
                </Link>
              </li>
              <li>
                <Link to={"/saved"} onClick={handleProtectedNavigation}>
                  <MdOutlineSaveAlt /> SAVED
                </Link>
              </li>
              <li>
                <Link to={"/experiences"} onClick={handleProtectedNavigation}>
                  <RiChatSmile2Line /> EXPERIENCES
                </Link>
              </li>
              <li>
                <Link to={"/mock-interviews"} onClick={handleProtectedNavigation}>
                  <RiRobotLine /> MOCK INTERVIEW
                </Link>
              </li>
            </>
          ) : null}

          <li>
            <Link to={"/profile"} onClick={handleProtectedNavigation}>
              <AiOutlineUser /> PROFILE
            </Link>
          </li>
          <button className="logout-btn" onClick={handleLogoutClick}>
            <AiOutlineLogout /> LOGOUT
          </button>
        </ul>
        <div className="hamburger" onClick={() => setShow(!show)}>
          {show ? <AiOutlineClose /> : <GiHamburgerMenu />}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


