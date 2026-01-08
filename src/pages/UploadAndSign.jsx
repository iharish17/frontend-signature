import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { toast } from "react-toastify";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const UploadAndSign = () => {
  const pageWrapperRef = useRef(null);
  const renderedPageWidthRef = useRef(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(600);

  const [signatureType, setSignatureType] = useState("text");
  const [signatureText, setSignatureText] = useState("");
  const [signatureImage, setSignatureImage] = useState(null);

  const [positions, setPositions] = useState({});
  const [sizes, setSizes] = useState({});
  const [rotations] = useState({});
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  const [font, setFont] = useState("Helvetica");

  useEffect(() => {
    const updateWidth = () => {
      if (pageWrapperRef.current) {
        setPageWidth(pageWrapperRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const ensureSignaturePosition = () => {
    setPositions((prev) =>
      prev[currentPage]
        ? prev
        : { ...prev, [currentPage]: { x: 100, y: 120 } }
    );
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Upload a valid PDF");
      return;
    }
    setPdfFile(file);
    setPdfUrl(URL.createObjectURL(file));
    setCurrentPage(1);
    setPositions({});
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Upload a valid image");
      return;
    }
    setSignatureImage(file);
    setSignatureType("image");
    ensureSignaturePosition();
  };

  const startDrag = () => setDragging(true);
  const endActions = () => {
    setDragging(false);
    setResizing(false);
  };

  const moveDrag = (e) => {
    if ((!dragging && !resizing) || !pageWrapperRef.current) return;

    const rect = pageWrapperRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;

    if (dragging) {
      setPositions((p) => ({
        ...p,
        [currentPage]: {
          x: Math.max(0, cx - rect.left),
          y: Math.max(0, cy - rect.top)
        }
      }));
    }

    if (resizing) {
      setSizes((s) => {
        const cur = s[currentPage] || { width: 160, height: 60 };
        return {
          ...s,
          [currentPage]: {
            width: Math.max(60, cur.width + e.movementX),
            height: Math.max(30, cur.height + e.movementY)
          }
        };
      });
    }
  };

  const signAndDownload = async () => {
    if (signatureType === "text" && !signatureText.trim()) {
      toast.error("Enter signature text");
      return;
    }

    try {
      const bytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();

      const embeddedFont =
        signatureType === "text"
          ? await pdfDoc.embedFont(
              StandardFonts[font] || StandardFonts.Helvetica
            )
          : null;

      const imageBytes =
        signatureType === "image" && signatureImage
          ? await signatureImage.arrayBuffer()
          : null;

      const embeddedImage =
        imageBytes &&
        (signatureImage.type.includes("png")
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes));

      pages.forEach((page, i) => {
        const pos = positions[i + 1];
        if (!pos || !renderedPageWidthRef.current) return;

        const scale = page.getWidth() / renderedPageWidthRef.current;
        const rotation = degrees(rotations[i + 1] || 0);

        if (signatureType === "text") {
          const fontSize = 22 * scale;
          const textHeight = embeddedFont.heightAtSize(fontSize);

          page.drawText(signatureText, {
            x: pos.x * scale,
            y: page.getHeight() - pos.y * scale - textHeight,
            size: fontSize,
            font: embeddedFont,
            color: rgb(0, 0, 0)
          });
        }

        if (signatureType === "image" && embeddedImage) {
          const size = sizes[i + 1] || { width: 160, height: 60 };
          page.drawImage(embeddedImage, {
            x: pos.x * scale,
            y: page.getHeight() - pos.y * scale - size.height * scale,
            width: size.width * scale,
            height: size.height * scale,
            rotate: rotation
          });
        }
      });

      const signedPdf = await pdfDoc.save();
      const blob = new Blob([signedPdf], { type: "application/pdf" });

      const fd = new FormData();
      fd.append("pdf", blob, "signed-document.pdf");

      await fetch("http://localhost:5000/api/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: fd
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "signed-document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF signed, saved & downloaded");
    } catch {
      toast.error("Signing failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <div className="w-full md:w-1/4 bg-white shadow p-4 space-y-4">
        <input type="file" accept="application/pdf" onChange={handlePdfUpload} />

        <div className="flex gap-4">
          <label>
            <input
              type="radio"
              checked={signatureType === "text"}
              onChange={() => setSignatureType("text")}
            />{" "}
            Text
          </label>

          <label>
            <input
              type="radio"
              checked={signatureType === "image"}
              onChange={() => setSignatureType("image")}
            />{" "}
            Image
          </label>
        </div>

        {signatureType === "image" && (
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        )}

        {signatureType === "text" && (
          <input
            type="text"
            placeholder="Signature text"
            value={signatureText}
            onChange={(e) => {
              setSignatureText(e.target.value);
              ensureSignaturePosition();
            }}
            className="border p-2 w-full"
          />
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {pdfUrl && (
          <div className="flex-1 overflow-y-auto flex justify-center p-4">
            <div
              ref={pageWrapperRef}
              className="relative bg-white shadow"
              onMouseMove={moveDrag}
              onMouseUp={endActions}
              onTouchMove={moveDrag}
              onTouchEnd={endActions}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              >
                <Page
                  pageNumber={currentPage}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={(p) => {
                    renderedPageWidthRef.current = p.width;
                  }}
                />
              </Document>

              <div
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                style={{
                  position: "absolute",
                  left: positions[currentPage]?.x || 100,
                  top: positions[currentPage]?.y || 120,
                  width: sizes[currentPage]?.width || 160,
                  height: sizes[currentPage]?.height || 60,
                  border: "1px solid black",
                  background: "white",
                  cursor: "move"
                }}
              >
                {signatureType === "text"
                  ? signatureText || "Signature"
                  : signatureImage && (
                      <img
                        src={URL.createObjectURL(signatureImage)}
                        alt="signature"
                        style={{ width: "100%", height: "100%" }}
                      />
                    )}

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
          </div>
        )}

        {pdfUrl && (
          <div className="bg-white shadow p-3 flex justify-between">
            <div className="flex gap-2">
              {Array.from({ length: numPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border ${
                    currentPage === i + 1
                      ? "bg-red-600 text-white"
                      : ""
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={signAndDownload}
              className="bg-red-600 text-white px-4 py-2"
            >
              Sign & Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadAndSign;
