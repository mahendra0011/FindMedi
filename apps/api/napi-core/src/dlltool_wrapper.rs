use std::env;
use std::fs::File;
use std::io::Write;
use std::process::ExitCode;

/// Minimal dlltool.exe replacement for Rust GNU target on Windows.
///
/// When rustc uses -C link-self-contained=yes, it calls dlltool to create
/// import libraries (.lib files) for system DLLs. This wrapper creates
/// valid (but empty) COFF archive files so the linker step succeeds.
/// rust-lld with link-self-contained resolves symbols from bundled DLLs directly.
fn main() -> ExitCode {
  let args: Vec<String> = env::args().skip(1).collect();

  // Find -l <output_lib> flag
  let mut lib_out: Option<String> = None;
  let mut i = 0;
  while i < args.len() {
    if args[i] == "-l" {
      if i + 1 < args.len() {
        lib_out = Some(args[i + 1].clone());
        i += 2;
        continue;
      }
    } else if args[i].starts_with("-l") {
      lib_out = Some(args[i][2..].to_string());
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

/// Create a valid (but empty) COFF archive file.
/// The archive magic is `!<arch>\n` (8 bytes).
/// An empty archive with just the magic is a valid COFF archive.
fn create_empty_coff_archive(path: &str) -> std::io::Result<()> {
  let mut file = File::create(path)?;
  // COFF archive signature
  file.write_all(b"!<arch>\n")?;
  Ok(())
}
