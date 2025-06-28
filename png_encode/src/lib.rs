use png::{BitDepth, ColorType, Encoder};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub fn export_png(width: u32, height: u32, pixels: &[u8]) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();

    {
        let cursor = Cursor::new(&mut buffer);

        let (indexed_pixels, palette) = rgba_to_indexed(pixels)?;

        let mut encoder = Encoder::new(cursor, width, height);
        encoder.set_color(ColorType::Indexed);
        encoder.set_depth(BitDepth::Eight);

        encoder.set_palette(palette);

        let mut writer = encoder.write_header().unwrap();
        writer.write_image_data(&indexed_pixels).unwrap();
    }

    Ok(buffer)
}

fn rgba_to_indexed(rgba: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let mut palette = Vec::<u8>::new(); // will store RGB
    let mut indexed_pixels = Vec::with_capacity(rgba.len() / 4);

    fn cmp_color(a: &[u8], b: &[u8]) -> std::cmp::Ordering {
        for i in 0..3 {
            if a[i] < b[i] {
                return std::cmp::Ordering::Less;
            }
            if a[i] > b[i] {
                return std::cmp::Ordering::Greater;
            }
        }
        std::cmp::Ordering::Equal
    }

    fn binary_search_palette(palette: &[u8], color: &[u8]) -> Option<usize> {
        let mut left = 0;
        let mut right = palette.len() / 3;
        while left < right {
            let mid = (left + right) / 2;
            let mid_color = &palette[mid * 3..mid * 3 + 3];
            match cmp_color(mid_color, color) {
                std::cmp::Ordering::Less => left = mid + 1,
                std::cmp::Ordering::Greater => right = mid,
                std::cmp::Ordering::Equal => return Some(mid),
            }
        }
        None
    }

    fn find_insert_pos(palette: &[u8], color: &[u8]) -> usize {
        let mut left = 0;
        let mut right = palette.len() / 3;
        while left < right {
            let mid = (left + right) / 2;
            let mid_color = &palette[mid * 3..mid * 3 + 3];
            if cmp_color(mid_color, color) == std::cmp::Ordering::Less {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        left
    }

    for chunk in rgba.chunks(4) {
        let color = &chunk[0..3]; // RGB slice only

        if let Some(idx) = binary_search_palette(&palette, color) {
            indexed_pixels.push(idx as u8);
        } else {
            let idx = palette.len() / 3;
            if idx >= 256 {
                return Err("Palette too big, max 256 colors".to_string());
            }

            let pos = find_insert_pos(&palette, color);
            // Insert 3 bytes at pos*3 without replacing anything
            palette.splice(pos * 3..pos * 3, color.iter().cloned());
            indexed_pixels.push(pos as u8);
        }
    }

    Ok((indexed_pixels, palette))
}
