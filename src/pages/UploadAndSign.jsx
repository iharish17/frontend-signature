import React, { useState, useRef, useEffect, useContext } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.entry';
import { PDFDocument } from 'pdf-lib';
import { AuthContext } from '../Context/AuthContext';
import API from '../utils/api';
import { toast } from 'react-toastify';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function UploadAndSign() {
  const { user } = useContext(AuthContext);
  const [pdfFile, setPdfFile] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [signedDocs, setSignedDocs] = useState([]);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const canvasRef = useRef();

  useEffect(() => {
    const fetchSignedDocs = async () => {
      try {
        const res = await API.get('/docs/mine', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setSignedDocs(res.data);
      } catch (err) {
        console.error('Failed to fetch documents', err);
      }
    };
    fetchSignedDocs();
  }, [user.token]);

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    setPdfFile(file);
    if (file) renderPDFToCanvas(file);
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) setSignatureImage(URL.createObjectURL(file));
  };

  const renderPDFToCanvas = async (file) => {
    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      const page = await pdf.getPage(1);

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
    };
    fileReader.readAsArrayBuffer(file);
  };

  const onDrag = (e) => {
    const container = canvasRef.current?.getBoundingClientRect();
    if (!container) return;
    const x = e.clientX - container.left - 50;
    const y = container.height - (e.clientY - container.top) - 25;
    setPosition({ x, y });
  };

  const handleSignAndDownload = async () => {
    if (!pdfFile || !signatureImage) return alert('Upload PDF and signature image.');

    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];

    const signatureBytes = await fetch(signatureImage).then((res) => res.arrayBuffer());
    const ext = signatureImage.split('.').pop().toLowerCase();
    const signatureEmbed = ext === 'png'
      ? await pdfDoc.embedPng(signatureBytes)
      : await pdfDoc.embedJpg(signatureBytes);

    page.drawImage(signatureEmbed, {
      x: position.x,
      y: position.y,
      width: 100,
      height: 50,
    });

    const signedBytes = await pdfDoc.save();
    const blob = new Blob([signedBytes], { type: 'application/pdf' });

    // ⬇️ Download to client
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'signed-document.pdf';
    link.click();

    // ⬆️ Upload to backend
    const formData = new FormData();
    formData.append('file', blob, 'signed-document.pdf');

    try {
      await API.post('/docs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });
     toast.success('Signed document uploaded to My Documents!');
    } catch (err) {
      toast.error('Upload failed');
    }
  };

  const downloadSignedFromBackend = async (id) => {
  try {
    const res = await API.get(`/docs/${id}`, {
      headers: { Authorization: `Bearer ${user.token}` },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'signed-document.pdf');
    document.body.appendChild(link);
    link.click();
  } catch (err) {
    alert('Download failed');
  }
};

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto grid gap-6">
        <h2 className="text-2xl font-bold text-center">📄 Upload & Sign Document</h2>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <label>
              Upload PDF:
              <input type="file" accept="application/pdf" onChange={handlePdfChange} className="block mt-1" />
            </label>
            <label>
              Upload Signature Image:
              <input type="file" accept="image/*" onChange={handleSignatureChange} className="block mt-1" />
            </label>
            <button
              onClick={handleSignAndDownload}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              ✍️ Sign, Download & Upload
            </button>
          </div>

          <div className="relative">
            <canvas ref={canvasRef} className="border shadow bg-white" />
            {signatureImage && (
              <img
                src={signatureImage}
                alt="Signature"
                draggable
                onDragEnd={onDrag}
                style={{
                  position: 'absolute',
                  left: `${position.x}px`,
                  bottom: `${position.y}px`,
                  width: '100px',
                  height: '50px',
                  cursor: 'move',
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">📁 Previously Uploaded Documents</h3>
          {signedDocs.length === 0 ? (
            <p className="text-gray-500">No documents yet.</p>
          ) : (
            <ul className="space-y-3">
              {signedDocs.map((doc) => (
                <li
                  key={doc._id}
                  className="bg-white p-3 shadow rounded flex justify-between items-center"
                >
                  <span>{doc.fileName}</span>
                  <button
                    onClick={() => downloadSignedFromBackend(doc._id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Download Signed PDF
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadAndSign;