use std::env;
use std::fs::File;
use std::io::Write;
use std::process::ExitCode;

/// Minimal dlltool.exe replacement for Rust GNU target on Windows.
///
/// The real dlltool creates COFF import libraries from .dll exports.
/// With link-self-contained=yes, rust-lld can resolve symbols from
/// system DLLs directly, so we only need to create a valid (but
/// minimal) COFF archive file to satisfy rustc's link step.
fn main() -> ExitCode {
  let args: Vec<String> = env::args().skip(1).collect();

  // Find the -l (library output) flag
  let mut lib_out: Option<String> = None;
  let mut i = 0;
  while i < args.len() {
    if args[i] == "-l" || args[i].starts_with("-l") {
      if args[i] == "-l" {
        // -l <path>
        if i + 1 < args.len() {
          lib_out = Some(args[i + 1].clone());
          i += 2;
          continue;
        }
      } else {
        // -l<path>
        lib_out = Some(args[i][2..].to_string());
      }
    }
    i += 1;
  }

  if let Some(path) = lib_out {
    if let Err(e) = create_empty_coff_archive(&path) {
      eprintln!("dlltool: failed to create {}: {}", path, e);
      return ExitCode::FAILURE;
    }
  }

  ExitCode::SUCCESS
}

/// Create a minimal valid COFF import archive.
/// The archive magic is `!<arch>\n` (8 bytes) followed by file entries.
/// An empty archive (just the magic) is valid and will be accepted by linkers.
fn create_empty_coff_archive(path: &str) -> std::io::Result<()> {
  let mut file = File::create(path)?;
  // COFF archive signature: "!<arch>\n"
  file.write_all(b"!<arch>\n")?;
  Ok(())
}
