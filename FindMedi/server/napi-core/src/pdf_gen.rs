//! Minimal PDF generator for invoice/payment documents.
//!
//! Uses only standard 14 PDF fonts (Helvetica) — no font embedding needed.
//! Compresses content streams with flate2/miniz_oxide (pure Rust, no build scripts).

use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::Write;

pub const PAGE_WIDTH: f32 = 595.0;  // A4 at 72 dpi
pub const PAGE_HEIGHT: f32 = 842.0;
pub const MARGIN: f32 = 36.0;

/// A page with text and drawing primitives.
pub struct PdfPage {
  pub width: f32,
  pub height: f32,
  pub margin: f32,
  elements: Vec<PageElement>,
}

#[derive(Clone)]
pub enum PageElement {
  Text { x: f32, y: f32, font_index: usize, font_size: f32, text: String },
  RectFill { x: f32, y: f32, w: f32, h: f32, r: u8, g: u8, b: u8 },
  RectStroke { x: f32, y: f32, w: f32, h: f32, r: u8, g: u8, b: u8 },
  Line { x1: f32, y1: f32, x2: f32, y2: f32, r: u8, g: u8, b: u8, width: f32 },
}

/// Standard 14 PDF font reference.
pub struct FontRef {
  pub name: &'static str,
}

/// Font registry — index 0 = body text, index 1 = bold.
pub const FONTS: &[FontRef] = &[
  FontRef { name: "Helvetica" },
  FontRef { name: "Helvetica-Bold" },
];

pub fn font_regular() -> usize { 0 }
pub fn font_bold() -> usize { 1 }

impl PdfPage {
  pub fn new(width: f32, height: f32, margin: f32) -> Self {
    PdfPage { width, height, margin, elements: Vec::new() }
  }

  pub fn text(&mut self, x: f32, y: f32, font_index: usize, size: f32, text: &str) {
    let escaped: String = text
      .chars()
      .map(|c| match c {
        '(' | ')' | '\\' => format!("\\{}", c),
        c => c.to_string(),
      })
      .collect();
    self.elements.push(PageElement::Text {
      x, y, font_index, font_size: size, text: escaped,
    });
  }

  pub fn rect_fill(&mut self, x: f32, y: f32, w: f32, h: f32, r: u8, g: u8, b: u8) {
    self.elements.push(PageElement::RectFill { x, y, w, h, r, g, b });
  }

  pub fn rect_stroke(&mut self, x: f32, y: f32, w: f32, h: f32, r: u8, g: u8, b: u8) {
    self.elements.push(PageElement::RectStroke { x, y, w, h, r, g, b });
  }

  pub fn line(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, r: u8, g: u8, b: u8, width: f32) {
    self.elements.push(PageElement::Line { x1, y1, x2, y2, r, g, b, width });
  }

  pub fn vline(&mut self, x: f32, y1: f32, y2: f32, r: u8, g: u8, b: u8, width: f32) {
    self.line(x, y1, x, y2, r, g, b, width);
  }
}

/// Build the raw PDF content stream bytes for a page.
fn build_content_stream(page: &PdfPage) -> Vec<u8> {
  let mut s = Vec::new();

  for elem in &page.elements {
    match elem {
      PageElement::Text { x, y, font_index, font_size, text } => {
        write!(&mut s, "BT /F{} {:.1} Tf {:.1} {:.1} Td ({}) Tj ET\n",
          font_index + 1, font_size, x, y, text).ok();
      }
      PageElement::RectFill { x, y, w, h, r, g, b } => {
        write!(&mut s, "{:.3} {:.3} {:.3} rg {:.1} {:.1} {:.1} {:.1} re f\n",
          *r as f32 / 255.0, *g as f32 / 255.0, *b as f32 / 255.0,
          x, y, w, h).ok();
      }
      PageElement::RectStroke { x, y, w, h, r, g, b } => {
        write!(&mut s, "{:.3} {:.3} {:.3} RG {:.1} {:.1} {:.1} {:.1} re S\n",
          *r as f32 / 255.0, *g as f32 / 255.0, *b as f32 / 255.0,
          x, y, w, h).ok();
      }
      PageElement::Line { x1, y1, x2, y2, r, g, b, width } => {
        write!(&mut s, "{:.3} {:.3} {:.3} RG {:.1} w {:.1} {:.1} m {:.1} {:.1} l S\n",
          *r as f32 / 255.0, *g as f32 / 255.0, *b as f32 / 255.0,
          width, x1, y1, x2, y2).ok();
      }
    }
  }

  s
}

/// Compress data with flate2 (zlib/deflate).
fn compress(data: &[u8]) -> Vec<u8> {
  let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
  encoder.write_all(data).unwrap();
  encoder.finish().unwrap()
}

/// A PDF object that produces its serialized bytes.
trait PdfObject {
  fn write_to(&self, out: &mut Vec<u8>);
}

/// Render a single-page PDF to bytes.
pub fn render_pdf(page: &PdfPage) -> Vec<u8> {
  const NUM_FONTS: usize = 2;
  // Object numbering (1-indexed, 0 = free list):
  // 1..NUM_FONTS+1    → fonts
  // NUM_FONTS+1       → content stream
  // NUM_FONTS+2       → resources
  // NUM_FONTS+3       → page
  // NUM_FONTS+4       → pages root
  // NUM_FONTS+5       → catalog (root)

  let font_start = 1usize;
  let content_obj = font_start + NUM_FONTS;        // content stream
  let resources_obj = content_obj + 1;               // resources dict
  let page_obj = resources_obj + 1;                  // page
  let pages_obj = page_obj + 1;                      // pages root
  let catalog_obj = pages_obj + 1;                   // catalog

  let total_objects = catalog_obj + 1;

  // Build content stream
  let raw_content = build_content_stream(page);
  let compressed = compress(&raw_content);

  // Build font objects
  let font_bytes: Vec<Vec<u8>> = FONTS.iter().map(|f| {
    format!("<< /Type /Font /Subtype /Type1 /BaseFont /{} >>", f.name).into_bytes()
  }).collect();

  // Build content stream object
  let content_header = format!(
    "<< /Length {} /Filter /FlateDecode >>\nstream\n",
    compressed.len()
  ).into_bytes();

  // Build resources object
  let font_refs: String = (0..NUM_FONTS)
    .map(|i| format!("/F{} {} 0 R ", i + 1, font_start + i))
    .collect();
  let resources_bytes = format!(
    "<< /Font << {} >> /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] >>",
    font_refs.trim_end()
  ).into_bytes();

  // Build page object
  let page_bytes = format!(
    "<< /Type /Page /Parent {} 0 R /MediaBox [0 0 {:.0} {:.0}] \
     /Contents {} 0 R /Resources {} 0 R >>",
    pages_obj,
    page.width, page.height,
    content_obj,
    resources_obj,
  ).into_bytes();

  // Build pages root
  let pages_bytes = format!(
    "<< /Type /Pages /Kids [{} 0 R] /Count 1 >>",
    page_obj,
  ).into_bytes();

  // Build catalog
  let catalog_bytes = format!(
    "<< /Type /Catalog /Pages {} 0 R >>",
    pages_obj,
  ).into_bytes();

  let mut output: Vec<u8> = Vec::new();
  output.extend_from_slice(b"%PDF-1.4\n");

  let mut offsets: Vec<usize> = Vec::with_capacity(total_objects);

  // Object 0: free list
  offsets.push(output.len());
  output.extend_from_slice(b"0000000000 65535 f \n");

  // Objects 1..NUM_FONTS+1: fonts
  for i in 0..NUM_FONTS {
    offsets.push(output.len());
    write!(&mut output, "{} 0 obj\n", font_start + i).ok();
    output.extend_from_slice(&font_bytes[i]);
    output.extend_from_slice(b"\nendobj\n");
  }

  // Content stream object
  offsets.push(output.len());
  write!(&mut output, "{} 0 obj\n", content_obj).ok();
  output.extend_from_slice(&content_header);
  output.extend_from_slice(&compressed);
  output.extend_from_slice(b"\nendstream\n");
  output.extend_from_slice(b"endobj\n");

  // Resources
  offsets.push(output.len());
  write!(&mut output, "{} 0 obj\n", resources_obj).ok();
  output.extend_from_slice(&resources_bytes);
  output.extend_from_slice(b"\n");
  output.extend_from_slice(b"endobj\n");

  // Page
  offsets.push(output.len());
  write!(&mut output, "{} 0 obj\n", page_obj).ok();
  output.extend_from_slice(&page_bytes);
  output.extend_from_slice(b"\n");
  output.extend_from_slice(b"endobj\n");

  // Pages root
  offsets.push(output.len());
  write!(&mut output, "{} 0 obj\n", pages_obj).ok();
  output.extend_from_slice(&pages_bytes);
  output.extend_from_slice(b"\n");
  output.extend_from_slice(b"endobj\n");

  // Catalog
  offsets.push(output.len());
  write!(&mut output, "{} 0 obj\n", catalog_obj).ok();
  output.extend_from_slice(&catalog_bytes);
  output.extend_from_slice(b"\n");
  output.extend_from_slice(b"endobj\n");

  // Cross-reference table
  let xref_pos = output.len();
  write!(&mut output, "xref\n0 {}\n", total_objects).ok();
  write!(&mut output, "{:010} 65535 f \r\n", offsets[0]).ok();
  for off in &offsets[1..] {
    write!(&mut output, "{:010} 00000 n \r\n", off).ok();
  }

  // Trailer
  write!(&mut output,
    "trailer\n<< /Size {} /Root {} 0 R >>\nstartxref\n{}\n%%EOF",
    total_objects, catalog_obj, xref_pos
  ).ok();

  output
}

/// Color constants matching the hospital brand colors (from pdfService.js COLORS)
pub const C_PRIMARY: (u8, u8, u8) = (15, 118, 104);
pub const C_PRIMARY_DARK: (u8, u8, u8) = (19, 78, 74);
pub const C_ACCENT: (u8, u8, u8) = (37, 94, 233);
pub const C_INK: (u8, u8, u8) = (17, 24, 39);
pub const C_MUTED: (u8, u8, u8) = (107, 114, 120);
pub const C_BORDER: (u8, u8, u8) = (209, 213, 219);
pub const C_SOFT: (u8, u8, u8) = (243, 244, 246);
pub const C_SUCCESS: (u8, u8, u8) = (21, 128, 61);
pub const C_WARNING: (u8, u8, u8) = (180, 83, 9);
pub const C_DANGER: (u8, u8, u8) = (185, 28, 28);
pub const C_WHITE: (u8, u8, u8) = (255, 255, 255);
