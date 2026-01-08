// src/pages/ViewDocuments.jsx
import React, { useEffect, useState, useContext } from 'react';
import API from '../utils/api';
import { AuthContext } from '../Context/AuthContext';

function ViewDocuments() {
  const { user } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await API.get("/documents/mine", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setDocs(res.data);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      }
    };
    fetchDocs();
  }, [user.token]);

  const handleDownload = async (id) => {
  try {
    const res = await API.get(
  `/documents/download/${id}`,
  {
    headers: {
      Authorization: `Bearer ${user.token}`
    },
    responseType: "blob"
  }
);


    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "signed-document.pdf";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
    alert("Download failed");
  }
};


  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-2xl font-bold text-center mb-6">📂 My Signed Documents</h2>

      {docs.length === 0 ? (
        <p className="text-center text-gray-500">No signed documents found.</p>
      ) : (
        <ul className="grid gap-4 max-w-3xl mx-auto">
          {docs.map((doc) => (
            <li
              key={doc._id}
              className="bg-white p-4 shadow rounded flex justify-between items-center"
            >
              <span>{doc.filename}</span>
              <button
                onClick={() => handleDownload(doc._id)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ViewDocuments;
