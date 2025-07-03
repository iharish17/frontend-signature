import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Context/AuthContext';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white px-4 py-3 flex flex-wrap justify-between items-center shadow-md">
      <Link to="/" className="text-xl font-bold mb-2 md:mb-0">
        SignMate
      </Link>

      {user && (
        <div className="flex flex-wrap gap-4 items-center">
          <Link to="/upload" className="hover:underline whitespace-nowrap">
            📤 Upload & Sign
          </Link>
          <Link to="/documents" className="hover:underline whitespace-nowrap">
            📄 My Documents
          </Link>
          <span className="bg-blue-800 px-3 py-1 rounded text-sm whitespace-nowrap">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
