import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
import API from "../utils/api";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ✅ Worker source for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureText, setSignatureText] = useState("Harish Kumar");
  const [font, setFont] = useState("Helvetica");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const draggableRef = useRef(null);

  // 📂 Handle PDF upload
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  // 📄 Capture PDF page size for scaling
  const onPdfLoadSuccess = (page) => {
    setPageDimensions({ width: page.width, height: page.height });
  };

  // 📌 Update signature position when drag stops
  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
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
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("✅ Signed PDF uploaded to backend!");
    } catch (err) {
      toast.error("❌ Upload failed");
      console.error(err.response?.data || err.message);
    }
  };

  // 🖊️ Draw signature into PDF + download + upload
  const handleDownload = async () => {
    if (!pdfFile || !pageDimensions.width) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    // scale preview (600px wide) → real PDF size
    const scale = width / 600;
    const actualX = position.x * scale;
    const actualY = height - position.y * scale - 20;

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

    // 💾 Trigger browser download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "signed-document.pdf";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Upload & Sign PDF</h1>

      {/* Upload controls */}
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
        <div
          style={{ position: "relative", width: 600 }}
          className="border shadow rounded"
        >
          <Document file={pdfUrl}>
            <Page
              pageNumber={1}
              width={600}
              onLoadSuccess={onPdfLoadSuccess}
            />
          </Document>

          {/* Draggable signature */}
          <Draggable
            nodeRef={draggableRef}
            position={position}
            onStop={handleDragStop}
            bounds="parent"
          >
            <div
              ref={draggableRef}
              className="absolute text-black bg-white/80 px-2 py-1 rounded shadow border border-gray-300 cursor-move"
              style={{
                fontFamily: font,
                fontSize: "18px",
                zIndex: 10,
              }}
            >
              ✍️ {signatureText}
            </div>
          </Draggable>
        </div>
      )}

      {/* Download button */}
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
