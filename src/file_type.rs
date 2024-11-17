use std::io::{self, Read};

use serde::{Deserialize, Serialize};

/// # File type
///
/// Contains all the supported file types of video, image and audio.
///
/// Used to determine the file type of a file, or to give information about the file to embed creators.
#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum FileType {
  Audio(AudioType),
  Image(ImageType),
  Video(VideoType),
  Unknown,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum ImageType {
  PNG,
  JPEG,
  BMP,
  GIF,
  WEBP,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum VideoType {
  MP4,
  AVI,
  MOV,
  MKV,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum AudioType {
  MP3,
  AAC,
  M4A,
  OGG,
  WAV,
}

impl FileType {
  pub fn is_image(&self) -> bool {
    match self {
      FileType::Image(_) => true,
      _ => false,
    }
  }
  pub fn is_video(&self) -> bool {
    match self {
      FileType::Video(_) => true,
      _ => false,
    }
  }
  pub fn is_audio(&self) -> bool {
    match self {
      FileType::Audio(_) => true,
      _ => false,
    }
  }

  /// Converts the file type to a mime type
  ///
  /// Example: `FileType::Audio(AudioType::MP3)` -> `"audio/mpeg"`
  pub fn to_mime_type(&self) -> String {
    return match self {
      // Audio
      FileType::Audio(AudioType::MP3) => "audio/mpeg".to_string(),
      FileType::Audio(AudioType::AAC) => "audio/aac".to_string(),
      FileType::Audio(AudioType::M4A) => "audio/m4a".to_string(),
      FileType::Audio(AudioType::OGG) => "audio/ogg".to_string(),
      FileType::Audio(AudioType::WAV) => "audio/wav".to_string(),
      // Image
      FileType::Image(ImageType::PNG) => "image/png".to_string(),
      FileType::Image(ImageType::JPEG) => "image/jpeg".to_string(),
      FileType::Image(ImageType::BMP) => "image/bmp".to_string(),
      FileType::Image(ImageType::GIF) => "image/gif".to_string(),
      FileType::Image(ImageType::WEBP) => "image/webp".to_string(),
      // Video
      FileType::Video(VideoType::MP4) => "video/mp4".to_string(),
      FileType::Video(VideoType::AVI) => "video/avi".to_string(),
      FileType::Video(VideoType::MOV) => "video/mov".to_string(),
      FileType::Video(VideoType::MKV) => "video/mkv".to_string(),
      // Other
      _ => "application/octet-stream".to_string(),
    };
  }

  /// Tries to convert a mime type to a [FileType]
  ///
  /// If the mime type is not supported, returns [None] or [FileType::Unknown].
  ///
  /// Example: `"audio/mpeg"` -> `Some(FileType::Audio(AudioType::MP3))`
  ///
  /// List of supported mime types:
  /// - Audio: `audio/mpeg`, `audio/aac`, `audio/m4a`, `audio/ogg`, `audio/wav`
  /// - Image: `image/png`, `image/jpeg`, `image/bmp`, `image/gif`, `image/webp`
  /// - Video: `video/mp4`, `video/avi`, `video/mov`, `video/mkv`
  pub fn from_mime_type(mime_type: &str) -> Option<FileType> {
    match mime_type {
      "audio/mpeg" => Some(FileType::Audio(AudioType::MP3)),
      "audio/aac" => Some(FileType::Audio(AudioType::AAC)),
      "audio/m4a" => Some(FileType::Audio(AudioType::M4A)),
      "audio/ogg" => Some(FileType::Audio(AudioType::OGG)),
      "audio/wav" => Some(FileType::Audio(AudioType::WAV)),
      "image/png" => Some(FileType::Image(ImageType::PNG)),
      "image/jpeg" => Some(FileType::Image(ImageType::JPEG)),
      "image/bmp" => Some(FileType::Image(ImageType::BMP)),
      "image/gif" => Some(FileType::Image(ImageType::GIF)),
      "image/webp" => Some(FileType::Image(ImageType::WEBP)),
      "video/mp4" => Some(FileType::Video(VideoType::MP4)),
      "video/avi" => Some(FileType::Video(VideoType::AVI)),
      "video/mov" => Some(FileType::Video(VideoType::MOV)),
      "video/mkv" => Some(FileType::Video(VideoType::MKV)),
      "application/octet-stream" => Some(FileType::Unknown),
      _ => None,
    }
  }
}

/// # File type detector
///
/// Detects the file type of a reader
///
/// Using custom file type detector for ensuring that the file type is supported by the server
pub struct FileTypeDetector {}

impl FileTypeDetector {
  /// Gusses the file type based on the file signatures (magic numbers or first bytes)
  ///
  /// Source: https://www.garykessler.net/library/file_sigs.html
  ///
  /// If the file type cannot be guessed, [FileType::Unknown] is returned
  ///
  /// ### Arguments
  /// * `reader` - Any reader that implements [Read](https://doc.rust-lang.org/std/io/trait.Read.html)
  ///
  /// ### Returns
  /// * [FileType] - The guessed file type
  ///
  /// If the file type cannot be guessed (for example, if the file is empty or the first bytes are not enough to determine the file type), [FileType::Unknown] is returned
  pub fn guess<R: Read>(mut reader: R) -> io::Result<FileType> {
    let mut buffer = [0u8; 16];

    // Read as much as we can, up to 16 bytes
    let bytes_read = reader.read(&mut buffer)?;
    if bytes_read == 0 {
      return Ok(FileType::Unknown);
    }

    Ok(match &buffer {
      // Audio Formats
      b if bytes_read >= 3 && b.starts_with(b"ID3")
        || (bytes_read >= 2 && b.starts_with(&[0xFF, 0xFB])) =>
      {
        FileType::Audio(AudioType::MP3)
      }
      b if bytes_read >= 4 && b.starts_with(b"ADIF")
        || (bytes_read >= 2 && (b.starts_with(&[0xFF, 0xF1]) || b.starts_with(&[0xFF, 0xF9]))) =>
      {
        FileType::Audio(AudioType::AAC)
      }
      b if bytes_read >= 7 && (b.starts_with(b"ftypM4A") || b.starts_with(b"M4A ")) => {
        FileType::Audio(AudioType::M4A)
      }
      b if bytes_read >= 4 && b.starts_with(b"OggS") => FileType::Audio(AudioType::OGG),
      b if bytes_read >= 12 && b.starts_with(b"RIFF") && &b[8..12] == b"WAVE" => {
        FileType::Audio(AudioType::WAV)
      }

      // Video Formats
      b if bytes_read >= 4
        && ((bytes_read >= 8
          && (b.starts_with(b"\x00\x00\x00\x20ftyp")
            || b.starts_with(b"\x00\x00\x00\x18ftyp")))
          || (bytes_read >= 4 && b.starts_with(b"ftyp"))
          || (bytes_read >= 4 && b.starts_with(b"moov"))
          || (bytes_read >= 4 && b.starts_with(b"mdat"))
          || (bytes_read >= 4 && b.starts_with(b"free"))
          || (bytes_read >= 4 && b.starts_with(b"skip"))
          || (bytes_read >= 4 && b.starts_with(b"wide"))) =>
      {
        FileType::Video(VideoType::MP4)
      }
      b if bytes_read >= 12 && b.starts_with(b"RIFF") && &b[8..12] == b"AVI " => {
        FileType::Video(VideoType::AVI)
      }
      b if bytes_read >= 4 && b.starts_with(b"\x1A\x45\xDF\xA3") => FileType::Video(VideoType::MKV),
      b if bytes_read >= 8
        && (&b[4..8] == b"moov"
          || &b[4..8] == b"free"
          || &b[4..8] == b"mdat"
          || &b[4..8] == b"skip"
          || &b[4..8] == b"wide"
          || &b[4..8] == b"pnot") =>
      {
        FileType::Video(VideoType::MOV)
      }

      // Image Formats
      b if bytes_read >= 8 && b.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) => {
        FileType::Image(ImageType::PNG)
      }
      b if bytes_read >= 3 && b.starts_with(&[0xFF, 0xD8, 0xFF]) => {
        FileType::Image(ImageType::JPEG)
      }
      b if bytes_read >= 2 && b.starts_with(b"BM") => FileType::Image(ImageType::BMP),
      b if bytes_read >= 6 && (b.starts_with(b"GIF87a") || b.starts_with(b"GIF89a")) => {
        FileType::Image(ImageType::GIF)
      }
      // WEBP detection - checks for RIFF header and WEBP type
      b if bytes_read >= 12 && b.starts_with(b"RIFF") && &b[8..12] == b"WEBP" => {
        FileType::Image(ImageType::WEBP)
      }

      _ => FileType::Unknown,
    })
  }

  /// Uses the [Self::guess] function and prints the hex dump of the first 1024 bytes of the file
  ///
  /// Useful for debugging
  pub fn quess_debug<R: Read>(reader: &mut R) -> io::Result<FileType> {
    let mut buffer = [0; 1024];
    let bytes_read = reader.read(&mut buffer).unwrap();
    Self::print_hex_dump(&buffer, bytes_read);
    Self::guess(reader)
  }

  fn print_hex_dump(buffer: &[u8], len: usize) {
    println!("First {} bytes of file:", len);
    println!("Hex dump:");
    for (i, chunk) in buffer.chunks(16).enumerate() {
      print!("{:08x}  ", i * 16);

      // Print hex values
      for byte in chunk {
        print!("{:02x} ", byte);
      }

      // Fill remaining space if chunk is smaller than 16
      for _ in chunk.len()..16 {
        print!("   ");
      }

      print!(" |");
      // Print ASCII representation
      for byte in chunk {
        if byte.is_ascii_graphic() {
          print!("{}", *byte as char);
        } else {
          print!(".");
        }
      }
      println!("|");
    }
  }
}
