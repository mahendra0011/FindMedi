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

/// Standard Adobe Font Metrics (AFM) character widths for Helvetica (1/1000 of an em)
/// Covers ASCII characters 32 (' ') through 126 ('~').
pub const HELVETICA_AFM_WIDTHS: [u16; 95] = [
  278, // 32 ' '
  278, // 33 '!'
  355, // 34 '"'
  556, // 35 '#'
  556, // 36 '$'
  889, // 37 '%'
  667, // 38 '&'
  191, // 39 '\''
  333, // 40 '('
  333, // 41 ')'
  389, // 42 '*'
  584, // 43 '+'
  278, // 44 ','
  333, // 45 '-'
  278, // 46 '.'
  278, // 47 '/'
  556, // 48 '0'
  556, // 49 '1'
  556, // 50 '2'
  556, // 51 '3'
  556, // 52 '4'
  556, // 53 '5'
  556, // 54 '6'
  556, // 55 '7'
  556, // 56 '8'
  556, // 57 '9'
  278, // 58 ':'
  278, // 59 ';'
  584, // 60 '<'
  584, // 61 '='
  584, // 62 '>'
  556, // 63 '?'
  1015, // 64 '@'
  667, // 65 'A'
  667, // 66 'B'
  722, // 67 'C'
  722, // 68 'D'
  667, // 69 'E'
  611, // 70 'F'
  778, // 71 'G'
  722, // 72 'H'
  278, // 73 'I'
  500, // 74 'J'
  667, // 75 'K'
  556, // 76 'L'
  833, // 77 'M'
  722, // 78 'N'
  778, // 79 'O'
  667, // 80 'P'
  778, // 81 'Q'
  722, // 82 'R'
  667, // 83 'S'
  611, // 84 'T'
  722, // 85 'U'
  667, // 86 'V'
  944, // 87 'W'
  667, // 88 'X'
  667, // 89 'Y'
  611, // 90 'Z'
  278, // 91 '['
  278, // 92 '\\'
  278, // 93 ']'
  469, // 94 '^'
  556, // 95 '_'
  333, // 96 '`'
  556, // 97 'a'
  556, // 98 'b'
  500, // 99 'c'
  556, // 100 'd'
  556, // 101 'e'
  278, // 102 'f'
  556, // 103 'g'
  556, // 104 'h'
  222, // 105 'i'
  222, // 106 'j'
  500, // 107 'k'
  222, // 108 'l'
  833, // 109 'm'
  556, // 110 'n'
  556, // 111 'o'
  556, // 112 'p'
  556, // 113 'q'
  333, // 114 'r'
  500, // 115 's'
  278, // 116 't'
  556, // 117 'u'
  500, // 118 'v'
  722, // 119 'w'
  500, // 120 'x'
  500, // 121 'y'
  500, // 122 'z'
  334, // 123 '{'
  260, // 124 '|'
  334, // 125 '}'
  584, // 126 '~'
];

/// Calculate exact text width using standard Helvetica Adobe Font Metrics (AFM).
pub fn helvetica_text_width(s: &str, font_size: f32) -> f32 {
  let units: u32 = s.chars().map(|c| {
    let code = c as u32;
    if (32..=126).contains(&code) {
      HELVETICA_AFM_WIDTHS[(code - 32) as usize] as u32
    } else {
      556 // default average width for characters outside ASCII 32..126
    }
  }).sum();
  (units as f32 / 1000.0) * font_size
}
