import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
import API from "../utils/api";

// ✅ Fixed workerSrc interpolation
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureText, setSignatureText] = useState("Harish Kumar");
  const [font, setFont] = useState("Helvetica");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const draggableRef = useRef(null);

  // 📂 Handle PDF file selection
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  // 📌 Update position when dragging stops
  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  // 📄 Store page width/height for scaling
  const onPdfLoadSuccess = ({ width, height }) => {
    setPageDimensions({ width, height });
  };

  // ☁️ Upload signed PDF to backend
  const uploadToBackend = async (pdfBlob) => {
  const file = new File([pdfBlob], `${Date.now()}-signed.pdf`, {
    type: "application/pdf",
  });

  const formData = new FormData();
  formData.append("pdf", file);

  try {
    await API.post("/docs/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data", // ✅ Explicitly set
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    toast.success("✅ Signed PDF uploaded to backend!");
  } catch (err) {
    toast.error("❌ Upload failed");
    console.error(err.response?.data || err.message);
  }
};


  // 💾 Download signed PDF
  const handleDownload = async () => {
    if (!pdfFile || !pageDimensions.width) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    // 📏 Scale coordinates from preview to PDF size
    const scaleFactor = 600 / pageDimensions.width;
    const actualX = position.x / scaleFactor;
    const actualY = height - position.y / scaleFactor - 20;

    const selectedFont = await pdfDoc.embedFont(StandardFonts[font]);

    page.drawText(signatureText, {
      x: actualX,
      y: actualY,
      size: 18,
      font: selectedFont,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    await uploadToBackend(blob);

    // 💾 Trigger download in browser
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "signed-document.pdf";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Upload & Sign PDF</h1>

      {/* Upload, Signature Text, Font Selection */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input type="file" accept="application/pdf" onChange={handlePdfChange} />
        <input
          type="text"
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          placeholder="Type your signature"
          className="border px-3 py-1 rounded"
        />
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="Helvetica">Helvetica</option>
          <option value="Courier">Courier</option>
          <option value="TimesRoman">Times Roman</option>
        </select>
      </div>

      {/* PDF Preview */}
      {pdfUrl && (
        <div style={{ position: "relative", width: 600 }} className="border shadow rounded">
          <Document file={pdfUrl}>
            <Page pageNumber={1} width={600} onLoadSuccess={onPdfLoadSuccess} />
          </Document>

          {/* Draggable Signature */}
          <Draggable
            nodeRef={draggableRef}
            onStop={handleDragStop}
            bounds="parent"
            defaultPosition={position}
          >
            <div
              ref={draggableRef}
              className="absolute text-black bg-white/80 px-2 py-1 rounded shadow border border-gray-300 cursor-move"
              style={{
                fontFamily: font,
                fontSize: "18px",
                top: position.y,
                left: position.x,
                zIndex: 10,
              }}
            >
              ✍️ {signatureText}
            </div>
          </Draggable>
        </div>
      )}

      {/* Download Button */}
      {pdfUrl && (
        <button
          onClick={handleDownload}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Sign & Download
        </button>
      )}
    </div>
  );
};

export default UploadAndSign;
