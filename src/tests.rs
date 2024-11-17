
use std::io::Cursor;

use crate::file_type::{AudioType, FileType, FileTypeDetector, ImageType, VideoType};

#[test]
fn test_detect_file_types() {
    let test_cases = vec![
        // Audio
        (b"ID3\x03\x00\x00\x00\x00\x00\x00".to_vec(), FileType::Audio(AudioType::MP3)),
        (b"ADIF....".to_vec(), FileType::Audio(AudioType::AAC)),
        (b"ftypM4A ".to_vec(), FileType::Audio(AudioType::M4A)),
        (b"OggS\x00\x02".to_vec(), FileType::Audio(AudioType::OGG)),
        (b"RIFF....WAVE".to_vec(), FileType::Audio(AudioType::WAV)),
        
        // Video
        (b"\x00\x00\x00\x18ftypisom".to_vec(), FileType::Video(VideoType::MP4)),
        (b"\x00\x00\x00\x20ftypisom".to_vec(), FileType::Video(VideoType::MP4)),
        (b"RIFF....AVI ".to_vec(), FileType::Video(VideoType::AVI)),
        (b"\x1A\x45\xDF\xA3".to_vec(), FileType::Video(VideoType::MKV)),
        
        // Images
        (vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A], FileType::Image(ImageType::PNG)),
        (vec![0xFF, 0xD8, 0xFF, 0xE0], FileType::Image(ImageType::JPEG)),
        (b"BM....".to_vec(), FileType::Image(ImageType::BMP)),
        (b"GIF89a".to_vec(), FileType::Image(ImageType::GIF)),
        (b"RIFF....WEBP".to_vec(), FileType::Image(ImageType::WEBP)),
    ];

    for (data, expected_type) in test_cases {
        let cursor = Cursor::new(data);
        assert_eq!(FileTypeDetector::guess(cursor).unwrap(), expected_type);
    }
}
