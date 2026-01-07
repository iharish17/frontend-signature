import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { toast } from "react-toastify";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const UploadAndSign = () => {
  const containerRef = useRef(null);

  // PDF
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Signature type
  const [signatureType, setSignatureType] = useState("text");
  const [signatureText, setSignatureText] = useState("");
  const [signatureImage, setSignatureImage] = useState(null);
  const [font, setFont] = useState("Helvetica");

  // Drag & resize
  const [position, setPosition] = useState({ x: 120, y: 120 });
  const [size, setSize] = useState({ width: 160, height: 60 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  /* ================= PDF UPLOAD ================= */

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF");
      return;
    }
    setPdfFile(file);
    setPdfUrl(URL.createObjectURL(file));
  };

  /* ================= IMAGE SIGNATURE ================= */

  const handleSignatureImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Upload a valid image");
      return;
    }
    setSignatureImage(file);
  };

  /* ================= DRAG & TOUCH ================= */

  const startDrag = () => setDragging(true);
  const endActions = () => {
    setDragging(false);
    setResizing(false);
  };

  const moveDrag = (e) => {
    if ((!dragging && !resizing) || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (dragging) {
      setPosition({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }

    if (resizing) {
      setSize((prev) => ({
        width: Math.max(60, prev.width + e.movementX),
        height: Math.max(30, prev.height + e.movementY)
      }));
    }
  };

  /* ================= SIGN & SAVE ================= */

  const signAndDownload = async () => {
    if (!pdfFile) {
      toast.error("Upload a PDF first");
      return;
    }

    if (signatureType === "text" && !signatureText.trim()) {
      toast.error("Enter signature text");
      return;
    }

    if (signatureType === "image" && !signatureImage) {
      toast.error("Upload signature image");
      return;
    }

    try {
      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const page = pdfDoc.getPages()[0];

      if (signatureType === "text") {
        const fontMap = {
          Helvetica: StandardFonts.Helvetica,
          TimesRoman: StandardFonts.TimesRoman,
          Courier: StandardFonts.Courier
        };

        const embeddedFont = await pdfDoc.embedFont(
          fontMap[font] || StandardFonts.Helvetica
        );

        page.drawText(signatureText, {
          x: position.x,
          y: page.getHeight() - position.y,
          size: 24,
          font: embeddedFont,
          color: rgb(0, 0, 0)
        });
      }

      if (signatureType === "image") {
        const imgBytes = await signatureImage.arrayBuffer();
        const image = signatureImage.type.includes("png")
          ? await pdfDoc.embedPng(imgBytes)
          : await pdfDoc.embedJpg(imgBytes);

        page.drawImage(image, {
          x: position.x,
          y: page.getHeight() - position.y,
          width: size.width,
          height: size.height
        });
      }

      const signedPdf = await pdfDoc.save();
      const blob = new Blob([signedPdf], { type: "application/pdf" });

      /* ===== SAVE TO BACKEND ===== */
      const formData = new FormData();
      formData.append("pdf", blob, "signed-document.pdf");

      await fetch("http://localhost:5000/api/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      /* ===== DOWNLOAD LOCALLY ===== */
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "signed-document.pdf";
      a.click();

      toast.success("PDF signed & saved successfully");
    } catch {
      toast.error("Failed to sign PDF");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Upload & Sign PDF</h2>

      <input type="file" accept="application/pdf" onChange={handlePdfUpload} />

      <div className="my-4">
        <label>
          <input
            type="radio"
            checked={signatureType === "text"}
            onChange={() => setSignatureType("text")}
          />{" "}
          Text Signature
        </label>

        <label className="ml-4">
          <input
            type="radio"
            checked={signatureType === "image"}
            onChange={() => setSignatureType("image")}
          />{" "}
          Image Signature
        </label>
      </div>

      {signatureType === "text" && (
        <>
          <input
            type="text"
            placeholder="Enter signature text"
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            className="border p-2 mb-2 w-full"
          />

          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="border p-2 mb-4"
          >
            <option value="Helvetica">Helvetica</option>
            <option value="TimesRoman">Times Roman</option>
            <option value="Courier">Courier</option>
          </select>
        </>
      )}

      {signatureType === "image" && (
        <input type="file" accept="image/*" onChange={handleSignatureImageUpload} />
      )}

      {pdfUrl && (
        <div
          ref={containerRef}
          className="relative border mt-4"
          onMouseMove={moveDrag}
          onMouseUp={endActions}
          onTouchMove={moveDrag}
          onTouchEnd={endActions}
        >
          <Document file={pdfUrl}>
            <Page pageNumber={1} />
          </Document>

          <div
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            style={{
              position: "absolute",
              left: position.x,
              top: position.y,
              width: size.width,
              height: size.height,
              cursor: "move",
              background: "white",
              border: "1px solid black",
              padding: "4px"
            }}
          >
            {signatureType === "text"
              ? signatureText || "Signature"
              : "Signature Image"}

            {/* Resize handle */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizing(true);
              }}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: "12px",
                height: "12px",
                background: "#2563eb",
                cursor: "nwse-resize"
              }}
            />
          </div>
        </div>
      )}

      <button
        onClick={signAndDownload}
        className="bg-blue-600 text-white px-4 py-2 mt-4"
      >
        Sign & Download
      </button>
    </div>
  );
};

export default UploadAndSign;
