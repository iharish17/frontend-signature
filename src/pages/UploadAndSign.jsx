import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
import API from "../utils/api";

// ✅ Fix worker for CRA
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureImg, setSignatureImg] = useState(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const draggableRef = useRef(null);

  // Handle PDF upload
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  // Handle signature image upload
  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setSignatureImg(reader.result);
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload an image (PNG/JPG).");
    }
  };

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const onPdfLoadSuccess = ({ width, height }) => {
    setPageDimensions({ width, height });
  };

  const uploadToBackend = async (pdfBlob) => {
    const file = new File([pdfBlob], `${Date.now()}-signed.pdf`, {
      type: "application/pdf",
    });

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      await API.post("/docs/upload", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("✅ Signed PDF uploaded to backend!");
    } catch (err) {
      toast.error("❌ Upload failed");
      console.error(err.response?.data || err.message);
    }
  };

  const handleDownload = async () => {
    if (!pdfFile || !signatureImg || !pageDimensions.width) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    // Scale factor to map screen coords → PDF coords
    const scaleFactor = 600 / pageDimensions.width;
    const actualX = position.x / scaleFactor;
    const actualY = height - position.y / scaleFactor - 100; // adjust offset

    // Embed image signature
    const signatureImageBytes = await fetch(signatureImg).then((res) =>
      res.arrayBuffer()
    );
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    const sigDims = signatureImage.scale(0.25); // adjust size

    page.drawImage(signatureImage, {
      x: actualX,
      y: actualY,
      width: sigDims.width,
      height: sigDims.height,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    await uploadToBackend(blob);

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "signed-document.pdf";
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">
        Upload & Sign PDF
      </h1>

      {/* Upload controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input type="file" accept="application/pdf" onChange={handlePdfChange} />
        <input type="file" accept="image/*" onChange={handleSignatureChange} />
      </div>

      {/* PDF Preview */}
      {pdfUrl && (
        <div
          style={{ position: "relative", width: 600 }}
          className="border shadow rounded"
        >
          <Document file={pdfUrl}>
            <Page pageNumber={1} width={600} onLoadSuccess={onPdfLoadSuccess} />
          </Document>

          {/* Draggable Signature Preview */}
          {signatureImg && (
            <Draggable
              nodeRef={draggableRef}
              onStop={handleDragStop}
              bounds="parent"
            >
              <img
                ref={draggableRef}
                src={signatureImg}
                alt="Signature"
                style={{
                  position: "absolute",
                  top: position.y,
                  left: position.x,
                  width: "120px",
                  cursor: "move",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              />
            </Draggable>
          )}
        </div>
      )}

      {/* Download button */}
      {pdfUrl && signatureImg && (
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
